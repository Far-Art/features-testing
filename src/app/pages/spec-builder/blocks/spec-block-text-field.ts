import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ImsErrorPopoverDirective} from '../../../components/ims-error-popover';
import {ImsFormField} from '../../../components/ims-form-layout';
import {ImsInputDirective} from '../../../ims-input.directive';
import {ImsFormatCurrencyDirective, ImsFormatDirective} from '../../../shared/ims-format';
import {ImsPatternDirective, ImsPatternInput} from '../../../shared/ims-pattern.directive';
import {ReadonlyDirective} from '../../../shared/readonly.directive';
import {SpecChoiceOption, SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {FIELD_WIDTH_OPTIONS, FREE_WIDTH, fieldClass, widthResize} from './spec-block-options';

let nextId = 0;

/** The pattern a field without one is guarded by: it lets everything through. */
const ANY_TEXT = '[\\s\\S]*';

/** A `pattern` value: the `customPattern` text is the pattern. */
const CUSTOM_PATTERN = 'custom';

/** The `imsPattern` presets. */
const PATTERN_PRESETS: ReadonlySet<string> = new Set(['integer', 'decimal', 'signedInteger', 'signedDecimal']);

const PATTERN_OPTIONS: readonly SpecChoiceOption[] = [
    {value: '', label: 'ללא'},
    {value: 'integer', label: 'מספר שלם (integer)'},
    {value: 'decimal', label: 'מספר עשרוני (decimal)'},
    {value: 'signedInteger', label: 'מספר שלם עם סימן (signedInteger)'},
    {value: 'signedDecimal', label: 'מספר עשרוני עם סימן (signedDecimal)'},
    {value: CUSTOM_PATTERN, label: 'ביטוי רגולרי משלי'}
];

/** `format` values that are not an `imsFormat` token. */
const FORMAT = {none: '', fromPattern: 'pattern', currency: 'currency', currencySymbol: 'currency-symbol'};

const FORMAT_OPTIONS: readonly SpecChoiceOption[] = [
    {value: FORMAT.none, label: 'ללא'},
    {value: FORMAT.fromPattern, label: 'לפי התבנית (imsFormat)'},
    {value: '#,###', label: '#,###'},
    {value: '#,###.#', label: '#,###.#'},
    {value: '#,###.##', label: '#,###.##'},
    {value: FORMAT.currency, label: 'כסף (imsFormatCurrency)'},
    {value: FORMAT.currencySymbol, label: 'כסף עם ₪ (imsFormatCurrency showSymbol)'}
];

/**
 * A labelled text field, or a textarea, drawn as a page draws it: `imsInput`
 * with `ngModel`, and the `imsPattern` guard and the `imsFormat` or
 * `imsFormatCurrency` display its settings name. The example value is written
 * through the model, so a format shows it as the field shows it at rest, and
 * in preview mode the field guards and formats what is typed. A refusal is
 * explained by an `ims-error-popover`.
 *
 * A field with no pattern is guarded by one that lets everything through, so
 * one input serves every pattern; one input per kind of format remains,
 * because a directive cannot be applied conditionally.
 */
@Component({
    selector: 'app-spec-block-text-field',
    standalone: true,
    imports: [
        FormsModule,
        ImsErrorPopoverDirective,
        ImsFormatCurrencyDirective,
        ImsFormatDirective,
        ImsFormField,
        ImsInputDirective,
        ImsPatternDirective,
        ReadonlyDirective
    ],
    template: `
        <ims-form-field>
            @if (label()) {
                <label [for]="id">{{ label() }}</label>
            }
            @if (multiline()) {
                <textarea
                    imsInput
                    [id]="id"
                    [class]="controlClass()"
                    [class.ims-input--invalid]="invalid()"
                    [ims-readonly]="readonly()"
                    [rows]="rows()"
                    [placeholder]="placeholder()"
                    [attr.maxlength]="maxLength() || null"
                    [ngModel]="value()"
                    [disabled]="disabled()"
                ></textarea>
            } @else {
                @switch (formatKind()) {
                    @case ('number') {
                        <input
                            imsInput
                            type="text"
                            ims-error-popover
                            [id]="id"
                            [class]="controlClass()"
                            [class.ims-input--invalid]="invalid()"
                            [ims-readonly]="readonly()"
                            [imsPattern]="guard()"
                            [imsPatternMin]="bound(min())"
                            [imsPatternMax]="bound(max())"
                            [imsFormat]="formatToken()"
                            [placeholder]="placeholder()"
                            [attr.maxlength]="maxLength() || null"
                            [ngModel]="value()"
                            [disabled]="disabled()"
                        >
                    }
                    @case ('currency') {
                        <input
                            imsInput
                            type="text"
                            ims-error-popover
                            imsFormatCurrency
                            [id]="id"
                            [class]="controlClass()"
                            [class.ims-input--invalid]="invalid()"
                            [ims-readonly]="readonly()"
                            [imsPattern]="guard()"
                            [imsPatternMin]="bound(min())"
                            [imsPatternMax]="bound(max())"
                            [showSymbol]="format() === formats.currencySymbol"
                            [placeholder]="placeholder()"
                            [attr.maxlength]="maxLength() || null"
                            [ngModel]="value()"
                            [disabled]="disabled()"
                        >
                    }
                    @default {
                        <input
                            imsInput
                            type="text"
                            ims-error-popover
                            [id]="id"
                            [class]="controlClass()"
                            [class.ims-input--invalid]="invalid()"
                            [ims-readonly]="readonly()"
                            [imsPattern]="guard()"
                            [imsPatternMin]="bound(min())"
                            [imsPatternMax]="bound(max())"
                            [placeholder]="placeholder()"
                            [attr.maxlength]="maxLength() || null"
                            [ngModel]="value()"
                            [disabled]="disabled()"
                        >
                    }
                }
            }
        </ims-form-field>
    `,
    styles: `
        :host {
            display: block;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockTextField {
    readonly label = input.required<string>();
    readonly value = input.required<string>();
    readonly placeholder = input.required<string>();
    readonly width = input.required<string>();
    readonly multiline = input.required<boolean>();
    readonly rows = input.required<number>();
    readonly pattern = input.required<string>();
    readonly customPattern = input.required<string>();
    readonly min = input.required<string>();
    readonly max = input.required<string>();
    readonly format = input.required<string>();
    readonly maxLength = input.required<number>();
    readonly invalid = input.required<boolean>();
    readonly readonly = input.required<boolean>();
    readonly disabled = input.required<boolean>();

    protected readonly formats = FORMAT;
    protected readonly id = `spec-block-text-field-${nextId++}`;
    protected readonly controlClass = computed(() => fieldClass(this.width()));
    /** The pattern the field is guarded by. A regular expression that does not compile guards nothing. */
    protected readonly guard = computed<ImsPatternInput>(() => {
        const pattern = this.pattern();
        if (PATTERN_PRESETS.has(pattern)) {
            return pattern;
        }
        return pattern === CUSTOM_PATTERN && compiles(this.customPattern()) ? this.customPattern() : ANY_TEXT;
    });
    /** Which formatting directive the field carries. */
    protected readonly formatKind = computed(() => {
        const format = this.format();
        if (format === FORMAT.none) {
            return 'none';
        }
        return format === FORMAT.currency || format === FORMAT.currencySymbol ? 'currency' : 'number';
    });
    /** The `imsFormat` token: empty, the bare attribute, takes the shape of the pattern. */
    protected readonly formatToken = computed(() => this.format() === FORMAT.fromPattern ? '' : this.format());

    /** A bound typed in the inspector, or null for none. */
    protected bound(text: string): number | null {
        const value = Number(text.trim());
        return text.trim() !== '' && Number.isFinite(value) ? value : null;
    }
}

export const TEXT_FIELD_BLOCK = defineSpecBlock({
    type: 'text-field',
    label: 'שדה טקסט',
    category: 'fields',
    icon: 'text_fields',
    component: SpecBlockTextField,
    resize: widthResize,
    defaultSize: {width: 280, height: 26},
    typedProperty: 'value',
    properties: {
        label: {kind: 'text', label: 'תווית ליד השדה', defaultValue: 'שם פרטי', labelSamples: ['שם פרטי', 'שם משפחה', 'מספר זהות', 'טלפון נייד', 'דואר אלקטרוני', 'כתובת', 'עיר', 'מספר פוליסה']},
        value: {kind: 'text', label: 'תוכן השדה', defaultValue: '', hint: 'מה שכתוב בתוך השדה, כאילו המשתמש הקליד אותו, כמו 1234.5. התבנית והתצוגה חלות עליו. אפשר גם להקליד ישירות בשדה, בלחיצה כפולה עליו.'},
        placeholder: {kind: 'text', label: 'טקסט רמז בשדה ריק (placeholder)', defaultValue: '', hint: 'מוצג באפור רק כל עוד השדה ריק.'},
        width: {kind: 'choice', label: 'רוחב', defaultValue: FREE_WIDTH, options: FIELD_WIDTH_OPTIONS},
        multiline: {kind: 'toggle', label: 'כמה שורות', defaultValue: false},
        rows: {kind: 'number', label: 'שורות', defaultValue: 3, min: 1, max: 12},
        pattern: {
            kind: 'choice',
            label: 'תבנית הקלדה (imsPattern)',
            defaultValue: '',
            options: PATTERN_OPTIONS,
            hint: 'מה מותר להקליד. נסו להקליד בתצוגה מקדימה.'
        },
        customPattern: {kind: 'text', label: 'ביטוי רגולרי', defaultValue: '', hint: 'רק לתבנית "ביטוי רגולרי משלי". חייב לקבל גם ערך חלקי, כמו [0-9]{0,9}.'},
        min: {kind: 'text', label: 'המספר הקטן ביותר שמותר', defaultValue: '', hint: 'רק לתבנית מספרית. ריק: ללא.'},
        max: {kind: 'text', label: 'המספר הגדול ביותר שמותר', defaultValue: '', hint: 'רק לתבנית מספרית. ריק: ללא.'},
        format: {kind: 'choice', label: 'תצוגה (imsFormat)', defaultValue: FORMAT.none, options: FORMAT_OPTIONS},
        maxLength: {kind: 'number', label: 'אורך מקסימלי', defaultValue: 0, min: 0, max: 1000, hint: '0: ללא הגבלה.'},
        invalid: {kind: 'toggle', label: 'שגוי', defaultValue: false},
        readonly: {kind: 'toggle', label: 'לקריאה בלבד', defaultValue: false},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false}
    },
    reference: {
        selector: 'input[imsInput], textarea[imsInput]',
        snippet: (props: SpecProps) => {
            const multiline = props['multiline'] === true;
            const attributes = htmlAttribute('class', fieldClass(props['width']))
                + (multiline ? htmlAttribute('rows', props['rows']) : ' type="text"')
                + patternAttributes(props)
                + (multiline ? '' : formatAttributes(String(props['format'])))
                + htmlAttribute('maxlength', props['maxLength'], 0)
                + htmlAttribute('placeholder', props['placeholder'])
                + (props['readonly'] === true ? ' [ims-readonly]="true"' : '')
                + htmlFlag('disabled', props['disabled']);
            const control = multiline ? `<textarea imsInput${attributes}></textarea>` : `<input imsInput${attributes}>`;
            const label = props['label'] ? `    <label>${escapeHtml(String(props['label']))}</label>\n` : '';
            return `<ims-form-field>\n${label}    ${control}\n</ims-form-field>`;
        }
    }
});

/** True when `source` is a regular expression the browser can compile. */
function compiles(source: string): boolean {
    try {
        new RegExp(source);
        return source !== '';
    } catch {
        return false;
    }
}

/** The `imsPattern` attributes of the settings: the pattern, and the bounds a preset takes. */
function patternAttributes(props: SpecProps): string {
    const pattern = String(props['pattern']);
    if (pattern === CUSTOM_PATTERN) {
        return htmlAttribute('imsPattern', props['customPattern']);
    }
    if (!PATTERN_PRESETS.has(pattern)) {
        return '';
    }
    return htmlAttribute('imsPattern', pattern)
        + htmlAttribute('imsPatternMin', String(props['min']).trim())
        + htmlAttribute('imsPatternMax', String(props['max']).trim());
}

/** The formatting directive of the `format` setting. */
function formatAttributes(format: string): string {
    switch (format) {
        case FORMAT.none:
            return '';
        case FORMAT.fromPattern:
            return ' imsFormat';
        case FORMAT.currency:
            return ' imsFormatCurrency';
        case FORMAT.currencySymbol:
            return ' imsFormatCurrency showSymbol';
        default:
            return htmlAttribute('imsFormat', format);
    }
}
