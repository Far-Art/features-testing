import { computed, DestroyRef, Directive, effect, ElementRef, inject, signal, untracked } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ReadonlyDirective } from './shared/readonly.directive';

type ImsInputElement = HTMLInputElement | HTMLTextAreaElement;

/** Adds the shared input contract to native text fields. */
@Directive({
  selector: 'input[imsInput], textarea[imsInput]',
  standalone: true,
  host: {
    class: 'ims-input',
    '[class.ims-readonly]': 'readonlyMode()',
    '(paste)': 'onPaste($event)',
  },
})
export class ImsInputDirective {
  private readonly element = inject<ElementRef<ImsInputElement>>(ElementRef).nativeElement;
  private readonly valueAccessors = inject(NG_VALUE_ACCESSOR, { optional: true, self: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly readonlyMode = ReadonlyDirective.injectSignal();

  /**
   * Disabled state last requested by a bound form control. Written through
   * `untracked()`: a control can be disabled from inside an effect, and
   * Angular 18 rejects a tracked signal write there.
   */
  private readonly formDisabled = signal(false);

  /** True while the form control or readonly asks for it. */
  private readonly shouldDisable = computed(() => this.formDisabled() || this.readonlyMode());

  constructor() {
    this.synchronizeValueAccessorDisabledState();

    // An `ims-readonly` on this same element binds `disabled` too. Sharing
    // this state makes both bindings agree, whichever of them runs last.
    ReadonlyDirective.shareHostDisabled(this.shouldDisable);

    effect(() => {
      const disabled = this.shouldDisable();
      if (this.element.disabled !== disabled) {
        this.element.disabled = disabled;
      }
    });
  }

  protected onPaste(event: Event): void {
    if (!(event instanceof ClipboardEvent)) {
      return;
    }

    const clipboardData = event.clipboardData;

    if (!clipboardData) {
      return;
    }

    const pastedText = clipboardData.getData('text/plain');
    const trimmedText = pastedText.trim();

    if (trimmedText === pastedText) {
      return;
    }

    const selectionStart = this.element.selectionStart;
    const selectionEnd = this.element.selectionEnd;

    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    event.preventDefault();

    const insertedText = this.limitToAvailableLength(trimmedText, selectionStart, selectionEnd);
    this.element.setRangeText(insertedText, selectionStart, selectionEnd, 'end');
    this.element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        data: insertedText,
        dataTransfer: clipboardData,
        inputType: 'insertFromPaste',
      }),
    );
  }

  private limitToAvailableLength(text: string, selectionStart: number, selectionEnd: number): string {
    const maximumLength = this.element.maxLength;

    if (maximumLength < 0) {
      return text;
    }

    const retainedLength = this.element.value.length - (selectionEnd - selectionStart);
    return text.slice(0, Math.max(0, maximumLength - retainedLength));
  }

  /**
   * Routes a bound form control's disabled state through this directive,
   * so enabling the control does not enable a readonly field.
   *
   * Wraps the value accessors on this element rather than the form
   * directive's `valueAccessor`, which newer Angular versions only pick in
   * the form directive's first `ngOnChanges` — the same call that first sets
   * the disabled state. The accessors exist by the time this constructor
   * runs, so the wrapper sees that call whatever order the directives run in.
   */
  private synchronizeValueAccessorDisabledState(): void {
    for (const valueAccessor of this.valueAccessors ?? []) {
      const setDisabledState = valueAccessor.setDisabledState;
      if (!setDisabledState) continue;

      const synchronizedSetDisabledState = (isDisabled: boolean): void => {
        untracked(() => this.formDisabled.set(isDisabled));
        setDisabledState.call(valueAccessor, untracked(() => this.shouldDisable()));
      };

      valueAccessor.setDisabledState = synchronizedSetDisabledState;
      this.destroyRef.onDestroy(() => {
        if (valueAccessor.setDisabledState === synchronizedSetDisabledState) {
          valueAccessor.setDisabledState = setDisabledState;
        }
      });
    }
  }
}
