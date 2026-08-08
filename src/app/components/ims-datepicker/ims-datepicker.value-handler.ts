import {Injectable, InjectionToken, Provider, Type, inject} from '@angular/core';
import {DateTime} from 'luxon';
import {ImsDatepickerDate} from './ims-datepicker.types';
import {isNativeDate, normalizeDateValue, toUtcEpochMillis} from './ims-datepicker.utils';

export interface ImsDatepickerValueHandler<TDate extends object = object> {
    isValue(value: unknown): value is TDate;

    /** Converts a supported object or epoch milliseconds to UTC calendar milliseconds. */
    toCalendarMillis(value: unknown, interpretationZone: string): number | null;

    /** Creates the handler's concrete object from UTC calendar milliseconds. */
    fromCalendarMillis(value: number): TDate;
}

@Injectable({providedIn: 'root'})
export class ImsDatepickerDateValueHandler implements ImsDatepickerValueHandler<Date> {
    isValue(value: unknown): value is Date {
        return isNativeDate(value);
    }

    toCalendarMillis(value: unknown, interpretationZone: string): number | null {
        if (typeof value !== 'number' && !this.isValue(value)) return null;

        const normalized = normalizeDateValue(
            value,
            interpretationZone,
            'dd/MM/yyyy',
            'start'
        );
        return normalized ? toUtcEpochMillis(normalized) : null;
    }

    fromCalendarMillis(value: number): Date {
        return new Date(value);
    }
}

@Injectable({providedIn: 'root'})
export class ImsDatepickerLuxonValueHandler
    implements ImsDatepickerValueHandler<DateTime> {
    isValue(value: unknown): value is DateTime {
        return DateTime.isDateTime(value) && value.isValid;
    }

    toCalendarMillis(value: unknown, interpretationZone: string): number | null {
        const numeric = calendarMillisFromNumber(value, interpretationZone);
        if (numeric !== null) return numeric;
        if (!this.isValue(value)) return null;

        const date = new Date(0);
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCFullYear(value.year, value.month - 1, value.day);

        return date.getUTCFullYear() === value.year
            && date.getUTCMonth() === value.month - 1
            && date.getUTCDate() === value.day
            ? date.getTime()
            : null;
    }

    fromCalendarMillis(value: number): DateTime {
        return DateTime.fromMillis(value, {zone: 'utc'});
    }
}

export const IMS_DATEPICKER_VALUE_HANDLER =
    new InjectionToken<ImsDatepickerValueHandler<object>>(
        'IMS_DATEPICKER_VALUE_HANDLER',
        {factory: () => inject(ImsDatepickerLuxonValueHandler)}
    );

export function provideImsDatepickerValueHandler(
    handler: Type<ImsDatepickerValueHandler<object>>
): Provider {
    return {
        provide: IMS_DATEPICKER_VALUE_HANDLER,
        useClass: handler
    };
}

export function provideImsDatepickerDateValueHandler(): Provider {
    return provideImsDatepickerValueHandler(ImsDatepickerDateValueHandler);
}

export function provideImsDatepickerLuxonValueHandler(): Provider {
    return provideImsDatepickerValueHandler(ImsDatepickerLuxonValueHandler);
}

export function calendarMillisFromNumber(
    value: unknown,
    interpretationZone: string
): number | null {
    if (typeof value !== 'number') return null;

    const normalized: ImsDatepickerDate | null = normalizeDateValue(
        value,
        interpretationZone,
        'dd/MM/yyyy',
        'start'
    );
    return normalized ? toUtcEpochMillis(normalized) : null;
}
