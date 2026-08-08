import {JsonPipe} from '@angular/common';
import {Component, signal, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Temporal} from '@js-temporal/polyfill';
import moment from 'moment';
import type {Moment} from 'moment';
import {
    ImsDatepicker,
    ImsDatepickerValue
} from '../../components/ims-datepicker';
import {
    ImsDatepickerExperimental,
    ImsDatepickerExperimentalValue,
    provideImsDatepickerExperimentalConfig
} from '../../components/ims-datepicker-experimental';
import {
    ImsDatepickerMoment,
    ImsDatepickerMomentValue,
    provideImsDatepickerMomentConfig
} from '../../components/ims-datepicker-moment';
import {TemporalHelper} from '../../shared/temporal.helper';

@Component({
    selector: 'app-datepicker-demo',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        JsonPipe,
        ImsDatepicker,
        ImsDatepickerMoment,
        ImsDatepickerExperimental
    ],
    providers: [
        provideImsDatepickerMomentConfig({
            locale: 'he',
            zone: 'Asia/Jerusalem',
            firstDayOfWeek: 7
        }),
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
    readonly dateControl = new FormControl<ImsDatepickerValue>(
        utcDate(2026, 6, 7)
    );
    readonly monthControl = new FormControl<ImsDatepickerValue>(
        Date.UTC(2026, 5, 30)
    );
    readonly temporalControl = new FormControl<ImsDatepickerExperimentalValue>(
        TemporalHelper.plainDate(2026, 6, 7)
    );
    readonly momentControl = new FormControl<ImsDatepickerMomentValue>(
        moment.utc([2026, 5, 7])
    );
    readonly min = signal<ImsDatepickerValue>(utcDate(2020, 1, 1));
    readonly max = signal<ImsDatepickerValue>(utcDate(2035, 12, 31));

    templateDate: ImsDatepickerValue = null;

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

    describe(
        value: ImsDatepickerValue | ImsDatepickerExperimentalValue | ImsDatepickerMomentValue
    ): string {
        if (value instanceof Date) return value.toISOString();
        if (value instanceof Temporal.PlainDate) return value.toString();
        if (moment.isMoment(value)) return (value as Moment).toISOString();
        return value === null || value === undefined ? 'null' : String(value);
    }
}

function utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}
