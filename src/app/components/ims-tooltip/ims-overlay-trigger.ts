import {Directionality} from '@angular/cdk/bidi';
import {ConnectedPosition} from '@angular/cdk/overlay';
import {DestroyRef, Directive, ElementRef, inject} from '@angular/core';
import {
    IMS_TOOLTIP_CONFIG,
    IMS_TOOLTIP_DEFAULTS,
    ImsTooltipPosition,
    ImsTooltipSeverity
} from './ims-tooltip.types';

// TODO: two other directives already do most of what this base does, each with
// its own copy. `ImsTextTruncateDirective` in src/app/shared is the same widget
// with a different trigger predicate — it duplicates the ID helpers below and
// the pointer-gap hover bridge that `ImsPopover` uses — and
// `ImsConnectedPopoverBase` in src/app/components/ims-error-popover duplicates
// the lazy-overlay lifecycle. Folding all three onto this base is worth doing
// once the tooltip family has settled; both have specs that would need a pass.

/** Gap in pixels between the host and the surface placed beside it. */
const SURFACE_OFFSET = 8;

/** Smallest distance in pixels the surface keeps from the viewport edge. */
const VIEWPORT_MARGIN = 8;

let nextSurfaceId = 0;

/**
 * Trigger, timing and placement shared by {@link ImsTooltip} and
 * {@link ImsPopover}.
 *
 * Owns everything the two do identically — when to open, when to close, where
 * the surface goes, and what the host's ARIA says about it — and leaves what
 * differs to the subclass: what gets attached, whether it takes the pointer,
 * and how it is dismissed.
 *
 * Nothing here touches the CDK overlay. A subclass creates one only on the
 * first open, so an element that is never hovered costs this directive instance
 * and its host listeners and nothing else.
 *
 * There are no touch listeners anywhere in this family. The application is
 * desktop-only, so hover and focus are the whole trigger surface; Material's
 * long-press path has no counterpart here on purpose.
 */
@Directive({
    host: {
        '(mouseenter)': 'requestOpen()',
        '(mouseleave)': 'handlePointerLeave($event)',
        '(focusin)': 'requestOpen()',
        '(focusout)': 'handleFocusOut($event)',
        '(keydown.escape)': 'closeNow()'
    }
})
export abstract class ImsOverlayTrigger {
    /** Element the surface is placed against and described onto. */
    protected readonly hostElement: HTMLElement =
        inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /** Resolved application-wide defaults. */
    protected readonly config = inject(IMS_TOOLTIP_CONFIG);

    /** Reading direction, which is what makes `before` and `after` mean anything. */
    protected readonly directionality = inject(Directionality);

    /**
     * Defaults contributed by this element or an ancestor, if any.
     *
     * Resolved once at construction rather than per read: DI shape does not
     * change over an element's life, and only the signal behind it does.
     */
    private readonly hostDefaults = inject(IMS_TOOLTIP_DEFAULTS, {optional: true});

    private readonly destroyRef = inject(DestroyRef);

    /** ID the surface carries, so the host can reference it. */
    protected readonly surfaceId = `ims-overlay-${nextSurfaceId++}`;

    private openTimer: ReturnType<typeof setTimeout> | null = null;
    private closeTimer: ReturnType<typeof setTimeout> | null = null;

    protected constructor() {
        this.destroyRef.onDestroy(() => {
            this.clearTimers();
            this.closeSurface();
        });
    }

    /** Whether there is anything to show right now. */
    protected abstract canOpen(): boolean;

    /** Creates or reveals the surface. Called after the show delay has elapsed. */
    protected abstract openSurface(): void;

    /** Hides the surface. Must tolerate being called when nothing is open. */
    protected abstract closeSurface(): void;

    /**
     * Opens after the configured delay, unless something closes it first.
     *
     * A pending close is cancelled rather than left to fire, which is what keeps
     * the surface steady when the pointer crosses a child boundary inside the
     * host.
     */
    protected requestOpen(): void {
        this.clearTimer('close');
        if (this.openTimer !== null || !this.canOpen()) return;

        const delay = this.config.showDelay;
        if (delay <= 0) {
            this.openSurface();
            return;
        }

        this.openTimer = setTimeout(() => {
            this.openTimer = null;
            if (this.canOpen()) this.openSurface();
        }, delay);
    }

