import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImsFormField } from './ims-form-field';
import { ImsFormFieldHint, ImsFormFieldInline, ImsFormFieldLabel } from './ims-form-field.directives';
import { ImsFormFieldGrid } from './ims-form-field-grid';
import { ImsFormFieldRow } from './ims-form-field-row';

@Component({
    selector: 'test-contents-row',
    imports: [ImsFormField, ImsFormFieldRow],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ims-form-field-row>
            <ims-form-field>
                <label>Phone</label>
                <input>
            </ims-form-field>
            <ims-form-field>
                <label>Email</label>
                <input>
            </ims-form-field>
        </ims-form-field-row>
    `,
    styles: ':host { display: contents; }'
})
class ContentsRowTestComponent {
}

@Component({
    imports: [
        ContentsRowTestComponent,
        ImsFormField,
        ImsFormFieldGrid,
        ImsFormFieldHint,
        ImsFormFieldInline,
        ImsFormFieldLabel
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ims-form-field id="plain-field">
            <label>Plain label</label>
            <input>
        </ims-form-field>
        <ims-form-field id="readonly-field">
            <span imsFormFieldLabel>Readonly label</span>
            <span>Readonly value</span>
        </ims-form-field>
        <ims-form-field id="projection-order-field">
            <input>
            <label>Projected label</label>
        </ims-form-field>
        <ims-form-field id="hint-field">
            <label>Billing date</label>
            <input aria-describedby="consumer-note">
            @if (showHint) {
                <span imsFormFieldHint>First day of the month</span>
            }
        </ims-form-field>
        <ims-form-field id="inline-hint-field">
            <label>Amount</label>
            <span imsFormFieldInline>
                <input>
                <span imsFormFieldHint id="amount-hint">Up to 1,000</span>
            </span>
        </ims-form-field>
        <ims-form-field-grid id="contents-grid" columns="2">
            <span style="display: contents">
                <ims-form-field>
                    <label>First name</label>
                    <input>
                </ims-form-field>
                <ims-form-field>
                    <label>Last name</label>
                    <input>
                </ims-form-field>
            </span>
            <test-contents-row/>
        </ims-form-field-grid>
    `
})
class ImsFormFieldTestHost {
    showHint = true;
}

/** Waits for the grid's layout, which runs in an animation frame. */
function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Reads the logical grid placement a field was given. */
function columnStart(field: Element): string {
    return (field as HTMLElement).style.getPropertyValue('--ims-form-grid-column-start');
}

describe('ImsFormField', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ImsFormFieldTestHost]
        }).compileComponents();
    });

    it('infers a plain direct label and control', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#plain-field') as HTMLElement;
        const label = field.querySelector('label') as HTMLLabelElement;
        const input = field.querySelector('input') as HTMLInputElement;

        expect(label.htmlFor).toBe(input.id);
    });

    it('projects an explicit non-label heading before a read-only value', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const parts = fixture.nativeElement.querySelectorAll('#readonly-field > span');

        expect(parts[0].hasAttribute('imsFormFieldLabel')).toBe(true);
        expect(parts[1].textContent?.trim()).toBe('Readonly value');
    });

    it('projects the label slot before the catch-all value slot', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#projection-order-field') as HTMLElement;

        expect(field.children[0].tagName).toBe('LABEL');
        expect(field.children[1].tagName).toBe('INPUT');
    });

    it('adds a hint to the control description, after the references already there', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#hint-field') as HTMLElement;
        const input = field.querySelector('input') as HTMLInputElement;
        const hint = field.querySelector('[imsFormFieldHint]') as HTMLElement;

        expect(hint.id).not.toBe('');
        expect(input.getAttribute('aria-describedby')).toBe(`consumer-note ${hint.id}`);
    });

    it('removes only its own reference when the hint goes', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#hint-field') as HTMLElement;
        const input = field.querySelector('input') as HTMLInputElement;
        const hint = field.querySelector('[imsFormFieldHint]') as HTMLElement;

        expect(input.getAttribute('aria-describedby')).toBe(`consumer-note ${hint.id}`);

        fixture.componentInstance.showHint = false;
        fixture.detectChanges();
        await fixture.whenStable();

        expect(input.getAttribute('aria-describedby')).toBe('consumer-note');
    });

    it('describes a control inside an inline value with the hint id it was given', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#inline-hint-field') as HTMLElement;
        const label = field.querySelector('label') as HTMLLabelElement;
        const input = field.querySelector('input') as HTMLInputElement;

        expect(label.htmlFor).toBe(input.id);
        expect(input.getAttribute('aria-describedby')).toBe('amount-hint');
    });

    it('lays out fields inside a display: contents element as fields of the grid', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();
        await nextFrame();

        const fields = Array.from<HTMLElement>(
            fixture.nativeElement.querySelectorAll('#contents-grid > span > ims-form-field')
        );

        expect(fields.map((field) => field.hasAttribute('data-ims-subgrid'))).toEqual([true, true]);
        expect(fields.map(columnStart)).toEqual(['1', '4']);
    });

    it('lays out a row held by a display: contents component as a row of the grid', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();
        await nextFrame();

        const row = fixture.nativeElement.querySelector(
            '#contents-grid test-contents-row ims-form-field-row'
        ) as HTMLElement;
        const fields = Array.from<HTMLElement>(row.querySelectorAll('ims-form-field'));

        expect(row.hasAttribute('data-ims-subgrid')).toBe(true);
        expect(fields.map((field) => field.hasAttribute('data-ims-subgrid'))).toEqual([true, true]);
        expect(fields.map(columnStart)).toEqual(['1', '4']);
    });

});
