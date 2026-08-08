import {InjectionToken, Provider} from '@angular/core';
import {Temporal} from '@js-temporal/polyfill';

export type ImsDatepickerExperimentalPrecision = 'dd/MM/yyyy' | 'MM/yyyy';
export type ImsDatepickerExperimentalDate = Temporal.PlainDate;
export type ImsDatepickerExperimentalValue = ImsDatepickerExperimentalDate | number | null | undefined;
export type ImsDatepickerExperimentalValueType = 'temporal' | 'millis';
export type ImsDatepickerExperimentalMonthDay = 'start' | 'end';
export type ImsDatepickerExperimentalView = 'day' | 'month' | 'year';
export type ImsDatepickerExperimentalFirstDayOfWeek = 1 | 7;
export type ImsDatepickerExperimentalDateFilter = (date: ImsDatepickerExperimentalDate) => boolean;

export interface ImsDatepickerExperimentalFormats {
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

export interface ImsDatepickerExperimentalConfig {
    readonly min?: ImsDatepickerExperimentalValue;
    readonly max?: ImsDatepickerExperimentalValue;
    /**
     * Global strict date filter. An instance filter can further restrict dates,
     * but cannot enable a date rejected by this predicate.
     */
    readonly dateFilter?: ImsDatepickerExperimentalDateFilter;
    readonly valueType?: ImsDatepickerExperimentalValueType;
    readonly locale?: string;
    /**
     * Zone used to interpret millisecond inputs and obtain the current calendar
     * date. Millisecond outputs are serialized at UTC midnight.
     */
    readonly zone?: string;
    readonly firstDayOfWeek?: ImsDatepickerExperimentalFirstDayOfWeek;
    readonly formats?: PartialImsDatepickerExperimentalFormats;
}

export interface PartialImsDatepickerExperimentalFormats {
    readonly parse?: {
        readonly dateInput?: readonly string[];
        readonly monthInput?: readonly string[];
    };
    readonly display?: Partial<ImsDatepickerExperimentalFormats['display']>;
}

export const IMS_DATEPICKER_EXPERIMENTAL_DEFAULT_FORMATS: ImsDatepickerExperimentalFormats = {
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

export const IMS_DATEPICKER_EXPERIMENTAL_CONFIG = new InjectionToken<ImsDatepickerExperimentalConfig>(
    'IMS_DATEPICKER_EXPERIMENTAL_CONFIG',
    {factory: () => ({})}
);

export function provideImsDatepickerExperimentalConfig(config: ImsDatepickerExperimentalConfig): Provider {
    return {
        provide: IMS_DATEPICKER_EXPERIMENTAL_CONFIG,
        useValue: config
    };
}
