import { DateTime } from 'luxon';
import { IMS_DATEPICKER_DEFAULT_FORMATS } from './ims-datepicker.types';
import {
    calendarDateFromValue,
    IMS_DATEPICKER_INPUT_PATTERNS,
    normalizeDateValue,
    parseDateText,
    serializeDateValue
} from './ims-datepicker.utils';

function calendarDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(value: Date | null): string | undefined {
    return value?.toISOString().slice(0, 10);
}

describe('ims-datepicker coercion', () => {
    const now = calendarDate(2026, 6, 7);
    const baseOptions = {
        precision: 'dd/MM/yyyy' as const,
        monthDay: 'start' as const,
        formats: IMS_DATEPICKER_DEFAULT_FORMATS,
        locale: 'en',
        interpretationZone: 'Asia/Jerusalem',
        now
    };

    it('coerces one or two digits to a day in the current month', () => {
        expect(isoDate(parseDateText('1', baseOptions))).toBe('2026-06-01');
        expect(isoDate(parseDateText('10', baseOptions))).toBe('2026-06-10');
    });

    it('coerces four digits to a year and preserves the current month and day', () => {
        expect(isoDate(parseDateText('2032', baseOptions))).toBe('2032-06-07');
    });

    it('accepts slash, dash, dot, and whitespace separators', () => {
        for (const text of ['5/2/2028', '5-2-2028', '5.2.2028', '5 2 2028']) {
            expect(isoDate(parseDateText(text, baseOptions))).toBe('2028-02-05');
        }
    });

    it('uses HTML pattern expressions that compile with the browser v flag', () => {
        const datePattern = new RegExp(`^(?:${IMS_DATEPICKER_INPUT_PATTERNS['dd/MM/yyyy']})$`, 'v');
        const monthPattern = new RegExp(`^(?:${IMS_DATEPICKER_INPUT_PATTERNS['MM/yyyy']})$`, 'v');

        for (const text of ['5/2/2028', '5-2-2028', '5.2.2028', '5 2 2028']) {
            expect(datePattern.test(text)).toBe(true);
        }

        for (const text of ['2/2028', '2-2028', '2.2028', '2 2028']) {
            expect(monthPattern.test(text)).toBe(true);
        }
    });

    it('parses custom numeric token order', () => {
        expect(isoDate(parseDateText('2028.02.05', {
            ...baseOptions,
            formats: {
                ...IMS_DATEPICKER_DEFAULT_FORMATS,
                parse: {
                    ...IMS_DATEPICKER_DEFAULT_FORMATS.parse,
                    dateInput: ['yyyy.MM.dd']
                }
            }
        }))).toBe('2028-02-05');
    });

    it('rejects month or weekday names', () => {
        expect(parseDateText('5 February 2028', baseOptions)).toBeNull();
        expect(parseDateText('Monday', baseOptions)).toBeNull();
    });

    it('coerces month precision to the configured boundary day', () => {
        expect(isoDate(parseDateText('2', {
            ...baseOptions,
            precision: 'MM/yyyy',
            monthDay: 'start'
        }))).toBe('2026-02-01');

        expect(isoDate(parseDateText('2/2028', {
            ...baseOptions,
            precision: 'MM/yyyy',
            monthDay: 'end'
        }))).toBe('2028-02-29');
    });

    it('normalizes native Date values to a date-only value', () => {
        const source = calendarDate(2026, 6, 7);

        expect(isoDate(normalizeDateValue(
            source,
            'Asia/Jerusalem',
            'dd/MM/yyyy',
            'start'
        ))).toBe('2026-06-07');
    });

    it('interprets millisecond inputs in the configured zone before removing time', () => {
        const source = Date.parse('2026-06-07T21:30:00.000Z');

        expect(isoDate(normalizeDateValue(
            source,
            'Asia/Jerusalem',
            'dd/MM/yyyy',
            'start'
        ))).toBe('2026-06-08');
    });
});

describe('ims-datepicker value conversion', () => {
    it('reads a Luxon DateTime by the calendar date in its own zone', () => {
        const lateEvening = DateTime.fromISO('2026-06-07T23:30:00', { zone: 'Asia/Jerusalem' });

        expect(isoDate(calendarDateFromValue(lateEvening, 'UTC'))).toBe('2026-06-07');
    });

    it('reads a native Date by its UTC fields and milliseconds in the interpretation zone', () => {
        const instant = '2026-06-07T23:30:00Z';

        expect(isoDate(calendarDateFromValue(new Date(instant), 'Asia/Jerusalem'))).toBe('2026-06-07');
        expect(isoDate(calendarDateFromValue(Date.parse(instant), 'Asia/Jerusalem'))).toBe('2026-06-08');
    });

    it('rejects unsupported and invalid values', () => {
        expect(calendarDateFromValue('2026-06-07', 'UTC')).toBeNull();
        expect(calendarDateFromValue(new Date(Number.NaN), 'UTC')).toBeNull();
        expect(calendarDateFromValue(DateTime.invalid('test'), 'UTC')).toBeNull();
    });

    it('serializes a calendar date as each value type at UTC midnight', () => {
        const date = calendarDate(2026, 6, 7);
        const luxonValue = serializeDateValue(date, 'luxon') as DateTime;

        expect(DateTime.isDateTime(luxonValue)).toBe(true);
        expect(luxonValue.toISO()).toBe('2026-06-07T00:00:00.000Z');
        expect(serializeDateValue(date, 'date')).toEqual(date);
        expect(serializeDateValue(date, 'millis')).toBe(Date.UTC(2026, 5, 7));
    });
});
