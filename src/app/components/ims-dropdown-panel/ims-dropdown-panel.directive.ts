import {InteractivityChecker} from '@angular/cdk/a11y';
import {Directionality} from '@angular/cdk/bidi';
import {hasModifierKey} from '@angular/cdk/keycodes';
import {
    ConnectedPosition,
    FlexibleConnectedPositionStrategy,
    Overlay,
    OverlayRef
} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {
    ComponentRef,
    DestroyRef,
    Directive,
    ElementRef,
    Injector,
    NgZone,
    TemplateRef,
    ViewContainerRef,
    booleanAttribute,
    effect,
    inject,
    input,
    output,
    signal,
    untracked
} from '@angular/core';
import {Subscription} from 'rxjs';
import {ImsDropdownPanelRef} from './ims-dropdown-panel-ref';
import {ImsDropdownPanelSurface} from './ims-dropdown-panel-surface';
import {
    ImsDropdownPanelAlign,
    ImsDropdownPanelAutoFocus,
    ImsDropdownPanelContent,
    ImsDropdownPanelPosition
} from './ims-dropdown-panel.types';

/** Marks the surface as fading out. Styled in ims-dropdown-panel.scss. */
const LEAVING_CLASS = 'ims-dropdown-panel--leaving';

/**
 * How long the fade-out is given before the surface is detached.
 *
 * Must match the `ims-dropdown-panel-leave` animation in ims-dropdown-panel.scss.
 */
const LEAVE_DURATION_MS = 120;

/** Gap in pixels between the trigger and the panel. */
const PANEL_OFFSET = 4;

/** Smallest distance in pixels the panel keeps from the viewport edge. */
const VIEWPORT_MARGIN = 8;

/** Elements that can take focus, narrowed further by `InteractivityChecker`. */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button',
    'input',
    'select',
    'textarea',
    'iframe',
    'audio[controls]',
    'video[controls]',
    'summary',
    '[tabindex]',
    '[contenteditable]:not([contenteditable="false"])'
].join(',');

/** Inputs for component content when the call site passes none. One object, so nothing re-applies. */
const NO_INPUTS: Record<string, unknown> = {};

let nextPanelId = 0;

/**
 * Opens a panel under its host on click, holding a template or a component.
 *
 * ```html
 * <button ims-button [imsDropdownPanel]="actions">Actions</button>
 * <ng-template #actions let-panel>
 *     <button ims-button (click)="panel.close('archive')">Archive</button>
 * </ng-template>
 *
 * <button ims-button [imsDropdownPanel]="PolicyFilterPanel" [imsDropdownPanelInputs]="{year: 2026}"
 *         (imsDropdownPanelClosed)="applyFilter($event)">Filter</button>
 * ```
 *
 * A dropdown rather than a popover. `imsPopover` follows the pointer: it opens
 * on hover, survives the trip to its surface, and ends when the pointer leaves.
 * This opens on a click and stays until it is dismissed — by the trigger, an
 * outside click, <kbd>Esc</kbd>, tabbing out of it, or the content closing it
 * through its `ImsDropdownPanelRef` with a result.
 *
 * The overlay is created on the first open and reused after that, so a trigger
 * that is never clicked costs this directive and one click listener.
 */
@Directive({
    selector: '[imsDropdownPanel]',
    standalone: true,
    exportAs: 'imsDropdownPanel',
    host: {
        'aria-haspopup': 'dialog',
        '[attr.aria-expanded]': 'isOpen()',
        '[attr.aria-controls]': 'isOpen() ? panelId : null',
        '(click)': 'toggle()'
    }
})
export class ImsDropdownPanelTrigger {
    private readonly hostElement: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly directionality = inject(Directionality);
    private readonly interactivityChecker = inject(InteractivityChecker);
    private readonly ngZone = inject(NgZone);

    /** ID the surface carries, so the trigger can reference it. */
    protected readonly panelId = `ims-dropdown-panel-${nextPanelId++}`;

