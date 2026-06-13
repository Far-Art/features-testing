import { Temporal } from '@js-temporal/polyfill';
import { IMS_DATEPICKER_DEFAULT_FORMATS } from './ims-datepicker.types';
import { IMS_DATEPICKER_INPUT_PATTERNS, normalizeDateValue, parseDateText } from './ims-datepicker.utils';

describe('ims-datepicker coercion', () => {
    const now = Temporal.PlainDate.from('2026-06-07');
    const baseOptions = {
        precision: 'dd/MM/yyyy' as const,
        monthDay: 'start' as const,
        formats: IMS_DATEPICKER_DEFAULT_FORMATS,
        locale: 'en',
        interpretationZone: 'Asia/Jerusalem',
        now
    };

    it('coerces one or two digits to a day in the current month', () => {
        expect(parseDateText('1', baseOptions)?.toString()).toBe('2026-06-01');
        expect(parseDateText('10', baseOptions)?.toString()).toBe('2026-06-10');
    });

    it('coerces four digits to a year and preserves the current month and day', () => {
        expect(parseDateText('2032', baseOptions)?.toString()).toBe('2032-06-07');
    });

    it('accepts slash, dash, dot, and whitespace separators', () => {
        for (const text of ['5/2/2028', '5-2-2028', '5.2.2028', '5 2 2028']) {
            expect(parseDateText(text, baseOptions)?.toString()).toBe('2028-02-05');
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
        expect(parseDateText('2028.02.05', {
            ...baseOptions,
            formats: {
                ...IMS_DATEPICKER_DEFAULT_FORMATS,
                parse: {
                    ...IMS_DATEPICKER_DEFAULT_FORMATS.parse,
                    dateInput: ['yyyy.MM.dd']
                }
            }
        })?.toString()).toBe('2028-02-05');
    });

    it('rejects month or weekday names', () => {
        expect(parseDateText('5 February 2028', baseOptions)).toBeNull();
        expect(parseDateText('Monday', baseOptions)).toBeNull();
    });

    it('coerces month precision to the configured boundary day', () => {
        expect(parseDateText('2', {
            ...baseOptions,
            precision: 'MM/yyyy',
            monthDay: 'start'
        })?.toString()).toBe('2026-02-01');

        expect(parseDateText('2/2028', {
            ...baseOptions,
            precision: 'MM/yyyy',
            monthDay: 'end'
        })?.toString()).toBe('2028-02-29');
    });

    it('normalizes Temporal values to a date-only value', () => {
        const source = Temporal.PlainDate.from('2026-06-07');

        expect(normalizeDateValue(source, 'Asia/Jerusalem', 'dd/MM/yyyy', 'start')?.toString()).toBe('2026-06-07');
    });

    it('interprets millisecond inputs in the configured zone before removing time', () => {
        const source = Temporal.PlainDateTime
            .from('2026-06-08T00:30:00')
            .toZonedDateTime('Asia/Jerusalem');

        expect(normalizeDateValue(source.epochMilliseconds, 'Asia/Jerusalem', 'dd/MM/yyyy', 'start')?.toString()).toBe('2026-06-08');
    });
});
