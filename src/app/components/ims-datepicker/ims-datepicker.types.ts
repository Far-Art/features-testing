import {InjectionToken, Provider} from '@angular/core';
import type {DateTime} from 'luxon';

export type ImsDatepickerPrecision = 'dd/MM/yyyy' | 'MM/yyyy';
export type ImsDatepickerDate = Date;
export type ImsDatepickerValue<TDate extends object = DateTime> =
    TDate | number | null | undefined;
export type ImsDatepickerAnyValue = ImsDatepickerValue<object>;
export type ImsDatepickerValueType = 'date' | 'millis';
export type ImsDatepickerMonthDay = 'start' | 'end';
export type ImsDatepickerView = 'day' | 'month' | 'year';
export type ImsDatepickerFirstDayOfWeek = 1 | 7;
export type ImsDatepickerDateFilter<TDate extends object = DateTime> =
    (date: TDate) => boolean;

export interface ImsDatepickerLabels {
    readonly openCalendar: string;
    readonly closeCalendar: string;
    readonly clearDate: string;
    readonly changeCalendarView: string;
    readonly calendarFor: string;
    readonly chooseMonthIn: string;
    readonly chooseYearFrom: string;
    readonly previousMonth: string;
    readonly nextMonth: string;
    readonly previousYear: string;
    readonly nextYear: string;
    readonly previousYears: string;
    readonly nextYears: string;
    readonly startOfMonth: string;
    readonly today: string;
    readonly endOfMonth: string;
    readonly week: string;
}

export type PartialImsDatepickerLabels = Partial<ImsDatepickerLabels>;

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

export interface ImsDatepickerConfig<TDate extends object = DateTime> {
    readonly min?: ImsDatepickerValue<TDate>;
    readonly max?: ImsDatepickerValue<TDate>;
    /**
     * Global strict date filter. An instance filter can further restrict dates,
     * but cannot enable a date rejected by this predicate.
     */
    readonly dateFilter?: ImsDatepickerDateFilter<TDate>;
    readonly valueType?: ImsDatepickerValueType;
    readonly locale?: string;
    /**
     * Zone used to interpret millisecond inputs and obtain the current calendar
     * date. Concrete handler values and millisecond outputs represent UTC midnight.
     */
    readonly zone?: string;
    readonly firstDayOfWeek?: ImsDatepickerFirstDayOfWeek;
    readonly formats?: PartialImsDatepickerFormats;
    readonly labels?: PartialImsDatepickerLabels;
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

export const IMS_DATEPICKER_DEFAULT_LABELS: ImsDatepickerLabels = {
    openCalendar: 'Open calendar',
    closeCalendar: 'Close calendar',
    clearDate: 'Clear date',
    changeCalendarView: 'Change calendar view',
    calendarFor: 'Calendar for {period}',
    chooseMonthIn: 'Choose a month in {period}',
    chooseYearFrom: 'Choose a year from {period}',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    previousYears: 'Previous {count} years',
    nextYears: 'Next {count} years',
    startOfMonth: 'Start of month',
    today: 'Today',
    endOfMonth: 'End of month',
    week: 'Week'
};

export const IMS_DATEPICKER_CONFIG = new InjectionToken<ImsDatepickerConfig<object>>(
    'IMS_DATEPICKER_CONFIG',
    {factory: () => ({})}
);

export function provideImsDatepickerConfig<TDate extends object = DateTime>(
    config: ImsDatepickerConfig<TDate>
): Provider {
    return {
        provide: IMS_DATEPICKER_CONFIG,
        useValue: config
    };
}
