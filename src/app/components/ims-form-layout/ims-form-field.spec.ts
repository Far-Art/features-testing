import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImsFormField } from './ims-form-field';
import { ImsFormFieldHint, ImsFormFieldInline, ImsFormFieldLabel } from './ims-form-field.directives';
import type { ImsFormFieldFontWeight } from './ims-form-field-font-weight';
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

@Component({
    imports: [ImsFormField, ImsFormFieldGrid, ImsFormFieldLabel, ImsFormFieldRow],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The form-layout styles are global in the app. Without encapsulation they
    // are global here too, so the font weights come from the real rules.
    encapsulation: ViewEncapsulation.None,
    styleUrls: [
        '../../../styles/ims-form-layout/ims-form-field.scss',
        '../../../styles/ims-form-layout/ims-form-field-grid.scss'
    ],
    template: `
        <ims-form-field id="default-field">
            <span imsFormFieldLabel>Default</span>
            <span>Default value</span>
        </ims-form-field>
        <ims-form-field-grid columns="2" labelFontWeight="semibold" valueFontWeight="medium">
            <ims-form-field id="grid-field">
                <span imsFormFieldLabel>Grid</span>
                <span>Grid value</span>
            </ims-form-field>
            <ims-form-field id="field-over-grid" labelFontWeight="regular" valueFontWeight="bold">
                <span imsFormFieldLabel>Field over grid</span>
                <span>Field over grid value</span>
            </ims-form-field>
            <ims-form-field-row labelFontWeight="extrabold" [valueFontWeight]="rowValueFontWeight()">
                <ims-form-field id="row-field">
                    <span imsFormFieldLabel>Row</span>
                    <span>Row value</span>
                </ims-form-field>
                <ims-form-field id="field-over-row" labelFontWeight="medium" valueFontWeight="regular">
                    <span imsFormFieldLabel>Field over row</span>
                    <span>Field over row value</span>
                </ims-form-field>
            </ims-form-field-row>
            <ims-form-field id="outer-field">
                <span imsFormFieldLabel>Outer</span>
                <div>
                    <ims-form-field id="nested-field">
                        <span imsFormFieldLabel>Nested</span>
                        <span>Nested value</span>
                    </ims-form-field>
                </div>
            </ims-form-field>
            <div>
                <ims-form-field-grid>
                    <ims-form-field id="nested-grid-field">
                        <span imsFormFieldLabel>Nested grid</span>
                        <span>Nested grid value</span>
                    </ims-form-field>
                </ims-form-field-grid>
            </div>
        </ims-form-field-grid>
    `
})
class FontWeightTestHost {
    readonly rowValueFontWeight = signal<ImsFormFieldFontWeight | null>('bold');
}

/** Waits for the grid's layout, which runs in an animation frame. */
function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Reads the logical grid placement a field was given. */
function columnStart(field: Element): string {
    return (field as HTMLElement).style.getPropertyValue('--ims-form-grid-column-start');
}

/**
 * Resolves the font weight of a field's label or value to the name of the
 * `--ims-font-weight-*` token it ends up with.
 *
 * jsdom computes none of this itself: it leaves `var()` unsubstituted, and it
 * inherits a custom property past an element that resets it with `initial`.
 * So the cascade is resolved here, from the real rules and inline styles, the
 * way a browser resolves it. The tokens are not loaded, so a token is where
 * resolution stops.
 */
function fontWeight(element: Element): string | null {
    const value = resolveProperty(element, 'font-weight');
    return /^var\(--ims-font-weight-([\w-]+)\)$/.exec(value ?? '')?.[1] ?? value;
}

/**
 * Returns an inherited property's value on an element: what the nearest
 * element declaring it says, with each `var()` substituted on that element.
 * `initial` resolves to `null`, so a `var()` reading it takes its fallback.
 */
function resolveProperty(element: Element, property: string): string | null {
    for (let node: Element | null = element; node !== null; node = node.parentElement) {
        const value = declaredValue(node, property);
        if (value !== null) {
            return value === 'initial' ? null : substituteVar(value, node);
        }
    }
    return null;
}

