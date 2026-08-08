import {
    IMS_DATEPICKER_DEFAULT_FORMATS,
    ImsDatepickerDate,
    ImsDatepickerFirstDayOfWeek,
    ImsDatepickerFormats,
    ImsDatepickerMonthDay,
    ImsDatepickerPrecision,
    ImsDatepickerValue,
    PartialImsDatepickerFormats
} from './ims-datepicker.types';

const UTC_TIME_ZONE = 'UTC';
const FORMAT_TOKEN_PATTERN = /yyyy|yy|LLLL|LLL|MMMM|MMM|cccc|ccc|EEEE|EEE|dd|d|MM|M/g;
const FORMAT_PARSE_TOKENS = ['yyyy', 'yy', 'dd', 'd', 'MM', 'M'] as const;

export const IMS_DATEPICKER_INPUT_PATTERNS: Readonly<
    Record<ImsDatepickerPrecision, string>
> = {
    'dd/MM/yyyy': '[0-9]+(?:(?:/|\\.|-| )[0-9]+){0,2}',
    'MM/yyyy': '[0-9]+(?:(?:/|\\.|-| )[0-9]+)?'
};

const ALLOWED_INPUT = /^[0-9]+(?:[/.\- ][0-9]+){0,2}$/;
const PROGRESSIVE_DATE_INPUT = /^(?:[0-9]+(?:[/.\- ][0-9]*){0,2})?$/;
const PROGRESSIVE_MONTH_INPUT = /^(?:[0-9]+(?:[/.\- ][0-9]*)?)?$/;

type FormatParseToken = typeof FORMAT_PARSE_TOKENS[number];
type FormatParseField = 'year' | 'month' | 'day';

interface ParsedFormatPart {
    readonly field: FormatParseField;
    readonly token: FormatParseToken;
}

export interface ImsDateParseOptions {
    readonly precision: ImsDatepickerPrecision;
    readonly monthDay: ImsDatepickerMonthDay;
    readonly formats: ImsDatepickerFormats;
    readonly locale: string;
    readonly interpretationZone: string;
    readonly now?: ImsDatepickerDate;
}

export function canonicalDate(year: number, month: number, day: number): ImsDatepickerDate | null {
    if (
        !Number.isInteger(year)
        || !Number.isInteger(month)
        || !Number.isInteger(day)
        || month < 1
        || month > 12
        || day < 1
    ) return null;

    const value = new Date(0);
    value.setUTCHours(0, 0, 0, 0);
    value.setUTCFullYear(year, month - 1, day);

    return dateYear(value) === year && dateMonth(value) === month && dateDay(value) === day
        ? value
        : null;
}

export function isNativeDate(value: unknown): value is ImsDatepickerDate {
    return value instanceof Date && Number.isFinite(value.getTime());
}

export function isDateInputTextAllowed(
    text: string,
    precision: ImsDatepickerPrecision
): boolean {
    return precision === 'dd/MM/yyyy'
        ? PROGRESSIVE_DATE_INPUT.test(text)
        : PROGRESSIVE_MONTH_INPUT.test(text);
}

export function normalizeDateValue(
    value: ImsDatepickerValue<Date>,
    interpretationZone: string,
    precision: ImsDatepickerPrecision,
    monthDay: ImsDatepickerMonthDay
): ImsDatepickerDate | null {
    if (value === null || value === undefined) return null;

    let source: ImsDatepickerDate;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;

        const parts = datePartsInZone(value, resolveTimeZoneId(interpretationZone));
        if (!parts) return null;
        source = canonicalDate(parts.year, parts.month, parts.day)!;
    } else if (isNativeDate(value)) {
        source = value;
    } else {
        return null;
    }

    return canonicalForPrecision(
        dateYear(source),
        dateMonth(source),
        dateDay(source),
        precision,
        monthDay
    );
}

export function parseDateText(
    text: string,
    options: ImsDateParseOptions
): ImsDatepickerDate | null {
    const trimmed = text.trim();
    if (!trimmed || !ALLOWED_INPUT.test(trimmed)) return null;

    const now = options.now ?? todayInZone(options.interpretationZone);
    const exact = parseConfiguredFormat(trimmed, options, now);
    if (exact) return exact;

    const segments = trimmed.split(/[\s/.-]+/).filter(Boolean);

    if (segments.some((segment) => !/^\d+$/.test(segment))) return null;

    return options.precision === 'dd/MM/yyyy'
        ? parseDateSegments(segments, now, options.monthDay)
        : parseMonthSegments(segments, now, options.monthDay);
}

