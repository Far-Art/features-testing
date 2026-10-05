import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {ImsFormField} from '../../../components/ims-form-layout';
import {IMS_SELECTION_LABELS, ImsOption, ImsSelect, ImsSelectFilterMode, ImsSelectToolbarMode} from '../../../components/ims-select';
import {ImsSelectionToolbar} from '../../../shared/ims-selection';
import {ReadonlyDirective} from '../../../shared/readonly.directive';
import {SpecChoiceOption, SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {splitLines} from '../core/spec-document.utils';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {FIELD_WIDTH_OPTIONS, FREE_WIDTH, fieldClass, widthResize} from './spec-block-options';

let nextId = 0;

/** When the filter or the multi-select toolbar is shown. */
const AUTO_MODE_OPTIONS: readonly SpecChoiceOption[] = [
    {value: 'auto', label: 'אוטומטי, לפי מספר האפשרויות'},
    {value: 'on', label: 'תמיד'},
    {value: 'off', label: 'אף פעם'}
];

/** Option counts from which `ims-select` shows the filter and the toolbar in `auto` mode: its defaults. */
const AUTO_FILTER_MIN_OPTIONS = 15;
const AUTO_TOOLBAR_MIN_OPTIONS = 10;

/**
 * A labelled `ims-select`, single or multiple. The options are typed one per
 * line, and the selected ones are picked from them in the inspector.
 *
 * With "list open" on, the list is drawn open below the field. It is a copy
 * drawn with the select's own panel classes, inside the page: the select's
 * real list is a CDK overlay, which sits outside the page, is not scaled with
 * it and closes at the first click elsewhere, so it could not be placed,
 * kept open or captured with the page. In preview mode the real list still
 * opens on a click.
 */
@Component({
    selector: 'app-spec-block-select',
    standalone: true,
    imports: [ImsFormField, ImsOption, ImsSelect, ImsSelectionToolbar, ReadonlyDirective],
    template: `
        <ims-form-field>
            @if (label()) {
                <label [for]="id">{{ label() }}</label>
            }
            <!-- The field's value: the select, and the open list placed under it. -->
            <span class="spec-block-select__control" [class]="controlClass()">
                <ims-select
                    class="field-stretch"
                    [id]="id"
                    [class.ims-input--invalid]="invalid()"
                    [ims-readonly]="readonly()"
                    [multiple]="multiple()"
                    [clearable]="clearable()"
                    [filter]="filter()"
                    [toolbar]="toolbar()"
                    [placeholder]="placeholder() || null"
                    [value]="value()"
                    [disabled]="disabled()"
                >
                    @for (option of optionList(); track $index) {
                        <ims-option [value]="option" [selectionText]="option">{{ option }}</ims-option>
                    }
                </ims-select>

                @if (showList()) {
                    <div
                        class="ims-select__overlay spec-block-select__list"
                        aria-hidden="true"
                        [class.ims-select__overlay--toolbar-right]="showToolbar()"
                    >
                        @if (showToolbar()) {
                            <ims-selection-toolbar
                                class="ims-select__toolbar"
                                viewMode="all"
                                [labels]="selectionLabels"
                                [viewModeCounts]="viewModeCounts()"
                            />
                        }
                        <div class="ims-select__menu">
                            @if (showFilter()) {
                                <div class="ims-select__filter">
                                    <input class="ims-input" type="text" tabindex="-1" [placeholder]="selectionLabels.filter">
                                </div>
                            }
                            <div class="ims-select__listbox spec-block-select__listbox">
                                @for (option of optionList(); track $index) {
                                    <div class="ims-option" [class.ims-option--selected]="selectedSet().has(option)">
                                        <span class="ims-option__label">
                                            <span class="ims-option__content">{{ option }}</span>
                                            <span class="ims-option__weight-reserve">{{ option }}</span>
                                        </span>
                                    </div>
                                } @empty {
                                    <div class="ims-select__empty">{{ selectionLabels.noOptions }}</div>
                                }
                            </div>
                        </div>
                    </div>
                }
            </span>
        </ims-form-field>
    `,
    styles: `
        :host {
            display: block;
        }

        .spec-block-select__control {
            position: relative;
            display: block;
        }

        /* Where the real list opens: under the field, from its start edge, at least as wide. */
        .spec-block-select__list {
            position: absolute;
            inset-block-start: calc(100% + 4px);
            inset-inline-start: 0;
            z-index: 1;
            min-inline-size: 100%;
            pointer-events: none;
        }

        .spec-block-select__listbox {
            max-block-size: 18rem;
            view-transition-name: none;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockSelect {
    readonly label = input.required<string>();
    readonly options = input.required<string>();
    readonly multiple = input.required<boolean>();
    readonly selected = input.required<string>();
    readonly placeholder = input.required<string>();
    readonly clearable = input.required<boolean>();
    readonly filter = input.required<ImsSelectFilterMode>();
    readonly toolbar = input.required<ImsSelectToolbarMode>();
    readonly width = input.required<string>();
    readonly open = input.required<boolean>();
    readonly invalid = input.required<boolean>();
    readonly readonly = input.required<boolean>();
    readonly disabled = input.required<boolean>();

    protected readonly id = `spec-block-select-${nextId++}`;
    protected readonly selectionLabels = inject(IMS_SELECTION_LABELS);
    protected readonly optionList = computed(() => splitLines(this.options()));
    protected readonly controlClass = computed(() => fieldClass(this.width()));
    private readonly selectedLines = computed(() => splitLines(this.selected()));
    /** The first selected line in a single select, every selected line in a multiple one. */
    protected readonly value = computed(() => this.multiple() ? this.selectedLines() : this.selectedLines()[0] ?? null);
    protected readonly selectedSet = computed(() => new Set(this.multiple() ? this.selectedLines() : this.selectedLines().slice(0, 1)));
    /** A disabled or readonly select does not open its options. */
    protected readonly showList = computed(() => this.open() && !this.disabled() && !this.readonly());
    protected readonly showFilter = computed(() => isShown(this.filter(), this.optionList().length, AUTO_FILTER_MIN_OPTIONS));
    protected readonly showToolbar = computed(() => this.multiple() && isShown(this.toolbar(), this.optionList().length, AUTO_TOOLBAR_MIN_OPTIONS));
    protected readonly viewModeCounts = computed(() => {
        const all = this.optionList().length;
        const selected = this.optionList().filter((option) => this.selectedSet().has(option)).length;
        return {all, selected, unselected: all - selected};
    });
}

/** Whether a part with an on / off / auto mode is shown, as `ims-select` decides it. */
function isShown(mode: string, optionCount: number, autoMinOptions: number): boolean {
    return mode === 'on' || (mode === 'auto' && optionCount >= autoMinOptions);
}

export const SELECT_BLOCK = defineSpecBlock({
    type: 'select',
    label: 'רשימת בחירה',
    category: 'fields',
    icon: 'arrow_drop_down_circle',
    component: SpecBlockSelect,
    resize: widthResize,
    defaultSize: {width: 280, height: 26},
    properties: {
        label: {kind: 'text', label: 'תווית ליד השדה', defaultValue: 'סניף', labelSamples: ['סניף', 'סוג פוליסה', 'מצב משפחתי', 'ארץ לידה', 'סוג כיסוי', 'אמצעי תשלום']},
        options: {kind: 'text', label: 'אפשרויות', defaultValue: 'ירושלים\nתל אביב\nחיפה', multiline: true, hint: 'ערך אחד בכל שורה'},
        multiple: {kind: 'toggle', label: 'בחירה מרובה', defaultValue: false},
        selected: {kind: 'selection', label: 'ערכים נבחרים', defaultValue: '', optionsFrom: 'options', multipleFrom: 'multiple'},
        placeholder: {kind: 'text', label: 'טקסט רמז בשדה ריק (placeholder)', defaultValue: '', hint: 'מוצג באפור רק כל עוד השדה ריק.'},
        clearable: {kind: 'toggle', label: 'כפתור ניקוי (בבחירה יחידה)', defaultValue: false},
        filter: {kind: 'choice', label: 'שדה סינון', defaultValue: 'auto', options: AUTO_MODE_OPTIONS},
        toolbar: {kind: 'choice', label: 'סרגל כלים (בבחירה מרובה)', defaultValue: 'auto', options: AUTO_MODE_OPTIONS},
        width: {kind: 'choice', label: 'רוחב', defaultValue: FREE_WIDTH, options: FIELD_WIDTH_OPTIONS},
        open: {kind: 'toggle', label: 'רשימה פתוחה', defaultValue: false, hint: 'מציג את רשימת האפשרויות פתוחה מתחת לשדה, גם בצילום.'},
        invalid: {kind: 'toggle', label: 'שגוי', defaultValue: false},
        readonly: {kind: 'toggle', label: 'לקריאה בלבד', defaultValue: false},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false}
    },
    reference: {
        selector: 'ims-select',
        snippet: (props: SpecProps) => {
            const multiple = props['multiple'] === true;
            const attributes = htmlAttribute('class', fieldClass(props['width']))
                + htmlFlag('multiple', multiple)
                + (multiple ? '' : htmlFlag('clearable', props['clearable']))
                + htmlAttribute('filter', props['filter'], 'auto')
                + (multiple ? htmlAttribute('toolbar', props['toolbar'], 'auto') : '')
                + htmlAttribute('placeholder', props['placeholder'])
                + (props['readonly'] === true ? ' [ims-readonly]="true"' : '')
                + htmlFlag('disabled', props['disabled']);
            const options = splitLines(String(props['options']))
                .map((option) => `        <ims-option value="${escapeHtml(option)}">${escapeHtml(option)}</ims-option>`)
                .join('\n');
            const label = props['label'] ? `    <label>${escapeHtml(String(props['label']))}</label>\n` : '';
            return `<ims-form-field>\n${label}    <ims-select${attributes}>\n${options}\n    </ims-select>\n</ims-form-field>`;
        }
    }
});
