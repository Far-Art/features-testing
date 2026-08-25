import {
    ChangeDetectionStrategy,
    Component,
    booleanAttribute,
    computed,
    input,
    numberAttribute
} from '@angular/core';

/**
 * A Material Symbols glyph. The projected text is the symbol name — the font
 * renders it as a ligature, so the name goes in as content rather than as an
 * input:
 *
 * ```html
 * <ims-icon>add</ims-icon>
 * <ims-icon filled size="24">table_chart</ims-icon>
 * ```
 *
 * Decorative by default: the host carries `aria-hidden` so screen readers skip
 * the ligature text, which is what you want inside a control that is already
 * named. For a standalone icon that must carry meaning on its own, pass `label`
 * and the host becomes `role="img"` with that name:
 *
 * ```html
 * <button ims-button-icon aria-label="Save"><ims-icon>save</ims-icon></button>
 * <ims-icon label="Overdue">warning</ims-icon>
 * ```
 *
 * Presentation comes from the global `.ims-icon` class in
 * src/styles/ims-icon.scss; the inputs below only override its custom
 * properties per instance.
 */
@Component({
    selector: 'ims-icon',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-icon',
        '[class.ims-icon--filled]': 'filled()',
        '[attr.role]': 'label() ? "img" : null',
        '[attr.aria-label]': 'label()',
        '[attr.aria-hidden]': 'label() ? null : "true"',
        '[style.--ims-icon-size]': 'sizePx()',
        '[style.--ims-icon-weight]': 'resolvedWeight()',
        '[style.--ims-icon-grade]': 'resolvedGrade()',
        '[style.--ims-icon-optical-size]': 'resolvedOpticalSize()'
    }
})
export class ImsIcon {
    /** Solid rather than outlined — the font's `FILL` axis. */
    readonly filled = input(false, {transform: booleanAttribute});

    /**
     * Rendered font size in px. Unset defers to `--ims-icon-size`, which is
     * where the house default lives.
     */
    readonly size = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    /** Stroke weight, the font's `wght` axis. Spec range 100–700. */
    readonly weight = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    /** Emphasis against the surface, the font's `GRAD` axis. Spec range -25–200. */
    readonly grade = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    /** Which drawing the font picks for this size, its `opsz` axis. Spec range 20–48. */
    readonly opticalSize = input<number | null, unknown>(null, {
        transform: (value): number | null => (value == null ? null : numberAttribute(value))
    });

    /**
     * Accessible name. Set it only when the icon carries meaning no surrounding
     * control already conveys; leaving it unset keeps the glyph decorative.
     */
    readonly label = input<string | null>(null);

    // Each of these returns null when its input is unset, which removes the
    // inline style and lets the stylesheet's value apply. The stylesheet is the
    // single source for defaults; TS only overrides what a call site asks for.
    protected readonly sizePx = computed(() => {
        const size = this.size();
        return size === null ? null : `${size}px`;
    });

    protected readonly resolvedWeight = computed(() => stringify(this.weight()));
    protected readonly resolvedGrade = computed(() => stringify(this.grade()));
    protected readonly resolvedOpticalSize = computed(() => stringify(this.opticalSize()));
}

function stringify(value: number | null): string | null {
    return value === null ? null : String(value);
}
