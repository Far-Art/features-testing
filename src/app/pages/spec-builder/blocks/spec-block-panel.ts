import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {ImsPanel, ImsPanelHeader, ImsPanelSeverity} from '../../../components/ims-panel';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute} from '../core/spec-reference.utils';
import {SEVERITY_OPTIONS} from './spec-block-options';

/**
 * `ims-panel` with an optional header.
 *
 * In a spec a panel often frames other items placed over it, so it fills its
 * item instead of being as tall as its text. Send it to the back to keep it
 * behind them.
 */
@Component({
    selector: 'app-spec-block-panel',
    standalone: true,
    imports: [ImsPanel, ImsPanelHeader],
    template: `
        <ims-panel class="spec-block-panel__panel" [severity]="severity()">
            @if (showHeader()) {
                <ims-panel-header [icon]="icon() || null">{{ title() }}</ims-panel-header>
            }
            <p class="spec-block-panel__body">{{ body() }}</p>
        </ims-panel>
    `,
    styles: `
        :host {
            display: block;
        }

        .spec-block-panel__panel {
            block-size: 100%;
            max-block-size: none;
        }

        .spec-block-panel__body {
            margin: 0;
            white-space: pre-line;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockPanel {
    readonly severity = input.required<ImsPanelSeverity>();
    readonly showHeader = input.required<boolean>();
    readonly title = input.required<string>();
    readonly icon = input.required<string>();
    readonly body = input.required<string>();
}

export const PANEL_BLOCK = defineSpecBlock({
    type: 'panel',
    label: 'פאנל',
    category: 'layout',
    icon: 'web_asset',
    component: SpecBlockPanel,
    resize: 'both',
    defaultSize: {width: 360, height: 200},
    properties: {
        severity: {kind: 'choice', label: 'משמעות', defaultValue: 'neutral', options: [{value: 'neutral', label: 'ניטרלי'}, ...SEVERITY_OPTIONS]},
        showHeader: {kind: 'toggle', label: 'כותרת', defaultValue: true},
        title: {kind: 'text', label: 'טקסט הכותרת', defaultValue: 'פרטי פוליסה'},
        icon: {kind: 'text', label: 'סמל הכותרת (שם מ־Material Symbols)', defaultValue: 'receipt_long'},
        body: {kind: 'text', label: 'תוכן', defaultValue: '', multiline: true}
    },
    reference: {
        selector: 'ims-panel',
        snippet: (props: SpecProps) => {
            const header = props['showHeader']
                ? `\n    <ims-panel-header${htmlAttribute('icon', props['icon'])}>${escapeHtml(String(props['title']))}</ims-panel-header>`
                : '';
            const body = props['body'] ? `\n    <p>${escapeHtml(String(props['body']))}</p>` : '';
            return `<ims-panel${htmlAttribute('severity', props['severity'], 'neutral')}>${header}${body}\n</ims-panel>`;
        }
    }
});
