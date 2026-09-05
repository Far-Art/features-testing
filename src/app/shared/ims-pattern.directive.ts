import { Directive, ElementRef, computed, inject, input } from '@angular/core';

type ImsPatternElement = HTMLInputElement | HTMLTextAreaElement;

/** Shapes common enough to name instead of spelling out. */
export type ImsPatternPreset = 'integer' | 'decimal' | 'signedInteger' | 'signedDecimal';

/** Accepted by `imsPattern`: a preset name, a regular expression, or its source text. */
export type ImsPatternInput = ImsPatternPreset | RegExp | (string & {});

/** Shared sources, so a change to a shape lands on its signed form too. */
const INTEGER_SOURCE = '0|[1-9][0-9]*';
const DECIMAL_SOURCE = `(${INTEGER_SOURCE})?(\\.[0-9]{0,2})?`;

/**
 * A signed shape is its unsigned source behind an optional minus, and the whole of it is
 * optional: a lone `-` has to be a legal value, or the first keystroke of a negative number
 * would be refused before a digit could follow it.
 */
const signed = (source: string): RegExp => new RegExp(`-?(?:${source})?`);

/**
 * The compiled presets. Exported so a call site can bind one explicitly
 * (`[imsPattern]="IMS_PATTERN.decimal"`) instead of naming it as a string.
 *
 * Every preset accepts partial input: a decimal allows a trailing dot while the fraction is
 * still being typed, a signed form allows a lone minus, and none allows a leading zero.
 */
export const IMS_PATTERN: Record<ImsPatternPreset, RegExp> = {
  integer: new RegExp(INTEGER_SOURCE),
  decimal: new RegExp(DECIMAL_SOURCE),
  signedInteger: signed(INTEGER_SOURCE),
  signedDecimal: signed(DECIMAL_SOURCE),
};

/** A value that reads as zero, and is replaced whole rather than typed around. */
const ZERO_VALUE = /^-?0(\.0*)?$/;

/**
 * Rewrites a prospective value into the form the field wants.
 *
 * @param value the whole value the field would hold if the change were applied — the current
 *              value with the selection replaced by the inserted text, not the keystroke.
 * @returns the value to write instead; return `value` unchanged to correct nothing.
 *
 * A corrector must be pure and idempotent: its result is written back through an `input`
 * event, which re-enters the same pipeline. The result is still tested against the pattern,
 * so a correction cannot smuggle in a value the guard would refuse.
 */
export type ImsPatternCorrector = (value: string) => string;

/**
 * Corrects the two numeric shapes worth fixing instead of refusing: a zero the next digit is
 * meant to replace (`01` reads as `1`), and a fraction typed without its leading zero
 * (`.5` reads as `0.5`). The strip is greedy so a pasted `007` lands as `7`.
 *
 * A minus is set aside first, so a signed value is corrected by the same two rules.
 */
const correctNumeric: ImsPatternCorrector = (value) => {
  const sign = value.startsWith('-') ? '-' : '';
  const magnitude = value.slice(sign.length);

  return magnitude.startsWith('.')
    ? `${sign}0${magnitude}`
    : sign + magnitude.replace(/^0+(?=[0-9])/, '');
};

/** Every preset is numeric, so all of them correct a leading zero the same way. */
const PRESET_CORRECT: Record<ImsPatternPreset, ImsPatternCorrector> = {
  integer: correctNumeric,
  decimal: correctNumeric,
  signedInteger: correctNumeric,
  signedDecimal: correctNumeric,
};

/** Index of the first character a correction changed, or the end of the shorter value. */
const firstDifference = (value: string, corrected: string): number => {
  const shared = Math.min(value.length, corrected.length);
  let index = 0;

  while (index < shared && value[index] === corrected[index]) {
    index++;
  }

  return index;
};

/**
 * Where the caret belongs once a correction rewrote part of the value: shifted by the length
 * the correction added or removed, but only when it changed something in front of the caret.
 */
const correctedCaret = (value: string, corrected: string, caret: number): number => {
  if (firstDifference(value, corrected) >= caret) {
    return Math.min(caret, corrected.length);
  }

  return Math.min(Math.max(caret + corrected.length - value.length, 0), corrected.length);
};

