import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImsFormField } from './ims-form-field';
import { ImsFormFieldLabel } from './ims-form-field.directives';

@Component({
    imports: [ImsFormField, ImsFormFieldLabel],
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
        <ims-form-field id="width-field" controlWidth="20rem">
            <label>Width label</label>
            <input>
        </ims-form-field>
        <ims-form-field id="projection-order-field">
            <input>
            <label>Projected label</label>
        </ims-form-field>
    `
})
class ImsFormFieldTestHost {
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

    it('sets the value width on the form field', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#width-field') as HTMLElement;

        expect(field.style.getPropertyValue('--ims-form-control-width')).toBe('20rem');
    });

    it('projects the label slot before the catch-all value slot', async () => {
        const fixture = TestBed.createComponent(ImsFormFieldTestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const field = fixture.nativeElement.querySelector('#projection-order-field') as HTMLElement;

        expect(field.children[0].tagName).toBe('LABEL');
        expect(field.children[1].tagName).toBe('INPUT');
    });

});
