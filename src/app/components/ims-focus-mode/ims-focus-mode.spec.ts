import { ApplicationRef, ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IMS_BUTTON_EDIT_ICON } from '../ims-button';
import { ImsInputDirective } from '../../ims-input.directive';
import { ReadonlyDirective } from '../../shared/readonly.directive';
import { ImsFocusMode } from './ims-focus-mode';

@Component({
  imports: [FormsModule, ImsFocusMode, ImsInputDirective, ReactiveFormsModule, ReadonlyDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ims-focus-mode label="Notes" [labels]="labels" [ims-readonly]="scopeReadonly">
      <textarea imsInput [formControl]="notes"></textarea>
    </ims-focus-mode>

    <ims-focus-mode label="Summary" [labels]="labels">
      <input imsInput type="text" [(ngModel)]="summary"/>
    </ims-focus-mode>

    <ims-focus-mode label="Locked" [labels]="labels">
      <input imsInput type="text" value="locked value" [ims-readonly]="true"/>
    </ims-focus-mode>

    <ims-focus-mode label="Capped" [labels]="labels">
      <input imsInput type="text" maxlength="12" [formControl]="capped"/>
    </ims-focus-mode>
  `,
})
class FocusModeHost {
  readonly labels = {
    apply: 'Apply',
    cancel: 'Cancel',
    characters: 'characters',
    required: 'Required',
  };
  readonly notes = new FormControl('original value', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6), Validators.maxLength(40)],
  });
  /** Declares both a native limit and a looser validator, to pin precedence. */
  readonly capped = new FormControl('abc', {
    nonNullable: true,
    validators: [Validators.maxLength(99)],
  });
  summary = 'first';
  scopeReadonly: boolean | null = null;
}

/**
 * Runs change detection across the app, including detached overlay views.
 *
 * The macrotask wait matters: native disabled and readonly state reaches the
 * component through a `MutationObserver`, whose callbacks are delivered on the
 * microtask queue. Rendering before that drain would read stale state.
 */
async function settle(fixture: ComponentFixture<FocusModeHost>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  TestBed.inject(ApplicationRef).tick();
  await fixture.whenStable();
}

/** The fixture root, typed so DOM queries stay checked. */
function root(fixture: ComponentFixture<FocusModeHost>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function triggers(fixture: ComponentFixture<FocusModeHost>): HTMLButtonElement[] {
  return Array.from(
    root(fixture).querySelectorAll<HTMLButtonElement>('[data-ims-focus-mode-trigger]'),
  );
}

function triggerIcon(button: HTMLButtonElement): string {
  return button.querySelector('.ims-button__symbol')?.textContent?.trim() ?? '';
}

function stage(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.ims-focus-mode__stage');
}

function stageField(): HTMLTextAreaElement | HTMLInputElement | null {
  return document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
    '.ims-focus-mode__stage textarea, .ims-focus-mode__stage input',
  );
}

function actionLabels(): string[] {
  return Array.from(document.querySelectorAll('.ims-dialog-actions button')).map(
    (button) => button.textContent?.trim() ?? '',
  );
}

function actionButton(label: string): HTMLButtonElement {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.ims-dialog-actions button'),
  ).find((candidate) => candidate.textContent?.trim() === label);

  if (!button) {
    throw new Error(`Dialog action "${label}" was not rendered.`);
  }

  return button;
}

function clickAction(label: string): void {
  actionButton(label).click();
}

function characterCount(): string {
  return document.querySelector('.ims-focus-mode__count')?.textContent?.trim() ?? '';
}

/** Types into the projected field the way a user would. */
function typeInto(field: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ImsFocusMode', () => {
  let fixture: ComponentFixture<FocusModeHost>;
  let host: FocusModeHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FocusModeHost] }).compileComponents();
    fixture = TestBed.createComponent(FocusModeHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(async () => {
    if (stage()) {
      clickAction('Cancel');
      await settle(fixture);
    }

    fixture.destroy();
  });

  async function openNotes(): Promise<void> {
    triggers(fixture)[0].click();
    await settle(fixture);
  }

  it('projects the caller\'s own element rather than a copy', async () => {
    const original = root(fixture).querySelector('textarea');

    await openNotes();

    expect(stageField()).toBe(original);
  });

  it('restores the element to its original parent after closing', async () => {
    const focusModeHost = root(fixture).querySelector('ims-focus-mode')!;
    const original = root(fixture).querySelector('textarea')!;

    await openNotes();
    expect(focusModeHost.contains(original)).toBe(false);

    clickAction('Cancel');
    await settle(fixture);

    expect(focusModeHost.contains(original)).toBe(true);
  });

  it('flips the trigger between the edit affordance and zoom-in with control state', async () => {
    // The editable trigger is the shared `ims-button-edit` preset, so its glyph
    // comes from there rather than being chosen by this component.
    expect(triggerIcon(triggers(fixture)[0])).toBe(IMS_BUTTON_EDIT_ICON);
    expect(triggers(fixture)[0].classList.contains('ims-button--edit')).toBe(true);

    host.notes.disable();
    await settle(fixture);
    expect(triggerIcon(triggers(fixture)[0])).toBe('zoom_in');
    expect(triggers(fixture)[0].classList.contains('ims-button--edit')).toBe(false);

    host.notes.enable();
    await settle(fixture);
    expect(triggerIcon(triggers(fixture)[0])).toBe(IMS_BUTTON_EDIT_ICON);
  });

  it('keeps the trigger usable inside a readonly scope', async () => {
    host.scopeReadonly = true;
    await settle(fixture);

    const trigger = triggers(fixture)[0];
    expect(triggerIcon(trigger)).toBe('zoom_in');
    expect(trigger.disabled).toBe(false);

    trigger.click();
    await settle(fixture);

    expect(stage()).not.toBeNull();
    expect(actionLabels()).toEqual(['Cancel']);
  });

  it('buffers edits so the control is untouched while the dialog is open', async () => {
    await openNotes();

    typeInto(stageField()!, 'edited inside the dialog');
    await settle(fixture);

    expect(host.notes.value).toBe('original value');
    expect(host.notes.pristine).toBe(true);
    expect(host.notes.touched).toBe(false);
  });

  it('commits the buffered draft on apply', async () => {
    await openNotes();
    typeInto(stageField()!, 'edited inside the dialog');
    await settle(fixture);

    clickAction('Apply');
    await settle(fixture);

    expect(host.notes.value).toBe('edited inside the dialog');
    expect(host.notes.dirty).toBe(true);
    expect(host.notes.touched).toBe(true);
  });

  it('discards the buffered draft on cancel', async () => {
    await openNotes();
    typeInto(stageField()!, 'edited inside the dialog');
    await settle(fixture);

    clickAction('Cancel');
    await settle(fixture);

    expect(host.notes.value).toBe('original value');
    expect(host.notes.pristine).toBe(true);
    expect(host.notes.touched).toBe(false);
    expect(root(fixture).querySelector('textarea')?.value).toBe('original value');
  });

  it('keeps the same control and its validators across an apply cycle', async () => {
    const controlBefore = host.notes;

    await openNotes();
    typeInto(stageField()!, 'a comfortably valid value');
    await settle(fixture);
    clickAction('Apply');
    await settle(fixture);

    expect(host.notes).toBe(controlBefore);
    expect(host.notes.value).toBe('a comfortably valid value');
    expect(host.notes.valid).toBe(true);
  });

  it('counts the buffered characters against the control\'s limit', async () => {
    await openNotes();
    expect(characterCount()).toBe('14 / 40');

    typeInto(stageField()!, 'four');
    await settle(fixture);
    expect(characterCount()).toBe('4 / 40');
  });

  it('counts without a limit when the field enforces none', async () => {
    // The template-driven field has no validators at all.
    triggers(fixture)[1].click();
    await settle(fixture);

    expect(characterCount()).toBe('5 characters');
  });

  it('disables apply while the buffered value fails validation', async () => {
    await openNotes();
    expect(actionButton('Apply').disabled).toBe(false);

    // Under `minLength(6)`.
    typeInto(stageField()!, 'tiny');
    await settle(fixture);
    expect(actionButton('Apply').disabled).toBe(true);

    // Over `maxLength(40)`.
    typeInto(stageField()!, 'x'.repeat(41));
    await settle(fixture);
    expect(actionButton('Apply').disabled).toBe(true);
    expect(
      document.querySelector('.ims-focus-mode__count')?.classList.contains(
        'ims-focus-mode__count--over',
      ),
    ).toBe(true);

    typeInto(stageField()!, 'back to a valid value');
    await settle(fixture);
    expect(actionButton('Apply').disabled).toBe(false);
  });

  it('leaves the control untouched when an invalid draft is applied anyway', async () => {
    await openNotes();
    typeInto(stageField()!, 'tiny');
    await settle(fixture);

    // Behind the disabled action: closing here would report success while
    // discarding the edit.
    actionButton('Apply').click();
    await settle(fixture);

    expect(stage()).not.toBeNull();
    expect(host.notes.value).toBe('original value');
  });

  it('hides apply and stays open when the control is disabled mid-dialog', async () => {
    await openNotes();
    expect(actionLabels()).toEqual(['Cancel', 'Apply']);

    host.notes.disable();
    await settle(fixture);

    expect(stage()).not.toBeNull();
    expect(actionLabels()).toEqual(['Cancel']);
  });

  it('still discards the draft when the control was disabled mid-dialog', async () => {
    await openNotes();
    typeInto(stageField()!, 'edited inside the dialog');
    await settle(fixture);

    // `disable()` emits a value change without changing the value. The buffer
    // must not mistake that for an external write and adopt the draft.
    host.notes.disable();
    await settle(fixture);
    clickAction('Cancel');
    await settle(fixture);

    host.notes.enable();
    await settle(fixture);

    expect(host.notes.value).toBe('original value');
    expect(root(fixture).querySelector('textarea')?.value).toBe('original value');
  });

  it('lets an external write while open win over the buffered draft', async () => {
    await openNotes();
    typeInto(stageField()!, 'edited inside the dialog');
    await settle(fixture);

    host.notes.setValue('written from outside');
    await settle(fixture);

    expect(stageField()?.value).toBe('written from outside');

    clickAction('Apply');
    await settle(fixture);

    expect(host.notes.value).toBe('written from outside');
  });

  it('stands in for the field with a clone of it', async () => {
    const original = root(fixture).querySelector('textarea')!;
    const classesBefore = original.className;

    await openNotes();

    const placeholder = root(fixture).querySelector<HTMLTextAreaElement>(
      '[data-ims-focus-mode-placeholder]',
    )!;

    // Same kind of element carrying the same classes, which is what makes it
    // lay out identically without anything being measured.
    expect(placeholder.tagName).toBe(original.tagName);
    expect(placeholder).not.toBe(original);
    for (const className of classesBefore.split(' ').filter(Boolean)) {
      expect(placeholder.classList.contains(className)).toBe(true);
    }
  });

  it('keeps the stand-in inert and out of the accessibility tree', async () => {
    await openNotes();

    const placeholder = root(fixture).querySelector<HTMLTextAreaElement>(
      '[data-ims-focus-mode-placeholder]',
    )!;

    expect(placeholder.disabled).toBe(true);
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
    // A clone carries the original's identity attributes; duplicating them
    // would break the label association `ims-form-field` resolves by id.
    expect(placeholder.hasAttribute('id')).toBe(false);
    expect(placeholder.hasAttribute('name')).toBe(false);
  });

  it('shows the buffered draft in the stand-in and removes it on close', async () => {
    await openNotes();
    typeInto(stageField()!, 'edited inside the dialog');
    await settle(fixture);

    expect(
      root(fixture).querySelector<HTMLTextAreaElement>('[data-ims-focus-mode-placeholder]')?.value,
    ).toBe('edited inside the dialog');

    clickAction('Cancel');
    await settle(fixture);

    expect(root(fixture).querySelector('[data-ims-focus-mode-placeholder]')).toBeNull();
  });

  it('restores the field to the stand-in\'s position on close', async () => {
    const focusModeHost = root(fixture).querySelector('ims-focus-mode')!;
    const original = root(fixture).querySelector('textarea')!;
    const siblingsBefore = [...focusModeHost.children].map((child) => child.tagName);

    await openNotes();
    clickAction('Cancel');
    await settle(fixture);

    expect([...focusModeHost.children].map((child) => child.tagName)).toEqual(siblingsBefore);
    expect(focusModeHost.firstElementChild).toBe(original);
  });

  it('reads a readonly directive placed on the field itself', async () => {
    // The directive is on the field, which is a *child* of the wrapper, so
    // injection cannot carry the state upward the way an ancestor scope does.
    // Focus mode sees it through the `disabled` attribute the directive sets,
    // which is why the native-state observer exists alongside the injected one.
    const trigger = triggers(fixture)[2];

    expect(triggerIcon(trigger)).toBe('zoom_in');
    expect(trigger.disabled).toBe(false);

    trigger.click();
    await settle(fixture);

    expect(stage()).not.toBeNull();
    expect(actionLabels()).toEqual(['Cancel']);
  });

  it('hands the length limit to the browser while the field is projected', async () => {
    const original = root(fixture).querySelector('textarea')!;
    expect(original.hasAttribute('maxlength')).toBe(false);

    await openNotes();
    // Enforcement itself is the platform's; what this owns is handing it over.
    expect(stageField()?.getAttribute('maxlength')).toBe('40');

    clickAction('Cancel');
    await settle(fixture);

    expect(original.hasAttribute('maxlength')).toBe(false);
  });

  it('leaves a limit the field declares itself in charge', async () => {
    const capped = root(fixture).querySelectorAll('input')[2];

    triggers(fixture)[3].click();
    await settle(fixture);

    // The element's own limit is the one the browser enforces, so it wins over
    // the looser validator and the counter reports it.
    expect(stageField()?.getAttribute('maxlength')).toBe('12');
    expect(characterCount()).toBe('3 / 12');

    clickAction('Cancel');
    await settle(fixture);

    expect(capped.getAttribute('maxlength')).toBe('12');
  });

  it('notes a required field and calls it out once unmet', async () => {
    await openNotes();

    const note = () => document.querySelector('.ims-focus-mode__required');
    expect(note()?.textContent?.trim()).toBe('Required');
    expect(note()?.classList.contains('ims-focus-mode__required--unmet')).toBe(false);

    typeInto(stageField()!, '');
    await settle(fixture);

    expect(note()?.classList.contains('ims-focus-mode__required--unmet')).toBe(true);
    expect(actionButton('Apply').disabled).toBe(true);
  });

  it('omits the required note when the field does not demand a value', async () => {
    triggers(fixture)[1].click();
    await settle(fixture);

    expect(document.querySelector('.ims-focus-mode__required')).toBeNull();
  });

  it('commits through the view-to-model pipeline for template-driven fields', async () => {
    triggers(fixture)[1].click();
    await settle(fixture);

    typeInto(stageField()!, 'second');
    await settle(fixture);
    expect(host.summary).toBe('first');

    clickAction('Apply');
    await settle(fixture);

    expect(host.summary).toBe('second');
  });
});
