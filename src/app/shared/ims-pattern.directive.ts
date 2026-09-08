import { Directive, ElementRef, computed, inject, input, numberAttribute } from '@angular/core';
import { IMS_ERROR_POPOVER_TARGET } from '../components/ims-error-popover';

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

/**
 * Why a change was refused. A preset diagnoses its own refusals; `custom` is what a message
 * supplied at the call site reports, because it needs no diagnosis.
 *
 * The reason travels with the message, so an application can word all of them in its own
 * language from one place — the `imsPattern` entry of the error-popover mapper — instead of
 * spelling out a sentence on every field.
 */
export type ImsPatternReason =
  | 'wholeNumber'
  | 'number'
  | 'sign'
  | 'signPlacement'
  | 'decimalPoint'
  | 'decimals'
  | 'min'
  | 'max'
  | 'custom';

/** The two bounds a preset can carry, reported as reasons of their own. */
export type ImsPatternBound = 'min' | 'max';

/** A refusal read from the shape of what was typed, rather than from a bound or a call site. */
type ImsPatternShapeReason = Exclude<ImsPatternReason, ImsPatternBound | 'custom'>;

/** The sentence each diagnosed reason stands for. */
const REASON_MESSAGE: Record<ImsPatternShapeReason, string> = {
  wholeNumber: 'Only whole numbers are allowed.',
  number: 'Only numbers are allowed.',
  sign: 'A negative value is not allowed.',
  signPlacement: 'A minus sign is only allowed at the start.',
  decimalPoint: 'Only one decimal point is allowed.',
  decimals: 'Up to two decimals are allowed.',
};

/** A bound's sentence names the limit it stands for, so it is written rather than looked up. */
const BOUND_MESSAGE: Record<ImsPatternBound, (bound: number) => string> = {
  min: (bound) => `The value may not be less than ${bound}.`,
  max: (bound) => `The value may not be greater than ${bound}.`,
};

/** What a refusal carries into an error popover: the sentence, and the reason behind it. */
export interface ImsPatternRefusal {
  readonly message: string;
  readonly reason: ImsPatternReason;
  /** The limit that was passed, on a `min` or `max` refusal, and nothing on any other. */
  readonly bound?: number;
}

/** A bound a value has passed, carried from the test that found it to the sentence about it. */
interface ImsPatternExcess {
  readonly reason: ImsPatternBound;
  readonly bound: number;
}

/**
 * Reads a preset's refusal from the text that was turned down, so a letter and a third
 * decimal are not told the same thing.
 *
 * The insertion is what the change would have added, and the shape of the preset says what
 * that character could have been. Text that is not part of a number at all — and a dot where
 * the shape has no fraction — is a question of what the field holds, not of any one rule.
 * Everything else is a rule the value has already used up: its sign, its decimal point, or
 * its two fraction digits.
 */
