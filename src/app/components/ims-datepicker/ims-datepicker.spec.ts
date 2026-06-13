import {Component} from '@angular/core';
import {OverlayContainer} from '@angular/cdk/overlay';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Temporal} from '@js-temporal/polyfill';
import {ImsDatepicker} from './ims-datepicker';
import {ImsDatepickerValue} from './ims-datepicker.types';

function plainDate(year: number, month: number, day: number): Temporal.PlainDate {
    return Temporal.PlainDate.from({year, month, day});
}

function utcMillis(year: number, month: number, day: number): number {
    return Date.UTC(year, month - 1, day);
}

@Component({
    imports: [ReactiveFormsModule, ImsDatepicker],
    template: `
        <ims-datepicker
            [formControl]="control"
            [format]="format"
            [monthDay]="monthDay"
            [min]="min"
            [max]="max"
            [valueType]="valueType"
        />
    `
})
class DatepickerTestHost {
    readonly control = new FormControl<ImsDatepickerValue>(null);
    format: 'dd/MM/yyyy' | 'MM/yyyy' = 'dd/MM/yyyy';
    monthDay: 'start' | 'end' = 'start';
    min: ImsDatepickerValue = null;
    max: ImsDatepickerValue = null;
    valueType: 'temporal' | 'millis' | null = 'millis';
}

describe('ImsDatepicker', () => {
    let fixture: ComponentFixture<DatepickerTestHost>;
    let host: DatepickerTestHost;
    let input: HTMLInputElement;
    let overlayContainer: OverlayContainer;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DatepickerTestHost]
        }).compileComponents();

        fixture = TestBed.createComponent(DatepickerTestHost);
        host = fixture.componentInstance;
        overlayContainer = TestBed.inject(OverlayContainer);
        fixture.detectChanges();
        input = fixture.nativeElement.querySelector('input');
    });

    it('coerces typed text and emits UTC midnight milliseconds', () => {
        input.value = '5-2-2028';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(host.control.value).toBe(utcMillis(2028, 2, 5));
        expect(input.value).toBe('05/02/2028');
    });

    it('emits Temporal dates when no millisecond value type is configured', () => {
        host.valueType = null;
        fixture.detectChanges();

        input.value = '5-2-2028';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(host.control.value instanceof Temporal.PlainDate).toBeTrue();
        expect(host.control.value?.toString()).toBe('2028-02-05');
    });

    it('automatically contributes reactive-form min and max validation', () => {
        host.min = plainDate(2026, 1, 1);
        host.max = plainDate(2026, 12, 31);
        fixture.detectChanges();

        host.control.setValue(utcMillis(2025, 12, 31));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMin')).toBeTrue();

        host.control.setValue(utcMillis(2027, 1, 1));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMax')).toBeTrue();

        host.control.setValue(utcMillis(2026, 6, 1));
        fixture.detectChanges();
        expect(host.control.valid).toBeTrue();
    });

    it('does not allow an instance range to relax the default global range', () => {
        host.min = plainDate(1800, 1, 1);
        host.max = plainDate(2200, 12, 31);
        fixture.detectChanges();

        host.control.setValue(utcMillis(1899, 12, 31));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMin')).toBeTrue();

        host.control.setValue(utcMillis(2101, 1, 1));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMax')).toBeTrue();
    });

    it('keeps invalid numeric text and exposes a parse validation error', () => {
        input.value = '99/99/9999';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(input.value).toBe('99/99/9999');
        expect(host.control.value).toBeNull();
        expect(host.control.hasError('imsDatepickerParse')).toBeTrue();
    });

    it('uses the last day at UTC midnight for end-of-month precision', () => {
        host.format = 'MM/yyyy';
        host.monthDay = 'end';
        fixture.detectChanges();

        input.value = '2/2028';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(host.control.value).toBe(utcMillis(2028, 2, 29));
        expect(input.value).toBe('02/2028');
    });

    it('cycles through day, year, and month views for full dates', () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;

        datepicker.calendarView.set('day');
        datepicker.cycleView();
        expect(datepicker.calendarView()).toBe('year');

        datepicker.cycleView();
        expect(datepicker.calendarView()).toBe('month');

        datepicker.cycleView();
        expect(datepicker.calendarView()).toBe('day');
    });

    it('does not cycle to the day view for month-only values', () => {
        host.format = 'MM/yyyy';
        fixture.detectChanges();

        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;

        datepicker.calendarView.set('month');
        datepicker.cycleView();
        expect(datepicker.calendarView()).toBe('year');

        datepicker.cycleView();
        expect(datepicker.calendarView()).toBe('month');
    });

    it('uses the month and year as the day-view header label', () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;

        datepicker.cursor.set(plainDate(2028, 2, 1));
        datepicker.calendarView.set('day');

        expect(datepicker.headerLabel()).toBe('February 2028');
    });

    it('renders blank placeholders instead of days from adjacent months', () => {
        host.control.setValue(utcMillis(2028, 2, 5));
        fixture.detectChanges();

        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.openPicker();
        fixture.detectChanges();

        const overlay = overlayContainer.getContainerElement();
        expect(overlay.querySelectorAll('button.ims-datepicker__day').length).toBe(29);
        expect(overlay.querySelectorAll('.ims-datepicker__day-placeholder').length).toBe(13);
    });

    it('adapts navigation actions and labels to the displayed view', () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;

        datepicker.cursor.set(plainDate(2028, 2, 5));
        datepicker.calendarView.set('day');
        expect(datepicker.navigationLabel('near', 1)).toBe('Next month');
        expect(datepicker.navigationLabel('far', -1)).toBe('Previous year');
        datepicker.navigate('near', 1);
        expect(datepicker.cursor().toString()).toBe('2028-03-05');
        datepicker.navigate('far', -1);
        expect(datepicker.cursor().toString()).toBe('2027-03-05');

        datepicker.cursor.set(plainDate(2028, 2, 5));
        datepicker.calendarView.set('month');
        expect(datepicker.navigationLabel('near', 1)).toBe('Next year');
        expect(datepicker.navigationLabel('far', -1)).toBe('Previous 10 years');
        datepicker.navigate('far', 1);
        expect(datepicker.cursor().year).toBe(2038);

        datepicker.cursor.set(plainDate(2000, 2, 5));
        datepicker.calendarView.set('year');
        expect(datepicker.navigationLabel('near', 1)).toBe('Next 24 years');
        expect(datepicker.navigationLabel('far', -1)).toBe('Previous 48 years');
        datepicker.navigate('near', 1);
        expect(datepicker.cursor().year).toBe(2024);
        datepicker.navigate('far', -1);
        expect(datepicker.cursor().year).toBe(1976);
    });

    it('adds matching native tooltips to the navigation buttons', () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.cursor.set(plainDate(2028, 2, 5));
        datepicker.open.set(true);
        fixture.detectChanges();

        const buttons = Array.from(
            overlayContainer.getContainerElement().querySelectorAll<HTMLButtonElement>(
                '.ims-datepicker__header .ims-datepicker__step'
            )
        );

        expect(buttons.map((button) => button.title)).toEqual([
            'Previous year',
            'Previous month',
            'Next month',
            'Next year'
        ]);
    });
});
