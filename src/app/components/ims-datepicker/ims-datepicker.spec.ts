import { Component, ChangeDetectionStrategy } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateTime } from 'luxon';
import { ImsDatepicker } from './ims-datepicker';
import { ImsDatepickerValue } from './ims-datepicker.types';

function calendarDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}

function luxonDate(year: number, month: number, day: number): DateTime {
    return DateTime.utc(year, month, day);
}

function utcMillis(year: number, month: number, day: number): number {
    return Date.UTC(year, month - 1, day);
}

@Component({
    imports: [ReactiveFormsModule, ImsDatepicker],
    changeDetection: ChangeDetectionStrategy.Eager,
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
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
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

    it('renders the field and calendar trigger with the shared input-action contract', () => {
        const fixtureElement = fixture.nativeElement as HTMLElement;
        const datepickerHost = fixtureElement.querySelector<HTMLElement>('ims-datepicker')!;
        const field = datepickerHost.querySelector<HTMLElement>('.ims-datepicker__field')!;
        const toggle = datepickerHost.querySelector<HTMLButtonElement>('.ims-datepicker__toggle')!;

        expect(datepickerHost.classList.contains('ims-input-action')).toBe(true);
        expect(field.classList.contains('ims-input-action__field')).toBe(true);
        expect(toggle.classList.contains('ims-input-action__button')).toBe(true);
        expect(toggle.classList.contains('ims-button-icon')).toBe(true);
        expect(field.parentElement).toBe(datepickerHost);
        expect(toggle.parentElement).toBe(datepickerHost);
        expect(toggle.querySelector('.ims-button__symbol')?.textContent).toBe('calendar_month');
    });

    it('keeps the adjacent trigger inside the overlay interaction boundary', () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
            '.ims-datepicker__toggle'
        )!;
        datepicker.openPicker();
        fixture.detectChanges();

        const event = new MouseEvent('click');
        Object.defineProperty(event, 'target', { value: toggle });
        datepicker.onOutsideClick(event);

        expect(datepicker.open()).toBe(true);

        toggle.click();
        fixture.detectChanges();

        expect(datepicker.open()).toBe(false);
    });

    it('keeps the adjacent trigger accessibility and disabled state synchronized', () => {
        const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
            '.ims-datepicker__toggle'
        )!;

        expect(toggle.getAttribute('aria-label')).toBe('Open calendar');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(toggle.getAttribute('aria-controls')).toBeNull();

        toggle.click();
        fixture.detectChanges();

        expect(toggle.getAttribute('aria-label')).toBe('Close calendar');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(toggle.getAttribute('aria-controls')).not.toBeNull();

        host.control.disable();
        fixture.detectChanges();

        expect(input.disabled).toBe(true);
        expect(toggle.disabled).toBe(true);
        expect(toggle.getAttribute('aria-disabled')).toBe('true');
    });

    it('coerces typed text and emits UTC midnight milliseconds', () => {
        input.value = '5-2-2028';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(host.control.value).toBe(utcMillis(2028, 2, 5));
        expect(input.value).toBe('05/02/2028');
    });

    it('emits Luxon dates when no millisecond value type is configured', () => {
        host.valueType = null;
        fixture.detectChanges();

        input.value = '5-2-2028';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(DateTime.isDateTime(host.control.value)).toBe(true);
        expect((host.control.value as DateTime).toISODate()).toBe('2028-02-05');
    });

    it('automatically contributes reactive-form min and max validation', () => {
        host.min = luxonDate(2026, 1, 1);
        host.max = luxonDate(2026, 12, 31);
        fixture.detectChanges();

        host.control.setValue(utcMillis(2025, 12, 31));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMin')).toBe(true);

        host.control.setValue(utcMillis(2027, 1, 1));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMax')).toBe(true);

        host.control.setValue(utcMillis(2026, 6, 1));
        fixture.detectChanges();
        expect(host.control.valid).toBe(true);
    });

    it('does not allow an instance range to relax the default global range', () => {
        host.min = luxonDate(1800, 1, 1);
        host.max = luxonDate(2300, 12, 31);
        fixture.detectChanges();

        host.control.setValue(utcMillis(1899, 12, 31));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMin')).toBe(true);

        host.control.setValue(utcMillis(2201, 1, 1));
        fixture.detectChanges();
        expect(host.control.hasError('imsDatepickerMax')).toBe(true);
    });

    it('keeps invalid numeric text and exposes a parse validation error', () => {
        input.value = '99/99/9999';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(input.value).toBe('99/99/9999');
        expect(host.control.value).toBeNull();
        expect(host.control.hasError('imsDatepickerParse')).toBe(true);
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

        datepicker.cursor.set(calendarDate(2028, 2, 1));
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

        datepicker.cursor.set(calendarDate(2028, 2, 5));
        datepicker.calendarView.set('day');
        expect(datepicker.navigationLabel('near', 1)).toBe('Next month');
        expect(datepicker.navigationLabel('far', -1)).toBe('Previous year');
        datepicker.navigate('near', 1);
        expect(datepicker.cursor().toISOString().slice(0, 10)).toBe('2028-03-05');
        datepicker.navigate('far', -1);
        expect(datepicker.cursor().toISOString().slice(0, 10)).toBe('2027-03-05');

        datepicker.cursor.set(calendarDate(2028, 2, 5));
        datepicker.calendarView.set('month');
        expect(datepicker.navigationLabel('near', 1)).toBe('Next year');
        expect(datepicker.navigationLabel('far', -1)).toBe('Previous 10 years');
        datepicker.navigate('far', 1);
        expect(datepicker.cursor().getUTCFullYear()).toBe(2038);

        datepicker.cursor.set(calendarDate(2000, 2, 5));
        datepicker.calendarView.set('year');
        expect(datepicker.navigationLabel('near', 1)).toBe('Next 24 years');
        expect(datepicker.navigationLabel('far', -1)).toBe('Previous 48 years');
        datepicker.navigate('near', 1);
        expect(datepicker.cursor().getUTCFullYear()).toBe(2024);
        datepicker.navigate('far', -1);
        expect(datepicker.cursor().getUTCFullYear()).toBe(1976);
    });

    it('adds matching native tooltips to the navigation buttons', () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.cursor.set(calendarDate(2028, 2, 5));
        datepicker.open.set(true);
        fixture.detectChanges();

        const buttons = Array.from(overlayContainer.getContainerElement().querySelectorAll<HTMLButtonElement>('.ims-datepicker__header .ims-datepicker__step'));

        expect(buttons.map((button) => button.title)).toEqual([
            'Previous year',
            'Previous month',
            'Next month',
            'Next year'
        ]);
    });

    it('returns focus to the grid when an arrow key is pressed in the header', async () => {
        host.control.setValue(utcMillis(2028, 2, 5));
        fixture.detectChanges();

        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.openPicker();
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const overlay = overlayContainer.getContainerElement();
        const headerButton = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__view-button')!;
        headerButton.focus();
        headerButton.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            bubbles: true
        }));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const activeCell = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__cell--active');
        expect(activeCell?.textContent?.trim()).toBe('6');
        expect(document.activeElement).toBe(activeCell);
    });

    it('keeps focus on a header button after keyboard activation', async () => {
        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.openPicker();
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const viewButton = overlayContainer.getContainerElement()
            .querySelector<HTMLButtonElement>('.ims-datepicker__view-button')!;
        viewButton.focus();
        viewButton.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            detail: 0
        }));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        expect(datepicker.calendarView()).toBe('year');
        expect(document.activeElement).toBe(viewButton);
    });

    it('focuses the month grid after selecting a year with Enter', async () => {
        host.control.setValue(utcMillis(2028, 2, 5));
        fixture.detectChanges();

        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.openPicker();
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const overlay = overlayContainer.getContainerElement();
        const viewButton = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__view-button')!;
        viewButton.focus();
        viewButton.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            detail: 0
        }));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        viewButton.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            bubbles: true
        }));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const activeYear = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__year.ims-datepicker__cell--active')!;
        activeYear.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true
        }));
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const activeMonth = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__month.ims-datepicker__cell--active');
        expect(datepicker.calendarView()).toBe('month');
        expect(document.activeElement).toBe(activeMonth);
    });

    it('focuses the active cell when empty grid space is clicked', async () => {
        host.control.setValue(utcMillis(2028, 2, 5));
        fixture.detectChanges();

        const datepicker = fixture.debugElement.query(By.directive(ImsDatepicker))
            .componentInstance as ImsDatepicker;
        datepicker.openPicker();
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(16);

        const overlay = overlayContainer.getContainerElement();
        const viewButton = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__view-button')!;
        const placeholder = overlay.querySelector<HTMLElement>('.ims-datepicker__day-placeholder')!;
        viewButton.focus();
        placeholder.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(16);

        const activeCell = overlay.querySelector<HTMLButtonElement>('.ims-datepicker__cell--active');
        expect(document.activeElement).toBe(activeCell);
    });
});
