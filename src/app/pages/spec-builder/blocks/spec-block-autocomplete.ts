import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsAutocomplete} from '../../../components/ims-autocomplete';
import {ImsFormField} from '../../../components/ims-form-layout';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {splitLines} from '../core/spec-document.utils';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {FIELD_WIDTH_OPTIONS, FREE_WIDTH, fieldClass, widthResize} from './spec-block-options';

let nextId = 0;

/** A labelled `ims-autocomplete`. The options are typed one per line. */
@Component({
    selector: 'app-spec-block-autocomplete',
    standalone: true,
    imports: [ImsAutocomplete, ImsFormField],
    template: `
        <ims-form-field>
            @if (label()) {
                <label [for]="id">{{ label() }}</label>
            }
            <ims-autocomplete
                [id]="id"
                [class]="controlClass()"
                [options]="optionList()"
                [placeholder]="placeholder() || null"
                [value]="initialValue()"
                [multiple]="multiple()"
                [disabled]="disabled()"
            />
        </ims-form-field>
    `,
    styles: `
        :host {
            display: block;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockAutocomplete {
    readonly label = input.required<string>();
    readonly options = input.required<string>();
    readonly value = input.required<string>();
    readonly placeholder = input.required<string>();
    readonly width = input.required<string>();
    readonly multiple = input.required<boolean>();
    readonly disabled = input.required<boolean>();

    protected readonly id = `spec-block-autocomplete-${nextId++}`;
    protected readonly optionList = computed(() => splitLines(this.options()));
    protected readonly controlClass = computed(() => fieldClass(this.width()));
    /** A multiple autocomplete holds a list: then each line of the example value is one entry. */
    protected readonly initialValue = computed(() => this.multiple() ? splitLines(this.value()) : this.value() || null);
}

export const AUTOCOMPLETE_BLOCK = defineSpecBlock({
    type: 'autocomplete',
    label: 'השלמה אוטומטית',
    category: 'fields',
    icon: 'manage_search',
    component: SpecBlockAutocomplete,
    resize: widthResize,
    defaultSize: {width: 280, height: 26},
    properties: {
        label: {kind: 'text', label: 'תווית ליד השדה', defaultValue: 'לקוח', labelSamples: ['לקוח', 'סוכן', 'מבוטח ראשי', 'יישוב', 'בית חולים', 'מוסך']},
        options: {kind: 'text', label: 'אפשרויות', defaultValue: 'נועה כהן\nדוד לוי\nמרים אברהם', multiline: true, hint: 'ערך אחד בכל שורה'},
        multiple: {kind: 'toggle', label: 'בחירה מרובה', defaultValue: false},
        value: {kind: 'selection', label: 'ערכים נבחרים', defaultValue: '', optionsFrom: 'options', multipleFrom: 'multiple'},
        placeholder: {kind: 'text', label: 'טקסט רמז בשדה ריק (placeholder)', defaultValue: '', hint: 'מוצג באפור רק כל עוד השדה ריק.'},
        width: {kind: 'choice', label: 'רוחב', defaultValue: FREE_WIDTH, options: FIELD_WIDTH_OPTIONS},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false}
    },
    reference: {
        selector: 'ims-autocomplete',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('class', fieldClass(props['width']))
                + htmlAttribute('placeholder', props['placeholder'])
                + htmlFlag('multiple', props['multiple'])
                + htmlFlag('disabled', props['disabled']);
            const label = props['label'] ? `    <label>${escapeHtml(String(props['label']))}</label>\n` : '';
            return `<ims-form-field>\n${label}    <ims-autocomplete${attributes} [options]="options"/>\n</ims-form-field>`;
        }
    }
});
