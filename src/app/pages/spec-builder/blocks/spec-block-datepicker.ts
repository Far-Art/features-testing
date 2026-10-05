import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsDatepicker, ImsDatepickerPrecision} from '../../../components/ims-datepicker';
import {ImsFormField} from '../../../components/ims-form-layout';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';

let nextId = 0;

/** A labelled `ims-datepicker`. The example date is typed as `yyyy-mm-dd`. */
@Component({
    selector: 'app-spec-block-datepicker',
    standalone: true,
    imports: [ImsDatepicker, ImsFormField],
    template: `
        <ims-form-field>
            @if (label()) {
                <label [for]="id">{{ label() }}</label>
            }
            <ims-datepicker
                [id]="id"
                [format]="format()"
                [value]="date()"
                [showWeekNumbers]="showWeekNumbers()"
                [disabled]="disabled()"
            />
        </ims-form-field>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockDatepicker {
    readonly label = input.required<string>();
    readonly value = input.required<string>();
    readonly format = input.required<ImsDatepickerPrecision>();
    readonly showWeekNumbers = input.required<boolean>();
    readonly disabled = input.required<boolean>();

    protected readonly id = `spec-block-datepicker-${nextId++}`;
    /** The example date in epoch milliseconds, or null when the text is not a date. */
    protected readonly date = computed(() => {
        const time = Date.parse(this.value());
        return Number.isFinite(time) ? time : null;
    });
}

export const DATEPICKER_BLOCK = defineSpecBlock({
    type: 'datepicker',
    label: 'תאריך',
    category: 'fields',
    icon: 'calendar_month',
    component: SpecBlockDatepicker,
    resize: 'none',
    defaultSize: {width: 220, height: 26},
    properties: {
        label: {kind: 'text', label: 'תווית ליד השדה', defaultValue: 'תאריך לידה', labelSamples: ['תאריך לידה', 'תחילת ביטוח', 'סיום ביטוח', 'תאריך אירוע', 'תאריך הגשה']},
        value: {kind: 'text', label: 'התאריך שבשדה (yyyy-mm-dd)', defaultValue: '', hint: 'ריק: השדה ריק.'},
        format: {
            kind: 'choice',
            label: 'דיוק',
            defaultValue: 'dd/MM/yyyy',
            options: [
                {value: 'dd/MM/yyyy', label: 'יום'},
                {value: 'MM/yyyy', label: 'חודש'}
            ]
        },
        showWeekNumbers: {kind: 'toggle', label: 'מספרי שבועות', defaultValue: false},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false}
    },
    reference: {
        selector: 'ims-datepicker',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('format', props['format'], 'dd/MM/yyyy')
                + htmlFlag('showWeekNumbers', props['showWeekNumbers'])
                + htmlFlag('disabled', props['disabled']);
            const label = props['label'] ? `    <label>${escapeHtml(String(props['label']))}</label>\n` : '';
            return `<ims-form-field>\n${label}    <ims-datepicker${attributes}/>\n</ims-form-field>`;
        }
    }
});
