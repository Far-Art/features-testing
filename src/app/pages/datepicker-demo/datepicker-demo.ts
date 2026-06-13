import {JsonPipe} from '@angular/common';
import {Component, signal} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Temporal} from '@js-temporal/polyfill';
import {
    ImsDatepicker,
    ImsDatepickerValue,
    toUtcEpochMillis
} from '../../components/ims-datepicker';
import {TemporalHelper} from '../../shared/temporal.helper';

@Component({
    selector: 'app-datepicker-demo',
    imports: [FormsModule, ReactiveFormsModule, JsonPipe, ImsDatepicker],
    templateUrl: './datepicker-demo.html',
    styleUrl: './datepicker-demo.scss'
})
export class DatepickerDemo {
    readonly dateControl = new FormControl<ImsDatepickerValue>(
        TemporalHelper.plainDate(2026, 6, 7)
    );
    readonly monthControl = new FormControl<ImsDatepickerValue>(
        toUtcEpochMillis(TemporalHelper.plainDate(2026, 6, 30))
    );
    readonly min = signal<ImsDatepickerValue>(TemporalHelper.plainDate(2020, 1, 1));
    readonly max = signal<ImsDatepickerValue>(TemporalHelper.plainDate(2035, 12, 31));

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
        this.min.set(TemporalHelper.plainDate(2026, 1, 1));
        this.max.set(TemporalHelper.plainDate(2026, 12, 31));
    }

    restoreRange(): void {
        this.min.set(TemporalHelper.plainDate(2020, 1, 1));
        this.max.set(TemporalHelper.plainDate(2035, 12, 31));
    }

    describe(value: ImsDatepickerValue): string {
        if (value instanceof Temporal.PlainDate) return value.toString();
        return value === null || value === undefined ? 'null' : String(value);
    }
}

