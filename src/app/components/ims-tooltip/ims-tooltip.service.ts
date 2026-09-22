import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {ComponentRef, Injectable, OnDestroy, inject} from '@angular/core';
import {ConnectedPosition} from '@angular/cdk/overlay';
import {ImsTooltipPanel} from './ims-tooltip-panel';
import {ImsTooltipSeverity} from './ims-tooltip.types';

/** Marks the panel as fading out. Styled in ims-tooltip.scss. */
const LEAVING_CLASS = 'ims-tooltip--leaving';

/**
 * How long the fade-out is given before the panel is detached.
 *
 * Must match the `ims-tooltip-leave` animation in ims-tooltip.scss. Timed rather
 * than driven by `animationend`, because reduced motion shortens the animation
 * to the point where the event is unreliable, and a tooltip left attached a few
 * milliseconds too long is invisible and takes no pointer anyway.
 */
const LEAVE_DURATION_MS = 90;

/** Everything the shared panel needs in order to describe one host. */
export interface ImsTooltipState {
    /** ID the host references through `aria-describedby`. */
    readonly id: string;
    /** Text to show. Already trimmed by the caller. */
    readonly message: string;
    /** Tone to paint. */
    readonly severity: ImsTooltipSeverity;
    /** Ordered placements, preferred side first. */
    readonly positions: readonly ConnectedPosition[];
    /** Reading direction applied to the detached overlay. */
    readonly direction: 'ltr' | 'rtl';
    /** Smallest distance to keep from the viewport edge. */
    readonly viewportMargin: number;
}

/**
 * The one text tooltip on screen.
 *
 * Every `imsTooltip` in the application shares a single CDK overlay, created on
 * the first hover anywhere and re-aimed at each new host thereafter. A tooltip
 * directive that is never triggered contributes nothing to it.
 *
 * This is the part that differs most from `MatTooltip`, and from
 * `ImsTextTruncateDirective`: both keep a per-instance `OverlayRef` alive once
 * an element has been hovered, so passing the pointer across a row of fifty
 * buttons retains fifty overlays for as long as those buttons live. Here the
 * ceiling is one, for the whole application.
 *
 * The consequence is deliberate and worth knowing: only one text tooltip is ever
 * visible, and the most recent trigger wins. Material would show a focused
 * button's tooltip and a hovered one's at the same time.
 *
 * The panel component is detached on hide and re-attached on show while the
 * overlay itself persists — the overlay is the expensive half, and re-attaching
 * is what replays the enter animation. `ImsConnectedPopoverBase` splits the two
 * the same way.
 */
@Injectable({providedIn: 'root'})
export class ImsTooltipService implements OnDestroy {
    private readonly overlay = inject(Overlay);
    private overlayRef: OverlayRef | null = null;
    private panelRef: ComponentRef<ImsTooltipPanel> | null = null;
    private owner: object | null = null;
    private leaveTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Shows `state` against `host`, taking the shared panel from whoever had it.
     *
     * @param owner Directive instance claiming the panel; its identity is what
     *     {@link hide} checks, so a stale hide cannot close a newer tooltip.
     * @param host Element the surface is placed against.
     * @param state Text, tone and placement for this one appearance.
     */
    show(owner: object, host: HTMLElement, state: ImsTooltipState): void {
        // Ends any fade-out in progress by detaching outright, so the panel
        // below is a fresh one and its enter animation runs from the start. An
        // attached panel reused mid-leave would simply appear.
        this.cancelLeave();

        const overlayRef = this.ensureOverlay(host, state);

        if (!overlayRef.hasAttached()) {
            this.panelRef = overlayRef.attach(new ComponentPortal(ImsTooltipPanel));
        }

        this.owner = owner;

        const panel = this.panelRef?.instance;
        if (panel) {
            panel.id.set(state.id);
            panel.message.set(state.message);
            panel.severity.set(state.severity);
            // The panel is attached outside any change-detection tree that runs
            // on its own, so its first paint has to be asked for.
            this.panelRef?.changeDetectorRef.detectChanges();
        }

        overlayRef.setDirection(state.direction);
        overlayRef.updatePosition();
    }

    /**
     * Hides the panel, but only for the directive that currently holds it.
     *
     * The guard is what makes the shared panel safe: a tooltip whose hide delay
     * elapses after another has already taken over must not close the new one.
     *
     * @param owner Directive instance that previously called {@link show}.
     */
    hide(owner: object): void {
        if (this.owner !== owner) return;

        // Ownership is released now, not when the fade finishes: the panel is
        // no longer anybody's, and another host may claim it mid-fade.
        this.owner = null;
        this.beginLeave();
    }

    /** Whether `owner` is the directive currently showing the panel. */
    isShowing(owner: object): boolean {
        return this.owner === owner;
    }

    ngOnDestroy(): void {
        this.clearLeaveTimer();
        this.overlayRef?.dispose();
        this.overlayRef = null;
        this.panelRef = null;
        this.owner = null;
    }

    /** Plays the fade-out, then detaches once it has had time to finish. */
    private beginLeave(): void {
        const element = this.panelRef?.location.nativeElement as HTMLElement | undefined;

        if (!element || !this.overlayRef?.hasAttached()) {
            this.detachPanel();
            return;
        }

        element.classList.add(LEAVING_CLASS);
        this.leaveTimer = setTimeout(() => {
            this.leaveTimer = null;
            this.detachPanel();
        }, LEAVE_DURATION_MS);
    }

    /** Cuts a fade-out short, detaching immediately. */
    private cancelLeave(): void {
        if (this.leaveTimer === null) return;

        this.clearLeaveTimer();
        this.detachPanel();
    }

    private clearLeaveTimer(): void {
        if (this.leaveTimer === null) return;
        clearTimeout(this.leaveTimer);
        this.leaveTimer = null;
    }

    private detachPanel(): void {
        this.overlayRef?.detach();
        this.panelRef = null;
    }

    /** Creates the overlay once, then re-aims it at each new host. */
    private ensureOverlay(host: HTMLElement, state: ImsTooltipState): OverlayRef {
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(host)
            .withFlexibleDimensions(false)
            // Push is what makes a bubble with no room slide along its axis
            // instead of jumping to a perpendicular side. See
            // `getConnectedPositions`, which withholds the perpendicular pair
            // precisely so this happens.
            .withPush(true)
            // Hands the panel a `transform-origin` matching the side it landed
            // on, so the enter scale grows out of the host rather than swelling
            // from the bubble's own middle — which also pins the edge nearest
            // the host instead of letting both edges drift.
            .withTransformOriginOn('.ims-tooltip')
            .withViewportMargin(state.viewportMargin)
            .withPositions([...state.positions]);

        if (this.overlayRef) {
            this.overlayRef.updatePositionStrategy(positionStrategy);
            return this.overlayRef;
        }

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });

        // The pane must never intercept a click. A tooltip is not interactive,
        // and one caught mid-fade over a button would swallow the press.
        this.overlayRef.hostElement.style.pointerEvents = 'none';
        this.overlayRef.overlayElement.style.pointerEvents = 'none';

        return this.overlayRef;
    }
}
