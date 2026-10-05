import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsIcon} from '../../../components/ims-icon';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml, htmlAttribute, htmlFlag} from '../core/spec-reference.utils';
import {tokenColor} from './spec-block-options';

/** `ims-icon`: a Material Symbols glyph, painted with a colour token. */
@Component({
    selector: 'app-spec-block-icon',
    standalone: true,
    imports: [ImsIcon],
    template: `<ims-icon [filled]="filled()" [size]="size()" [style.color]="colorCss()">{{ name() }}</ims-icon>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockIcon {
    readonly name = input.required<string>();
    readonly size = input.required<number>();
    readonly filled = input.required<boolean>();
    readonly color = input.required<string>();

    protected readonly colorCss = computed(() => tokenColor(this.color(), 'inherit'));
}

export const ICON_BLOCK = defineSpecBlock({
    type: 'icon',
    label: 'סמל',
    category: 'layout',
    icon: 'emoji_symbols',
    component: SpecBlockIcon,
    resize: 'none',
    defaultSize: {width: 24, height: 24},
    properties: {
        name: {kind: 'text', label: 'שם מ־Material Symbols', defaultValue: 'info'},
        size: {kind: 'number', label: 'גודל', defaultValue: 24, min: 12, max: 96},
        filled: {kind: 'toggle', label: 'מלא', defaultValue: false},
        color: {kind: 'token', label: 'צבע', defaultValue: '--ims-color-interactive', use: 'color'}
    },
    reference: {
        selector: 'ims-icon',
        snippet: (props: SpecProps) =>
            `<ims-icon${htmlFlag('filled', props['filled'])}${htmlAttribute('size', props['size'])}>${escapeHtml(String(props['name']))}</ims-icon>`
    }
});
