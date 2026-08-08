import {Directive, Provider, forwardRef} from '@angular/core';
import moment from 'moment';
import type {Moment} from 'moment';
import type {ImsDatepickerValue} from './ims-datepicker.types';
import {
    IMS_DATEPICKER_VALUE_HANDLER,
    ImsDatepickerValueHandler,
    calendarMillisFromNumber,
    provideImsDatepickerValueHandler
} from './ims-datepicker-value.directive';
import {canonicalDate, toUtcEpochMillis} from './ims-datepicker.utils';

export type ImsDatepickerMomentValue = ImsDatepickerValue<Moment>;

/** Selects and handles Moment values for an ims-datepicker instance. */
@Directive({
    selector: 'ims-datepicker[imsDatepickerMoment]',
    providers: [{
        provide: IMS_DATEPICKER_VALUE_HANDLER,
        useExisting: forwardRef(() => ImsDatepickerMomentValueHandlerDirective)
    }]
})
export class ImsDatepickerMomentValueHandlerDirective
    implements ImsDatepickerValueHandler<Moment> {
    isValue(value: unknown): value is Moment {
        return moment.isMoment(value) && value.isValid();
    }

    toCalendarMillis(value: unknown, interpretationZone: string): number | null {
        const numeric = calendarMillisFromNumber(value, interpretationZone);
        if (numeric !== null) return numeric;
        if (!this.isValue(value)) return null;

        const date = canonicalDate(value.year(), value.month() + 1, value.date());
        return date ? toUtcEpochMillis(date) : null;
    }

    fromCalendarMillis(value: number): Moment {
        return moment.utc(value);
    }
}

export function provideImsDatepickerMomentValueHandler(): Provider {
    return provideImsDatepickerValueHandler(ImsDatepickerMomentValueHandlerDirective);
}
