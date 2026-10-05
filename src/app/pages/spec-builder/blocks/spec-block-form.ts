import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsCheckbox} from '../../../components/ims-checkbox';
import {ImsDatepicker} from '../../../components/ims-datepicker';
import {ImsFormField, ImsFormFieldGrid, ImsFormFieldLabel} from '../../../components/ims-form-layout';
import {ImsOption, ImsSelect} from '../../../components/ims-select';
import {ImsToggleSwitch, ImsToggleSwitchOption} from '../../../components/ims-toggle-switch';
import {SpecListProperty, SpecListRow, SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {validRow, validValue} from '../core/spec-document.utils';
import {escapeHtml, htmlAttribute} from '../core/spec-reference.utils';
import {FIELD_WIDTH_OPTIONS, FREE_WIDTH, fieldClass} from './spec-block-options';

let nextId = 0;

/** The answers a toggle field offers. Its example value picks one of them. */
const TOGGLE_ANSWERS = {first: 'כן', second: 'לא'};

/** Controls whose width the field's `width` sets. The others have a size of their own. */
const SIZED_CONTROLS = new Set(['text', 'textarea', 'select']);

/** One field of the form, read from a row of the fields list. */
interface FormField {
    readonly label: string;
    readonly control: string;
    readonly width: string;
    readonly span: string;
    readonly value: string;
}

/** The fields of a form. Declared apart from the block, so the snippet can read its rows the same way the component does. */
const FIELDS_PROPERTY: SpecListProperty = {
    kind: 'list',
    label: 'שדות',
    hint: 'תוכן השדה: תאריך נכתב yyyy-mm-dd, כל תוכן מסמן תיבת סימון, ומתג מקבל כן או לא. לתאריך, לתיבת סימון ולמתג יש רוחב משלהם.',
    rowLabel: 'שדה',
    maxRows: 40,
    columns: {
        label: {kind: 'text', label: 'תווית', defaultValue: 'שדה חדש', isLabel: true},
        control: {
            kind: 'choice',
            label: 'סוג',
            defaultValue: 'text',
            options: [
                {value: 'text', label: 'שדה טקסט'},
                {value: 'textarea', label: 'טקסט ארוך'},
                {value: 'select', label: 'רשימת בחירה'},
                {value: 'date', label: 'תאריך'},
                {value: 'checkbox', label: 'תיבת סימון'},
                {value: 'toggle', label: 'מתג כן / לא'},
                {value: 'readonly', label: 'ערך לקריאה בלבד'}
            ]
        },
        width: {kind: 'choice', label: 'רוחב', defaultValue: FREE_WIDTH, options: FIELD_WIDTH_OPTIONS},
        span: {
            kind: 'choice',
            label: 'פריסה',
            defaultValue: '1',
            options: [
                {value: '1', label: 'עמודה אחת'},
                {value: 'row', label: 'כל השורה'}
            ]
        },
        value: {kind: 'text', label: 'תוכן השדה', defaultValue: ''}
    },
    defaultValue: [
        {label: 'שם פרטי', control: 'text', width: 'field-m', span: '1', value: ''},
        {label: 'שם משפחה', control: 'text', width: 'field-m', span: '1', value: ''},
        {label: 'תאריך לידה', control: 'date', width: FREE_WIDTH, span: '1', value: ''},
        {label: 'סניף', control: 'select', width: 'field-m', span: '1', value: 'תל אביב'},
        {label: 'כתובת', control: 'text', width: FREE_WIDTH, span: 'row', value: ''},
        {label: 'שליחת עדכונים', control: 'checkbox', width: FREE_WIDTH, span: '1', value: 'כן'}
    ]
};

/**
 * Fields laid out by `ims-form-field-grid`, so their labels and controls line
 * up in columns as they do on a real page. The fields are typed as a list in
 * the inspector rather than placed one by one.
 */
@Component({
    selector: 'app-spec-block-form',
    standalone: true,
    imports: [
        ImsCheckbox,
        ImsDatepicker,
        ImsFormField,
        ImsFormFieldGrid,
        ImsFormFieldLabel,
        ImsOption,
        ImsSelect,
        ImsToggleSwitch,
        ImsToggleSwitchOption
    ],
    template: `
        <ims-form-field-grid [columns]="columns()" [columnDistribution]="distribution()">
            @for (field of fieldList(); track $index) {
                @let id = idPrefix + '-' + $index;
                <!-- One node per block, so ims-form-field can project the label into its label slot. -->
                <ims-form-field [span]="field.span === 'row' ? 'row' : 1">
                    @if (field.label && !field.textLabel) {
                        <label [for]="id">{{ field.label }}</label>
                    }
                    @if (field.label && field.textLabel) {
                        <span imsFormFieldLabel>{{ field.label }}</span>
                    }
                    @switch (field.control) {
                        @case ('textarea') {
                            <textarea class="ims-input" rows="3" [id]="id" [class]="field.widthClass" [value]="field.value"></textarea>
                        }
                        @case ('select') {
                            <ims-select [id]="id" [class]="field.widthClass" [value]="field.value || null">
                                @if (field.value) {
                                    <ims-option [value]="field.value" [selectionText]="field.value">{{ field.value }}</ims-option>
                                }
                            </ims-select>
                        }
                        @case ('date') {
                            <ims-datepicker [id]="id" [value]="date(field.value)"/>
                        }
                        @case ('checkbox') {
                            <ims-checkbox [checked]="!!field.value"/>
                        }
                        @case ('toggle') {
                            <ims-toggle-switch [value]="toggleValue(field.value)">
                                <ims-toggle-switch-option value="first">{{ answers.first }}</ims-toggle-switch-option>
                                <ims-toggle-switch-option value="second">{{ answers.second }}</ims-toggle-switch-option>
                            </ims-toggle-switch>
                        }
                        @case ('readonly') {
                            <span>{{ field.value }}</span>
                        }
                        @default {
                            <input class="ims-input" type="text" [id]="id" [class]="field.widthClass" [value]="field.value">
                        }
                    }
                </ims-form-field>
            }
        </ims-form-field-grid>
    `,
    styles: `
        :host {
            display: block;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockForm {
    readonly fields = input.required<readonly SpecListRow[]>();
    readonly columns = input.required<number>();
    readonly distribution = input.required<'even' | 'max-content'>();

    protected readonly answers = TOGGLE_ANSWERS;
    protected readonly idPrefix = `spec-block-form-${nextId++}`;
    protected readonly fieldList = computed(() => this.fields().map((row) => {
        const field = readField(row);
        // A checkbox's label is tied to the checkbox's own input by the field, so it has no id to point at here.
        return {...field, textLabel: hasTextLabel(field) || field.control === 'checkbox', widthClass: fieldClass(field.width)};
    }));

    /** The example date in epoch milliseconds, or null when the text is not a date. */
    protected date(text: string): number | null {
        const time = Date.parse(text);
        return Number.isFinite(time) ? time : null;
    }

    protected toggleValue(text: string): 'first' | 'second' | null {
        if (text === TOGGLE_ANSWERS.first) {
            return 'first';
        }
        return text === TOGGLE_ANSWERS.second ? 'second' : null;
    }
}

export const FORM_BLOCK = defineSpecBlock({
    type: 'form',
    label: 'טופס',
    category: 'fields',
    icon: 'dynamic_form',
    component: SpecBlockForm,
    resize: 'width',
    defaultSize: {width: 720, height: 140},
    properties: {
        fields: FIELDS_PROPERTY,
        columns: {kind: 'number', label: 'עמודות', defaultValue: 2, min: 1, max: 4},
        distribution: {
            kind: 'choice',
            label: 'רוחב פנוי',
            defaultValue: 'even',
            options: [
                {value: 'even', label: 'מתחלק בין השדות'},
                {value: 'max-content', label: 'בין העמודות'}
            ]
        }
    },
    reference: {
        selector: 'ims-form-field-grid',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('columns', props['columns'])
                + htmlAttribute('columnDistribution', props['distribution'], 'even');
            const rows = validValue(FIELDS_PROPERTY, props['fields']) as readonly SpecListRow[];
            const fields = rows.map((row) => fieldSnippet(readField(row)).map((line) => `    ${line}`).join('\n')).join('\n');
            return `<ims-form-field-grid${attributes}>\n${fields}\n</ims-form-field-grid>`;
        }
    }
});

/** A row of the fields list as a field, with every column valid. */
function readField(row: SpecListRow): FormField {
    const valid = validRow(FIELDS_PROPERTY, row);
    return {label: valid['label'], control: valid['control'], width: valid['width'], span: valid['span'], value: valid['value']};
}

/** True when the field's label has no control to point at, so it is marked as a label instead of being one. */
function hasTextLabel(field: FormField): boolean {
    return field.control === 'toggle' || field.control === 'readonly';
}

/** The template of one field of the form, as lines without the form's indent. */
function fieldSnippet(field: FormField): string[] {
    const sized = SIZED_CONTROLS.has(field.control) ? htmlAttribute('class', fieldClass(field.width)) : '';
    const text = escapeHtml(field.label);
    const label = !field.label ? [] : hasTextLabel(field)
        ? [`    <span imsFormFieldLabel>${text}</span>`]
        : [`    <label>${text}</label>`];

    let control: string[];
    switch (field.control) {
        case 'textarea':
            control = [`    <textarea imsInput rows="3"${sized}></textarea>`];
            break;
        case 'select':
            control = [`    <ims-select${sized}></ims-select>`];
            break;
        case 'date':
            control = ['    <ims-datepicker/>'];
            break;
        case 'checkbox':
            control = ['    <ims-checkbox/>'];
            break;
        case 'toggle':
            control = [
                '    <ims-toggle-switch>',
                `        <ims-toggle-switch-option [value]="true">${TOGGLE_ANSWERS.first}</ims-toggle-switch-option>`,
                `        <ims-toggle-switch-option [value]="false">${TOGGLE_ANSWERS.second}</ims-toggle-switch-option>`,
                '    </ims-toggle-switch>'
            ];
            break;
        case 'readonly':
            control = [`    <span>${escapeHtml(field.value)}</span>`];
            break;
        default:
            control = [`    <input imsInput type="text"${sized}>`];
    }

    const span = field.span === 'row' ? ' span="row"' : '';
    return [`<ims-form-field${span}>`, ...label, ...control, '</ims-form-field>'];
}
