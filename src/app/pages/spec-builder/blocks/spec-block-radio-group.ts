import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsFormField, ImsFormFieldLabel} from '../../../components/ims-form-layout';
import {ImsRadio, ImsRadioAppearance, ImsRadioGroup, ImsRadioGroupLayout} from '../../../components/ims-radio';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {splitLines} from '../core/spec-document.utils';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {CONTENT_WIDTH, CONTENT_WIDTH_OPTIONS, FREE_WIDTH, widthResize} from './spec-block-options';

let nextId = 0;

/** A labelled `ims-radio-group`. The options are typed one per line. */
@Component({
    selector: 'app-spec-block-radio-group',
    standalone: true,
    imports: [ImsFormField, ImsFormFieldLabel, ImsRadio, ImsRadioGroup],
    template: `
        <ims-form-field>
            @if (label()) {
                <span imsFormFieldLabel [id]="labelId">{{ label() }}</span>
            }
            <ims-radio-group
                [attr.aria-labelledby]="label() ? labelId : null"
                [class.spec-block-radio-group__fill]="width() === freeWidth"
                [layout]="layout()"
                [appearance]="appearance()"
                [value]="selected() || null"
                [disabled]="disabled()"
            >
                @for (option of optionList(); track $index) {
                    <ims-radio [value]="option">{{ option }}</ims-radio>
                }
            </ims-radio-group>
        </ims-form-field>
    `,
    styles: `
        :host {
            display: block;
        }

        .spec-block-radio-group__fill {
            inline-size: 100%;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockRadioGroup {
    readonly label = input.required<string>();
    readonly options = input.required<string>();
    readonly selected = input.required<string>();
    readonly layout = input.required<ImsRadioGroupLayout>();
    readonly appearance = input.required<ImsRadioAppearance>();
    readonly disabled = input.required<boolean>();
    readonly width = input.required<string>();

    protected readonly freeWidth = FREE_WIDTH;
    protected readonly labelId = `spec-block-radio-group-${nextId++}`;
    protected readonly optionList = computed(() => splitLines(this.options()));
}

export const RADIO_GROUP_BLOCK = defineSpecBlock({
    type: 'radio-group',
    label: 'כפתורי בחירה',
    category: 'choices',
    icon: 'radio_button_checked',
    component: SpecBlockRadioGroup,
    resize: widthResize,
    defaultSize: {width: 280, height: 80},
    properties: {
        label: {kind: 'text', label: 'תווית ליד השדה', defaultValue: 'ערוץ עדכונים', labelSamples: ['ערוץ עדכונים', 'סוג לקוח', 'תדירות תשלום', 'מין']},
        options: {kind: 'text', label: 'אפשרויות', defaultValue: 'דואר אלקטרוני\nמסרון\nטלפון', multiline: true, hint: 'ערך אחד בכל שורה'},
        selected: {kind: 'selection', label: 'ערך נבחר', defaultValue: 'דואר אלקטרוני', optionsFrom: 'options'},
        layout: {
            kind: 'choice',
            label: 'פריסה',
            defaultValue: 'stacked',
            options: [
                {value: 'stacked', label: 'זו מתחת לזו'},
                {value: 'inline', label: 'זו לצד זו'}
            ]
        },
        appearance: {
            kind: 'choice',
            label: 'מראה',
            defaultValue: 'radio',
            options: [
                {value: 'radio', label: 'עיגול'},
                {value: 'check', label: 'וי'}
            ]
        },
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false},
        width: {kind: 'choice', label: 'רוחב', defaultValue: CONTENT_WIDTH, options: CONTENT_WIDTH_OPTIONS}
    },
    reference: {
        selector: 'ims-radio-group',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('layout', props['layout'], 'stacked')
                + htmlAttribute('appearance', props['appearance'], 'radio')
                + htmlFlag('disabled', props['disabled']);
            const options = splitLines(String(props['options']))
                .map((option) => `        <ims-radio value="${escapeHtml(option)}">${escapeHtml(option)}</ims-radio>`)
                .join('\n');
            const label = props['label'] ? `    <span imsFormFieldLabel>${escapeHtml(String(props['label']))}</span>\n` : '';
            return `<ims-form-field>\n${label}    <ims-radio-group${attributes}>\n${options}\n    </ims-radio-group>\n</ims-form-field>`;
        }
    }
});