/** Substitutes a value of the form `var(--name)` or `var(--name, fallback)`. */
function substituteVar(value: string, element: Element): string | null {
    const reference = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/.exec(value);
    if (reference === null || reference[1].startsWith('--ims-font-weight-')) {
        return value;
    }

    const [, name, fallback] = reference;
    return resolveProperty(element, name) ??
        (fallback === undefined ? null : substituteVar(fallback.trim(), element));
}

/**
 * Returns the value an element's inline style or a matching stylesheet rule
 * declares for a property. Inline wins. Among rules, the last match wins,
 * which is enough for the few declarations these tests read.
 */
function declaredValue(element: Element, property: string): string | null {
    const inline = (element as HTMLElement).style.getPropertyValue(property).trim();
    if (inline !== '') {
        return inline;
    }

    let declared: string | null = null;
    for (const rule of styleRules(Array.from(element.ownerDocument.styleSheets))) {
        const value = rule.style.getPropertyValue(property).trim();
        if (value !== '' && element.matches(rule.selectorText)) {
            declared = value;
        }
    }
    return declared;
}

/** Lists the style rules of stylesheets, including those inside grouping rules. */
function styleRules(sheets: readonly (CSSStyleSheet | CSSGroupingRule)[]): CSSStyleRule[] {
    return sheets.flatMap((sheet) => Array.from(sheet.cssRules).flatMap((rule) => {
        if (rule instanceof CSSStyleRule) {
            return [rule];
        }
        return rule instanceof CSSGroupingRule ? styleRules([rule]) : [];
    }));
}

/** Reads the font weights of a field's main label and value. */
function fieldFontWeights(host: HTMLElement, id: string): {label: string | null; value: string | null} {
    const field = host.querySelector(`#${id}`) as HTMLElement;
    return {
        label: fontWeight(field.querySelector(':scope > [imsFormFieldLabel]') as HTMLElement),
        value: fontWeight(field.querySelector(':scope > :not([imsFormFieldLabel])') as HTMLElement)
    };
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

    describe('font weights', () => {
        async function render() {
            const fixture = TestBed.createComponent(FontWeightTestHost);
            fixture.detectChanges();
            await fixture.whenStable();
            return fixture;
        }

        it('makes the label bold and the value regular by default', async () => {
            const fixture = await render();

            expect(fieldFontWeights(fixture.nativeElement, 'default-field'))
                .toEqual({label: 'bold', value: 'regular'});
        });

        it('gives the fields in a grid the grid\'s weights', async () => {
            const fixture = await render();

            expect(fieldFontWeights(fixture.nativeElement, 'grid-field'))
                .toEqual({label: 'semibold', value: 'medium'});
        });

        it('lets a row take precedence over its grid', async () => {
            const fixture = await render();

            expect(fieldFontWeights(fixture.nativeElement, 'row-field'))
                .toEqual({label: 'extrabold', value: 'bold'});
        });

        it('lets a field take precedence over its row and its grid', async () => {
            const fixture = await render();

            expect(fieldFontWeights(fixture.nativeElement, 'field-over-row'))
                .toEqual({label: 'medium', value: 'regular'});
            expect(fieldFontWeights(fixture.nativeElement, 'field-over-grid'))
                .toEqual({label: 'regular', value: 'bold'});
        });

        it('falls back to the grid\'s weight when the row\'s is cleared', async () => {
            const fixture = await render();

            fixture.componentInstance.rowValueFontWeight.set(null);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(fieldFontWeights(fixture.nativeElement, 'row-field'))
                .toEqual({label: 'extrabold', value: 'medium'});
        });

        it('starts a field nested in another field\'s value from the defaults', async () => {
            const fixture = await render();

            expect(fieldFontWeights(fixture.nativeElement, 'outer-field').label).toBe('semibold');
            expect(fieldFontWeights(fixture.nativeElement, 'nested-field'))
                .toEqual({label: 'bold', value: 'regular'});
        });

        it('starts the fields of a nested grid from the defaults', async () => {
            const fixture = await render();

            expect(fieldFontWeights(fixture.nativeElement, 'nested-grid-field'))
                .toEqual({label: 'bold', value: 'regular'});
        });
    });
});
