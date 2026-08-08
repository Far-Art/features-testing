import {Injectable, Provider} from '@angular/core';
import moment from 'moment';
import type {Moment} from 'moment';
import type {ImsDatepickerValue} from '../ims-datepicker/ims-datepicker.types';
import {
    ImsDatepickerValueHandler,
    calendarMillisFromNumber,
    provideImsDatepickerValueHandler
} from '../ims-datepicker/ims-datepicker.value-handler';
import {canonicalDate, toUtcEpochMillis} from '../ims-datepicker/ims-datepicker.utils';

export type ImsDatepickerMomentValue = ImsDatepickerValue<Moment>;

@Injectable()
export class ImsDatepickerMomentValueHandler
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
    return provideImsDatepickerValueHandler(ImsDatepickerMomentValueHandler);
}
