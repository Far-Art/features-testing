import {ConnectedPosition, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {
    ChangeDetectionStrategy,
    Component,
    ComponentRef,
    booleanAttribute,
    Directive,
    ElementRef,
    OnDestroy,
    ViewContainerRef,
    computed,
    inject,
    input
} from '@angular/core';

/** Supported positions for the full-text tooltip relative to the host element. */
export type ImsTextTruncatePosition = 'center' | 'top' | 'bottom';

/**
 * Applies single-line CSS truncation and displays the full value in a lazy CDK
 * overlay only when the measured text overflows.
 *
 * By default the directive truncates and measures its host. Composite controls
 * can disable the host styles with `imsTextTruncateApplyStyles="false"` and
 * provide a descendant selector through `imsTextTruncateTarget`.
 *
 * The tooltip is non-interactive by default and closes when the pointer leaves
 * the host. Enable `imsTextTruncateInteractive` when users must select or copy
 * the full text.
 */
@Directive({
    selector: '[imsTextTruncate]',
    standalone: true,
    host: {
        '[style.display]': 'applyStyles() ? display() : null',
        '[style.min-width]': 'applyStyles() ? "0" : null',
        '[style.max-width]': 'applyStyles() ? maxWidthCss() : null',
        '[style.overflow]': 'applyStyles() ? "hidden" : null',
        '[style.text-overflow]': 'applyStyles() ? "ellipsis" : null',
        '[style.white-space]': 'applyStyles() ? "nowrap" : null',
        '[attr.aria-describedby]': 'popoverVisible ? popoverId : null',
        '[attr.tabindex]': 'focusable() ? "0" : null',
        '(mouseenter)': 'showPopover()',
        '(focusin)': 'showPopoverOnFocus()',
        '(mouseleave)': 'hidePopover($event)',
        '(focusout)': 'hidePopoverImmediately()',
        '(keydown.escape)': 'hidePopoverImmediately()'
    }
})
export class ImsTextTruncateDirective implements OnDestroy {
    /**
     * Full text rendered in the tooltip.
     *
     * When omitted or empty, text is read from the measured target element.
     */
    readonly text = input<string | null | undefined>(undefined, {alias: 'imsTextTruncate'});

    /** CSS display value applied to the host when truncation styles are enabled. */
    readonly display = input<string | null>('block', {alias: 'imsTruncateDisplay'});

    /** Adds `tabindex="0"` so a normally non-focusable host can reveal the tooltip by keyboard. */
    readonly focusable = input(false, {
        alias: 'imsTruncateFocusable',
        transform: booleanAttribute
    });

    /** Disables tooltip creation while preserving any configured truncation styles. */
    readonly popoverDisabled = input(false, {
        alias: 'imsTruncatePopoverDisabled',
        transform: booleanAttribute
    });

    /** Maximum width applied to the truncated host. Numeric values are treated as pixels. */
    readonly maxWidth = input<string | number | null>('100%', {alias: 'imsTruncateMaxWidth'});

    /** Maximum tooltip width. Numeric values are treated as pixels. */
    readonly popoverMaxWidth = input<string | number>('min(36rem, calc(100vw - 24px))', {
        alias: 'imsTruncatePopoverMaxWidth'
    });

    /**
     * Tooltip placement.
     *
     * `center` overlays the host, `top` places it above, and `bottom` places it below.
     */
    readonly position = input<ImsTextTruncatePosition>('center', {
        alias: 'imsTextTruncatePosition'
    });

    /**
     * Element used for overflow measurement and inherited typography.
     *
     * Accepts a descendant CSS selector or a direct element reference. Defaults
     * to the directive host.
     */
    readonly target = input<string | HTMLElement | null>(null, {
        alias: 'imsTextTruncateTarget'
    });

    /**
     * Whether the directive applies its CSS truncation styles to the host.
     *
     * Disable this when the component already owns its truncation styles.
     */
    readonly applyStyles = input(true, {
        alias: 'imsTextTruncateApplyStyles',
        transform: booleanAttribute
    });

    /** Whether focus entering the host may display the tooltip. */
    readonly showOnFocus = input(true, {
        alias: 'imsTextTruncateShowOnFocus',
        transform: booleanAttribute
    });

    /**
     * Explicit overflow state supplied by a component.
     *
     * Use this when content is semantically abbreviated, such as a `+N` selected
     * values badge, even if the measured DOM node does not currently overflow.
     */
    readonly overflow = input(false, {
        alias: 'imsTextTruncateOverflow',
        transform: booleanAttribute
    });

    /**
     * Enables pointer interaction and text selection inside the tooltip.
     *
     * Interactive tooltips remain open while the pointer is over either the
     * host or tooltip. The default non-interactive mode closes on host leave.
     */
    readonly interactive = input(false, {
        alias: 'imsTextTruncateInteractive',
        transform: booleanAttribute
    });

    readonly maxWidthCss = computed(() => toCssLength(this.maxWidth()));

    protected readonly popoverId = `ims-text-truncate-popover-${nextPopoverId++}`;
    protected popoverVisible = false;

    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private overlayRef: OverlayRef | null = null;
    private overlayPosition: ImsTextTruncatePosition | null = null;
    private popoverRef: ComponentRef<ImsTextTruncatePopover> | null = null;
    private documentMouseMoveListener: ((event: MouseEvent) => void) | null = null;

    showPopover(): void {
        if (this.popoverDisabled()) {
            return;
        }

        const hostElement = this.elementRef.nativeElement;
        const targetElement = this.resolveTargetElement(hostElement);
        if (!targetElement || (!this.overflow() && !isOverflowing(targetElement))) {
            this.hidePopoverImmediately();
            return;
        }

        const text = this.resolveText(targetElement);
        if (!text) {
            this.hidePopoverImmediately();
            return;
        }

        const overlayRef = this.ensureOverlayRef(hostElement);
        if (!overlayRef.hasAttached()) {
            this.popoverRef = overlayRef.attach(new ComponentPortal(
                ImsTextTruncatePopover,
                this.viewContainerRef
            ));
        }

        const popover = this.popoverRef?.instance;
        if (popover) {
            const hostStyles = targetElement.ownerDocument.defaultView?.getComputedStyle(targetElement);
            popover.id = this.popoverId;
            popover.text = text;
            popover.maxWidth = toCssLength(this.popoverMaxWidth()) ?? '';
            popover.font = hostStyles?.font ?? 'inherit';
            popover.lineHeight = hostStyles?.lineHeight ?? 'normal';
            popover.direction = hostStyles?.direction ?? 'inherit';
            popover.interactive = this.interactive();
            this.popoverRef?.changeDetectorRef.detectChanges();
        }

        this.applyOverlayInteractivity(overlayRef);
        overlayRef.updatePosition();
        this.popoverVisible = true;
        if (this.interactive()) {
            this.listenForDocumentMouseMove();
        } else {
            this.stopListeningForDocumentMouseMove();
        }
    }

    showPopoverOnFocus(): void {
        if (this.showOnFocus()) {
            this.showPopover();
        }
    }

    hidePopover(event?: MouseEvent): void {
        if (this.interactive() && event && this.isPointerInsideVisibleRegion(event)) {
            return;
        }

        this.hidePopoverImmediately();
    }

    hidePopoverImmediately(): void {
        this.overlayRef?.detach();
        this.popoverRef = null;
        this.stopListeningForDocumentMouseMove();
        this.popoverVisible = false;
    }

    ngOnDestroy(): void {
        this.stopListeningForDocumentMouseMove();
        this.overlayRef?.dispose();
        this.overlayRef = null;
        this.overlayPosition = null;
        this.popoverRef = null;
    }

    private resolveText(hostElement: HTMLElement): string {
        const inputText = this.text();
        return (inputText === undefined || inputText === null || inputText === ''
            ? hostElement.textContent
            : inputText
        )?.trim() ?? '';
    }

    private resolveTargetElement(hostElement: HTMLElement): HTMLElement | null {
        const target = this.target();
        if (target instanceof HTMLElement) {
            return target;
        }

        if (typeof target === 'string' && target) {
            return hostElement.querySelector<HTMLElement>(target);
        }

        return hostElement;
    }

    private ensureOverlayRef(hostElement: HTMLElement): OverlayRef {
        if (this.overlayRef) {
            const position = this.position();
            if (this.overlayPosition !== position) {
                this.overlayPosition = position;
                this.overlayRef.updatePositionStrategy(this.createPositionStrategy(hostElement, position));
            }

            return this.overlayRef;
        }

        const position = this.position();
        const positionStrategy = this.createPositionStrategy(hostElement, position);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });
        this.overlayRef.hostElement.style.pointerEvents = 'none';
        this.overlayPosition = position;

        return this.overlayRef;
    }

    private applyOverlayInteractivity(overlayRef: OverlayRef): void {
        overlayRef.overlayElement.style.pointerEvents = this.interactive() ? 'auto' : 'none';
    }

    private createPositionStrategy(hostElement: HTMLElement, position: ImsTextTruncatePosition) {
        return this.overlay
            .position()
            .flexibleConnectedTo(hostElement)
            .withFlexibleDimensions(false)
            .withPush(true)
            .withViewportMargin(6)
            .withPositions(getOverlayPositions(position));
    }

    private listenForDocumentMouseMove(): void {
        if (this.documentMouseMoveListener) {
            return;
        }

        const document = this.elementRef.nativeElement.ownerDocument;
        const listener = (event: MouseEvent) => {
            if (!this.isPointerInsideVisibleRegion(event)) {
                this.hidePopoverImmediately();
            }
        };

        document.addEventListener('mousemove', listener, {passive: true});
        this.documentMouseMoveListener = listener;
    }

    private stopListeningForDocumentMouseMove(): void {
        if (!this.documentMouseMoveListener) {
            return;
        }

        this.elementRef.nativeElement.ownerDocument.removeEventListener(
            'mousemove',
            this.documentMouseMoveListener
        );
        this.documentMouseMoveListener = null;
    }

    private isPointerInsideVisibleRegion(event: MouseEvent): boolean {
        return isPointInsideRect(event, this.elementRef.nativeElement.getBoundingClientRect())
            || isPointInsideRect(event, this.overlayRef?.overlayElement.getBoundingClientRect());
    }
}