const PRESET_NAMES = Object.keys(IMS_PATTERN) as readonly ImsPatternPreset[];

/**
 * The preset a pattern stands for, by name or by the exported instance itself, so
 * `imsPattern="decimal"` and `[imsPattern]="IMS_PATTERN.decimal"` behave identically.
 */
const presetOf = (pattern: ImsPatternInput): ImsPatternPreset | null =>
  PRESET_NAMES.find((name) => pattern === name || pattern === IMS_PATTERN[name]) ?? null;

/**
 * Compiles the accepted pattern and anchors it to the whole value, matching the
 * semantics of the native `pattern` attribute.
 */
const toRegExp = (pattern: ImsPatternInput): RegExp => {
  const preset = presetOf(pattern);
  const resolved = preset === null ? pattern : IMS_PATTERN[preset];
  const source = resolved instanceof RegExp ? resolved.source : resolved;
  // `g` and `y` make `test` stateful, which would reject every other keystroke.
  const flags = resolved instanceof RegExp ? resolved.flags.replace(/[gy]/g, '') : '';

  return new RegExp(`^(?:${source})$`, flags);
};

/** Text a change would insert, or `null` when it removes, reorders or replays characters. */
const insertedText = (event: InputEvent): string | null => {
  if (!event.inputType.startsWith('insert')) {
    return null;
  }

  if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
    return '\n';
  }

  return event.data ?? event.dataTransfer?.getData('text/plain') ?? null;
};

/**
 * Restricts typing, pasting and dropping into a text field to values that match a pattern.
 *
 * The pattern is a preset name, a string or a `RegExp`, and is tested against the whole
 * prospective value, so it must also accept partial input: `\d{0,3}` allows typing three
 * digits one by one, while `\d{3}` would reject the first two keystrokes.
 *
 * Removing characters is always allowed, so a value that arrives from outside the field can
 * still be corrected.
 *
 * A preset additionally selects a value that reads as zero when the field is focused, and
 * corrects the two numeric shapes worth correcting rather than refusing: `0` followed by a
 * digit loses the zero, and a leading `.` gains one.
 *
 * Correction applies to text being inserted, whether typed or pasted. Deleting is never
 * corrected — a leading zero has to be removable — and neither is a value the application
 * itself wrote. `imsPatternCorrect` replaces the correction with one of your own, or switches
 * it off entirely.
 *
 * ```html
 * <input imsPattern="decimal" />
 * <input [imsPattern]="IMS_PATTERN.integer" />
 * <textarea [imsPattern]="/[a-z ]+/i"></textarea>
 * ```
 */
@Directive({
  selector: 'input[imsPattern], textarea[imsPattern]',
  standalone: true,
  host: {
    '(beforeinput)': 'onBeforeInput($event)',
    '(input)': 'onInput($event)',
    '(compositionstart)': 'onCompositionStart()',
    '(compositionend)': 'onCompositionEnd()',
    '(focus)': 'onFocus()',
    '(mousedown)': 'onMouseDown()',
    '(mouseup)': 'onMouseUp($event)',
  },
})
export class ImsPatternDirective {
  private readonly element = inject<ElementRef<ImsPatternElement>>(ElementRef).nativeElement;

  /** What the value must match: a preset name, a `RegExp`, or a regex source string. */
  readonly pattern = input.required<ImsPatternInput>({ alias: 'imsPattern' });

  private readonly regex = computed(() => toRegExp(this.pattern()));

  /**
   * Replaces the correction a preset applies to inserted text. A function corrects with your
   * own rule, which is also the only way a custom pattern corrects at all; `false` guards
   * without ever rewriting.
   */
  readonly correction = input<ImsPatternCorrector | false | undefined>(undefined, {
    alias: 'imsPatternCorrect',
  });

  /** The correction in force: an explicit one, the preset's own, or none at all. */
  private readonly corrector = computed<ImsPatternCorrector | null>(() => {
    const correction = this.correction();

    if (correction !== undefined) {
      return correction === false ? null : correction;
    }

    const preset = presetOf(this.pattern());

    return preset === null ? null : PRESET_CORRECT[preset];
  });

