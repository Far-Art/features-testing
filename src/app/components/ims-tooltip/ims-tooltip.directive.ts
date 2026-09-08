import {Directive, Signal, booleanAttribute, effect, inject, input} from '@angular/core';
import {MatTooltip} from '@angular/material/tooltip';
import {ImsTooltipPosition, ImsTooltipSeverity} from './ims-tooltip.types';

/** The four signals a tooltip host supplies, whatever it names its own inputs. */
export interface ImsTooltipSource {
    /** Text to show. Empty or whitespace-only means no tooltip. */
    readonly message: Signal<string | null>;
    /** Tone the tooltip is painted in. */
    readonly severity: Signal<ImsTooltipSeverity>;
    /** Preferred side, or `null` to defer to the configured default. */
    readonly position: Signal<ImsTooltipPosition | null>;
    /** Suppresses the tooltip while leaving the message bound. */
    readonly disabled: Signal<boolean>;
}

/**
 * Mirrors a host's tooltip signals onto the `MatTooltip` applied to the same
 * element. Call it from a constructor, alongside `hostDirectives: [MatTooltip]`.
 *
 * This exists so a host can own the inputs itself instead of re-exposing
 * {@link ImsTooltip}'s through `hostDirectives`. `ImsButtonBase` needs that:
 * its host directives reach the four button selectors only by inheritance, and
 * an alias renamed across that hop is a step too far for the editor tooling
 * even though the compiler accepts it — a plain input, declared on the base
 * like `icon-size` and `call-to-action`, resolves everywhere.
 */
export function connectImsTooltip(source: ImsTooltipSource): void {
    const matTooltip = inject(MatTooltip);

    effect(() => {
        matTooltip.message = source.message()?.trim() ?? '';
    });

    effect(() => {
        matTooltip.disabled = source.disabled();
    });

    // The class lands on the tooltip's own element, one level above the painted
    // surface. Custom properties inherit down to it, which is why
    // ims-tooltip.scss can set a severity with variables alone.
    effect(() => {
        matTooltip.tooltipClass = ['ims-tooltip', `ims-tooltip--${source.severity()}`];
    });

    // Written only when asked for. Assigning it unconditionally would overwrite
    // the configured default with this input's own, and no call site could then
    // leave the choice to the application.
    effect(() => {
        const position = source.position();
        if (position !== null) matTooltip.position = position;
    });
}

/**
 * Hover and focus tooltip, painted in one of the four house severities.
 *
 * `MatTooltip` does the work — overlay, positioning, touch long-press, and the
 * `aria-describedby` wiring — and stays an implementation detail: it is applied
 * as a host directive with none of its own inputs exposed, so every spelling a
 * call site sees is an `ims` one and Material can be swapped out without
 * touching a template.
 *
 * ```html
 * <span imsTooltip="Rounded to the nearest agora">…</span>
 * <span imsTooltip="Past its renewal date" imsTooltipSeverity="danger">…</span>
 * ```
 *
 * The `ims-button` family carries its own tooltip rather than importing this
 * directive — see `ImsButtonBase`, which declares the same four inputs under
 * the button family's dash-cased spelling (`ims-tooltip`,
 * `ims-tooltip-severity`, …) and shares the wiring through
 * {@link connectImsTooltip}. Do not add `imsTooltip` to a button: it would put
 * a second `MatTooltip` on an element that already has one.
 *
 * An empty or whitespace-only message is inert — `MatTooltip` refuses to open
 * without text — so a bound message that has not arrived yet costs nothing.
 */
@Directive({
    selector: '[imsTooltip]',
    standalone: true,
    hostDirectives: [MatTooltip]
})
export class ImsTooltip {
    /** Text shown in the tooltip. Empty or whitespace-only means no tooltip. */
    readonly message = input<string | null>(null, {alias: 'imsTooltip'});

    /** Tone the tooltip is painted in. */
    readonly severity = input<ImsTooltipSeverity>('info', {alias: 'imsTooltipSeverity'});

    /**
     * Preferred side of the host.
     *
     * Unset defers to `MAT_TOOLTIP_DEFAULT_OPTIONS.position` — see
     * `provideImsTooltipConfig` — which is where the house default lives. This
     * is the override for the odd call site, not the place to move every
     * tooltip.
     */
    readonly position = input<ImsTooltipPosition | null>(null, {alias: 'imsTooltipPosition'});

    /** Suppresses the tooltip while keeping its message bound. */
    readonly disabled = input(false, {
        alias: 'imsTooltipDisabled',
        transform: booleanAttribute
    });

    constructor() {
        connectImsTooltip(this);
    }
}
