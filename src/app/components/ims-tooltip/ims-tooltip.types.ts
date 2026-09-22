import {InjectionToken, Provider, Signal} from '@angular/core';

/**
 * Tone a tooltip or popover is painted in.
 *
 * The same four values as `ImsSnackbarSeverity` and `ImsButtonSeverity`, so one
 * word means the same thing wherever the application reports state.
 */
export type ImsTooltipSeverity = 'info' | 'success' | 'warning' | 'danger';

/**
 * Side of the host the surface is placed on.
 *
 * `before` and `after` follow the reading direction and are the two to reach
 * for in this application, which runs right-to-left; the rest are absolute and
 * mean the same thing in either direction.
 *
 * Owned here rather than re-exported from Material. The words are Material's
 * because the call sites were already written in them, but nothing behind them
 * is.
 */
export type ImsTooltipPosition = 'above' | 'below' | 'left' | 'right' | 'before' | 'after';

/** Application-wide defaults used by every tooltip and popover. */
export interface ImsTooltipConfig {
    /** Milliseconds a pointer must rest on the host before the surface opens. */
    readonly showDelay: number;
    /** Milliseconds the surface stays after the pointer leaves. */
    readonly hideDelay: number;
    /** Preferred placement wherever a call site names none. */
    readonly position: ImsTooltipPosition;
    /** Tone applied wherever neither a call site nor the host supplies one. */
    readonly severity: ImsTooltipSeverity;
}

/**
 * House baseline applied by {@link provideImsTooltipConfig} before any supplied
 * value.
 *
 * The delays stay at `0`: how chatty the UI feels is a per-application
 * judgment, so it belongs in `app.config.ts` where it is visible rather than
 * hidden in a library default. What this constant does settle is the two things
 * that are not judgment calls — a surface sits above its host, and an untoned
 * one is `info`.
 *
 * Above rather than below because a surface below a control tends to cover what
 * the control is about to affect: the next field in a form, the rest of a grid
 * row. There is also usually somewhere to fall back to, since a host low on a
 * long page has room above it more reliably than one at the top has below it.
 */
export const IMS_TOOLTIP_DEFAULT_CONFIG: ImsTooltipConfig = {
    showDelay: 0,
    hideDelay: 0,
    position: 'above',
    severity: 'info'
};

/** Fully resolved global tooltip configuration. */
export const IMS_TOOLTIP_CONFIG = new InjectionToken<ImsTooltipConfig>('IMS_TOOLTIP_CONFIG', {
    factory: () => IMS_TOOLTIP_DEFAULT_CONFIG
});

/**
 * Configures application-wide tooltip and popover behavior.
 *
 * @param config Options merged over {@link IMS_TOOLTIP_DEFAULT_CONFIG}.
 * @returns An Angular provider for the resolved configuration.
 * @throws {RangeError} When either delay is negative or not finite.
 */
export function provideImsTooltipConfig(config: Partial<ImsTooltipConfig> = {}): Provider {
    const options: ImsTooltipConfig = {...IMS_TOOLTIP_DEFAULT_CONFIG, ...config};

    for (const key of ['showDelay', 'hideDelay'] as const) {
        const delay = options[key];
        if (!Number.isFinite(delay) || delay < 0) {
            throw new RangeError(`Tooltip ${key} must be a non-negative number.`);
        }
    }

    return {provide: IMS_TOOLTIP_CONFIG, useValue: options};
}

/**
 * What a host element contributes to a tooltip placed on it.
 *
 * Every field is optional and every one is a fallback: an input written at the
 * call site always wins. This is how the `delete` button preset makes its
 * tooltip danger-toned without the template repeating the tone that the
 * button's own appearance already states.
 */
export interface ImsTooltipDefaults {
    /** Tone used when the call site names none. */
    readonly severity?: ImsTooltipSeverity;
    /** Placement used when the call site names none. */
    readonly position?: ImsTooltipPosition;
}

/**
 * Contract through which an element, or an ancestor of one, supplies tooltip
 * defaults.
 *
 * A signal rather than a value because a host's own inputs can change — a
 * button's `ims-button-severity` is bindable, and a tooltip on it should follow.
 */
export interface ImsTooltipDefaultsProvider {
    /** Defaults contributed to any tooltip on this element or inside it. */
    readonly tooltipDefaults: Signal<ImsTooltipDefaults>;
}

/**
 * Defaults resolved from the nearest contributing element.
 *
 * Deliberately not `self`-scoped: a toolbar that provides this sets the tone for
 * every tooltip inside it, the way `ims-readonly` reaches a whole subtree. The
 * directive resolves it optionally, so an element that contributes nothing costs
 * a tooltip nothing.
 */
export const IMS_TOOLTIP_DEFAULTS = new InjectionToken<ImsTooltipDefaultsProvider>(
    'IMS_TOOLTIP_DEFAULTS'
);