    private overlayRef: OverlayRef | null = null;
    private positionStrategy: FlexibleConnectedPositionStrategy | null = null;
    private surfaceRef: ComponentRef<ImsDropdownPanelSurface> | null = null;
    private activeRef: ImsDropdownPanelRef | null = null;
    private overlayEvents: Subscription | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private leaveTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly expanded = signal(false);

    /** Whether the panel is open. Read-only; use `open()`, `close()` or `toggle()`. */
    readonly isOpen = this.expanded.asReadonly();

    /** Content to render: an `<ng-template>` or a component type. `null` means no panel. */
    readonly content = input<ImsDropdownPanelContent | null>(null, {alias: 'imsDropdownPanel'});

    /** Inputs handed to component content. Ignored when the content is a template. */
    readonly inputs = input<Record<string, unknown> | null>(null, {alias: 'imsDropdownPanelInputs'});

    /** Side of the trigger the panel opens on. Flips to the opposite side when it does not fit. */
    readonly position = input<ImsDropdownPanelPosition>('below', {alias: 'imsDropdownPanelPosition'});

    /** Edge of the trigger the panel lines up with. */
    readonly align = input<ImsDropdownPanelAlign>('start', {alias: 'imsDropdownPanelAlign'});

    /** Whether the panel is at least as wide as the trigger. */
    readonly matchWidth = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsDropdownPanelMatchWidth',
        transform: booleanAttribute
    });

    /** Where focus goes when the panel opens. */
    readonly autoFocus = input<ImsDropdownPanelAutoFocus>('first-tabbable', {
        alias: 'imsDropdownPanelAutoFocus'
    });

    /**
     * Accessible name of the panel.
     *
     * Unset, the panel is named after the trigger: its `aria-label`, or else its
     * text.
     */
    readonly ariaLabel = input<string | null>(null, {alias: 'imsDropdownPanelAriaLabel'});

    /** Classes added to the panel surface, for styling one panel without touching the rest. */
    readonly class = input<string | readonly string[] | null>(null, {alias: 'imsDropdownPanelClass'});

    /** Keeps the trigger from opening the panel, and closes it if it is open. */
    readonly disabled = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsDropdownPanelDisabled',
        transform: booleanAttribute
    });

    /** Emits once the panel is open and its content rendered. */
    readonly opened = output<void>({alias: 'imsDropdownPanelOpened'});

    /**
     * Emits when the panel closes: the result content passed to
     * `ImsDropdownPanelRef.close()`, or `undefined` when it was dismissed.
     */
    readonly closed = output<unknown>({alias: 'imsDropdownPanelClosed'});

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            // Before disposing, or the pending detach fires against a disposed
            // overlay. A panel on a dying trigger has nothing to fade out for.
            this.clearLeaveTimer();
            this.stopObservingSize();
            this.overlayEvents?.unsubscribe();
            this.overlayRef?.dispose();
            this.overlayRef = null;
            this.surfaceRef = null;
            this.activeRef = null;
        });

        // Pushes content and placement changes into an open panel, and closes it
        // when there is no longer anything to show.
        effect(
            () => {
                const canOpen = this.canOpen();
                this.inputs();
                this.ariaLabel();
                this.class();
                this.position();
                this.align();
                this.matchWidth();

                if (!this.expanded()) return;

                untracked(() => {
                    if (!canOpen) {
                        this.closePanel(undefined, false);
                        return;
                    }

                    this.syncSurface();
                    this.applyPlacement();
                });
            },
            {allowSignalWrites: true}
        );
    }

    /** Opens the panel, or closes it when it is open. */
    toggle(): void {
        if (this.expanded()) {
            this.close();
        } else {
            this.open();
        }
    }

    /** Opens the panel. Does nothing when it is open, disabled, or has no content. */
    open(): void {
        if (this.expanded() || !this.canOpen()) return;

        // Ends any fade-out in progress, so the surface below is a fresh one and
        // its enter animation runs from the start.
        this.cancelLeave();

        const overlayRef = this.ensureOverlay();
        const panelRef = new ImsDropdownPanelRef<unknown>(
            (result) => {
                if (this.activeRef === panelRef) this.closePanel(result, true);
            },
            () => {
                if (this.activeRef === panelRef) this.overlayRef?.updatePosition();
            }
        );
        this.activeRef = panelRef;

        // Before attaching: the strategy validates its placements on attach.
        overlayRef.setDirection(this.directionality.value);
        this.positionStrategy?.withPositions(this.panelPositions());

        const injector = Injector.create({
            providers: [{provide: ImsDropdownPanelRef, useValue: panelRef}],
            parent: this.viewContainerRef.injector
        });
        this.surfaceRef = overlayRef.attach(
            new ComponentPortal(ImsDropdownPanelSurface, this.viewContainerRef, injector)
        );

        this.syncSurface();
        this.applyPlacement();
        this.expanded.set(true);
        this.observeSize();
        this.moveFocusIn();
        this.opened.emit();
    }

    /**
     * Closes the panel as a dismissal, so `imsDropdownPanelClosed` emits
     * `undefined`. Focus returns to the trigger when it was inside the panel.
     */
    close(): void {
        this.closePanel(undefined, false);
    }

    private canOpen(): boolean {
        return !this.disabled() && this.content() !== null;
    }

    /**
     * Closes the panel and plays its fade-out.
     *
     * @param result What `imsDropdownPanelClosed` emits.
     * @param restoreFocus Whether to return focus to the trigger regardless of
     * where it is. Focus inside the panel is always returned: the surface is
     * about to be detached, and focus left on it would fall to the document.
     */
    private closePanel(result: unknown, restoreFocus: boolean): void {
        if (!this.expanded()) return;

        const activeElement = this.hostElement.ownerDocument.activeElement;
        const focusInside =
            activeElement instanceof Node && !!this.overlayRef?.overlayElement.contains(activeElement);

        // State goes now, not when the fade ends: a panel on its way out must not
        // answer a key or a click, or still be announced as open.
        this.expanded.set(false);
        this.activeRef = null;
        this.stopObservingSize();
        this.beginLeave();

        if (restoreFocus || focusInside) this.hostElement.focus({preventScroll: true});

        this.closed.emit(result);
    }

    private ensureOverlay(): OverlayRef {
        if (this.overlayRef) return this.overlayRef;

        this.positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.hostElement)
            .withFlexibleDimensions(false)
            // Slides the panel along its side rather than letting it jump to a
            // perpendicular one — see `getPanelPositions`.
            .withPush(true)
            // Grows the panel out of the trigger's edge rather than its middle.
            .withTransformOriginOn('.ims-dropdown-panel')
            .withViewportMargin(VIEWPORT_MARGIN);

        this.overlayRef = this.overlay.create({
            positionStrategy: this.positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });

        // The connected bounding box spans a region far wider than the panel, so
        // it never takes the pointer. The pane does, which the CDK switches on
        // while attached.
        this.overlayRef.hostElement.style.pointerEvents = 'none';

        // Both streams reach this overlay only while it is attached, and only
        // when it is the topmost one listening. A select open inside the panel
        // is above it, so its option clicks and its Escape stay its own.
        this.overlayEvents = this.overlayRef.outsidePointerEvents().subscribe((event) => {
            const target = event.target;
            // A click on the trigger toggles; treating it as outside as well
            // would close the panel and reopen it at once.
            if (target instanceof Node && this.hostElement.contains(target)) return;
            this.closePanel(undefined, false);
        });

        this.overlayEvents.add(
            this.overlayRef.keydownEvents().subscribe((event) => {
                // Content that handled Escape itself prevents its default, as
                // the IMS selection components do while closing their own panel.
                if (event.key !== 'Escape' || event.defaultPrevented || hasModifierKey(event)) return;
                event.preventDefault();
                this.closePanel(undefined, true);
            })
        );

        const pane = this.overlayRef.overlayElement;
        this.ngZone.runOutsideAngular(() => {
            const onKeydown = (event: KeyboardEvent) => this.handleTab(event);
            pane.addEventListener('keydown', onKeydown);
            this.overlayEvents?.add(() => pane.removeEventListener('keydown', onKeydown));
        });

        return this.overlayRef;
    }

    /** Applies side, alignment and width to the overlay and re-runs placement. */
    private applyPlacement(): void {
        if (!this.overlayRef || !this.positionStrategy) return;

        this.positionStrategy.withPositions(this.panelPositions());
        this.overlayRef.updateSize({
            minWidth: this.matchWidth() ? this.hostElement.getBoundingClientRect().width : ''
        });
        this.overlayRef.updatePosition();
    }

    private panelPositions(): ConnectedPosition[] {
        return getPanelPositions(this.position(), this.align(), this.directionality.value);
    }

    private syncSurface(): void {
        const surface = this.surfaceRef?.instance;
        if (!surface || !this.activeRef) return;

        const content = this.content();
        const isTemplate = content instanceof TemplateRef;

        surface.id.set(this.panelId);
        surface.direction.set(this.directionality.value);
        surface.ariaLabel.set(this.resolveAriaLabel());
        surface.panelClass.set(this.class());
        surface.template.set(isTemplate ? content : null);
        // Kept for the whole opening rather than rebuilt per sync, so the
        // template outlet is not handed a new context on every input change.
        if (surface.context()?.$implicit !== this.activeRef) {
            surface.context.set({$implicit: this.activeRef});
        }
        surface.component.set(isTemplate ? null : content);
        surface.inputs.set(this.inputs() ?? NO_INPUTS);

        // Renders the content now rather than on the next pass, so focus can
        // move into it and placement measures its real size.
        this.surfaceRef?.changeDetectorRef.detectChanges();
    }

    private resolveAriaLabel(): string | null {
        const explicit = this.ariaLabel()?.trim();
        if (explicit) return explicit;

        const hostLabel = this.hostElement.getAttribute('aria-label')?.trim() || visibleText(this.hostElement);
        return hostLabel || null;
    }

    private moveFocusIn(): void {
        const surface = this.overlayRef?.overlayElement.querySelector<HTMLElement>('.ims-dropdown-panel');
        if (!surface) return;

        const target =
            this.autoFocus() === 'first-tabbable'
                ? (surface.querySelector<HTMLElement>('[cdkFocusInitial]') ?? this.tabbableElements(surface)[0])
                : null;

        (target ?? surface).focus({preventScroll: true});
    }

    /**
     * Closes the panel when Tab would carry focus out of it.
     *
     * The panel is rendered at the end of the document, so the browser's own
     * next stop after its last element is not the control after the trigger:
     * it is nothing on the page at all. Leaving forwards therefore focuses the
     * trigger and lets the Tab go ahead, and the browser moves on from the
     * trigger to whatever follows it. Leaving backwards stops on the trigger.
     *
     * A select or datepicker open inside the panel renders in its own overlay,
     * so its keys never reach this listener.
     */
    private handleTab(event: KeyboardEvent): void {
        if (event.key !== 'Tab' || !this.expanded() || event.defaultPrevented) return;

        const surface = this.overlayRef?.overlayElement.querySelector<HTMLElement>('.ims-dropdown-panel');
        if (!surface) return;

        const tabbables = this.tabbableElements(surface);
        const active = this.hostElement.ownerDocument.activeElement;
        const leaving = event.shiftKey
            ? active === surface || active === tabbables[0]
            : tabbables.length === 0 || active === tabbables[tabbables.length - 1];

        if (!leaving) return;

        if (event.shiftKey) event.preventDefault();
        this.ngZone.run(() => this.closePanel(undefined, true));
    }

    private tabbableElements(root: HTMLElement): HTMLElement[] {
        return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (element) =>
                this.interactivityChecker.isFocusable(element) && this.interactivityChecker.isTabbable(element)
        );
    }

    /** Re-runs placement when the content changes size, so a panel that grows still fits. */
    private observeSize(): void {
        const pane = this.overlayRef?.overlayElement;
        if (!pane || this.resizeObserver || typeof ResizeObserver === 'undefined') return;

        this.ngZone.runOutsideAngular(() => {
            this.resizeObserver = new ResizeObserver(() => this.overlayRef?.updatePosition());
            this.resizeObserver.observe(pane);
        });
    }

    private stopObservingSize(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }

    /** Plays the fade-out, then detaches once it has had time to finish. */
    private beginLeave(): void {
        const element = this.surfaceRef?.location.nativeElement as HTMLElement | undefined;

        if (!element || !this.overlayRef?.hasAttached()) {
            this.detachSurface();
            return;
        }

        element.classList.add(LEAVING_CLASS);
        this.leaveTimer = setTimeout(() => {
            this.leaveTimer = null;
            this.detachSurface();
        }, LEAVE_DURATION_MS);
    }

    /** Cuts a fade-out short, detaching immediately. */
    private cancelLeave(): void {
        if (this.leaveTimer === null) return;

        this.clearLeaveTimer();
        this.detachSurface();
    }

    private clearLeaveTimer(): void {
        if (this.leaveTimer === null) return;
        clearTimeout(this.leaveTimer);
        this.leaveTimer = null;
    }

    private detachSurface(): void {
        this.overlayRef?.detach();
        this.surfaceRef = null;
    }
}

