import {ConnectedPosition} from '@angular/cdk/overlay';
import {
    Directive,
    DestroyRef,
    ElementRef,
    Signal,
    afterNextRender,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    isSignal,
    numberAttribute,
    signal
} from '@angular/core';
import {AbstractControl, NgControl, ValidationErrors} from '@angular/forms';
import {Subscription} from 'rxjs';
import {ReadonlyDirective} from '../../shared/readonly.directive';
import {ImsConnectedPopoverBase} from './ims-connected-popover-base';
import {ImsErrorPopoverPanel} from './ims-error-popover-panel';
import {
    IMS_ERROR_POPOVER_COMPONENT_HOST,
    IMS_ERROR_POPOVER_CONFIG,
    ImsErrorMapper,
    ImsErrorPopoverPosition,
    ImsErrorPopoverSource
} from './ims-error-popover.types';

let nextErrorPopoverId = 0;

/**
 * Displays mapped Angular validation errors in a connected popover.
 *
 * A bare directive resolves `NgControl` from its host. Binding the directive
 * value supplies either an explicit `AbstractControl` or an error signal.
 */
@Directive({
    selector: '[ims-error-popover]',
    standalone: true,
    host: {
        '(pointerenter)': 'onHostPointerEnter($event)',
        '(pointermove)': 'onHostPointerMove($event)',
        '(pointerleave)': 'onHostPointerLeave()',
        '(focusin)': 'onHostFocusIn()',
        '(focusout)': 'onHostFocusOut($event)',
        '(keydown.escape)': 'hideFromUser()'
    }
})
export class ImsErrorPopoverDirective
    extends ImsConnectedPopoverBase<ImsErrorPopoverPanel> {
    /** Explicit control or error signal; an empty value uses the host `NgControl`. */
    readonly source = input<ImsErrorPopoverSource | ''>(undefined, {
        alias: 'ims-error-popover'
    });
    /** Disables every automatic, pointer, and focus opening trigger. */
    readonly disabled = input(false, {
        alias: 'ims-error-popover-disabled',
        transform: booleanAttribute
    });
    /** Per-instance mappings merged over the resolved global mapper. */
    readonly errorMapper = input<ImsErrorMapper | null>(null, {
        alias: 'ims-error-popover-mapper'
    });
    /** Per-instance automatic visibility duration in milliseconds. */
    readonly duration = input<number | null, number | string | null>(null, {
        alias: 'ims-error-popover-duration',
        transform: (value) => value === null ? null : numberAttribute(value)
    });
    /** Preferred side of the host, with the opposite side used as fallback. */
    readonly position = input<ImsErrorPopoverPosition | null>(null, {
        alias: 'ims-error-popover-position'
    });

    private readonly config = inject(IMS_ERROR_POPOVER_CONFIG);
    private readonly ngControl = inject(NgControl, {self: true, optional: true});
    private readonly inheritedReadonly: Signal<boolean> = ReadonlyDirective.injectSignal();
    private readonly componentHost = inject(IMS_ERROR_POPOVER_COMPONENT_HOST, {
        self: true,
        optional: true
    });
    private readonly hostElementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly popoverId = `ims-error-popover-${nextErrorPopoverId++}`;
    private readonly rawErrors = signal<ValidationErrors | null>(null);
    private readonly resolvedControl = signal<AbstractControl | null>(null);
    private readonly resolvedControlDisabled = signal(false);
    private readonly nativeDisabled = signal(false);
    private readonly sourceRevision = signal(0);
    /** Combines built-in, global, and instance message mappings. */
    private readonly effectiveMapper = computed<ImsErrorMapper>(() => ({
        ...this.config.errorMapper,
        ...(this.errorMapper() ?? {})
    }));
    /** Combines explicit, inherited, native, and Angular-control disabled states. */
    private readonly effectiveDisabled = computed(() =>
        this.disabled()
        || this.inheritedReadonly()
        || this.resolvedControlDisabled()
        || this.nativeDisabled()
    );
    /** Converts the current raw errors into ordered display rows. */
    private readonly mappedErrors = computed(() =>
        mapErrors(this.rawErrors(), this.effectiveMapper(), this.resolvedControl())
    );

    private controlSubscription: Subscription | null = null;
    private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    private positionFrame: number | null = null;
    private hostHovered = false;
    private hostFocused = false;
    private autoVisible = false;
    private lastPointer: {readonly x: number; readonly y: number} | null = null;
    private panelEntryArmed = false;
    private panelListenersElement: HTMLElement | null = null;
    private lastErrorSnapshot: ReadonlyMap<string, string> = new Map();
    private lastMappedErrors: readonly string[] = [];
    private ariaTarget: HTMLElement | null = null;
    private ariaInvalidBefore: string | null = null;
    private ownsAriaInvalid = false;
    private activeSourceIdentity: unknown = INITIAL_SOURCE;
    private lastSourceRevision = -1;
    private wasDisabled = false;

    /** Sets up source tracking, disabled-state observation, and lifecycle cleanup. */
    constructor() {
        super();

        const unregisterExternal = this.componentHost?.registerExternalErrorPopover();
        const mutationObserver = new MutationObserver(() => this.syncNativeDisabled());
        mutationObserver.observe(this.popoverHost, {
            attributes: true,
            attributeFilter: ['disabled', 'aria-disabled']
        });
        this.syncNativeDisabled();

        effect((onCleanup) => {
            const source = this.source();
            this.unbindControl();

            if (isSignal(source)) {
                this.markSource(source);
                this.resolvedControl.set(null);
                this.resolvedControlDisabled.set(false);
                this.rawErrors.set(cloneErrors(source()));
            } else {
                const control = source instanceof AbstractControl
                    ? source
                    : this.ngControl?.control ?? null;
                this.markSource(control);
                this.resolvedControl.set(control);
                this.syncControl(control);

                if (control) {
                    this.controlSubscription = control.events.subscribe(
                        () => this.syncControl(control)
                    );
                }
            }

            onCleanup(() => this.unbindControl());
        });

        afterNextRender(() => {
            const source = this.source();
            if (source !== '' && source !== null && source !== undefined) return;
            const control = this.ngControl?.control ?? null;
            if (control === this.resolvedControl()) return;

            this.unbindControl();
            this.markSource(control);
            this.resolvedControl.set(control);
            this.syncControl(control);
            if (control) {
                this.controlSubscription = control.events.subscribe(
                    () => this.syncControl(control)
                );
            }
        });

        effect(() => {
            const errors = this.rawErrors();
            const mappedErrors = this.mappedErrors();
            const disabled = this.effectiveDisabled();
            const sourceRevision = this.sourceRevision();
            this.applyErrorState(errors, mappedErrors, disabled, sourceRevision);
        });

        inject(ElementRef).nativeElement.ownerDocument.defaultView?.addEventListener(
            'pageshow',
            this.syncNativeDisabledBound
        );

        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
            unregisterExternal?.();
            mutationObserver.disconnect();
            this.unbindControl();
            this.clearTimeoutWindow();
            this.cancelPositionFrame();
            this.removePanelListeners();
            this.restoreAriaState();
            this.hostElementRef.nativeElement.ownerDocument.defaultView?.removeEventListener(
                'pageshow',
                this.syncNativeDisabledBound
            );
        });
    }

    /** Shows existing errors when the pointer enters the directive host. */
    onHostPointerEnter(event: PointerEvent): void {
        this.rememberPointer(event);
        this.hostHovered = true;
        this.reconcileVisibility();
    }

    /** Remembers pointer coordinates for the initial-under-cursor guard. */
    onHostPointerMove(event: PointerEvent): void {
        this.rememberPointer(event);
    }

    /** Releases pointer-forced visibility when the pointer leaves the host. */
    onHostPointerLeave(): void {
        this.hostHovered = false;
        this.reconcileVisibility();
    }

    /** Keeps the popover visible while focus is within the directive host. */
    onHostFocusIn(): void {
        this.hostFocused = true;
        this.reconcileVisibility();
    }

    /** Releases focus-forced visibility after focus leaves the complete host. */
    onHostFocusOut(event: FocusEvent): void {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && this.popoverHost.contains(nextTarget)) return;
        this.hostFocused = false;
        this.reconcileVisibility();
    }

    /** Dismisses timed visibility without overriding the focused-state guarantee. */
    hideFromUser(): void {
        if (this.hostFocused) return;
        this.autoVisible = false;
        this.clearTimeoutWindow();
        this.reconcileVisibility();
    }

    /** Stable listener reference used to refresh native disabled state after page restore. */
    private readonly syncNativeDisabledBound = () => this.syncNativeDisabled();

    /** Stops observing the previously resolved Angular control. */
    private unbindControl(): void {
        this.controlSubscription?.unsubscribe();
        this.controlSubscription = null;
    }

    /** Copies the current control errors and disabled state into reactive state. */
    private syncControl(control: AbstractControl | null): void {
        this.resolvedControlDisabled.set(control?.disabled ?? false);
        this.rawErrors.set(cloneErrors(control?.errors ?? null));
    }

    /** Records source identity changes even when two sources expose equal errors. */
    private markSource(source: unknown): void {
        if (this.activeSourceIdentity === source) return;
        this.activeSourceIdentity = source;
        this.sourceRevision.update((revision) => revision + 1);
    }

    /** Mirrors native disabled attributes that are outside Angular form state. */
    private syncNativeDisabled(): void {
        const host = this.popoverHost;
        const disabled = (host as HTMLInputElement).disabled === true
            || host.hasAttribute('disabled')
            || host.getAttribute('aria-disabled') === 'true';
        this.nativeDisabled.set(disabled);
    }

    /**
     * Applies meaningful source, error, mapper, and enabled-state transitions.
     * Equivalent recreated Angular error objects do not restart the timeout.
     */
    private applyErrorState(
        errors: ValidationErrors | null,
        mappedErrors: readonly string[],
        disabled: boolean,
        sourceRevision: number
    ): void {
        const snapshot = snapshotErrors(errors);
        const errorsChanged = !errorSnapshotsEqual(snapshot, this.lastErrorSnapshot);
        const mappedErrorsChanged = !stringArraysEqual(mappedErrors, this.lastMappedErrors);
        const sourceChanged = sourceRevision !== this.lastSourceRevision;
        const becameEnabled = this.wasDisabled && !disabled;
        this.lastErrorSnapshot = snapshot;
        this.lastMappedErrors = mappedErrors;
        this.lastSourceRevision = sourceRevision;
        this.wasDisabled = disabled;
        this.syncAriaInvalid(snapshot.size > 0);

        if (disabled || mappedErrors.length === 0) {
            this.autoVisible = false;
            this.clearTimeoutWindow();
            this.hidePopover();
            return;
        }

        if (errorsChanged || mappedErrorsChanged || sourceChanged || becameEnabled) {
            this.restartTimeoutWindow();
            this.reconcileVisibility();
            return;
        }

        if (this.connectedPopoverAttached()) {
            this.updatePanel(mappedErrors);
        }
        this.reconcileVisibility();
    }

    /** Restarts automatic visibility from the current configured duration. */
    private restartTimeoutWindow(): void {
        this.clearTimeoutWindow();
        const duration = this.resolveDuration();
        this.autoVisible = duration > 0;

        if (duration <= 0) return;
        this.timeoutHandle = setTimeout(() => {
            this.timeoutHandle = null;
            this.autoVisible = false;
            this.reconcileVisibility();
        }, duration);
    }

    /** Cancels the active automatic-visibility timer, if present. */
    private clearTimeoutWindow(): void {
        if (this.timeoutHandle === null) return;
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = null;
    }

    /** Resolves a valid instance duration or falls back to global configuration. */
    private resolveDuration(): number {
        const duration = this.duration();
        return duration !== null && Number.isFinite(duration) && duration >= 0
            ? duration
            : this.config.duration;
    }

    /** Reconciles error, disabled, timer, hover, and focus state into visibility. */
    private reconcileVisibility(): void {
        const errors = this.mappedErrors();
        const shouldShow = !this.effectiveDisabled()
            && errors.length > 0
            && (this.autoVisible || this.hostHovered || this.hostFocused);

        if (shouldShow) {
            this.showOrUpdatePopover(errors);
        } else {
            this.hidePopover();
        }
    }

    /** Attaches or updates the panel in place and synchronizes ARIA references. */
    private showOrUpdatePopover(errors: readonly string[]): void {
        const alreadyAttached = this.connectedPopoverAttached();
        const direction = getComputedStyle(this.popoverHost).direction === 'rtl'
            ? 'rtl'
            : 'ltr';
        const panelRef = this.attachConnectedPopover(ImsErrorPopoverPanel, {
            positions: getPositions(this.position() ?? this.config.position),
            direction
        });

        panelRef.instance.id.set(this.popoverId);
        panelRef.instance.direction.set(direction);
        panelRef.instance.errors.set(errors);
        panelRef.changeDetectorRef.detectChanges();
        this.connectAriaDescription();

        if (!alreadyAttached) {
            this.addPanelListeners();
            this.prepareInitialPointerGuard();
        }
    }

    /** Refreshes visible rows without detaching or recreating the panel. */
    private updatePanel(errors: readonly string[]): void {
        this.showOrUpdatePopover(errors);
    }

    /** Detaches the panel and removes only ARIA references owned by this directive. */
    private hidePopover(): void {
        if (!this.connectedPopoverAttached()) return;
        this.cancelPositionFrame();
        this.removePanelListeners();
        this.disconnectAriaDescription();
        this.detachConnectedPopover();
    }

    /** Subscribes to pointer transitions on the detached overlay pane. */
    private addPanelListeners(): void {
        const element = this.connectedPopoverElement();
        if (!element || this.panelListenersElement === element) return;
        this.removePanelListeners();
        element.addEventListener('pointerenter', this.onPanelPointerEnter);
        element.addEventListener('pointerleave', this.onPanelPointerLeave);
        this.panelListenersElement = element;
    }

    /** Removes pointer listeners from the previously attached overlay pane. */
    private removePanelListeners(): void {
        this.panelListenersElement?.removeEventListener(
            'pointerenter',
            this.onPanelPointerEnter
        );
        this.panelListenersElement?.removeEventListener(
            'pointerleave',
            this.onPanelPointerLeave
        );
        this.panelListenersElement = null;
    }

    /** Dismisses on deliberate panel entry after the initial pointer guard is armed. */
    private readonly onPanelPointerEnter = (): void => {
        if (!this.panelEntryArmed || this.hostFocused) return;
        this.hostHovered = false;
        this.autoVisible = false;
        this.clearTimeoutWindow();
        this.hidePopover();
    };

    /** Arms dismissal after the pointer has left a panel that appeared beneath it. */
    private readonly onPanelPointerLeave = (): void => {
        this.panelEntryArmed = true;
    };

    /** Arms dismissal unless the newly positioned panel appeared under the pointer. */
    private prepareInitialPointerGuard(): void {
        this.cancelPositionFrame();
        this.panelEntryArmed = false;
        const view = this.popoverHost.ownerDocument.defaultView;
        if (!view) {
            this.panelEntryArmed = true;
            return;
        }

        this.positionFrame = view.requestAnimationFrame(() => {
            this.positionFrame = null;
            const rect = this.connectedPopoverElement()?.getBoundingClientRect();
            this.panelEntryArmed = !this.lastPointer || !rect
                || !pointInsideRect(this.lastPointer, rect);
        });
    }

    /** Cancels a pending panel-position measurement. */
    private cancelPositionFrame(): void {
        if (this.positionFrame === null) return;
        this.popoverHost.ownerDocument.defaultView?.cancelAnimationFrame(this.positionFrame);
        this.positionFrame = null;
    }

    /** Stores the latest host-relative pointer event in viewport coordinates. */
    private rememberPointer(event: PointerEvent): void {
        this.lastPointer = {x: event.clientX, y: event.clientY};
    }

    /** Finds the focusable element that should own validation ARIA attributes. */
    private resolveAriaTarget(): HTMLElement {
        const primaryControl = this.popoverHost.querySelector<HTMLElement>(
            '[data-ims-main-control]'
        );
        const targetRoot = primaryControl ?? this.popoverHost;
        return findFocusable(targetRoot) ?? targetRoot;
    }

    /** Applies or restores `aria-invalid` without losing a consumer value. */
    private syncAriaInvalid(invalid: boolean): void {
        const target = this.resolveAriaTarget();
        if (this.ariaTarget !== target) {
            this.restoreAriaState();
            this.ariaTarget = target;
            this.ariaInvalidBefore = target.getAttribute('aria-invalid');
        }

        if (invalid) {
            if (target.getAttribute('aria-invalid') !== 'true') {
                target.setAttribute('aria-invalid', 'true');
                this.ownsAriaInvalid = true;
            }
        } else if (this.ownsAriaInvalid) {
            restoreAttribute(target, 'aria-invalid', this.ariaInvalidBefore);
            this.ownsAriaInvalid = false;
        }
    }

    /** Adds this visible panel to the control's ARIA description references. */
    private connectAriaDescription(): void {
        const target = this.ariaTarget ?? this.resolveAriaTarget();
        addIdReference(target, 'aria-describedby', this.popoverId);
        addIdReference(target, 'aria-errormessage', this.popoverId);
    }

    /** Removes only this panel ID from the control's ARIA references. */
    private disconnectAriaDescription(): void {
        if (!this.ariaTarget) return;
        removeIdReference(this.ariaTarget, 'aria-describedby', this.popoverId);
        removeIdReference(this.ariaTarget, 'aria-errormessage', this.popoverId);
    }

    /** Restores every ARIA attribute value temporarily owned by the directive. */
    private restoreAriaState(): void {
        if (!this.ariaTarget) return;
        this.disconnectAriaDescription();
        if (this.ownsAriaInvalid) {
            restoreAttribute(this.ariaTarget, 'aria-invalid', this.ariaInvalidBefore);
        }
        this.ariaTarget = null;
        this.ariaInvalidBefore = null;
        this.ownsAriaInvalid = false;
    }
}