const presetReason = (preset: ImsPatternPreset, insertion: string): ImsPatternShapeReason => {
  const fractional = preset === 'decimal' || preset === 'signedDecimal';
  const signed = preset === 'signedInteger' || preset === 'signedDecimal';
  const shape = fractional ? 'number' : 'wholeNumber';

  if (insertion === '' || /[^0-9.-]/.test(insertion)) {
    return shape;
  }

  if (insertion.includes('.') && !fractional) {
    return shape;
  }

  if (insertion.includes('-')) {
    return signed ? 'signPlacement' : 'sign';
  }

  if (insertion.includes('.')) {
    return 'decimalPoint';
  }

  return fractional ? 'decimals' : shape;
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
 * The text one value gained over another, read as the run between their common prefix and
 * their common suffix. It recovers the insertion behind a change that could not be cancelled
 * up front, which is the only place the inserted text is not already at hand.
 */
const insertedBetween = (previous: string, next: string): string => {
  const start = firstDifference(previous, next);
  let end = 0;

  while (
    end < next.length - start &&
    end < previous.length - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }

  return next.slice(start, next.length - end);
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

/**
 * Text a change would insert, or `null` when it removes, reorders or replays characters.
 *
 * A line break is inserted text only where the field can hold one. A single-line field reports
 * the same `insertLineBreak` for Enter without inserting anything: there the event is only the
 * cancellable hook in front of implicit form submission, so refusing it would swallow the
 * submit rather than a character.
 */
const insertedText = (event: InputEvent, multiline: boolean): string | null => {
  if (!event.inputType.startsWith('insert')) {
    return null;
  }

  if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
    return multiline ? '\n' : null;
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
 * `imsPatternMin` and `imsPatternMax` bound the number a preset describes. Inserting moves a
 * number away from zero, so a keystroke is refused only on the far side of a bound: a value that
 * has passed the maximum is refused, while one still short of the minimum is on its way there and
 * is let through. Leaving the field holds it to the whole range instead and announces a value
 * still outside it, which is a message and not a verdict — the control is never marked invalid.
 * A minimum of zero or more also takes the sign away, because no negative value could be legal
 * under it. Neither bound applies to a custom pattern, which need not describe a number at all.
 *
 * A preset field is also laid out for the number it holds: `direction: ltr` and
 * `text-align: end` are bound on the host, so digits keep their own reading order and their own
 * edge inside an RTL form. A custom pattern is left exactly as the page styled it.
 *
 * A refusal is silent by default, because a cancelled keystroke leaves nothing on screen to
 * explain it. An `ims-error-popover` on the same element is told about every refusal and says
 * why, once: the message appears for the popover's own duration and is not brought back by
 * hovering or focusing the field afterwards. A preset words the refusal from what was typed,
 * so a letter and a third decimal are not told the same thing, and sends the reason along with
 * it for an application that words refusals itself. `imsPatternMessage` supplies the sentence
 * for a custom pattern, replaces a preset's wording with one of your own, or switches it off.
 *
 * ```html
 * <input imsPattern="decimal" />
 * <input [imsPattern]="IMS_PATTERN.integer" />
 * <textarea [imsPattern]="/[a-z ]+/i"></textarea>
 *
 * <input imsPattern="signedInteger" imsPatternMin="-40" imsPatternMax="120" />
 * <input imsPattern="integer" ims-error-popover />
 * ```
 */
@Directive({
  selector: 'input[imsPattern], textarea[imsPattern]',
  standalone: true,
  host: {
    // A preset holds a number, and a number reads left to right whatever the page around it does.
    '[style.direction]': 'preset() === null ? null : "ltr"',
    '[style.text-align]': 'preset() === null ? null : "end"',
    '(beforeinput)': 'onBeforeInput($event)',
    '(input)': 'onInput($event)',
    '(compositionstart)': 'onCompositionStart()',
    '(compositionend)': 'onCompositionEnd()',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
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
   * The preset in force, or `null` for a pattern of your own. Everything a preset adds on top of
   * the guard — the correction, the zero selection, the bounds, the numeric layout — hangs off
   * this being something.
   */
  protected readonly preset = computed(() => presetOf(this.pattern()));

  /**
   * Replaces the correction a preset applies to inserted text. A function corrects with your
   * own rule, which is also the only way a custom pattern corrects at all; `false` guards
   * without ever rewriting.
   */
  readonly correction = input<ImsPatternCorrector | false | undefined>(undefined, {
    alias: 'imsPatternCorrect',
  });

  /**
   * What a refusal says. A preset words its own refusals, which this replaces with one
   * sentence for all of them; a custom pattern says nothing until given one, and `false`
   * refuses in silence.
   */
  readonly message = input<string | false | undefined>(undefined, {
    alias: 'imsPatternMessage',
  });

  /**
   * The smallest value the field may hold. It applies only to a preset, and only once a value
   * has passed it going down — a value still short of it is on its way there. Left unset it is
   * `NaN`, which no value is ever outside of.
   */
  readonly min = input<number, unknown>(NaN, {
    alias: 'imsPatternMin',
    transform: numberAttribute,
  });

  /**
   * The largest value the field may hold, refused as soon as a value passes it going up. Like
   * `imsPatternMin` it applies only to a preset, and is `NaN` when left unset.
   */
  readonly max = input<number, unknown>(NaN, {
    alias: 'imsPatternMax',
    transform: numberAttribute,
  });

  /**
   * The range in force. A bound belongs to the numeric shape a preset stands for, so a custom
   * pattern is left unbounded whatever the inputs say.
   */
  private readonly bounds = computed(() =>
    this.preset() === null
      ? { min: NaN, max: NaN }
      : { min: this.min(), max: this.max() },
  );

  /** The correction in force: an explicit one, the preset's own, or none at all. */
  private readonly corrector = computed<ImsPatternCorrector | null>(() => {
    const correction = this.correction();

    if (correction !== undefined) {
      return correction === false ? null : correction;
    }

    const preset = this.preset();

    return preset === null ? null : PRESET_CORRECT[preset];
  });

  /**
   * What to say about a refusal: the message in force with the reason behind it, or `null` when
   * the field refuses in silence. A cause of `null` is a custom pattern's, which diagnoses
   * nothing of its own and so says nothing until the call site writes the sentence.
   */
  private word(cause: ImsPatternExcess | ImsPatternShapeReason | null): ImsPatternRefusal | null {
    const message = this.message();

    if (message === false) {
      return null;
    }

    if (message !== undefined) {
      return { message, reason: 'custom' };
    }

    if (cause === null) {
      return null;
    }

    if (typeof cause === 'string') {
      return { message: REASON_MESSAGE[cause], reason: cause };
    }

    const { reason, bound } = cause;

    return { message: BOUND_MESSAGE[reason](bound), reason, bound };
  }

  /** An error popover on the same element, told about a refusal as it happens. */
  private readonly errorPopover = inject(IMS_ERROR_POPOVER_TARGET, {
    self: true,
    optional: true,
  });

  /** Last value the pattern accepted, restored when a change cannot be cancelled up front. */
  private acceptedValue = this.element.value;
  private acceptedCaret: number | null = null;
  /** Whether a refusal is standing on the popover, so it is withdrawn only once. */
  private announced = false;
  /** Whether the field can hold a line break at all; an `input` never can. */
  private readonly multiline = this.element.tagName === 'TEXTAREA';
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

    const insertion = insertedText(event, this.multiline);

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
      this.refuse(insertion, corrected);
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

    if (this.preset() === null || !ZERO_VALUE.test(this.element.value)) {
      return;
    }

    this.element.select();
    // A pointer press collapses the fresh selection on mouseup unless that is prevented.
    this.keepSelection = this.pressing;
  }

  /**
   * Holds a value the user has finished with to the whole range. Typing can only refuse the far
   * side of a bound — a value on its way up to a minimum has to be let through — so the near side
   * is settled here instead, once, as the field is left.
   */
  protected onBlur(): void {
    const shown = this.element.value;

    if (shown === '') {
      return;
    }

    // A sibling may have rewritten the display on the way out: `imsFormat` groups the number on
    // blur. What it wrote is no longer a number to read, so the last accepted value stands in.
    const value = Number.isNaN(Number(shown)) ? this.acceptedValue : shown;

    this.announce(this.word(this.outOfRange(value)));
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
      this.withdrawRefusal();
      return;
    }

    // The rollback writes, which re-enters here and withdraws; the refusal has to outlive it.
    this.write(this.acceptedValue, this.acceptedCaret ?? this.acceptedValue.length);
    this.refuse(insertedBetween(this.acceptedValue, value), value);
  }

  /**
   * Announces a refused insertion. A bound is only ever passed by a value the shape already
   * accepts, so the shape is diagnosed first from what was typed, and a bound explains the rest.
   */
  private refuse(insertion: string, value: string): void {
    const preset = this.preset();

    if (preset === null) {
      this.announce(this.word(null));
      return;
    }

    const excess = this.matches(value) ? this.exceeded(value) : null;

    this.announce(this.word(excess ?? presetReason(preset, insertion)));
  }

  /**
   * Puts a refusal on a popover sharing the element. The popover shows it once and forgets it,
   * so a refusal that is never followed by another simply fades.
   */
  private announce(refusal: ImsPatternRefusal | null): void {
    if (refusal === null) {
      return;
    }

    this.announced = true;
    this.errorPopover?.announceErrors({ imsPattern: refusal });
  }

  /**
   * Takes back an announcement the field has moved on from. Any accepted change withdraws it,
   * deletion included: the message explains what the field would not hold, and the field just
   * held something else.
   */
  private withdrawRefusal(): void {
    if (!this.announced) {
      return;
    }

    this.announced = false;
    this.errorPopover?.announceErrors(null);
  }

  /** Whether the pattern alone allows a value, before any bound is weighed. */
  private matches(value: string): boolean {
    return value === '' || this.regex().test(value);
  }

  /**
   * The bound a value has passed, or `null` while it is still within reach of one.
   *
   * Inserting moves a number away from zero, so only the far side of a bound is final: `120`
   * can never come back under a maximum of `100`, while `1` is on its way up to a minimum of
   * `10` and has to be let through until the field is left. A value that carries no number needs
   * no test of its own — `Number('-')` is `NaN`, so is an unset bound, and every comparison with
   * `NaN` is false.
   */
  private exceeded(value: string): ImsPatternExcess | null {
    const numeric = Number(value);
    const { min, max } = this.bounds();

    if (numeric > 0 && numeric > max) {
      return { reason: 'max', bound: max };
    }

    if (numeric < 0 && numeric < min) {
      return { reason: 'min', bound: min };
    }

    // A minimum of zero or more leaves no negative value to be typing towards, so the sign that
    // would begin one is refused before a digit can follow it.
    if (min >= 0 && value.startsWith('-')) {
      return { reason: 'min', bound: min };
    }

    return null;
  }

  /**
   * The bound a value sits outside of, in either direction — the whole range, which only a value
   * the user has finished with can be held to.
   */
  private outOfRange(value: string): ImsPatternExcess | null {
    const numeric = Number(value);
    const { min, max } = this.bounds();

    if (numeric > max) {
      return { reason: 'max', bound: max };
    }

    if (numeric < min) {
      return { reason: 'min', bound: min };
    }

    return null;
  }

  private accepts(value: string): boolean {
    return this.matches(value) && this.exceeded(value) === null;
  }
}
