import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReadonlyDirective, resolveImsReadonly } from './readonly.directive';

@Component({
  imports: [ReadonlyDirective],
  template: `
    <section id="page" [ims-readonly]="pageReadonly()" [ims-readonly-locked]="pageLocked()">
      <section id="inherit" [ims-readonly]="null"></section>

      <section
        id="exception"
        [ims-readonly]="false"
        [ims-readonly-override-parent]="allowOverride()"
      >
        <button id="exception-button" type="button" [ims-readonly]="false">Submit</button>
      </section>

      <section id="nested-lock" [ims-readonly-locked]="nestedLocked()">
        <input id="nested-input" [ims-readonly]="false" ims-readonly-override-parent />
      </section>
    </section>

    <section id="standalone-lock" ims-readonly-locked></section>
  `,
})
class ReadonlyTestHost {
  readonly pageReadonly = signal(false);
  readonly pageLocked = signal(false);
  readonly allowOverride = signal(false);
  readonly nestedLocked = signal(false);
}

describe('ReadonlyDirective', () => {
  let fixture: ComponentFixture<ReadonlyTestHost>;
  let host: ReadonlyTestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadonlyTestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadonlyTestHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** The host state of one provider, as its classes and attributes expose it. */
  function stateOf(id: string) {
    const element = fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    return {
      readonly: element.classList.contains('ims-readonly'),
      locked: element.classList.contains('ims-readonly-locked'),
      disabled: element.hasAttribute('disabled'),
      provider: element.getAttribute('ims-readonly-provider'),
      inherited: element.getAttribute('ims-readonly-inherited'),
      lockProvider: element.hasAttribute('ims-readonly-lock-provider'),
    };
  }

  function update(change: () => void): void {
    change();
    fixture.detectChanges();
  }

  it('inherits the parent state when ims-readonly is null', () => {
    update(() => host.pageReadonly.set(true));

    expect(stateOf('inherit')).toEqual({
      readonly: true,
      locked: false,
      disabled: true,
      provider: null,
      inherited: 'true',
      lockProvider: false,
    });
  });

  it('keeps a false child readonly under a readonly parent until the override is enabled', () => {
    update(() => host.pageReadonly.set(true));

    expect(stateOf('exception')).toMatchObject({ readonly: true, inherited: 'true' });
    expect(stateOf('exception-button')).toMatchObject({ readonly: true, disabled: true });

    update(() => host.allowOverride.set(true));

    expect(stateOf('exception')).toMatchObject({ readonly: false, provider: 'false' });
    expect(stateOf('exception-button')).toMatchObject({ readonly: false, disabled: false });
  });

  it('locks the host and every descendant, ignoring the override', () => {
    update(() => {
      host.allowOverride.set(true);
      host.pageLocked.set(true);
    });

    expect(stateOf('page')).toEqual({
      readonly: true,
      locked: true,
      disabled: true,
      provider: 'true',
      inherited: null,
      lockProvider: true,
    });
    expect(stateOf('exception')).toEqual({
      readonly: true,
      locked: true,
      disabled: true,
      provider: null,
      inherited: 'true',
      lockProvider: false,
    });
    expect(stateOf('exception-button')).toMatchObject({ readonly: true, disabled: true });
    expect(stateOf('nested-input')).toMatchObject({
      readonly: true,
      locked: true,
      inherited: 'true',
    });
  });

  it('marks only the outermost locked host as the lock provider', () => {
    update(() => {
      host.pageLocked.set(true);
      host.nestedLocked.set(true);
    });

    expect(stateOf('page').lockProvider).toBe(true);
    expect(stateOf('nested-lock')).toMatchObject({
      locked: true,
      inherited: 'true',
      lockProvider: false,
    });

    update(() => host.pageLocked.set(false));

    expect(stateOf('page')).toMatchObject({ locked: false, lockProvider: false });
    expect(stateOf('nested-lock')).toMatchObject({
      locked: true,
      provider: 'true',
      lockProvider: true,
    });
  });

  it('restores the previous rules when the lock turns off', () => {
    update(() => {
      host.pageReadonly.set(true);
      host.allowOverride.set(true);
      host.pageLocked.set(true);
    });

    expect(stateOf('exception').readonly).toBe(true);
    expect(stateOf('nested-input').readonly).toBe(true);

    update(() => host.pageLocked.set(false));

    expect(stateOf('page')).toMatchObject({ readonly: true, locked: false, provider: 'true' });
    expect(stateOf('exception')).toMatchObject({ readonly: false, locked: false });
    expect(stateOf('nested-input')).toMatchObject({ readonly: false, provider: 'false' });
  });

  it('locks with a bare ims-readonly-locked attribute and no ims-readonly', () => {
    expect(stateOf('standalone-lock')).toEqual({
      readonly: true,
      locked: true,
      disabled: true,
      provider: 'true',
      inherited: null,
      lockProvider: true,
    });
  });
});

describe('resolveImsReadonly', () => {
  const unlocked = { readonly: false, locked: false };
  const readonlyParent = { readonly: true, locked: false };
  const lockedParent = { readonly: true, locked: true };

  it.each([
    {
      rule: 'a locked parent wins over an override',
      parent: lockedParent,
      request: { readonly: false, overrideParent: true, locked: false },
      expected: { readonly: true, locked: true, inherited: true },
    },
    {
      rule: 'the host lock wins over its own false',
      parent: unlocked,
      request: { readonly: false, overrideParent: false, locked: true },
      expected: { readonly: true, locked: true, inherited: false },
    },
    {
      rule: 'null takes the parent state',
      parent: readonlyParent,
      request: { readonly: null, overrideParent: false, locked: false },
      expected: { readonly: true, locked: false, inherited: true },
    },
    {
      rule: 'false under a readonly parent stays readonly',
      parent: readonlyParent,
      request: { readonly: false, overrideParent: false, locked: false },
      expected: { readonly: true, locked: false, inherited: true },
    },
    {
      rule: 'the override lets false replace a readonly parent',
      parent: readonlyParent,
      request: { readonly: false, overrideParent: true, locked: false },
      expected: { readonly: false, locked: false, inherited: false },
    },
    {
      rule: 'true applies under an editable parent',
      parent: unlocked,
      request: { readonly: true, overrideParent: false, locked: false },
      expected: { readonly: true, locked: false, inherited: false },
    },
  ])('$rule', ({ parent, request, expected }) => {
    expect(resolveImsReadonly(parent, request)).toEqual(expected);
  });
});
