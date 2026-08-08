import {JsonPipe} from '@angular/common';
import {Component, signal, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Temporal} from '@js-temporal/polyfill';
import {DateTime} from 'luxon';
import moment from 'moment';
import type {Moment} from 'moment';
import {
    ImsDatepicker,
    ImsDatepickerDateValueHandlerDirective,
    ImsDatepickerValue
} from '../../components/ims-datepicker';
import {
    ImsDatepickerExperimental,
    ImsDatepickerExperimentalValue,
    provideImsDatepickerExperimentalConfig
} from '../../components/ims-datepicker-experimental';
import {
    ImsDatepickerMomentValue,
    ImsDatepickerMomentValueHandlerDirective
} from '../../components/ims-datepicker-moment';
import {
    ImsDatepickerLuxonValue
} from '../../components/ims-datepicker-luxon';
import {ReadonlyDirective} from '../../shared/readonly.directive';
import {TemporalHelper} from '../../shared/temporal.helper';

@Component({
    selector: 'app-datepicker-demo',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        JsonPipe,
        ImsDatepicker,
        ImsDatepickerDateValueHandlerDirective,
        ImsDatepickerMomentValueHandlerDirective,
        ImsDatepickerExperimental,
        ReadonlyDirective
    ],
    providers: [
        provideImsDatepickerExperimentalConfig({
            locale: 'he',
            zone: 'Asia/Jerusalem',
            firstDayOfWeek: 7
        })
    ],
    templateUrl: './datepicker-demo.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './datepicker-demo.scss'
})
export class DatepickerDemo {
    readonly dateControl = new FormControl<NativeDatepickerValue>(
        utcDate(2026, 6, 7)
    );
    readonly monthControl = new FormControl<NativeDatepickerValue>(
        Date.UTC(2026, 5, 30)
    );
    readonly readonlyDateControl = new FormControl<NativeDatepickerValue>(
        utcDate(2026, 8, 8)
    );
    readonly temporalControl = new FormControl<ImsDatepickerExperimentalValue>(
        TemporalHelper.plainDate(2026, 6, 7)
    );
    readonly momentControl = new FormControl<ImsDatepickerMomentValue>(
        moment.utc([2026, 5, 7])
    );
    readonly luxonControl = new FormControl<ImsDatepickerLuxonValue>(
        DateTime.utc(2026, 6, 7)
    );
    readonly min = signal<NativeDatepickerValue>(utcDate(2020, 1, 1));
    readonly max = signal<NativeDatepickerValue>(utcDate(2035, 12, 31));
    readonly readonlyEnabled = signal(true);
    readonly datepickerEvent = signal('—');

    templateDate: NativeDatepickerValue = null;

    readonly customFormats = {
        parse: {
            dateInput: ['yyyy.MM.dd']
        },
        display: {
            dateInput: 'yyyy.MM.dd'
        }
    };

    tightenRange(): void {
        this.min.set(utcDate(2026, 1, 1));
        this.max.set(utcDate(2026, 12, 31));
    }

    restoreRange(): void {
        this.min.set(utcDate(2020, 1, 1));
        this.max.set(utcDate(2035, 12, 31));
    }

    toggleReadonly(): void {
        this.readonlyEnabled.update((enabled) => !enabled);
    }

    logDatepickerEvent(name: string, value?: unknown): void {
        const detail = value === undefined ? '' : `: ${this.describe(value)}`;
        this.datepickerEvent.set(`${name}${detail}`);
    }

    describe(value: unknown): string {
        if (value instanceof Date) return value.toISOString();
        if (value instanceof Temporal.PlainDate) return value.toString();
        if (moment.isMoment(value)) return (value as Moment).toISOString();
        if (DateTime.isDateTime(value)) return value.toISO() ?? 'Invalid DateTime';
        return value === null || value === undefined ? 'null' : String(value);
    }
}

function utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}

type NativeDatepickerValue = ImsDatepickerValue<Date>;
