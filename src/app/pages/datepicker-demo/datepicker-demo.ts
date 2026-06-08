import {JsonPipe} from '@angular/common';
import {Component, signal} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DateTime} from 'luxon';
import {
    ImsDatepicker,
    ImsDatepickerValue
} from '../../components/ims-datepicker';

@Component({
    selector: 'app-datepicker-demo',
    imports: [FormsModule, ReactiveFormsModule, JsonPipe, ImsDatepicker],
    templateUrl: './datepicker-demo.html',
    styleUrl: './datepicker-demo.scss'
})
export class DatepickerDemo {
    readonly dateControl = new FormControl<ImsDatepickerValue>(
        DateTime.utc(2026, 6, 7)
    );
    readonly monthControl = new FormControl<ImsDatepickerValue>(
        DateTime.utc(2026, 6, 30).toMillis()
    );
    readonly min = signal<ImsDatepickerValue>(DateTime.utc(2020, 1, 1));
    readonly max = signal<ImsDatepickerValue>(DateTime.utc(2035, 12, 31));

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
        this.min.set(DateTime.utc(2026, 1, 1));
        this.max.set(DateTime.utc(2026, 12, 31));
    }

    restoreRange(): void {
        this.min.set(DateTime.utc(2020, 1, 1));
        this.max.set(DateTime.utc(2035, 12, 31));
    }

    describe(value: ImsDatepickerValue): string {
        if (DateTime.isDateTime(value)) return value.toISO() ?? '';
        return value === null || value === undefined ? 'null' : String(value);
    }
}

