import {ConnectedPosition, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {
    ComponentRef,
    DestroyRef,
    ElementRef,
    Type,
    ViewContainerRef,
    inject
} from '@angular/core';

/** Overlay options shared by element-connected IMS popovers. */
export interface ImsConnectedPopoverOptions {
    /** Explicit overlay origin; defaults to the directive host. */
    readonly origin?: HTMLElement;
    /** Ordered CDK positions, from preferred placement to fallbacks. */
    readonly positions: readonly ConnectedPosition[];
    /** Logical direction applied to the detached overlay. */
    readonly direction?: 'ltr' | 'rtl';
    /** Minimum distance in pixels between the overlay and viewport edge. */
    readonly viewportMargin?: number;
}

/**
 * Shared mechanics for lazily attached, element-connected CDK popovers.
 *
 * Subclasses own visibility and content state while this base owns the overlay,
 * portal, positioning, and disposal lifecycle.
 */
export abstract class ImsConnectedPopoverBase<TPanel> {
    protected readonly popoverHost: HTMLElement = inject<ElementRef<HTMLElement>>(
        ElementRef
    ).nativeElement;

    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly destroyRef = inject(DestroyRef);
    private overlayRef: OverlayRef | null = null;
    private panelRef: ComponentRef<TPanel> | null = null;
    private panelType: Type<TPanel> | null = null;

    /** Registers automatic disposal of the reusable CDK overlay. */
    protected constructor() {
        this.destroyRef.onDestroy(() => {
            this.overlayRef?.dispose();
            this.overlayRef = null;
            this.panelRef = null;
            this.panelType = null;
        });
    }

    /**
     * Attaches a panel lazily or returns the existing panel without recreating it.
     *
     * @param panelType Standalone component rendered inside the overlay.
     * @param options Origin, direction, and ordered connected positions.
     * @returns The attached panel component reference.
     */
    protected attachConnectedPopover(
        panelType: Type<TPanel>,
        options: ImsConnectedPopoverOptions
    ): ComponentRef<TPanel> {
        const overlayRef = this.ensureOverlay(options);

        if (!overlayRef.hasAttached() || this.panelType !== panelType) {
            if (overlayRef.hasAttached()) {
                overlayRef.detach();
            }

            this.panelRef = overlayRef.attach(
                new ComponentPortal(panelType, this.viewContainerRef)
            );
            this.panelType = panelType;
        }

        overlayRef.setDirection(options.direction ?? 'ltr');
        overlayRef.updatePosition();
        return this.panelRef!;
    }

    /** Detaches the current panel while keeping the reusable overlay reference. */
    protected detachConnectedPopover(): void {
        this.overlayRef?.detach();
        this.panelRef = null;
        this.panelType = null;
    }

    /** Returns whether a panel is currently attached to the overlay. */
    protected connectedPopoverAttached(): boolean {
        return this.overlayRef?.hasAttached() ?? false;
    }

    /** Returns the CDK overlay pane that contains the attached panel. */
    protected connectedPopoverElement(): HTMLElement | null {
        return this.overlayRef?.overlayElement ?? null;
    }

    /** Creates the overlay once and refreshes its position strategy thereafter. */
    private ensureOverlay(options: ImsConnectedPopoverOptions): OverlayRef {
        const origin = options.origin ?? this.popoverHost;
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(origin)
            .withFlexibleDimensions(false)
            .withPush(true)
            .withViewportMargin(options.viewportMargin ?? 8)
            .withPositions([...options.positions]);

        if (this.overlayRef) {
            this.overlayRef.updatePositionStrategy(positionStrategy);
            return this.overlayRef;
        }

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });

        return this.overlayRef;
    }
}