export function mergeDatepickerFormats(
    globalFormats?: PartialImsDatepickerFormats,
    instanceFormats?: PartialImsDatepickerFormats
): ImsDatepickerFormats {
    return {
        parse: {
            dateInput: instanceFormats?.parse?.dateInput
                ?? globalFormats?.parse?.dateInput
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.parse.dateInput,
            monthInput: instanceFormats?.parse?.monthInput
                ?? globalFormats?.parse?.monthInput
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.parse.monthInput
        },
        display: {
            dateInput: instanceFormats?.display?.dateInput
                ?? globalFormats?.display?.dateInput
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.display.dateInput,
            monthInput: instanceFormats?.display?.monthInput
                ?? globalFormats?.display?.monthInput
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.display.monthInput,
            monthLabel: instanceFormats?.display?.monthLabel
                ?? globalFormats?.display?.monthLabel
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.display.monthLabel,
            yearLabel: instanceFormats?.display?.yearLabel
                ?? globalFormats?.display?.yearLabel
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.display.yearLabel,
            monthYearLabel: instanceFormats?.display?.monthYearLabel
                ?? globalFormats?.display?.monthYearLabel
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.display.monthYearLabel,
            dayAriaLabel: instanceFormats?.display?.dayAriaLabel
                ?? globalFormats?.display?.dayAriaLabel
                ?? IMS_DATEPICKER_DEFAULT_FORMATS.display.dayAriaLabel
        }
    };
}

export function compareDateOnly(first: ImsDatepickerDate, second: ImsDatepickerDate): number {
    return Math.sign(first.getTime() - second.getTime());
}

export function clampDate(
    value: ImsDatepickerDate,
    min: ImsDatepickerDate,
    max: ImsDatepickerDate
): ImsDatepickerDate {
    if (compareDateOnly(value, min) < 0) return min;
    if (compareDateOnly(value, max) > 0) return max;
    return value;
}

export function todayInZone(interpretationZone: string): ImsDatepickerDate {
    const now = Date.now();
    const parts = datePartsInZone(now, resolveTimeZoneId(interpretationZone))
        ?? datePartsInZone(now, 'UTC')!;
    return canonicalDate(parts.year, parts.month, parts.day)!;
}

export function toUtcEpochMillis(value: ImsDatepickerDate): number {
    return value.getTime();
}

export function dateYear(value: ImsDatepickerDate): number {
    return value.getUTCFullYear();
}

export function dateMonth(value: ImsDatepickerDate): number {
    return value.getUTCMonth() + 1;
}

export function dateDay(value: ImsDatepickerDate): number {
    return value.getUTCDate();
}

export function dateDayOfWeek(value: ImsDatepickerDate): number {
    return value.getUTCDay() || 7;
}

export function daysInMonth(value: ImsDatepickerDate): number {
    const end = new Date(0);
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCFullYear(dateYear(value), dateMonth(value), 0);
    return end.getUTCDate();
}

export function addDate(
    value: ImsDatepickerDate,
    duration: {readonly days?: number; readonly months?: number; readonly years?: number}
): ImsDatepickerDate {
    const year = dateYear(value) + (duration.years ?? 0);
    const monthIndex = dateMonth(value) - 1 + (duration.months ?? 0);
    const normalizedYear = year + Math.floor(monthIndex / 12);
    const normalizedMonth = ((monthIndex % 12) + 12) % 12 + 1;
    const first = canonicalDate(normalizedYear, normalizedMonth, 1)!;
    const clampedDay = Math.min(dateDay(value), daysInMonth(first));
    const base = canonicalDate(normalizedYear, normalizedMonth, clampedDay)!;

    if (!duration.days) return base;
    const result = new Date(base.getTime());
    result.setUTCDate(result.getUTCDate() + duration.days);
    return result;
}

