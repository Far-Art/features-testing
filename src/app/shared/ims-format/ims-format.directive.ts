import {
  DestroyRef,
  Directive,
  ElementRef,
  OnInit,
  Signal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { ImsPatternDirective } from '../ims-pattern.directive';
import {
  IMS_CURRENCY_DEFAULT,
  IMS_CURRENCY_FORMAT,
  type ImsFormatToken,
  formatNumeric,
  groupedToken,
} from './ims-format';

type ImsFormatElement = HTMLInputElement | HTMLTextAreaElement;

/** Shared by every field that appends nothing after the number. */
const NO_SUFFIX = signal('').asReadonly();

/**
 * The machinery both formatting directives are built from.
 *
 * The field shows a *formatted* value while it is at rest and the *raw* value while it is being
 * edited. Only the raw value ever reaches the form: neither swap dispatches an `input` event, so
 * a bound `ngModel` or `FormControl` never sees a separator or a currency symbol.
 */
@Directive({
  host: {
    '(focus)': 'onFocus()',
    '(input)': 'onInput()',
    '(blur)': 'onBlur()',
  },
})
export abstract class ImsFormatBase implements OnInit {
  /** The `#` token the display is built from. */
  protected abstract readonly token: Signal<string>;

  /** Text appended after the number, empty when there is none. */
  protected readonly suffix: Signal<string> = NO_SUFFIX;

  private readonly element = inject<ElementRef<ImsFormatElement>>(ElementRef).nativeElement;
  private readonly ngControl = inject(NgControl, { optional: true, self: true });
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The canonical text: what the control holds, and what the field shows while focused.
   *
   * It is written from exactly two places — the user's own typing, and a value the application
   * wrote through the value accessor — so it cannot drift away from the control.
   */
  private raw = '';

  constructor() {
    // A token or symbol that changes while the field sits at rest has to reach the display.
    effect(() => {
      this.token();
      this.suffix();
      this.showFormatted();
    });
  }

  ngOnInit(): void {
    // Seeds from the DOM, which covers a plain `value` attribute and a form that already wrote
    // its first value before this directive was initialised.
    this.raw = this.element.value;
    this.interceptWriteValue();
    this.showFormatted();
  }

  protected onFocus(): void {
    this.write(this.raw);
  }

  protected onInput(): void {
    // The field holds raw text while it is focused, so the value accessor's own `input` listener
    // already hands the control exactly what belongs in it.
    this.raw = this.element.value;
  }

  protected onBlur(): void {
    this.showFormatted();
  }

  /** Formats the raw value into the field, unless the user is editing it. */
  private showFormatted(): void {
    if (this.element.ownerDocument.activeElement === this.element) {
      return;
    }

    this.write(formatNumeric(this.raw, this.token(), this.suffix()));
  }

  /**
   * Writes the display text, and only when it actually changes. A field whose raw and formatted
   * text are identical is left untouched, so a sibling directive's selection or caret survives.
   */
  private write(text: string): void {
    if (this.element.value !== text) {
      this.element.value = text;
    }
  }

  /**
   * Follows values the application writes. The accessor puts the raw value in the DOM; this takes
   * it from there and formats over it, so the model stays the source of truth and the display
   * stays derived. The original is restored on destroy, in case the accessor outlives this.
   */
  private interceptWriteValue(): void {
    const valueAccessor = this.ngControl?.valueAccessor;
    const writeValue = valueAccessor?.writeValue;

    if (!valueAccessor || !writeValue) {
      return;
    }

    const formattingWriteValue = (value: unknown): void => {
      writeValue.call(valueAccessor, value);
      this.raw = this.element.value;
      this.showFormatted();
    };

    valueAccessor.writeValue = formattingWriteValue;
    this.destroyRef.onDestroy(() => {
      if (valueAccessor.writeValue === formattingWriteValue) {
        valueAccessor.writeValue = writeValue;
      }
    });
  }
}

/**
 * Shows a numeric field grouped, and hands it back raw the moment it is focused.
 *
 * The attribute on its own formats as `#,###` — thousands separators, and every decimal the value
 * carries left as it is. A value of its own names another shape, and a shape that names its
 * fraction rounds the display to it.
 *
 * An `imsPattern` on the same field already says how many decimals the number has, so the bare
 * attribute takes its shape from there rather than being told it twice: `decimal` beside it shows
 * `#,###.##`, `integer` shows `#,###`, and a pattern of your own — which need not describe a
 * number at all — leaves the default in place. A token written here outranks all of it.
 *
 * It restricts nothing — pair it with `imsPattern` for a field that must also refuse bad
 * keystrokes.
 *
 * ```html
 * <input imsFormat />
 * <input imsFormat="#,###.##" [(ngModel)]="amount" />
 * <input imsInput imsPattern="decimal" imsFormat [formControl]="premium" />
 * ```
 */
@Directive({
  selector: 'input[imsFormat], textarea[imsFormat]',
  standalone: true,
})
export class ImsFormatDirective extends ImsFormatBase {
  /**
   * The shape to show. Absent — the bare attribute — means the shape the guard beside it
   * describes, and `#,###` where there is no guard to ask.
   */
  readonly format = input<ImsFormatToken>('', { alias: 'imsFormat' });

  /** The guard on this same field, whose numeric shape the bare attribute is shown in. */
  private readonly pattern = inject(ImsPatternDirective, { self: true, optional: true });

  protected readonly token = computed(
    () => this.format() || groupedToken(this.pattern?.fractionDigits() ?? 0),
  );
}

/**
 * The same field, shown as money: `#,###.##` with a currency symbol appended.
 *
 * The symbol is the attribute's own value and defaults to `₪`. It is appended as plain text
 * rather than produced by `Intl`, which would wrap it in `U+200F` bidi marks — invisible
 * characters that would sit inside an editable field and travel with everything copied out of it.
 *
 * ```html
 * <input imsFormatCurrency />
 * <input imsFormatCurrency="$" [(ngModel)]="price" />
 * ```
 */
@Directive({
  selector: 'input[imsFormatCurrency], textarea[imsFormatCurrency]',
  standalone: true,
})
export class ImsFormatCurrencyDirective extends ImsFormatBase {
  /** The symbol to append. Absent — the bare attribute — means `₪`. */
  readonly symbol = input<string>('', { alias: 'imsFormatCurrency' });

  protected readonly token = signal(IMS_CURRENCY_FORMAT).asReadonly();

  protected override readonly suffix = computed(() => ` ${this.symbol() || IMS_CURRENCY_DEFAULT}`);
}
