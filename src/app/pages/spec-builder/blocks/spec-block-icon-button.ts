import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsButtonIcon, ImsButtonIconPreset, ImsButtonSeverity} from '../../../components/ims-button';
import {ImsIcon} from '../../../components/ims-icon';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {SEVERITY_OPTIONS} from './spec-block-options';

/** `button[ims-button-icon]`: a button with only a glyph, or one of the edit and delete presets. */
@Component({
    selector: 'app-spec-block-icon-button',
    standalone: true,
    imports: [ImsButtonIcon, ImsIcon],
    template: `
        <button
            ims-button-icon
            [ims-button-icon-preset]="presetValue()"
            [ims-button-severity]="severity()"
            [disabled]="disabled()"
            [attr.aria-label]="label()"
        >
            @if (!presetValue()) {
                <ims-icon>{{ icon() }}</ims-icon>
            }
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockIconButton {
    readonly preset = input.required<string>();
    readonly icon = input.required<string>();
    readonly label = input.required<string>();
    readonly severity = input.required<ImsButtonSeverity>();
    readonly disabled = input.required<boolean>();

    /** A preset draws its own glyph, so nothing is projected while one is set. */
    protected readonly presetValue = computed(() => (this.preset() || null) as ImsButtonIconPreset | null);
}

export const ICON_BUTTON_BLOCK = defineSpecBlock({
    type: 'icon-button',
    label: 'כפתור סמל',
    category: 'actions',
    icon: 'touch_app',
    component: SpecBlockIconButton,
    resize: 'none',
    defaultSize: {width: 26, height: 26},
    properties: {
        preset: {
            kind: 'choice',
            label: 'תבנית',
            defaultValue: '',
            options: [
                {value: '', label: 'ללא'},
                {value: 'edit', label: 'עריכה'},
                {value: 'delete', label: 'מחיקה'}
            ]
        },
        icon: {kind: 'text', label: 'סמל (שם מ־Material Symbols)', defaultValue: 'search'},
        label: {kind: 'text', label: 'שם נגיש', defaultValue: 'חיפוש'},
        severity: {kind: 'choice', label: 'משמעות', defaultValue: 'info', options: SEVERITY_OPTIONS},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false}
    },
    reference: {
        selector: 'button[ims-button-icon]',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('ims-button-icon-preset', props['preset'])
                + htmlAttribute('ims-button-severity', props['severity'], 'info')
                + htmlAttribute('aria-label', props['label'])
                + htmlFlag('disabled', props['disabled']);
            return props['preset']
                ? `<button ims-button-icon${attributes}></button>`
                : `<button ims-button-icon${attributes}>\n    <ims-icon>${escapeHtml(String(props['icon']))}</ims-icon>\n</button>`;
        }
    }
});
