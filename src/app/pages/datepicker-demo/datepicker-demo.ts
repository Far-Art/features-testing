import {JsonPipe} from '@angular/common';
import {Component, signal, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DateTime} from 'luxon';
import {
    ImsDatepicker,
    ImsDatepickerDateValue,
    ImsDatepickerLuxonValue
} from '../../components/ims-datepicker';
import {ReadonlyDirective} from '../../shared/readonly.directive';

@Component({
    selector: 'app-datepicker-demo',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        JsonPipe,
        ImsDatepicker,
        ReadonlyDirective
    ],
    templateUrl: './datepicker-demo.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './datepicker-demo.scss'
})
export class DatepickerDemo {
    readonly dateControl = new FormControl<ImsDatepickerDateValue>(
        utcDate(2026, 6, 7)
    );
    readonly monthControl = new FormControl<ImsDatepickerDateValue>(
        Date.UTC(2026, 5, 30)
    );
    readonly readonlyDateControl = new FormControl<ImsDatepickerDateValue>(
        utcDate(2026, 8, 8)
    );
    readonly luxonControl = new FormControl<ImsDatepickerLuxonValue>(
        DateTime.utc(2026, 6, 7)
    );
    readonly min = signal<ImsDatepickerDateValue>(utcDate(2020, 1, 1));
    readonly max = signal<ImsDatepickerDateValue>(utcDate(2035, 12, 31));
    readonly readonlyEnabled = signal(true);
    readonly datepickerEvent = signal('—');

    templateDate: ImsDatepickerDateValue = null;

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
        if (DateTime.isDateTime(value)) return value.toISO() ?? 'Invalid DateTime';
        return value === null || value === undefined ? 'null' : String(value);
    }
}

function utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}
