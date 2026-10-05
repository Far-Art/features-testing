import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {tokenColor} from './spec-block-options';

/** A horizontal or vertical line across the middle of its item, such as a divider. */
@Component({
    selector: 'app-spec-block-line',
    standalone: true,
    template: `
        <div
            class="spec-block-line"
            [class.spec-block-line--vertical]="vertical()"
            [style.border-block-start]="vertical() ? null : lineCss()"
            [style.border-inline-start]="vertical() ? lineCss() : null"
        ></div>
    `,
    styles: `
        :host {
            display: grid;
            place-items: center;
        }

        .spec-block-line {
            inline-size: 100%;
        }

        .spec-block-line--vertical {
            inline-size: 0;
            block-size: 100%;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockLine {
    readonly orientation = input.required<string>();
    readonly color = input.required<string>();
    readonly thickness = input.required<number>();
    readonly lineStyle = input.required<string>();

    protected readonly vertical = computed(() => this.orientation() === 'vertical');
    protected readonly lineCss = computed(() => lineBorder(this.thickness(), this.lineStyle(), this.color()));
}

function lineBorder(thickness: number, style: string, token: string): string {
    return `${thickness}px ${style} ${tokenColor(token, 'currentColor')}`;
}

export const LINE_BLOCK = defineSpecBlock({
    type: 'line',
    label: 'קו',
    category: 'shapes',
    icon: 'horizontal_rule',
    component: SpecBlockLine,
    resize: 'both',
    defaultSize: {width: 240, height: 16},
    properties: {
        orientation: {
            kind: 'choice',
            label: 'כיוון',
            defaultValue: 'horizontal',
            options: [
                {value: 'horizontal', label: 'אופקי'},
                {value: 'vertical', label: 'אנכי'}
            ]
        },
        color: {kind: 'token', label: 'צבע', defaultValue: '--ims-color-border', use: 'color'},
        thickness: {kind: 'number', label: 'עובי', defaultValue: 1, min: 1, max: 12},
        lineStyle: {
            kind: 'choice',
            label: 'סגנון',
            defaultValue: 'solid',
            options: [
                {value: 'solid', label: 'רציף'},
                {value: 'dashed', label: 'מקווקו'},
                {value: 'dotted', label: 'מנוקד'}
            ]
        }
    },
    reference: {
        selector: '',
        language: 'css',
        snippet: (props: SpecProps) => {
            const side = props['orientation'] === 'vertical' ? 'border-inline-start' : 'border-block-start';
            return `${side}: ${lineBorder(Number(props['thickness']), String(props['lineStyle']), String(props['color']))};`;
        }
    }
});