@Component({
    selector: 'ims-text-truncate-popover',
    standalone: true,
    template: '{{ text }}',
    host: {
        class: 'ims-text-truncate-popover',
        role: 'tooltip',
        '[id]': 'id',
        '[style.box-sizing]': '"border-box"',
        '[style.padding]': '"0.375rem 0.5rem"',
        '[style.border-radius]': '"4px"',
        '[style.background]': '"#1f2937"',
        '[style.color]': '"#ffffff"',
        '[style.box-shadow]': '"0 8px 24px rgba(15, 23, 42, 0.18)"',
        '[style.white-space]': '"normal"',
        '[style.overflow-wrap]': '"anywhere"',
        '[style.pointer-events]': 'interactive ? "auto" : "none"',
        '[style.user-select]': 'interactive ? "text" : "none"',
        '[style.cursor]': 'interactive ? "text" : null',
        '[style.max-width]': 'maxWidth',
        '[style.font]': 'font',
        '[style.line-height]': 'lineHeight',
        '[style.direction]': 'direction'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
class ImsTextTruncatePopover {
    id = '';
    text = '';
    maxWidth = '';
    font = 'inherit';
    lineHeight = 'normal';
    direction = 'inherit';
    interactive = false;
}

let nextPopoverId = 0;

function isOverflowing(element: HTMLElement): boolean {
    return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
}

function toCssLength(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return typeof value === 'number' ? `${value}px` : value;
}

function isPointInsideRect(event: MouseEvent, rect: DOMRect | undefined): boolean {
    if (!rect) {
        return false;
    }

    return event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
}

function getOverlayPositions(position: ImsTextTruncatePosition): ConnectedPosition[] {
    const centeredPosition: ConnectedPosition = {
        originX: 'center',
        originY: 'center',
        overlayX: 'center',
        overlayY: 'center'
    };
    const topPosition: ConnectedPosition = {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
        offsetY: -6
    };
    const bottomPosition: ConnectedPosition = {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
        offsetY: 6
    };

    if (position === 'top') {
        return [topPosition, centeredPosition, bottomPosition];
    }

    if (position === 'bottom') {
        return [bottomPosition, centeredPosition, topPosition];
    }

    return [centeredPosition, topPosition, bottomPosition];
}
