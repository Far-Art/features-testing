import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
    computed,
    inject,
    input,
    numberAttribute
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {IMS_ICONS, ImsIconName} from './ims-icon.registry';

export type ImsIconTone =
    | 'default'
    | 'muted'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger'
    | 'inverse';

/**
 * Hover treatments from the icon spec, all driven by the off-register tint —
 * `lift` pushes it to 2.1x offset, `register` pulls it back into register,
 * `flip` throws it to the opposite corner, `ink` deepens it toward the contour.
 *
 * Defaults to `none`: most icons are decorative and sit inside a control that
 * owns the hover feedback, so an icon that animates on its own is usually wrong.
 * Opt in per instance, or hover an ancestor marked `.ims-icon-hover-group`.
 */
export type ImsIconHover = 'none' | 'lift' | 'register' | 'flip' | 'ink';

const MIN_OFFSET = 0;
const MAX_OFFSET = 3;

/**
 * The markup is a static string from our own registry — nothing user-supplied is
 * concatenated into it, so there is no injection surface to sanitize away, and
 * sanitizing would strip the very SVG attributes the glyph is made of.
 * Cached per icon so repeated instances share one SafeHtml.
 */
const markupCache = new Map<ImsIconName, SafeHtml>();

@Component({
    selector: 'ims-icon',
    standalone: true,
    template: '',
    styleUrl: './ims-icon.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The glyph is injected as innerHTML, so it never receives the component's
    // scoping attribute. Styles are global and every selector is prefixed with
    // `.ims-svg-icon` to keep them contained.
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ims-svg-icon',
        '[class.ims-svg-icon--muted]': 'tone() === "muted"',
        '[class.ims-svg-icon--accent]': 'tone() === "accent"',
        '[class.ims-svg-icon--success]': 'tone() === "success"',
        '[class.ims-svg-icon--warning]': 'tone() === "warning"',
        '[class.ims-svg-icon--danger]': 'tone() === "danger"',
        '[class.ims-svg-icon--inverse]': 'tone() === "inverse"',
        '[class.ims-svg-icon--hover-lift]': 'hover() === "lift"',
        '[class.ims-svg-icon--hover-register]': 'hover() === "register"',
        '[class.ims-svg-icon--hover-flip]': 'hover() === "flip"',
        '[class.ims-svg-icon--hover-ink]': 'hover() === "ink"',
        '[style.--ims-svg-icon-size]': 'sizePx()',
        '[style.--icon-stroke-width]': 'resolvedStrokeWidth()',
        '[style.--icon-offset]': 'resolvedOffset()',
        '[attr.role]': 'accessibleLabel() ? "img" : null',
        '[attr.aria-label]': 'accessibleLabel()',
        '[attr.aria-hidden]': 'accessibleLabel() ? null : "true"',
        '[innerHTML]': 'markup()'
    }
})
export class ImsIcon {
    private readonly sanitizer = inject(DomSanitizer);

    /** Which glyph to render. Restricted to the names generated from src/assets/icons. */
    readonly name = input.required<ImsIconName>();

    /**
     * Rendered edge length in px. Defaults to 18 to match the Material Symbols
     * ligature size used elsewhere in the system (`--ims-icon-size: 1.125rem`).
     */
    readonly size = input(18, {transform: numberAttribute});

    /** Duotone palette, resolved from the `--ims-color-*` ramps. */
    readonly tone = input<ImsIconTone>('default');

    /**
     * Accessible name. Leave unset for decorative icons — the host is then
     * `aria-hidden`, which is the right default next to a visible text label.
     * Pass `true` to reuse the glyph's own name from the source `<title>`.
     */
    readonly label = input<string | boolean | null>(null);

    /**
     * Off-register distance of the tint layer, in user units. Spec range 0–3.
     * Unset defers to `--icon-offset` in the stylesheet, so the house default
     * lives in one place and can be themed per surface.
     */
    readonly offset = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    /** Hover treatment. Also fires when an ancestor marked `.ims-icon-hover-group` is hovered. */
    readonly hover = input<ImsIconHover>('none');

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

    protected readonly accessibleLabel = computed(() => {
        const label = this.label();
        if (label === true) return IMS_ICONS[this.name()].label;
        if (label === false || label == null || label === '') return null;
        return label;
    });

    protected readonly markup = computed(() => {
        const name = this.name();
        const cached = markupCache.get(name);
        if (cached) return cached;

        const trusted = this.sanitizer.bypassSecurityTrustHtml(IMS_ICONS[name].source);
        markupCache.set(name, trusted);
        return trusted;
    });
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
