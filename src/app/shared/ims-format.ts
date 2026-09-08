/**
 * The numeric display vocabulary shared by `imsFormat`, `imsFormatCurrency` and their pipes.
 *
 * A token describes a *shape*, not a value: how many fraction digits the number is shown with,
 * and whether its integer part is grouped. Everything here is pure text in, text out — nothing
 * about it is Angular-aware, so the directive and the pipe cannot drift apart.
 */

/**
 * Shapes common enough to name, widened so any `#` token is accepted:
 * `###` and `#,###.###` work without being listed.
 */
export type ImsFormatToken = '#,###' | '#,###.#' | '#,###.##' | '###.#' | '###.##' | (string & {});

/** What a bare `imsFormat`, with no value of its own, formats as. */
export const IMS_FORMAT_DEFAULT = '#,###';

/** The shape money is always shown in. */
export const IMS_CURRENCY_FORMAT = '#,###.##';

/** The symbol `imsFormatCurrency` appends when it is not given one. */
export const IMS_CURRENCY_DEFAULT = '₪';

/**
 * Formatting is pinned to `en-US` rather than the injected `LOCALE_ID`, on purpose.
 *
 * The separators have to stay `,` and `.`: the displayed text is unformatted back through
 * `Number()`, and while editing, the field holds exactly the shape `IMS_PATTERN.decimal` lets the
 * user type. A locale that groups with `.`, or writes digits in another script, would break that
 * round trip. `he-IL` produces identical digits and separators, so nothing is lost here today.
 */
const FORMAT_LOCALE = 'en-US';

/** The integer part is `#` groups, optionally followed by a run of `#` after a dot. */
const TOKEN = /^(#{1,3}(?:,#{3})*|#+)(?:\.(#+))?$/;

/** A raw or already-grouped number, and nothing else. */
const NUMERIC_TEXT = /^-?(?:[0-9]+(?:,[0-9]{3})*|[0-9]*)(?:\.[0-9]*)?$/;

/** The most fraction digits `Intl.NumberFormat` will accept. */
const MAX_FRACTION_DIGITS = 20;

/** What a token resolves to once its `#` are counted. */
interface ImsFormatShape {
  readonly grouping: boolean;
  /**
   * How many fraction digits to show, or `null` to keep however many the value already has.
   *
   * A token that says nothing about the fraction — `#,###`, `###` — is not asking for whole
   * numbers. It is asking for grouping and nothing else, so the decimals survive untouched.
   */
  readonly fractionDigits: number | null;
}

const shapeOf = (token: string): ImsFormatShape | null => {
  const match = TOKEN.exec(token);

  if (match === null) {
    return null;
  }

  return {
    grouping: match[1].includes(','),
    fractionDigits: match[2]?.length ?? null,
  };
};

/** How many fraction digits a raw numeric string carries, trailing zeros included. */
const fractionDigitsOf = (numeric: string): number => {
  const dot = numeric.indexOf('.');

  return dot === -1 ? 0 : Math.min(numeric.length - dot - 1, MAX_FRACTION_DIGITS);
};

/** The default shape, resolved once — also the fallback for a token that does not parse. */
const DEFAULT_SHAPE = shapeOf(IMS_FORMAT_DEFAULT) as ImsFormatShape;

const formatters = new Map<string, Intl.NumberFormat>();

/** One `Intl.NumberFormat` per distinct shape; building one per keystroke is not free. */
const formatterFor = (grouping: boolean, fractionDigits: number): Intl.NumberFormat => {
  const key = `${grouping}:${fractionDigits}`;
  const cached = formatters.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(FORMAT_LOCALE, {
    useGrouping: grouping,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  formatters.set(key, formatter);

  return formatter;
};

/**
 * Strips a displayed value back to the characters a number is made of, removing grouping
 * separators, a currency symbol and the space in front of it in one pass.
 */
export const unformatNumeric = (text: string): string => text.replace(/[^0-9.-]/g, '');

/**
 * Renders `value` in the shape `token` describes, with `suffix` appended.
 *
 * A token that fixes the fraction — `#,###.##` — pads and rounds to that many digits. A token
 * that does not — `#,###` — only groups, and leaves every decimal the value carries in place.
 *
 * Returns `value` **unchanged** when it is empty or is not a number: prose in a `textarea`, a
 * half-typed `-`, and a value the application wrote in some other notation are all left exactly
 * as they are rather than being coerced into a zero.
 *
 * Idempotent — an already formatted value has its suffix and grouping removed before it is
 * measured, so formatting twice is formatting once.
 */
export function formatNumeric(value: string, token: string, suffix = ''): string {
  const text = value.trim();

  if (text === '') {
    return value;
  }

  const body = suffix !== '' && text.endsWith(suffix) ? text.slice(0, -suffix.length).trim() : text;

  if (!NUMERIC_TEXT.test(body)) {
    return value;
  }

  const numeric = unformatNumeric(body);
  const number = Number(numeric);

  if (!Number.isFinite(number)) {
    return value;
  }

  const shape = shapeOf(token) ?? DEFAULT_SHAPE;
  const fractionDigits = shape.fractionDigits ?? fractionDigitsOf(numeric);

  return formatterFor(shape.grouping, fractionDigits).format(number) + suffix;
}
