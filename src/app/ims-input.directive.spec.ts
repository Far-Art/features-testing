import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ImsInputDirective } from './ims-input.directive';
import { ReadonlyDirective } from './shared/readonly.directive';

@Component({
  imports: [ReactiveFormsModule, ImsInputDirective, ReadonlyDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section [ims-readonly]="readonlyState()">
      <input id="controlled-input" imsInput [formControl]="control" />
      <textarea id="plain-textarea" imsInput></textarea>
    </section>
  `,
})
class ImsInputTestHost {
  readonly control = new FormControl('', { nonNullable: true });
  readonly readonlyState = signal(false);
}

describe('ImsInputDirective', () => {
  let fixture: ComponentFixture<ImsInputTestHost>;
  let host: ImsInputTestHost;
  let input: HTMLInputElement;
  let textarea: HTMLTextAreaElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImsInputTestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(ImsInputTestHost);
    host = fixture.componentInstance;
    fixture.detectChanges();

    input = fixture.nativeElement.querySelector('#controlled-input');
    textarea = fixture.nativeElement.querySelector('#plain-textarea');
  });

  it('applies the shared input class to inputs and textareas', () => {
    expect(input.classList.contains('ims-input')).toBe(true);
    expect(textarea.classList.contains('ims-input')).toBe(true);
  });

  it('tracks reactive form control disable and enable changes', () => {
    expect(host.control.enabled).toBe(true);
    expect(input.disabled).toBe(false);

    host.control.disable();
    fixture.detectChanges();

    expect(host.control.disabled).toBe(true);
    expect(input.disabled).toBe(true);

    host.control.enable();
    fixture.detectChanges();

    expect(host.control.enabled).toBe(true);
    expect(input.disabled).toBe(false);
  });

  it('keeps the element disabled when the form control is enabled during readonly mode', () => {
    host.readonlyState.set(true);
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
    expect(input.classList.contains('ims-readonly')).toBe(true);
    expect(textarea.disabled).toBe(true);

    host.control.disable();
    fixture.detectChanges();
    host.control.enable();
    fixture.detectChanges();

    expect(host.control.enabled).toBe(true);
    expect(input.disabled).toBe(true);

    host.readonlyState.set(false);
    fixture.detectChanges();

    expect(input.disabled).toBe(false);
    expect(textarea.disabled).toBe(false);
  });

  it('preserves the form-disabled state when readonly mode is removed', () => {
    host.control.disable();
    host.readonlyState.set(true);
    fixture.detectChanges();

    host.readonlyState.set(false);
    fixture.detectChanges();

    expect(input.classList.contains('ims-readonly')).toBe(false);
    expect(host.control.disabled).toBe(true);
    expect(input.disabled).toBe(true);

    host.control.enable();
    fixture.detectChanges();

    expect(input.disabled).toBe(false);
  });
});
