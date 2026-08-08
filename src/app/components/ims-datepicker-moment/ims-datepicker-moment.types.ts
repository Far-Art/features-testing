import {InjectionToken, Provider} from '@angular/core';
import type {Moment} from 'moment';

export type ImsDatepickerMomentPrecision = 'dd/MM/yyyy' | 'MM/yyyy';
export type ImsDatepickerMomentDate = Moment;
/** Internal, date-only UTC representation shared by the calendar engine. */
export type ImsDatepickerMomentCalendarDate = Date;
export type ImsDatepickerMomentValue = ImsDatepickerMomentDate | number | null | undefined;
export type ImsDatepickerMomentValueType = 'moment' | 'millis';
export type ImsDatepickerMomentMonthDay = 'start' | 'end';
export type ImsDatepickerMomentView = 'day' | 'month' | 'year';
export type ImsDatepickerMomentFirstDayOfWeek = 1 | 7;
export type ImsDatepickerMomentDateFilter = (date: ImsDatepickerMomentDate) => boolean;

export interface ImsDatepickerMomentFormats {
    readonly parse: {
        readonly dateInput: readonly string[];
        readonly monthInput: readonly string[];
    };
    readonly display: {
        readonly dateInput: string;
        readonly monthInput: string;
        readonly monthLabel: string;
        readonly yearLabel: string;
        readonly monthYearLabel: string;
        readonly dayAriaLabel: string;
    };
}

export interface ImsDatepickerMomentConfig {
    readonly min?: ImsDatepickerMomentValue;
    readonly max?: ImsDatepickerMomentValue;
    /**
     * Global strict date filter. An instance filter can further restrict dates,
     * but cannot enable a date rejected by this predicate.
     */
    readonly dateFilter?: ImsDatepickerMomentDateFilter;
    readonly valueType?: ImsDatepickerMomentValueType;
    readonly locale?: string;
    /**
     * Zone used to interpret millisecond inputs and obtain the current calendar
     * date. Moment and millisecond outputs are serialized at UTC midnight.
     */
    readonly zone?: string;
    readonly firstDayOfWeek?: ImsDatepickerMomentFirstDayOfWeek;
    readonly formats?: PartialImsDatepickerMomentFormats;
}

export interface PartialImsDatepickerMomentFormats {
    readonly parse?: {
        readonly dateInput?: readonly string[];
        readonly monthInput?: readonly string[];
    };
    readonly display?: Partial<ImsDatepickerMomentFormats['display']>;
}

export const IMS_DATEPICKER_MOMENT_DEFAULT_FORMATS: ImsDatepickerMomentFormats = {
    parse: {
        dateInput: ['d/M/yyyy', 'dd/MM/yyyy'],
        monthInput: ['M/yyyy', 'MM/yyyy']
    },
    display: {
        dateInput: 'dd/MM/yyyy',
        monthInput: 'MM/yyyy',
        monthLabel: 'LLLL',
        yearLabel: 'yyyy',
        monthYearLabel: 'LLLL yyyy',
        dayAriaLabel: 'cccc, d LLLL yyyy'
    }
};

export const IMS_DATEPICKER_MOMENT_CONFIG = new InjectionToken<ImsDatepickerMomentConfig>(
    'IMS_DATEPICKER_MOMENT_CONFIG',
    {factory: () => ({})}
);

export function provideImsDatepickerMomentConfig(config: ImsDatepickerMomentConfig): Provider {
    return {
        provide: IMS_DATEPICKER_MOMENT_CONFIG,
        useValue: config
    };
}