/**
 * An element's text without what is hidden from assistive technology.
 *
 * An `ims-icon` is a ligature, so its glyph name is text too — `expand_more`
 * would otherwise end up in the panel's name. It carries `aria-hidden`, which is
 * what is skipped here.
 */
function visibleText(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * The two placements for one side and alignment: the side itself, then its
 * opposite with the same alignment.
 *
 * Two and no more, for the reason `getConnectedPositions` in ims-overlay-trigger
 * gives: the CDK takes the first candidate that fits completely, and only pushes
 * one back inside when none does. Offer the perpendicular sides too and a panel
 * below a trigger near the viewport's edge jumps beside it instead of sliding
 * along until it fits.
 *
 * @param position Preferred side.
 * @param align Edge of the trigger to line up with.
 * @param direction Reading direction, which decides the sign of a horizontal gap.
 */
export function getPanelPositions(
    position: ImsDropdownPanelPosition,
    align: ImsDropdownPanelAlign,
    direction: 'ltr' | 'rtl'
): ConnectedPosition[] {
    const below: ConnectedPosition = {
        originX: align,
        originY: 'bottom',
        overlayX: align,
        overlayY: 'top',
        offsetY: PANEL_OFFSET
    };
    const above: ConnectedPosition = {
        originX: align,
        originY: 'top',
        overlayX: align,
        overlayY: 'bottom',
        offsetY: -PANEL_OFFSET
    };

    // Before or after the trigger, `start` and `end` are its top and bottom.
    const vertical = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';

    // `originX` and `overlayX` are logical and resolved against the overlay's
    // direction, but `offsetX` is applied verbatim as a physical translateX().
    // The sign is therefore chosen here, or under RTL the gap would pull the
    // panel back across the trigger instead of away from it.
    const before: ConnectedPosition = {
        originX: 'start',
        originY: vertical,
        overlayX: 'end',
        overlayY: vertical,
        offsetX: direction === 'rtl' ? PANEL_OFFSET : -PANEL_OFFSET
    };
    const after: ConnectedPosition = {
        originX: 'end',
        originY: vertical,
        overlayX: 'start',
        overlayY: vertical,
        offsetX: direction === 'rtl' ? -PANEL_OFFSET : PANEL_OFFSET
    };

    switch (position) {
        case 'above':
            return [above, below];
        case 'before':
            return [before, after];
        case 'after':
            return [after, before];
        default:
            return [below, above];
    }
}
