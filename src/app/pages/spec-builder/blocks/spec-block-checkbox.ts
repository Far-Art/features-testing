import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {ImsCheckbox, ImsCheckboxAppearance} from '../../../components/ims-checkbox';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {CONTENT_WIDTH, CONTENT_WIDTH_OPTIONS, FREE_WIDTH, widthResize} from './spec-block-options';

/** `ims-checkbox` with its label. */
@Component({
    selector: 'app-spec-block-checkbox',
    standalone: true,
    imports: [ImsCheckbox],
    template: `
        <ims-checkbox
            [class.spec-block-checkbox__fill]="width() === freeWidth"
            [checked]="checked()"
            [appearance]="appearance()"
            [disabled]="disabled()"
        >{{ label() }}</ims-checkbox>
    `,
    styles: `
        :host {
            display: block;
        }

        .spec-block-checkbox__fill {
            inline-size: 100%;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockCheckbox {
    readonly label = input.required<string>();
    readonly checked = input.required<boolean>();
    readonly appearance = input.required<ImsCheckboxAppearance>();
    readonly disabled = input.required<boolean>();
    readonly width = input.required<string>();

    protected readonly freeWidth = FREE_WIDTH;
}

export const CHECKBOX_BLOCK = defineSpecBlock({
    type: 'checkbox',
    label: 'תיבת סימון',
    category: 'choices',
    icon: 'check_box',
    component: SpecBlockCheckbox,
    resize: widthResize,
    defaultSize: {width: 200, height: 26},
    properties: {
        label: {kind: 'text', label: 'תווית', defaultValue: 'שליחת עדכונים', labelSamples: ['שליחת עדכונים', 'אישור תנאי שימוש', 'כתובת זהה למגורים', 'הצגת פוליסות שבוטלו', 'הסכמה לדיוור']},
        checked: {kind: 'toggle', label: 'מסומן', defaultValue: true},
        appearance: {
            kind: 'choice',
            label: 'מראה',
            defaultValue: 'checkbox',
            options: [
                {value: 'checkbox', label: 'תיבה'},
                {value: 'check', label: 'וי'}
            ]
        },
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false},
        width: {kind: 'choice', label: 'רוחב', defaultValue: CONTENT_WIDTH, options: CONTENT_WIDTH_OPTIONS}
    },
    reference: {
        selector: 'ims-checkbox',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('appearance', props['appearance'], 'checkbox') + htmlFlag('disabled', props['disabled']);
            return `<ims-checkbox${attributes}>${escapeHtml(String(props['label']))}</ims-checkbox>`;
        }
    }
});