    /** Closes after the configured delay, cancelling any pending open. */
    protected requestClose(): void {
        this.clearTimer('open');
        if (this.closeTimer !== null) return;

        const delay = this.config.hideDelay;
        if (delay <= 0) {
            this.closeSurface();
            return;
        }

        this.closeTimer = setTimeout(() => {
            this.closeTimer = null;
            this.closeSurface();
        }, delay);
    }

    /** Closes now, skipping the hide delay. Used by Escape and by focus leaving. */
    protected closeNow(): void {
        this.clearTimers();
        this.closeSurface();
    }

    /**
     * The pointer left the host.
     *
     * Overridable because an interactive surface is somewhere the pointer is
     * meant to travel to, and the trip crosses this boundary.
     *
     * @param event The `mouseleave`, carrying where the pointer went.
     */
    protected handlePointerLeave(event: MouseEvent): void {
        this.requestClose();
    }

    /**
     * Focus left the host.
     *
     * Overridable for the same reason as {@link handlePointerLeave}: a surface
     * with focusable content is not a DOM descendant of the host, so tabbing
     * into it reads as focus leaving.
     *
     * @param event The `focusout`, carrying where focus went.
     */
    protected handleFocusOut(event: FocusEvent): void {
        this.closeNow();
    }

    /**
     * Tone to paint, resolved as explicit input, then host or ancestor default,
     * then application configuration.
     *
     * @param explicit Value written at the call site, or `null` when unset.
     */
    protected resolveSeverity(explicit: ImsTooltipSeverity | null): ImsTooltipSeverity {
        return explicit ?? this.hostDefaults?.tooltipDefaults().severity ?? this.config.severity;
    }

    /** Placement, resolved through the same three tiers as {@link resolveSeverity}. */
    protected resolvePosition(explicit: ImsTooltipPosition | null): ImsTooltipPosition {
        return explicit ?? this.hostDefaults?.tooltipDefaults().position ?? this.config.position;
    }

    /** Ordered placements for the current reading direction, preferred side first. */
    protected connectedPositions(position: ImsTooltipPosition): ConnectedPosition[] {
        return getConnectedPositions(position, this.directionality.value);
    }

    /** Smallest distance the surface keeps from the viewport edge. */
    protected get viewportMargin(): number {
        return VIEWPORT_MARGIN;
    }

    private clearTimers(): void {
        this.clearTimer('open');
        this.clearTimer('close');
    }

    private clearTimer(which: 'open' | 'close'): void {
        const handle = which === 'open' ? this.openTimer : this.closeTimer;
        if (handle === null) return;

        clearTimeout(handle);
        if (which === 'open') {
            this.openTimer = null;
        } else {
            this.closeTimer = null;
        }
    }
}

/** Surface above the host, centred on it. */
const ABOVE: ConnectedPosition = {
    originX: 'center',
    originY: 'top',
    overlayX: 'center',
    overlayY: 'bottom',
    offsetY: -SURFACE_OFFSET
};

/** Surface below the host, centred on it. */
const BELOW: ConnectedPosition = {
    originX: 'center',
    originY: 'bottom',
    overlayX: 'center',
    overlayY: 'top',
    offsetY: SURFACE_OFFSET
};

// The horizontal pair takes the direction as an argument, and the reason is a
// seam in the CDK worth knowing about.
//
// `originX`/`overlayX` really are logical: the strategy resolves `start` and
// `end` against the overlay's direction, so under RTL `start` is the host's
// right edge. `offsetX` is not. It is applied verbatim, as a physical
// `translateX()` on the pane, with no regard for direction at all.
//
// Mixing the two silently places the surface on the correct side and then
// nudges it the wrong way: under RTL a `before` surface sits off the host's
// right edge and a fixed `offsetX: -8` drags it eight pixels back across the
// host instead of opening a gap. So the side stays logical and the sign is
// resolved here.

/** Surface on the side the line starts from, with the gap opened away from the host. */
function before(direction: 'ltr' | 'rtl'): ConnectedPosition {
    return {
        originX: 'start',
        originY: 'center',
        overlayX: 'end',
        overlayY: 'center',
        offsetX: direction === 'rtl' ? SURFACE_OFFSET : -SURFACE_OFFSET
    };
}

/** Surface on the side the line runs towards, with the gap opened away from the host. */
function after(direction: 'ltr' | 'rtl'): ConnectedPosition {
    return {
        originX: 'end',
        originY: 'center',
        overlayX: 'start',
        overlayY: 'center',
        offsetX: direction === 'rtl' ? -SURFACE_OFFSET : SURFACE_OFFSET
    };
}

