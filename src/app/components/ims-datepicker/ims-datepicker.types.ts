import {InjectionToken, Provider} from '@angular/core';
import {Temporal} from '@js-temporal/polyfill';

export type ImsDatepickerPrecision = 'dd/MM/yyyy' | 'MM/yyyy';
export type ImsDatepickerDate = Temporal.PlainDate;
export type ImsDatepickerValue = ImsDatepickerDate | number | null | undefined;
export type ImsDatepickerValueType = 'temporal' | 'millis';
export type ImsDatepickerMonthDay = 'start' | 'end';
export type ImsDatepickerView = 'day' | 'month' | 'year';
export type ImsDatepickerFirstDayOfWeek = 1 | 7;
export type ImsDatepickerDateFilter = (date: ImsDatepickerDate) => boolean;

export interface ImsDatepickerFormats {
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

export interface ImsDatepickerConfig {
    readonly min?: ImsDatepickerValue;
    readonly max?: ImsDatepickerValue;
    /**
     * Global strict date filter. An instance filter can further restrict dates,
     * but cannot enable a date rejected by this predicate.
     */
    readonly dateFilter?: ImsDatepickerDateFilter;
    readonly valueType?: ImsDatepickerValueType;
    readonly locale?: string;
    /**
     * Zone used to interpret millisecond inputs and obtain the current calendar
     * date. Millisecond outputs are serialized at UTC midnight.
     */
    readonly zone?: string;
    readonly firstDayOfWeek?: ImsDatepickerFirstDayOfWeek;
    readonly formats?: PartialImsDatepickerFormats;
}

export interface PartialImsDatepickerFormats {
    readonly parse?: {
        readonly dateInput?: readonly string[];
        readonly monthInput?: readonly string[];
    };
    readonly display?: Partial<ImsDatepickerFormats['display']>;
}

export const IMS_DATEPICKER_DEFAULT_FORMATS: ImsDatepickerFormats = {
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

export const IMS_DATEPICKER_CONFIG = new InjectionToken<ImsDatepickerConfig>(
    'IMS_DATEPICKER_CONFIG',
    {factory: () => ({})}
);

export function provideImsDatepickerConfig(config: ImsDatepickerConfig): Provider {
    return {
        provide: IMS_DATEPICKER_CONFIG,
        useValue: config
    };
}