  /** Last value the pattern accepted, restored when a change cannot be cancelled up front. */
  private acceptedValue = this.element.value;
  private acceptedCaret: number | null = null;
  private composing = false;
  private pressing = false;
  private keepSelection = false;

  protected onBeforeInput(event: Event): void {
    if (this.composing) {
      return;
    }

    this.rememberAcceptedState();

    if (!(event instanceof InputEvent)) {
      return;
    }

    const insertion = insertedText(event);

    // Deletions and uncancellable changes, such as IME text, are settled on `input` instead.
    if (insertion === null || !event.cancelable) {
      return;
    }

    const { value, selectionStart, selectionEnd } = this.element;
    const start = selectionStart ?? value.length;
    const end = selectionEnd ?? start;
    const projected = value.slice(0, start) + insertion + value.slice(end);
    const corrector = this.corrector();
    const corrected = corrector === null ? projected : corrector(projected);

    if (!this.accepts(corrected)) {
      event.preventDefault();
      return;
    }

    if (corrected !== projected) {
      // The browser will not produce the corrected value, so write it instead of the keystroke.
      event.preventDefault();
      this.write(corrected, correctedCaret(projected, corrected, start + insertion.length));
    }
  }

  protected onInput(event: Event): void {
    if (this.composing) {
      return;
    }

    const inputType = event instanceof InputEvent ? event.inputType : '';
    this.settle(inputType.startsWith('insert'));
  }

  protected onCompositionStart(): void {
    this.composing = true;
  }

  protected onCompositionEnd(): void {
    this.composing = false;
    this.settle(true);
  }

  protected onFocus(): void {
    this.rememberAcceptedState();

    if (presetOf(this.pattern()) === null || !ZERO_VALUE.test(this.element.value)) {
      return;
    }

    this.element.select();
    // A pointer press collapses the fresh selection on mouseup unless that is prevented.
    this.keepSelection = this.pressing;
  }

  protected onMouseDown(): void {
    this.pressing = true;
  }

  protected onMouseUp(event: Event): void {
    this.pressing = false;

    if (this.keepSelection) {
      this.keepSelection = false;
      event.preventDefault();
    }
  }

  /** Snapshots the state a rejected change is rolled back to. */
  private rememberAcceptedState(): void {
    this.acceptedValue = this.element.value;
    this.acceptedCaret = this.element.selectionStart;
  }

  /** Writes a value the browser would not have produced, and tells listeners about it. */
  private write(value: string, caret: number): void {
    this.element.value = value;

    if (this.element.selectionStart !== null) {
      const position = Math.min(Math.max(caret, 0), value.length);
      this.element.setSelectionRange(position, position);
    }

    this.element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        data: value,
        inputType: 'insertReplacementText',
      }),
    );
  }

  /**
   * Keeps the current value, or rolls back an insertion that could not be prevented up front.
   *
   * Only insertions are rolled back. A deletion, an undo or a value set from outside the field
   * becomes the new accepted state even when it does not match, so the field never traps a value
   * the user cannot edit their way out of.
   */
  private settle(revertable: boolean): void {
    const { value, selectionStart } = this.element;
    // Only an insertion is corrected: a deletion that leaves a leading zero stays as typed,
    // otherwise backspacing the zero out of `0.5` would put it straight back.
    const corrector = revertable ? this.corrector() : null;
    const corrected = corrector === null ? value : corrector(value);

    if (corrected !== value && this.accepts(corrected)) {
      const caret = selectionStart ?? value.length;
      this.write(corrected, correctedCaret(value, corrected, caret));
      return;
    }

    if (!revertable || this.accepts(value) || value === this.acceptedValue) {
      this.rememberAcceptedState();
      return;
    }

    this.write(this.acceptedValue, this.acceptedCaret ?? this.acceptedValue.length);
  }

  private accepts(value: string): boolean {
    return value === '' || this.regex().test(value);
  }
}