const INITIAL_SOURCE = Symbol('INITIAL_SOURCE');

/** Clones the top-level error map so control events always reach signal consumers. */
function cloneErrors(errors: ValidationErrors | null): ValidationErrors | null {
    return errors ? {...errors} : null;
}

/** Converts an error map into stable, value-based fingerprints. */
function snapshotErrors(errors: ValidationErrors | null): ReadonlyMap<string, string> {
    return new Map(
        Object.entries(errors ?? {}).map(([key, value]) => [
            key,
            fingerprintErrorValue(value, new WeakSet())
        ])
    );
}

/** Compares error snapshots without relying on recreated object identities. */
function errorSnapshotsEqual(
    first: ReadonlyMap<string, string>,
    second: ReadonlyMap<string, string>
): boolean {
    if (first.size !== second.size) return false;
    for (const [key, value] of first) {
        if (!second.has(key) || !Object.is(value, second.get(key))) return false;
    }
    return true;
}

/** Produces a deterministic representation of typical validation payload values. */
function fingerprintErrorValue(value: unknown, ancestors: WeakSet<object>): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const valueType = typeof value;
    if (valueType === 'string') return `string:${value}`;
    if (valueType === 'number') return `number:${String(value)}`;
    if (valueType === 'boolean') return `boolean:${String(value)}`;
    if (valueType === 'bigint') return `bigint:${String(value)}`;
    if (valueType === 'symbol') return `symbol:${String(value)}`;
    if (valueType === 'function') return `function:${String(value)}`;

    const object = value as object;
    if (object instanceof Date) return `date:${object.toISOString()}`;
    if (ancestors.has(object)) return '[circular]';

    const jsonValue = readCustomJsonValue(object);
    if (jsonValue !== object) {
        return `json:${fingerprintErrorValue(jsonValue, ancestors)}`;
    }

    ancestors.add(object);
    const fingerprint = Array.isArray(object)
        ? `array:[${object.map((item) => fingerprintErrorValue(item, ancestors)).join(',')}]`
        : `object:{${Object.entries(object)
            .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
            .map(([key, item]) => `${key}:${fingerprintErrorValue(item, ancestors)}`)
            .join(',')}}`;
    ancestors.delete(object);
    return fingerprint;
}

