import {Provider} from '@angular/core';
import {
    MAT_TOOLTIP_DEFAULT_OPTIONS,
    MatTooltipDefaultOptions,
    TooltipPosition
} from '@angular/material/tooltip';

/**
 * Tone a tooltip is painted in.
 *
 * The same four values as `ImsSnackbarSeverity`, so one word means the same
 * thing wherever the application reports state.
 */
export type ImsTooltipSeverity = 'info' | 'success' | 'warning' | 'danger';

/**
 * Side of the host the tooltip is placed on.
 *
 * `before` and `after` follow the reading direction; the rest are absolute.
 * Re-exported so call sites never have to import from `@angular/material`.
 */
export type ImsTooltipPosition = TooltipPosition;

/**
 * House baseline applied by {@link provideImsTooltipConfig} before any supplied
 * value.
 *
 * The delays deliberately stay at Material's own `0`: a delay is a per-
 * application judgment about how chatty the UI should feel, so it belongs in
 * `app.config.ts` where it is visible, not hidden in a library default. What
 * this constant does settle is the two things that are not judgment calls —
 * tooltips sit below their host and never take the pointer.
 */
export const IMS_TOOLTIP_DEFAULT_OPTIONS: MatTooltipDefaultOptions = {
    showDelay: 0,
    hideDelay: 0,
    touchendHideDelay: 1500,
    position: 'below',
    disableTooltipInteractivity: true
};

/**
 * Configures application-wide tooltip behavior.
 *
 * There is no IMS-owned token behind this: the resolved options are stored in
 * Material's `MAT_TOOLTIP_DEFAULT_OPTIONS`, which is what `ImsTooltip` reads
 * through for everything it does not write itself. `tooltipClass` is the one
 * option with no effect here — `ims-tooltip-severity` owns that class list.
 *
 * @param config Options merged over {@link IMS_TOOLTIP_DEFAULT_OPTIONS}.
 * @returns An Angular provider for the resolved tooltip options.
 * @throws {RangeError} When any delay is negative or not finite.
 */
export function provideImsTooltipConfig(
    config: Partial<MatTooltipDefaultOptions> = {}
): Provider {
    const options: MatTooltipDefaultOptions = {...IMS_TOOLTIP_DEFAULT_OPTIONS, ...config};

    for (const key of ['showDelay', 'hideDelay', 'touchendHideDelay'] as const) {
        const delay = options[key];
        if (delay !== undefined && (!Number.isFinite(delay) || delay < 0)) {
            throw new RangeError(`Tooltip ${key} must be a non-negative number.`);
        }
    }

    return {provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: options};
}
