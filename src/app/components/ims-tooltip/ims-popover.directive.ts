import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {
    ComponentRef,
    DestroyRef,
    Directive,
    TemplateRef,
    Type,
    ViewContainerRef,
    booleanAttribute,
    effect,
    inject,
    input,
    signal
} from '@angular/core';
import {Subscription} from 'rxjs';
import {ImsOverlayTrigger, getGapRect, isPointInsideRect} from './ims-overlay-trigger';
import {ImsPopoverPanel} from './ims-popover-panel';
import {ImsTooltipPosition, ImsTooltipSeverity} from './ims-tooltip.types';

/** Marks the surface as fading out. Styled in ims-popover.scss. */
const LEAVING_CLASS = 'ims-popover--leaving';

/**
 * How long the fade-out is given before the surface is detached.
 *
 * Must match the `ims-popover-leave` animation in ims-popover.scss. Longer than
 * the tooltip's, because a bigger surface moving at the same speed reads as
 * snatched away.
 */
const LEAVE_DURATION_MS = 120;

/**
 * Hover and focus surface that holds a template or a component, and that the
 * user can reach into.
 *
 * Separate from `ImsTooltip` rather than a mode of it, because almost nothing
 * about it is the same widget. A tooltip is the host's description, never takes
 * the pointer, and ends when the pointer leaves. This is a `dialog`: it takes
 * the pointer, it survives the trip from host to surface, and it is dismissed
 * rather than merely left. Folding the two together would put all of that in
 * every plain text tooltip; kept apart, this file drops out of any bundle that
 * does not import it, which is most of them.
 *
 * ```html
 * <span [imsPopover]="preview">…</span>
 * <ng-template #preview><a href="/policy/12">Open the policy</a></ng-template>
 *
 * <span [imsPopover]="PolicyCard" [imsPopoverInputs]="{policyId: 12}">…</span>
 * ```
 *
 * Unlike the tooltip, each instance owns its overlay. A shared one is not
 * possible here: the content differs per host, and the surface is meant to stay
 * put while it is being used. The overlay is still created on the first open, so
 * a popover that is never triggered costs nothing but this directive.
 */
