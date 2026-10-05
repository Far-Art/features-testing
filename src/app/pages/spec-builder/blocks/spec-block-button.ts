import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsButton, ImsButtonSeverity, ImsButtonVariation} from '../../../components/ims-button';
import {ImsIcon} from '../../../components/ims-icon';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {CONTENT_WIDTH, SEVERITY_OPTIONS, SIZED_CONTENT_WIDTH_OPTIONS, contentWidthClass, widthResize} from './spec-block-options';

/** `button[ims-button]`: a button with a label and an optional icon. */
@Component({
    selector: 'app-spec-block-button',
    standalone: true,
    imports: [ImsButton, ImsIcon],
    template: `
        <button
            ims-button
            [ims-button-variation]="variation()"
            [ims-button-severity]="severity()"
            [call-to-action]="callToAction()"
            [disabled]="disabled()"
            [class]="widthClass()"
        >
            @if (icon()) {
                <ims-icon class="ims-button__symbol">{{ icon() }}</ims-icon>
            }
            {{ label() }}
        </button>
    `,
    styles: `
        :host {
            display: block;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockButton {
    readonly label = input.required<string>();
    readonly variation = input.required<ImsButtonVariation>();
    readonly severity = input.required<ImsButtonSeverity>();
    readonly icon = input.required<string>();
    readonly disabled = input.required<boolean>();
    readonly callToAction = input.required<boolean>();
    readonly width = input.required<string>();

    protected readonly widthClass = computed(() => contentWidthClass(this.width()));
}

export const BUTTON_BLOCK = defineSpecBlock({
    type: 'button',
    label: 'כפתור',
    category: 'actions',
    icon: 'smart_button',
    component: SpecBlockButton,
    resize: widthResize,
    defaultSize: {width: 120, height: 26},
    properties: {
        label: {kind: 'text', label: 'תווית', defaultValue: 'שמירה'},
        variation: {
            kind: 'choice',
            label: 'סגנון',
            defaultValue: 'primary',
            options: [
                {value: 'default', label: 'רגיל'},
                {value: 'primary', label: 'ראשי'},
                {value: 'secondary', label: 'משני'},
                {value: 'outline', label: 'מתאר'}
            ]
        },
        severity: {kind: 'choice', label: 'משמעות', defaultValue: 'info', options: SEVERITY_OPTIONS},
        icon: {kind: 'text', label: 'סמל (שם מ־Material Symbols)', defaultValue: ''},
        disabled: {kind: 'toggle', label: 'מושבת', defaultValue: false},
        callToAction: {kind: 'toggle', label: 'קריאה לפעולה', defaultValue: false},
        width: {kind: 'choice', label: 'רוחב', defaultValue: CONTENT_WIDTH, options: SIZED_CONTENT_WIDTH_OPTIONS}
    },
    reference: {
        selector: 'button[ims-button]',
        snippet: (props: SpecProps) => {
            const attributes = htmlAttribute('class', contentWidthClass(props['width']))
                + htmlAttribute('ims-button-variation', props['variation'], 'default')
                + htmlAttribute('ims-button-severity', props['severity'], 'info')
                + htmlFlag('call-to-action', props['callToAction'])
                + htmlFlag('disabled', props['disabled']);
            const icon = props['icon'] ? `\n    <ims-icon class="ims-button__symbol">${escapeHtml(String(props['icon']))}</ims-icon>` : '';
            return `<button ims-button${attributes}>${icon}\n    ${escapeHtml(String(props['label']))}\n</button>`;
        }
    }
});
