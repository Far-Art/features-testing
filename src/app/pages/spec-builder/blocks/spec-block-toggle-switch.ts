import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsFormField, ImsFormFieldLabel} from '../../../components/ims-form-layout';
import {ImsToggleSwitch, ImsToggleSwitchOption} from '../../../components/ims-toggle-switch';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlFlag} from '../core/spec-reference.utils';
import {CONTENT_WIDTH, CONTENT_WIDTH_OPTIONS, FREE_WIDTH, widthResize} from './spec-block-options';

let nextId = 0;

/** A labelled `ims-toggle-switch`: a choice between two answers, such as yes and no. */
@Component({
    selector: 'app-spec-block-toggle-switch',
    standalone: true,
    imports: [ImsFormField, ImsFormFieldLabel, ImsToggleSwitch, ImsToggleSwitchOption],
    template: `
        <ims-form-field>
            @if (label()) {
                <span imsFormFieldLabel [id]="labelId">{{ label() }}</span>
            }
            <ims-toggle-switch
                [attr.aria-labelledby]="label() ? labelId : null"
                [class.spec-block-toggle-switch__fill]="width() === freeWidth"
                [value]="value()"
                [disabled]="disabled()"
            >
                <ims-toggle-switch-option value="first">{{ first() }}</ims-toggle-switch-option>
                <ims-toggle-switch-option value="second" [appearance]="rejectSecond() ? 'reject' : 'check'">
                    {{ second() }}
                </ims-toggle-switch-option>
            </ims-toggle-switch>
        </ims-form-field>
    `,
    styles: `
        :host {
            display: block;
        }

        /* The switch spreads its two options apart across the width it gets. */
        .spec-block-toggle-switch__fill {
            inline-size: 100%;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockToggleSwitch {
    readonly label = input.required<string>();
    readonly first = input.required<string>();
    readonly second = input.required<string>();
    readonly selected = input.required<string>();
    readonly rejectSecond = input.required<boolean>();
    readonly disabled = input.required<boolean>();
    readonly width = input.required<string>();

    protected readonly freeWidth = FREE_WIDTH;
    protected readonly labelId = `spec-block-toggle-switch-${nextId++}`;
    protected readonly value = computed(() => this.selected() || null);
}

export const TOGGLE_SWITCH_BLOCK = defineSpecBlock({
    type: 'toggle-switch',
    label: 'מתג בחירה',
    category: 'choices',
    icon: 'toggle_on',
    component: SpecBlockToggleSwitch,
    resize: widthResize,
    defaultSize: {width: 280, height: 26},
    properties: {
        label: {kind: 'text', label: 'תווית ליד השדה', defaultValue: 'מעשן', labelSamples: ['מעשן', 'בעל רישיון נהיגה', 'נהג צעיר', 'קיים ביטוח קודם', 'תושב חוץ']},
        first: {kind: 'text', label: 'אפשרות ראשונה', defaultValue: 'כן'},
        second: {kind: 'text', label: 'אפשרות שנייה', defaultValue: 'לא'},
        selected: {
            kind: 'choice',
            label: 'נבחרת',
            defaultValue: '',
            options: [
                {value: '', label: 'אף אחת'},
                {value: 'first', label: 'הראשונה'},
                {value: 'second', label: 'השנייה'}
            ]
        },
        rejectSecond: {kind: 'toggle', label: 'השנייה היא דחייה', defaultValue: false},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false},
        width: {kind: 'choice', label: 'רוחב', defaultValue: CONTENT_WIDTH, options: CONTENT_WIDTH_OPTIONS}
    },
    reference: {
        selector: 'ims-toggle-switch',
        snippet: (props: SpecProps) => {
            const label = props['label'] ? `    <span imsFormFieldLabel>${escapeHtml(String(props['label']))}</span>\n` : '';
            const reject = props['rejectSecond'] ? ' appearance="reject"' : '';
            return `<ims-form-field>\n${label}    <ims-toggle-switch${htmlFlag('disabled', props['disabled'])}>\n`
                + `        <ims-toggle-switch-option [value]="true">${escapeHtml(String(props['first']))}</ims-toggle-switch-option>\n`
                + `        <ims-toggle-switch-option [value]="false"${reject}>${escapeHtml(String(props['second']))}</ims-toggle-switch-option>\n`
                + '    </ims-toggle-switch>\n</ims-form-field>';
        }
    }
});