@Directive({
    selector: '[imsPopover]',
    standalone: true,
    host: {
        'aria-haspopup': 'dialog',
        '[attr.aria-expanded]': 'expanded()',
        '[attr.aria-controls]': 'expanded() ? surfaceId : null'
    }
})
export class ImsPopover extends ImsOverlayTrigger {
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);

    private overlayRef: OverlayRef | null = null;
    private panelRef: ComponentRef<ImsPopoverPanel> | null = null;
    private documentMouseMove: ((event: MouseEvent) => void) | null = null;
    private documentKeydown: ((event: KeyboardEvent) => void) | null = null;
    private outsideClicks: Subscription | null = null;
    private leaveTimer: ReturnType<typeof setTimeout> | null = null;

    /** Whether the surface is currently open. Drives the host's ARIA. */
    protected readonly expanded = signal(false);

    /** Content to render: an `<ng-template>` or a component type. */
    readonly content = input<TemplateRef<unknown> | Type<unknown> | null>(null, {
        alias: 'imsPopover'
    });

    /** Inputs handed to component content. Ignored when the content is a template. */
    readonly inputs = input<Record<string, unknown> | null>(null, {alias: 'imsPopoverInputs'});

    /** Tone the surface is painted in. Unset defers to the host default, then the configuration. */
    readonly severity = input<ImsTooltipSeverity | null>(null, {alias: 'imsPopoverSeverity'});

    /** Preferred side of the host. Unset defers to the host default, then the configuration. */
    readonly position = input<ImsTooltipPosition | null>(null, {alias: 'imsPopoverPosition'});

    /**
     * Whether the surface takes the pointer.
     *
     * On by default, since content worth putting in a popover is usually content
     * worth reaching. Turned off, this behaves like a tooltip that happens to
     * render rich content: no hover bridge, no dismiss handling, no clicking.
     */
    readonly interactive = input<boolean, boolean | string | null | undefined>(true, {
        alias: 'imsPopoverInteractive',
        transform: booleanAttribute
    });

    /** Suppresses the popover while keeping its content bound. */
    readonly disabled = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsPopoverDisabled',
        transform: booleanAttribute
    });

    constructor() {
        super();

        inject(DestroyRef).onDestroy(() => {
            // Before disposing, or the pending detach fires against a disposed
            // overlay. A surface on a dying host has nothing to fade out for.
            this.clearLeaveTimer();
            this.overlayRef?.dispose();
            this.overlayRef = null;
            this.panelRef = null;
        });

        // Pushes content, tone and interactivity changes into an open surface.
        // See the matching effect in `ImsTooltip` for why the flag is here.
        effect(
            () => {
                const open = this.canOpen();
                const severity = this.resolveSeverity(this.severity());
                this.content();
                this.inputs();
                this.interactive();

                if (!this.expanded()) return;

                if (!open) {
                    this.closeNow();
                    return;
                }

                this.syncPanel(severity);
                this.applyInteractivity();
            },
            {allowSignalWrites: true}
        );
    }

    protected canOpen(): boolean {
        return !this.disabled() && this.content() !== null;
    }

    protected openSurface(): void {
        // Ends any fade-out in progress, so the surface below is a fresh one
        // and its enter animation runs from the start.
        this.cancelLeave();

        const overlayRef = this.ensureOverlay();

        if (!overlayRef.hasAttached()) {
            this.panelRef = overlayRef.attach(
                new ComponentPortal(ImsPopoverPanel, this.viewContainerRef)
            );
        }

        this.syncPanel(this.resolveSeverity(this.severity()));
        overlayRef.setDirection(this.directionality.value);
        overlayRef.updatePosition();
        this.applyInteractivity();
        this.expanded.set(true);
        this.startListening();
    }

    protected closeSurface(): void {
        // Listeners and ARIA go now, not when the fade ends: a surface on its
        // way out must not answer the pointer or still be announced as open.
        this.stopListening();
        this.expanded.set(false);
        this.beginLeave();
    }

    /** Plays the fade-out, then detaches once it has had time to finish. */
    private beginLeave(): void {
        const element = this.panelRef?.location.nativeElement as HTMLElement | undefined;

        if (!element || !this.overlayRef?.hasAttached() || this.leaveTimer !== null) {
            if (this.leaveTimer === null) this.detachPanel();
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

    /**
     * Keeps the surface open while the pointer is on its way to it.
     *
     * Leaving the host is only a reason to close when the pointer is not headed
     * somewhere that belongs to this popover — the surface itself, or the
     * corridor between the two that a diagonal path crosses.
     */
    protected override handlePointerLeave(event: MouseEvent): void {
        if (this.interactive() && this.expanded() && this.isPointerInsideSurface(event)) {
            return;
        }

        this.requestClose();
    }

    /** Keeps the surface open when focus moves into it, which reads as leaving the host. */
    protected override handleFocusOut(event: FocusEvent): void {
        const next = event.relatedTarget;
        if (
            this.interactive() &&
            next instanceof Node &&
            this.overlayRef?.overlayElement.contains(next)
        ) {
            return;
        }

        this.closeNow();
    }

    private ensureOverlay(): OverlayRef {
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.hostElement)
            .withFlexibleDimensions(false)
            // Slides the surface along its axis rather than letting it jump to
            // a perpendicular side — see `getConnectedPositions`.
            .withPush(true)
            // Aims the enter scale at the host's side rather than the surface's
            // middle — see ims-tooltip.service.ts.
            .withTransformOriginOn('.ims-popover')
            .withViewportMargin(this.viewportMargin)
            .withPositions(this.connectedPositions(this.resolvePosition(this.position())));

        if (this.overlayRef) {
            this.overlayRef.updatePositionStrategy(positionStrategy);
            return this.overlayRef;
        }

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });

        // The bounding box spans a region far wider than the surface, so it
        // never takes the pointer. Only the pane itself may, and only when the
        // popover is interactive.
        this.overlayRef.hostElement.style.pointerEvents = 'none';

        return this.overlayRef;
    }

    private syncPanel(severity: ImsTooltipSeverity): void {
        const panel = this.panelRef?.instance;
        if (!panel) return;

        const content = this.content();
        panel.id.set(this.surfaceId);
        panel.direction.set(this.directionality.value);
        panel.severity.set(severity);
        panel.interactive.set(this.interactive());
        panel.template.set(content instanceof TemplateRef ? content : null);
        panel.component.set(content instanceof TemplateRef ? null : content);
        panel.inputs.set(this.inputs() ?? {});
        this.panelRef?.changeDetectorRef.detectChanges();
    }

    private applyInteractivity(): void {
        if (!this.overlayRef) return;
        this.overlayRef.overlayElement.style.pointerEvents = this.interactive() ? 'auto' : 'none';
    }

    private isPointerInsideSurface(event: MouseEvent): boolean {
        const hostRect = this.hostElement.getBoundingClientRect();
        const surfaceRect = this.overlayRef?.overlayElement.getBoundingClientRect();

        return (
            isPointInsideRect(event, hostRect) ||
            isPointInsideRect(event, surfaceRect) ||
            (!!surfaceRect && isPointInsideRect(event, getGapRect(hostRect, surfaceRect)))
        );
    }

    /**
     * Watches for the three ways an open, interactive surface ends.
     *
     * A non-interactive one needs none of it: the pointer cannot be in it, so
     * `mouseleave` on the host is already the whole story.
     */
    private startListening(): void {
        if (!this.interactive() || this.documentMouseMove) return;

        const documentRef = this.hostElement.ownerDocument;

        this.documentMouseMove = (event: MouseEvent) => {
            if (!this.isPointerInsideSurface(event)) this.closeNow();
        };
        documentRef.addEventListener('mousemove', this.documentMouseMove, {passive: true});

        // Escape has to be caught at the document, not on the host: once focus
        // has moved into the surface it is no longer inside the host, so the
        // host's own key binding never fires.
        this.documentKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') this.closeNow();
        };
        documentRef.addEventListener('keydown', this.documentKeydown);

        this.outsideClicks =
            this.overlayRef?.outsidePointerEvents().subscribe((event) => {
                const target = event.target;
                // A click on the host is what opened this; treating it as an
                // outside click would close the surface the moment it is used.
                if (target instanceof Node && this.hostElement.contains(target)) return;
                this.closeNow();
            }) ?? null;
    }

    private stopListening(): void {
        const documentRef = this.hostElement.ownerDocument;

        if (this.documentMouseMove) {
            documentRef.removeEventListener('mousemove', this.documentMouseMove);
            this.documentMouseMove = null;
        }

        if (this.documentKeydown) {
            documentRef.removeEventListener('keydown', this.documentKeydown);
            this.documentKeydown = null;
        }

        this.outsideClicks?.unsubscribe();
        this.outsideClicks = null;
    }
}
