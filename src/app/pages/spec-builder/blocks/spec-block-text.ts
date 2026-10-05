import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {SpecBlockProperty, SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {escapeHtml} from '../core/spec-reference.utils';
import {FONT_WEIGHT_OPTIONS, tokenColor} from './spec-block-options';

/** A size or weight value: the one the page's stylesheets give the tag. */
const FROM_TAG = '';

type TextTag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/**
 * Text drawn in a real `span`, `p` or `h1`–`h6`, so it takes the style the
 * page's stylesheets give that tag, as it will on the real page. The size,
 * weight and colour can override that style. Text wraps within the item's
 * width, and a new line in the text starts a new line.
 */
@Component({
    selector: 'app-spec-block-text',
    standalone: true,
    template: `
        @switch (tag()) {
            @case ('h1') {
                <h1 class="spec-block-text" [style]="textStyle()">{{ text() }}</h1>
            }
            @case ('h2') {
                <h2 class="spec-block-text" [style]="textStyle()">{{ text() }}</h2>
            }
            @case ('h3') {
                <h3 class="spec-block-text" [style]="textStyle()">{{ text() }}</h3>
            }
            @case ('h4') {
                <h4 class="spec-block-text" [style]="textStyle()">{{ text() }}</h4>
            }
            @case ('h5') {
                <h5 class="spec-block-text" [style]="textStyle()">{{ text() }}</h5>
            }
            @case ('h6') {
                <h6 class="spec-block-text" [style]="textStyle()">{{ text() }}</h6>
            }
            @case ('p') {
                <p class="spec-block-text" [style]="textStyle()">{{ text() }}</p>
            }
            @default {
                <span class="spec-block-text" [style]="textStyle()">{{ text() }}</span>
            }
        }
    `,
    styles: `
        :host {
            display: block;
        }

        /* The item's position stands in for the tag's margins. */
        .spec-block-text {
            display: block;
            margin: 0;
            white-space: pre-line;
            overflow-wrap: anywhere;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockText {
    readonly text = input.required<string>();
    readonly tag = input.required<TextTag>();
    readonly size = input.required<string>();
    readonly weight = input.required<string>();
    readonly color = input.required<string>();
    readonly align = input.required<string>();

    /** Only the overrides: what is left out comes from the tag's own style. */
    protected readonly textStyle = computed(() => textStyle(this.size(), this.weight(), this.color(), this.align()));
}

/** The settings of a text block. A heading and plain text differ only in what they start with. */
function textProperties(text: string, tag: TextTag): Readonly<Record<keyof SpecBlockText & string, SpecBlockProperty>> {
    return {
        text: {kind: 'text', label: 'טקסט', defaultValue: text, multiline: true},
        tag: {
            kind: 'choice',
            label: 'תגית',
            defaultValue: tag,
            hint: 'הגודל והמשקל נלקחים מהעיצוב של התגית, אלא אם בוחרים אחרים.',
            options: [
                {value: 'span', label: 'span, טקסט בשורה'},
                {value: 'p', label: 'p, פסקה'},
                {value: 'h1', label: 'h1, כותרת ראשית'},
                {value: 'h2', label: 'h2, כותרת'},
                {value: 'h3', label: 'h3, כותרת משנה'},
                {value: 'h4', label: 'h4'},
                {value: 'h5', label: 'h5'},
                {value: 'h6', label: 'h6'}
            ]
        },
        size: {
            kind: 'choice',
            label: 'גודל',
            defaultValue: FROM_TAG,
            options: [
                {value: FROM_TAG, label: 'לפי התגית'},
                {value: '12', label: 'הערה (12)'},
                {value: '14', label: 'גוף (14)'},
                {value: '16', label: 'משנה (16)'},
                {value: '20', label: 'כותרת (20)'},
                {value: '24', label: 'כותרת עמוד (24)'},
                {value: '32', label: 'תצוגה (32)'}
            ]
        },
        weight: {kind: 'choice', label: 'משקל', defaultValue: FROM_TAG, options: [{value: FROM_TAG, label: 'לפי התגית'}, ...FONT_WEIGHT_OPTIONS]},
        color: {kind: 'token', label: 'צבע', defaultValue: '', use: 'color'},
        align: {
            kind: 'choice',
            label: 'יישור',
            defaultValue: 'start',
            options: [
                {value: 'start', label: 'לתחילת השורה'},
                {value: 'center', label: 'למרכז'},
                {value: 'end', label: 'לסוף השורה'}
            ]
        }
    };
}

/** The overrides of a text block as CSS declarations, without the ones left to the tag. */
function textStyle(size: unknown, weight: unknown, color: unknown, align: unknown): Record<string, string> {
    const style: Record<string, string> = {};
    if (size) {
        style['font-size'] = `${size}px`;
    }
    if (weight) {
        style['font-weight'] = `var(--ims-font-weight-${weight})`;
    }
    if (color) {
        style['color'] = tokenColor(String(color));
    }
    if (align !== 'start') {
        style['text-align'] = String(align);
    }
    return style;
}

/** `<tag style="…">text</tag>`, with a line break for each new line in the text. */
function textSnippet(props: SpecProps): string {
    const tag = String(props['tag']);
    const declarations = Object.entries(textStyle(props['size'], props['weight'], props['color'], props['align']))
        .map(([name, value]) => `${name}: ${value}`)
        .join('; ');
    const style = declarations ? ` style="${escapeHtml(declarations)}"` : '';
    const text = escapeHtml(String(props['text'])).replace(/\n/g, '<br>\n    ');
    return `<${tag}${style}>${text}</${tag}>`;
}

export const TEXT_BLOCK = defineSpecBlock({
    type: 'text',
    label: 'טקסט',
    category: 'shapes',
    icon: 'notes',
    component: SpecBlockText,
    resize: 'width',
    defaultSize: {width: 280, height: 24},
    properties: textProperties('טקסט לדוגמה', 'span'),
    reference: {selector: '', snippet: textSnippet}
});

export const HEADING_BLOCK = defineSpecBlock({
    type: 'heading',
    label: 'כותרת',
    category: 'shapes',
    icon: 'title',
    component: SpecBlockText,
    resize: 'width',
    defaultSize: {width: 280, height: 32},
    properties: textProperties('כותרת', 'h2'),
    reference: {selector: '', snippet: textSnippet}
});
