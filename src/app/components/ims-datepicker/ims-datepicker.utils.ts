import {DateTime} from 'luxon';
import {
    IMS_DATEPICKER_DEFAULT_FORMATS,
    ImsDatepickerFormats,
    ImsDatepickerMonthDay,
    ImsDatepickerPrecision,
    ImsDatepickerValue,
    PartialImsDatepickerFormats
} from './ims-datepicker.types';

const DATE_ONLY_ZONE = 'utc';
export const IMS_DATEPICKER_INPUT_PATTERNS: Readonly<
    Record<ImsDatepickerPrecision, string>
> = {
    'dd/MM/yyyy': '[0-9]+(?:[/\\.\\- ][0-9]+){0,2}',
    'MM/yyyy': '[0-9]+(?:[/\\.\\- ][0-9]+)?'
};
const ALLOWED_INPUT = /^[0-9]+(?:[/.\- ][0-9]+){0,2}$/;
const PROGRESSIVE_DATE_INPUT = /^(?:[0-9]+(?:[/.\- ][0-9]*){0,2})?$/;
const PROGRESSIVE_MONTH_INPUT = /^(?:[0-9]+(?:[/.\- ][0-9]*)?)?$/;

export interface ImsDateParseOptions {
    readonly precision: ImsDatepickerPrecision;
    readonly monthDay: ImsDatepickerMonthDay;
    readonly formats: ImsDatepickerFormats;
    readonly locale: string;
    readonly interpretationZone: string;
    readonly now?: DateTime;
}

export function canonicalDate(year: number, month: number, day: number): DateTime | null {
    const value = DateTime.fromObject(
        {year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0},
        {zone: DATE_ONLY_ZONE}
    );

    return value.isValid ? value : null;
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
    value: ImsDatepickerValue,
    interpretationZone: string,
    precision: ImsDatepickerPrecision,
    monthDay: ImsDatepickerMonthDay
): DateTime | null {
    if (value === null || value === undefined) return null;

    let source: DateTime;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        source = DateTime.fromMillis(value, {zone: interpretationZone});
    } else if (DateTime.isDateTime(value)) {
        source = value;
    } else {
        return null;
    }

    if (!source.isValid) return null;

    return canonicalForPrecision(source.year, source.month, source.day, precision, monthDay);
}

export function parseDateText(text: string, options: ImsDateParseOptions): DateTime | null {
    const trimmed = text.trim();
    if (!trimmed || !ALLOWED_INPUT.test(trimmed)) return null;

    const exact = parseConfiguredFormat(trimmed, options);
    if (exact) return exact;

    const now = options.now?.setZone(options.interpretationZone)
        ?? DateTime.now().setZone(options.interpretationZone);
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

export function compareDateOnly(first: DateTime, second: DateTime): number {
    return Math.sign(first.toMillis() - second.toMillis());
}

export function clampDate(value: DateTime, min: DateTime, max: DateTime): DateTime {
    if (compareDateOnly(value, min) < 0) return min;
    if (compareDateOnly(value, max) > 0) return max;
    return value;
}

function parseConfiguredFormat(text: string, options: ImsDateParseOptions): DateTime | null {
    const formats = options.precision === 'dd/MM/yyyy'
        ? options.formats.parse.dateInput
        : options.formats.parse.monthInput;

    for (const format of formats) {
        const parsed = DateTime.fromFormat(text, format, {
            locale: options.locale,
            zone: options.interpretationZone
        });

        if (parsed.isValid) {
            return canonicalForPrecision(
                parsed.year,
                parsed.month,
                parsed.day,
                options.precision,
                options.monthDay
            );
        }
    }

    return null;
}

function parseDateSegments(
    segments: readonly string[],
    now: DateTime,
    monthDay: ImsDatepickerMonthDay
): DateTime | null {
    if (segments.length === 1) {
        const token = segments[0];

        if (token.length <= 2) {
            return canonicalForPrecision(
                now.year,
                now.month,
                Number(token),
                'dd/MM/yyyy',
                monthDay
            );
        }

        if (token.length === 4) {
            return dateWithClampedDay(Number(token), now.month, now.day);
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
        return canonicalDate(now.year, Number(segments[1]), Number(segments[0]));
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
    now: DateTime,
    monthDay: ImsDatepickerMonthDay
): DateTime | null {
    if (segments.length === 1) {
        const token = segments[0];

        if (token.length <= 2) {
            return canonicalForPrecision(
                now.year,
                Number(token),
                1,
                'MM/yyyy',
                monthDay
            );
        }

        if (token.length === 4) {
            return canonicalForPrecision(
                Number(token),
                now.month,
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
): DateTime | null {
    if (precision === 'dd/MM/yyyy') return canonicalDate(year, month, day);

    const firstDay = canonicalDate(year, month, 1);
    if (!firstDay) return null;

    const targetDay = monthDay === 'end' ? firstDay.daysInMonth! : 1;
    return canonicalDate(year, month, targetDay);
}

function dateWithClampedDay(year: number, month: number, preferredDay: number): DateTime | null {
    const firstDay = canonicalDate(year, month, 1);
    if (!firstDay) return null;
    return canonicalDate(year, month, Math.min(preferredDay, firstDay.daysInMonth!));
}

function parseYear(value: string): number {
    return value.length <= 2 ? expandTwoDigitYear(Number(value)) : Number(value);
}

function expandTwoDigitYear(year: number): number {
    return year <= 49 ? 2000 + year : 1900 + year;
}
