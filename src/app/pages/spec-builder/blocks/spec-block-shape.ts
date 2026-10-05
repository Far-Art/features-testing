import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {tokenColor} from './spec-block-options';

/** A rectangle or an ellipse painted with colour tokens, with optional text inside. */
@Component({
    selector: 'app-spec-block-shape',
    standalone: true,
    template: `
        <div
            class="spec-block-shape"
            [style.background]="fillCss()"
            [style.border]="borderCss()"
            [style.border-radius]="radiusCss()"
            [style.color]="textColorCss()"
        >{{ text() }}</div>
    `,
    styles: `
        :host {
            display: block;
        }

        .spec-block-shape {
            display: grid;
            place-items: center;
            box-sizing: border-box;
            inline-size: 100%;
            block-size: 100%;
            padding: 0.5rem;
            overflow: hidden;
            text-align: center;
            white-space: pre-line;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockShape {
    readonly shape = input.required<string>();
    readonly fill = input.required<string>();
    readonly border = input.required<string>();
    readonly borderWidth = input.required<number>();
    readonly radius = input.required<number>();
    readonly text = input.required<string>();
    readonly textColor = input.required<string>();

    protected readonly fillCss = computed(() => tokenColor(this.fill()));
    protected readonly borderCss = computed(() => shapeBorder(this.border(), this.borderWidth()));
    protected readonly radiusCss = computed(() => this.shape() === 'ellipse' ? '50%' : `${this.radius()}px`);
    protected readonly textColorCss = computed(() => tokenColor(this.textColor(), 'inherit'));
}

function shapeBorder(token: string, width: number): string {
    return token && width > 0 ? `${width}px solid var(${token})` : 'none';
}

export const SHAPE_BLOCK = defineSpecBlock({
    type: 'shape',
    label: 'צורה',
    category: 'shapes',
    icon: 'rectangle',
    component: SpecBlockShape,
    resize: 'both',
    defaultSize: {width: 200, height: 120},
    properties: {
        shape: {
            kind: 'choice',
            label: 'סוג',
            defaultValue: 'rectangle',
            options: [
                {value: 'rectangle', label: 'מלבן'},
                {value: 'ellipse', label: 'אליפסה'}
            ]
        },
        fill: {kind: 'token', label: 'מילוי', defaultValue: '--ims-color-status-info-subtle', use: 'fill'},
        border: {kind: 'token', label: 'מסגרת', defaultValue: '--ims-color-status-info-border', use: 'color'},
        borderWidth: {kind: 'number', label: 'עובי מסגרת', defaultValue: 1, min: 0, max: 8},
        radius: {kind: 'number', label: 'עיגול פינות', defaultValue: 12, min: 0, max: 64},
        text: {kind: 'text', label: 'טקסט', defaultValue: '', multiline: true},
        textColor: {kind: 'token', label: 'צבע הטקסט', defaultValue: '--ims-color-on-surface', use: 'color'}
    },
    reference: {
        selector: '',
        language: 'css',
        snippet: (props: SpecProps) => [
            `background: ${tokenColor(String(props['fill']))};`,
            `border: ${shapeBorder(String(props['border']), Number(props['borderWidth']))};`,
            `border-radius: ${props['shape'] === 'ellipse' ? '50%' : `${props['radius']}px`};`,
            `color: ${tokenColor(String(props['textColor']), 'inherit')};`
        ].join('\n')
    }
});