/** Uses custom `toJSON` output when it provides a stable semantic value. */
function readCustomJsonValue(value: object): unknown {
    const toJson = (value as {toJSON?: unknown}).toJSON;
    if (typeof toJson !== 'function') return value;

    try {
        return toJson.call(value);
    } catch {
        return value;
    }
}

/** Performs an ordered shallow comparison of already-mapped error rows. */
function stringArraysEqual(first: readonly string[], second: readonly string[]): boolean {
    return first.length === second.length
        && first.every((value, index) => value === second[index]);
}

/** Maps errors in Angular's insertion order, with readable unknown-error fallbacks. */
function mapErrors(
    errors: ValidationErrors | null,
    mapper: ImsErrorMapper,
    control: AbstractControl | null
): readonly string[] {
    return Object.entries(errors ?? {}).map(([key, error]) => {
        const mapping = mapper[key];
        if (typeof mapping === 'function') {
            return mapping(error, {key, control});
        }
        if (typeof mapping === 'string') return interpolateErrorMessage(mapping, error);
        if (typeof error === 'string') return error;
        return humanizeErrorKey(key);
    }).filter((message) => message.trim().length > 0);
}

/** Replaces top-level error-payload placeholders and preserves unresolved names. */
function interpolateErrorMessage(template: string, error: unknown): string {
    if (typeof error !== 'object' || error === null) return template;

    return Object.entries(error).reduce(
        (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
        template
    );
}

/** Converts an unknown camel, snake, or kebab error key into readable text. */
function humanizeErrorKey(key: string): string {
    const value = key
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim();
    return value.length === 0
        ? 'Invalid value.'
        : `${value.charAt(0).toUpperCase()}${value.slice(1)}.`;
}

/** Builds preferred and fallback CDK positions for the requested side. */
function getPositions(preferred: ImsErrorPopoverPosition): ConnectedPosition[] {
    const bottom: ConnectedPosition = {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        offsetY: 6
    };
    const top: ConnectedPosition = {
        originX: 'start',
        originY: 'top',
        overlayX: 'start',
        overlayY: 'bottom',
        offsetY: -6
    };
    return preferred === 'top' ? [top, bottom] : [bottom, top];
}

/** Returns whether a viewport point lies inside a measured panel rectangle. */
function pointInsideRect(
    point: {readonly x: number; readonly y: number},
    rect: DOMRect
): boolean {
    return point.x >= rect.left
        && point.x <= rect.right
        && point.y >= rect.top
        && point.y <= rect.bottom;
}

/** Resolves the primary native focus target within a simple or composite host. */
function findFocusable(root: HTMLElement): HTMLElement | null {
    if (root.matches('input, select, textarea, button, [tabindex]')) return root;
    return root.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]');
}

/** Adds an ID to a space-delimited ARIA reference attribute without duplicates. */
function addIdReference(element: HTMLElement, attribute: string, id: string): void {
    const ids = new Set((element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean));
    ids.add(id);
    element.setAttribute(attribute, [...ids].join(' '));
}

/** Removes one owned ID while preserving every other ARIA reference. */
function removeIdReference(element: HTMLElement, attribute: string, id: string): void {
    const ids = (element.getAttribute(attribute) ?? '')
        .split(/\s+/)
        .filter((value) => value && value !== id);
    if (ids.length > 0) {
        element.setAttribute(attribute, ids.join(' '));
    } else {
        element.removeAttribute(attribute);
    }
}

/** Restores an attribute to its original value or removes it when originally absent. */
function restoreAttribute(element: HTMLElement, attribute: string, value: string | null): void {
    if (value === null) {
        element.removeAttribute(attribute);
    } else {
        element.setAttribute(attribute, value);
    }
}