/**
 * The two placements for one preferred side: the side itself, then its opposite.
 *
 * Exactly two, and the count is the whole point. The CDK takes the first
 * candidate that fits the viewport *completely*, and only when none does will it
 * push a partly-fitting one back inside. Offer it the perpendicular sides as
 * well and a tooltip below a host near the right edge jumps to the left of it —
 * because `before` happens to fit completely while `below`, overflowing by a few
 * pixels horizontally, does not. What it should do is stay below and slide along
 * until it fits.
 *
 * Withholding the perpendicular pair is what produces the slide: with nowhere
 * else to jump to, the strategy pushes. So the only placement change left is the
 * one that is genuinely warranted — flipping to the opposite side when the
 * preferred one has no room on its own axis. This is how `MatTooltip` behaves,
 * and for the same reason: it too supplies a main position and its fallback and
 * nothing more.
 *
 * Both callers pair this with `withPush(true)` and `withFlexibleDimensions(false)`;
 * the slide does not happen without them.
 *
 * @param position Preferred side, logical or absolute.
 * @param direction Reading direction, used to resolve `left` and `right`.
 * @returns The preferred placement and its opposite, in that order.
 */
export function getConnectedPositions(
    position: ImsTooltipPosition,
    direction: 'ltr' | 'rtl'
): ConnectedPosition[] {
    // `left` and `right` are the absolute pair: what they mean depends on the
    // direction, and once resolved they are the logical pair and nothing else.
    const resolved: ImsTooltipPosition =
        position === 'left'
            ? direction === 'rtl'
                ? 'after'
                : 'before'
            : position === 'right'
              ? direction === 'rtl'
                  ? 'before'
                  : 'after'
              : position;

    switch (resolved) {
        case 'above':
            return [ABOVE, BELOW];
        case 'before':
            return [before(direction), after(direction)];
        case 'after':
            return [after(direction), before(direction)];
        default:
            return [BELOW, ABOVE];
    }
}

/**
 * Adds an ID to a space-delimited ARIA reference attribute without duplicates.
 *
 * The ID is added and removed on its own rather than bound, because a binding
 * owns the whole attribute and would erase references the host already carries —
 * a hint, or an error popover's message.
 */
export function addIdReference(element: HTMLElement, attribute: string, id: string): void {
    const ids = new Set((element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean));
    ids.add(id);
    element.setAttribute(attribute, [...ids].join(' '));
}

/** Removes one owned ID while preserving every other ARIA reference. */
export function removeIdReference(element: HTMLElement, attribute: string, id: string): void {
    const ids = (element.getAttribute(attribute) ?? '')
        .split(/\s+/)
        .filter((value) => value && value !== id);

    if (ids.length > 0) {
        element.setAttribute(attribute, ids.join(' '));
    } else {
        element.removeAttribute(attribute);
    }
}

/** Whether a pointer event landed inside a rectangle. */
export function isPointInsideRect(event: MouseEvent, rect: DOMRect | null | undefined): boolean {
    return (
        !!rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
    );
}

/**
 * The corridor between a host and its surface.
 *
 * Without it, a pointer travelling diagonally from one to the other leaves both
 * for a frame and the surface closes under the cursor on its way to being used.
 *
 * @returns The rectangle spanning the gap, or `null` when the two overlap.
 */
export function getGapRect(hostRect: DOMRect, surfaceRect: DOMRect): DOMRect | null {
    const left = Math.max(Math.min(hostRect.left, surfaceRect.left), 0);
    const right = Math.min(Math.max(hostRect.right, surfaceRect.right), Number.MAX_SAFE_INTEGER);
    const top = Math.min(hostRect.bottom, surfaceRect.bottom);
    const bottom = Math.max(hostRect.top, surfaceRect.top);

    // A vertical gap exists only when one rectangle ends before the other
    // starts; otherwise they overlap and the corridor is already covered.
    if (bottom > top) {
        return new DOMRect(left, top, right - left, bottom - top);
    }

    const innerLeft = Math.min(hostRect.right, surfaceRect.right);
    const innerRight = Math.max(hostRect.left, surfaceRect.left);
    if (innerRight > innerLeft) {
        const gapTop = Math.max(Math.min(hostRect.top, surfaceRect.top), 0);
        const gapBottom = Math.max(hostRect.bottom, surfaceRect.bottom);
        return new DOMRect(innerLeft, gapTop, innerRight - innerLeft, gapBottom - gapTop);
    }

    return null;
}
