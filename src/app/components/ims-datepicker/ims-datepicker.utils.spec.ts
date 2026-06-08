import {DateTime} from 'luxon';
import {IMS_DATEPICKER_DEFAULT_FORMATS} from './ims-datepicker.types';
import {normalizeDateValue, parseDateText} from './ims-datepicker.utils';

describe('ims-datepicker coercion', () => {
    const now = DateTime.fromISO('2026-06-07T14:30:00', {zone: 'Asia/Jerusalem'});
    const baseOptions = {
        precision: 'dd/MM/yyyy' as const,
        monthDay: 'start' as const,
        formats: IMS_DATEPICKER_DEFAULT_FORMATS,
        locale: 'en',
        interpretationZone: 'Asia/Jerusalem',
        now
    };

    it('coerces one or two digits to a day in the current month', () => {
        expect(parseDateText('1', baseOptions)?.toISO()).toBe('2026-06-01T00:00:00.000Z');
        expect(parseDateText('10', baseOptions)?.toISO()).toBe('2026-06-10T00:00:00.000Z');
    });

    it('coerces four digits to a year and preserves the current month and day', () => {
        expect(parseDateText('2032', baseOptions)?.toISO()).toBe('2032-06-07T00:00:00.000Z');
    });

    it('accepts slash, dash, dot, and whitespace separators', () => {
        for (const text of ['5/2/2028', '5-2-2028', '5.2.2028', '5 2 2028']) {
            expect(parseDateText(text, baseOptions)?.toISO()).toBe('2028-02-05T00:00:00.000Z');
        }
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
        })?.toISO()).toBe('2026-02-01T00:00:00.000Z');

        expect(parseDateText('2/2028', {
            ...baseOptions,
            precision: 'MM/yyyy',
            monthDay: 'end'
        })?.toISO()).toBe('2028-02-29T00:00:00.000Z');
    });

    it('normalizes Luxon values to a UTC date-only value', () => {
        const source = DateTime.fromISO('2026-06-07T23:45:12.789', {zone: 'Asia/Jerusalem'});

        expect(normalizeDateValue(
            source,
            'Asia/Jerusalem',
            'dd/MM/yyyy',
            'start'
        )?.toISO()).toBe('2026-06-07T00:00:00.000Z');
    });

    it('interprets millisecond inputs in the configured zone before removing time', () => {
        const source = DateTime.fromISO('2026-06-08T00:30:00', {zone: 'Asia/Jerusalem'});

        expect(normalizeDateValue(
            source.toMillis(),
            'Asia/Jerusalem',
            'dd/MM/yyyy',
            'start'
        )?.toISO()).toBe('2026-06-08T00:00:00.000Z');
    });
});

