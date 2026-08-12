import {InjectionToken, Provider, Signal} from '@angular/core';
import {AbstractControl, ValidationErrors} from '@angular/forms';

/** Preferred side of the host on which the error popover is placed. */
export type ImsErrorPopoverPosition = 'bottom' | 'top';

/** Explicit error source accepted by the `ims-error-popover` directive input. */
export type ImsErrorPopoverSource =
    | AbstractControl
    | Signal<ValidationErrors | null>
    | null
    | undefined;

/** Context supplied to payload-aware error-message factories. */
export interface ImsErrorMapperContext {
    /** Angular validation-error key currently being mapped. */
    readonly key: string;
    /** Resolved Angular control, or `null` when errors come from a signal. */
    readonly control: AbstractControl | null;
}

/** Converts one Angular validation-error payload into display text. */
export type ImsErrorMessageFactory = (
    error: unknown,
    context: ImsErrorMapperContext
) => string;

/**
 * Fixed or payload-aware text used for one validation-error key.
 *
 * String mappings may reference top-level error-payload fields with
 * `{property}` placeholders. Factory results are treated as final text.
 */
export type ImsErrorMessage = string | ImsErrorMessageFactory;

/** Validation-error keys mapped to their user-facing messages. */
export type ImsErrorMapper = Readonly<Record<string, ImsErrorMessage>>;

/** Application-wide defaults used by every error-popover directive. */
export interface ImsErrorPopoverConfig {
    /** Automatic visibility window in milliseconds. `0` disables automatic display. */
    readonly duration: number;
    /** Preferred placement; the opposite side remains the viewport fallback. */
    readonly position: ImsErrorPopoverPosition;
    /** Messages merged over the built-in error mappings. */
    readonly errorMapper: ImsErrorMapper;
}

/** Contract through which a component yields popover ownership to an external directive. */
export interface ImsErrorPopoverComponentHost {
    /**
     * Registers an externally attached error popover.
     *
     * @returns An idempotent cleanup callback that restores internal ownership.
     */
    registerExternalErrorPopover(): () => void;
}

/** Same-host component contract optionally consumed by the error-popover directive. */
export const IMS_ERROR_POPOVER_COMPONENT_HOST =
    new InjectionToken<ImsErrorPopoverComponentHost>('IMS_ERROR_POPOVER_COMPONENT_HOST');

/** Built-in English mappings for common Angular and IMS datepicker errors. */
export const IMS_ERROR_POPOVER_DEFAULT_MAPPER: ImsErrorMapper = {
    required: 'This field is required.',
    requiredTrue: 'This field must be checked.',
    email: 'Enter a valid email address.',
    minlength: 'Enter at least {requiredLength} characters.',
    maxlength: 'Enter no more than {requiredLength} characters.',
    min: 'Enter a value of at least {min}.',
    max: 'Enter a value no greater than {max}.',
    pattern: 'Enter a value in the required format.',
    imsDatepickerParse: 'Enter a valid date.',
    imsDatepickerMin: 'The date cannot be earlier than {minFormatted}.',
    imsDatepickerMax: 'The date cannot be later than {maxFormatted}.',
    imsDatepickerFilter: 'This date is not available.'
};

/** Default six-second, below-host error-popover configuration. */
export const IMS_ERROR_POPOVER_DEFAULT_CONFIG: ImsErrorPopoverConfig = {
    duration: 6000,
    position: 'bottom',
    errorMapper: IMS_ERROR_POPOVER_DEFAULT_MAPPER
};

/** Injection token containing the fully resolved global error-popover configuration. */
export const IMS_ERROR_POPOVER_CONFIG = new InjectionToken<ImsErrorPopoverConfig>(
    'IMS_ERROR_POPOVER_CONFIG',
    {factory: () => IMS_ERROR_POPOVER_DEFAULT_CONFIG}
);

/**
 * Configures application-wide error-popover behavior and messages.
 *
 * Supplied mappings extend the built-in mappings instead of replacing them.
 *
 * @param config Partial global configuration. Duration must be non-negative.
 * @returns An Angular provider for the resolved error-popover configuration.
 * @throws {RangeError} When `duration` is negative or not finite.
 */
export function provideImsErrorPopoverConfig(
    config: Partial<Omit<ImsErrorPopoverConfig, 'errorMapper'>> & {
        readonly errorMapper?: ImsErrorMapper;
    }
): Provider {
    const duration = config.duration ?? IMS_ERROR_POPOVER_DEFAULT_CONFIG.duration;
    if (!Number.isFinite(duration) || duration < 0) {
        throw new RangeError('Error popover duration must be a non-negative number.');
    }

    return {
        provide: IMS_ERROR_POPOVER_CONFIG,
        useValue: {
            ...IMS_ERROR_POPOVER_DEFAULT_CONFIG,
            ...config,
            duration,
            errorMapper: {
                ...IMS_ERROR_POPOVER_DEFAULT_MAPPER,
                ...(config.errorMapper ?? {})
            }
        }
    };
}
