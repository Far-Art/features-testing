import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
    booleanAttribute,
    computed,
    inject,
    input,
    numberAttribute
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ImsDuoIconDefinition} from './ims-duo-icon.generated';

export type ImsDuoIconTone =
    | 'default'
    | 'muted'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger'
    | 'inverse';

const MIN_OFFSET = 0;
const MAX_OFFSET = 3;

/**
 * The markup is a static string from our own generated module — nothing
 * user-supplied is concatenated into it, so there is no injection surface to
 * sanitize away, and sanitizing would strip the very SVG attributes the glyph is
 * made of. Keyed by the icon object so repeated instances share one SafeHtml;
 * weak so a lazily-loaded icon can be collected with its chunk.
 */
const markupCache = new WeakMap<ImsDuoIconDefinition, SafeHtml>();

/**
 * A duotone icon. Purely presentational: the glyph is always decorative, because
 * every source file's `<svg>` root carries `aria-hidden="true"` and the host adds
 * no role of its own.
 *
 * Naming is the consumer's job, which is where it belongs — an icon-only control
 * should be named on the control, not the glyph:
 *
 * ```html
 * <button ims-button-icon aria-label="Save"><ims-duo-icon [icon]="save"/></button>
 * ```
 *
 * For a standalone icon that must carry meaning with no control around it, put
 * the role and name on the element itself:
 *
 * ```html
 * <ims-duo-icon [icon]="warning" role="img" aria-label="Overdue"/>
 * ```
 */
@Component({
    selector: 'ims-duo-icon',
    standalone: true,
    template: '',
    styleUrl: './ims-duo-icon.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The glyph is injected as innerHTML, so it never receives the component's
    // scoping attribute. Styles are global and every selector is prefixed with
    // `.ims-duo-icon` to keep them contained.
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ims-duo-icon',
        '[class.ims-duo-icon--muted]': 'tone() === "muted"',
        '[class.ims-duo-icon--accent]': 'tone() === "accent"',
        '[class.ims-duo-icon--success]': 'tone() === "success"',
        '[class.ims-duo-icon--warning]': 'tone() === "warning"',
        '[class.ims-duo-icon--danger]': 'tone() === "danger"',
        '[class.ims-duo-icon--inverse]': 'tone() === "inverse"',
        '[class.ims-duo-icon--hover]': 'hover()',
        '[style.--ims-duo-icon-size]': 'sizePx()',
        '[style.--ims-duo-icon-stroke-width]': 'resolvedStrokeWidth()',
        '[style.--ims-duo-icon-offset]': 'resolvedOffset()',
        '[innerHTML]': 'markup()'
    }
})
export class ImsDuoIcon {
    private readonly sanitizer = inject(DomSanitizer);

    /**
     * The glyph to render — import the icon and pass it in:
     * `import {imsDuoIconAdd} from '.../ims-icon'` then `<ims-duo-icon [icon]="imsDuoIconAdd"/>`.
     *
     * This takes the icon itself rather than a name so unused glyphs tree-shake:
     * a string lookup would force the whole set into the bundle.
     */
    readonly icon = input.required<ImsDuoIconDefinition>();

    /**
     * Rendered edge length in px. Defaults to 18 to match the Material Symbols
     * ligature size used elsewhere in the system (`--ims-icon-size: 1.125rem`).
     */
    readonly size = input(22, {transform: numberAttribute});

    /** Duotone palette, resolved from the `--ims-color-*` ramps. */
    readonly tone = input<ImsDuoIconTone>('default');

    /**
     * Off-register distance of the tint layer, in user units. Spec range 0–3.
     * Unset defers to `--ims-duo-icon-offset` in the stylesheet, so the house
     * default lives in one place and can be themed per surface.
     */
    readonly offset = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    /**
     * Opt into the lift treatment: on hover the tint pushes to 2.1x its offset.
     *
     * Off by default — most icons are decorative and sit inside a control that
     * already owns the hover feedback, so an icon that animates on its own is
     * usually wrong. Also fires when an ancestor marked
     * `.ims-duo-icon-hover-group` is hovered, which is what you want for an icon
     * inside a button.
     */
    readonly hover = input(false, {transform: booleanAttribute});

/** Per-instance stroke weight. Unset defers to `--icon-stroke-width`. */
    readonly strokeWidth = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    protected readonly sizePx = computed(() => `${this.size()}px`);

    // Null removes the inline style, letting the stylesheet's value apply.
    protected readonly resolvedOffset = computed(() => {
        const offset = this.offset();
        return offset === null ? null : String(clamp(offset, MIN_OFFSET, MAX_OFFSET));
    });

    protected readonly resolvedStrokeWidth = computed(() => {
        const strokeWidth = this.strokeWidth();
        return strokeWidth === null ? null : String(strokeWidth);
    });

    protected readonly markup = computed(() => {
        const icon = this.icon();
        const cached = markupCache.get(icon);
        if (cached) return cached;

        const trusted = this.sanitizer.bypassSecurityTrustHtml(icon.source);
        markupCache.set(icon, trusted);
        return trusted;
    });
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