export function dateDifferenceDays(
    start: ImsDatepickerDate,
    end: ImsDatepickerDate
): number {
    return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function dateEquals(first: ImsDatepickerDate, second: ImsDatepickerDate): boolean {
    return first.getTime() === second.getTime();
}

export function formatDate(
    value: ImsDatepickerDate,
    format: string,
    locale: string
): string {
    return format.replace(FORMAT_TOKEN_PATTERN, (token) => {
        switch (token) {
            case 'yyyy':
                return padYear(dateYear(value));
            case 'yy':
                return pad2(dateYear(value) % 100);
            case 'MM':
                return pad2(dateMonth(value));
            case 'M':
                return String(dateMonth(value));
            case 'dd':
                return pad2(dateDay(value));
            case 'd':
                return String(dateDay(value));
            case 'LLLL':
            case 'MMMM':
                return formatWithIntl(value, locale, {month: 'long'});
            case 'LLL':
            case 'MMM':
                return formatWithIntl(value, locale, {month: 'short'});
            case 'cccc':
            case 'EEEE':
                return formatWithIntl(value, locale, {weekday: 'long'});
            case 'ccc':
            case 'EEE':
                return formatWithIntl(value, locale, {weekday: 'short'});
            default:
                return token;
        }
    });
}

export function formatWeekdays(
    locale: string,
    firstDayOfWeek: ImsDatepickerFirstDayOfWeek
): readonly string[] {
    const monday = canonicalDate(2021, 11, 1)!;
    const weekdays = Array.from({length: 7}, (_, index) =>
        formatDate(addDate(monday, {days: index}), 'ccc', locale)
    );

    return firstDayOfWeek === 7
        ? [weekdays[6], ...weekdays.slice(0, 6)]
        : weekdays;
}

function resolveTimeZoneId(interpretationZone: string): string {
    return interpretationZone === 'local'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : interpretationZone;
}

function parseConfiguredFormat(
    text: string,
    options: ImsDateParseOptions,
    now: ImsDatepickerDate
): ImsDatepickerDate | null {
    const formats = options.precision === 'dd/MM/yyyy'
        ? options.formats.parse.dateInput
        : options.formats.parse.monthInput;

    for (const format of formats) {
        const parsed = parseNumericFormat(text, format);
        if (!parsed) continue;

        const year = parsed.year ?? dateYear(now);
        const month = parsed.month ?? dateMonth(now);
        const day = parsed.day ?? (
            options.precision === 'dd/MM/yyyy'
                ? dateDay(now)
                : 1
        );

        const date = canonicalForPrecision(
            year,
            month,
            day,
            options.precision,
            options.monthDay
        );

        if (date) return date;
    }

    return null;
}

function parseNumericFormat(
    text: string,
    format: string
): Partial<Record<FormatParseField, number>> | null {
    const parts: ParsedFormatPart[] = [];
    let pattern = '^';
    let index = 0;

    while (index < format.length) {
        const token = FORMAT_PARSE_TOKENS.find((candidate) =>
            format.startsWith(candidate, index)
        );

        if (token) {
            parts.push({
                field: parseTokenField(token),
                token
            });
            pattern += `(${parseTokenPattern(token)})`;
            index += token.length;
            continue;
        }

        if (/\s/.test(format[index])) {
            pattern += '\\s+';
            while (index < format.length && /\s/.test(format[index])) index++;
            continue;
        }

        pattern += escapeRegex(format[index]);
        index++;
    }

    const match = new RegExp(`${pattern}$`).exec(text);
    if (!match) return null;

    return parts.reduce<Partial<Record<FormatParseField, number>>>(
        (result, part, partIndex) => ({
            ...result,
            [part.field]: part.field === 'year'
                ? parseYearToken(match[partIndex + 1], part.token)
                : Number(match[partIndex + 1])
        }),
        {}
    );
}

function parseTokenField(token: FormatParseToken): FormatParseField {
    if (token === 'yyyy' || token === 'yy') return 'year';
    if (token === 'MM' || token === 'M') return 'month';
    return 'day';
}

function parseTokenPattern(token: FormatParseToken): string {
    if (token === 'yyyy') return '\\d{4}';
    if (token === 'yy' || token === 'dd' || token === 'MM') return '\\d{2}';
    return '\\d{1,2}';
}

function parseYearToken(value: string, token: FormatParseToken): number {
    return token === 'yy' ? expandTwoDigitYear(Number(value)) : Number(value);
}

function parseDateSegments(
    segments: readonly string[],
    now: ImsDatepickerDate,
    monthDay: ImsDatepickerMonthDay
): ImsDatepickerDate | null {
    if (segments.length === 1) {
        const token = segments[0];

        if (token.length <= 2) {
            return canonicalForPrecision(
                dateYear(now),
                dateMonth(now),
                Number(token),
                'dd/MM/yyyy',
                monthDay
            );
        }

        if (token.length === 4) {
            return dateWithClampedDay(Number(token), dateMonth(now), dateDay(now));
        }

        if (token.length === 8) {
            return canonicalDate(
                Number(token.slice(4)),
                Number(token.slice(2, 4)),
                Number(token.slice(0, 2))
            );
        }

        if (token.length === 6) {
            return canonicalDate(
                expandTwoDigitYear(Number(token.slice(4))),
                Number(token.slice(2, 4)),
                Number(token.slice(0, 2))
            );
        }

        return null;
    }

    if (segments.length === 2) {
        return canonicalDate(dateYear(now), Number(segments[1]), Number(segments[0]));
    }

    if (segments.length === 3) {
        return canonicalDate(
            parseYear(segments[2]),
            Number(segments[1]),
            Number(segments[0])
        );
    }

    return null;
}

function parseMonthSegments(
    segments: readonly string[],
    now: ImsDatepickerDate,
    monthDay: ImsDatepickerMonthDay
): ImsDatepickerDate | null {
    if (segments.length === 1) {
        const token = segments[0];

        if (token.length <= 2) {
            return canonicalForPrecision(
                dateYear(now),
                Number(token),
                1,
                'MM/yyyy',
                monthDay
            );
        }

        if (token.length === 4) {
            return canonicalForPrecision(
                Number(token),
                dateMonth(now),
                1,
                'MM/yyyy',
                monthDay
            );
        }

        if (token.length === 6) {
            return canonicalForPrecision(
                Number(token.slice(2)),
                Number(token.slice(0, 2)),
                1,
                'MM/yyyy',
                monthDay
            );
        }

        return null;
    }

    if (segments.length === 2) {
        return canonicalForPrecision(
            parseYear(segments[1]),
            Number(segments[0]),
            1,
            'MM/yyyy',
            monthDay
        );
    }

    return null;
}

function canonicalForPrecision(
    year: number,
    month: number,
    day: number,
    precision: ImsDatepickerPrecision,
    monthDay: ImsDatepickerMonthDay
): ImsDatepickerDate | null {
    if (precision === 'dd/MM/yyyy') return canonicalDate(year, month, day);

    const firstDay = canonicalDate(year, month, 1);
    if (!firstDay) return null;

    const targetDay = monthDay === 'end' ? daysInMonth(firstDay) : 1;
    return canonicalDate(year, month, targetDay);
}

function dateWithClampedDay(
    year: number,
    month: number,
    preferredDay: number
): ImsDatepickerDate | null {
    const firstDay = canonicalDate(year, month, 1);
    if (!firstDay) return null;
    return canonicalDate(year, month, Math.min(preferredDay, daysInMonth(firstDay)));
}

function formatWithIntl(
    value: ImsDatepickerDate,
    locale: string,
    options: Intl.DateTimeFormatOptions
): string {
    return new Intl.DateTimeFormat(locale, {
        ...options,
        timeZone: UTC_TIME_ZONE
    }).format(new Date(toUtcEpochMillis(value)));
}

function datePartsInZone(
    epochMillis: number,
    timeZone: string
): {readonly year: number; readonly month: number; readonly day: number} | null {
    try {
        const parts = new Intl.DateTimeFormat('en-US-u-ca-iso8601-nu-latn', {
            timeZone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).formatToParts(epochMillis);
        const partValue = (type: Intl.DateTimeFormatPartTypes) =>
            Number(parts.find((part) => part.type === type)?.value);
        const year = partValue('year');
        const month = partValue('month');
        const day = partValue('day');

        return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)
            ? {year, month, day}
            : null;
    } catch {
        return null;
    }
}

function parseYear(value: string): number {
    return value.length <= 2 ? expandTwoDigitYear(Number(value)) : Number(value);
}

function expandTwoDigitYear(year: number): number {
    return year <= 49 ? 2000 + year : 1900 + year;
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function padYear(value: number): string {
    return String(value).padStart(4, '0');
}
