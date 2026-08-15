import { DestroyRef, Directive, ElementRef, OnInit, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { ReadonlyDirective } from './shared/readonly.directive';

type ImsInputElement = HTMLInputElement | HTMLTextAreaElement;

/** Adds the shared input contract to native text fields. */
@Directive({
  selector: 'input[imsInput], textarea[imsInput]',
  standalone: true,
  host: {
    class: 'ims-input',
    '[class.ims-readonly]': 'readonlyMode()',
    '[disabled]': 'interactionDisabled',
    '(paste)': 'onPaste($event)',
  },
})
export class ImsInputDirective implements OnInit {
  private readonly element = inject<ElementRef<ImsInputElement>>(ElementRef).nativeElement;
  private readonly ngControl = inject(NgControl, { optional: true, self: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly readonlyMode = ReadonlyDirective.injectSignal();

  protected get interactionDisabled(): boolean {
    console.log('here')
    return this.readonlyMode() || this.ngControl?.disabled === true;
  }

  ngOnInit(): void {
    this.synchronizeValueAccessorDisabledState();
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

  private synchronizeValueAccessorDisabledState(): void {
    const valueAccessor = this.ngControl?.valueAccessor;
    const setDisabledState = valueAccessor?.setDisabledState;

    if (!valueAccessor || !setDisabledState) {
      return;
    }

    const synchronizedSetDisabledState = (isDisabled: boolean): void => {
      setDisabledState.call(valueAccessor, isDisabled || this.readonlyMode());
    };

    valueAccessor.setDisabledState = synchronizedSetDisabledState;
    this.destroyRef.onDestroy(() => {
      if (valueAccessor.setDisabledState === synchronizedSetDisabledState) {
        valueAccessor.setDisabledState = setDisabledState;
      }
    });
  }
}
