import {AfterViewInit, DestroyRef, Directive, effect, inject, input, NgZone, Renderer2} from '@angular/core';
import {CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport} from '@angular/cdk/scrolling';


@Directive({
    selector: 'cdk-virtual-scroll-viewport[imsVirtualScrollAutoHeight]',
    standalone: true
})
/**
 * Automatically assigns a concrete height to a CDK virtual-scroll viewport.
 *
 * CDK virtual scrolling requires a real viewport height. This directive derives
 * that height from the viewport wrapper's remaining content height and asks the
 * CDK viewport to re-measure when the wrapper, preceding siblings, or browser
 * viewport size changes.
 */
export class ImsVirtualScrollAutoHeightDirective implements AfterViewInit {
    /** Minimum viewport height. Numeric values are treated as pixels. */
    readonly minHeight = input<string | number>(0, {alias: 'imsVirtualScrollMinHeight'});
    /** Optional maximum viewport height. Numeric values are treated as pixels. */
    readonly maxHeight = input<string | number | undefined>(undefined, {alias: 'imsVirtualScrollMaxHeight'});
    /** Space to reserve below the viewport. Numeric values are treated as pixels. */
    readonly bottomOffset = input<string | number>(0, {alias: 'imsVirtualScrollBottomOffset'});
    /**
     * Whether the viewport should shrink to its total virtual content height
     * when the data is shorter than the available viewport space.
     */
    readonly fitContent = input<boolean>(false, {alias: 'imsVirtualScrollFitContent'});

    private readonly destroyRef = inject(DestroyRef);
    private readonly fixedSizeVirtualScroll = inject(CdkFixedSizeVirtualScroll, {
        optional: true,
        self: true
    });
    private readonly ngZone = inject(NgZone);
    private readonly renderer = inject(Renderer2);
    private readonly viewport = inject(CdkVirtualScrollViewport, {self: true});
    private readonly hostElement = this.viewport.elementRef.nativeElement;
    private readonly cleanupListeners: Array<() => void> = [];
    private animationFrameId: number | null = null;
    private lastHeight: number | null = null;
    private mutationObserver: MutationObserver | null = null;
    private previousWrapperOverflowY: string | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private wrapperElement: HTMLElement | null = null;
    private viewInitialized = false;

    constructor() {
        effect(() => {
            this.minHeight();
            this.maxHeight();
            this.bottomOffset();
            this.fitContent();
            this.scheduleMeasure();
        });

        this.destroyRef.onDestroy(() => this.cleanup());
    }

    /** Starts layout observers once the viewport element is present in the DOM. */
    ngAfterViewInit(): void {
        this.viewInitialized = true;

        this.ngZone.runOutsideAngular(() => {
            this.observeLayout();
            this.listenForViewportChanges();
            this.scheduleMeasure();
        });
    }

    /** Coalesces resize work into a single animation frame. */
    private scheduleMeasure(): void {
        if (!this.viewInitialized || this.animationFrameId !== null) {
            return;
        }

        const window = this.hostElement.ownerDocument.defaultView;
        if (!window) {
            return;
        }

        this.animationFrameId = window.requestAnimationFrame(() => {
            this.animationFrameId = null;
            this.measure();
        });
    }

    /** Measures and applies the next viewport height. */
    private measure(): void {
        const availableHeight = this.resolveAvailableHeight();
        const minHeight = Math.max(0, resolveCssLength(this.minHeight(), this.hostElement) ?? 0);
        const maxHeight = resolveCssLength(this.maxHeight(), this.hostElement) ?? availableHeight;
        const contentHeight = this.resolveContentHeight();

        let nextHeight = Math.min(availableHeight, maxHeight);
        if (this.fitContent() && contentHeight !== null) {
            nextHeight = Math.min(nextHeight, contentHeight);
        }

        nextHeight = Math.max(minHeight, nextHeight);
        nextHeight = Math.max(0, Math.floor(nextHeight));

        if (nextHeight === this.lastHeight) {
            return;
        }

        this.lastHeight = nextHeight;
        this.renderer.setStyle(this.hostElement, 'box-sizing', 'border-box');
        this.renderer.setStyle(this.hostElement, 'height', `${nextHeight}px`);
        this.viewport.checkViewportSize();
    }

    /** Returns wrapper height when available, otherwise viewport-bottom height. */
    private resolveAvailableHeight(): number {
        const window = this.hostElement.ownerDocument.defaultView;
        if (!window) {
            return 0;
        }

        const wrapperHeight = this.resolveWrapperHeight(window);
        if (wrapperHeight > 0) {
            return wrapperHeight;
        }

        const hostRect = this.hostElement.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const bottomOffset = resolveCssLength(this.bottomOffset(), this.hostElement) ?? 0;

        return Math.max(0, viewportHeight - Math.max(hostRect.top, 0) - bottomOffset);
    }

    /** Returns the remaining content-box height in the viewport's wrapper. */
    private resolveWrapperHeight(window: Window): number {
        const wrapperElement = this.wrapperElement ?? this.resolveLayoutWrapper(window);
        if (!wrapperElement) {
            return 0;
        }

        const hostRect = this.hostElement.getBoundingClientRect();
        const wrapperRect = wrapperElement.getBoundingClientRect();
        const wrapperStyles = window.getComputedStyle(wrapperElement);
        const borderTop = parseCssPixels(wrapperStyles.borderTopWidth);
        const paddingBottom = parseCssPixels(wrapperStyles.paddingBottom);
        const contentBottom = wrapperRect.top + borderTop + wrapperElement.clientHeight - paddingBottom;
        const bottomOffset = resolveCssLength(this.bottomOffset(), this.hostElement) ?? 0;

        return Math.max(0, contentBottom - hostRect.top - bottomOffset);
    }

    /** Returns total content height when it can be derived safely. */
    private resolveContentHeight(): number | null {
        const itemSize = this.resolveFixedItemSize();
        if (itemSize !== null) {
            return this.viewport.getDataLength() * itemSize;
        }

        const renderedContentSize = this.viewport.measureRenderedContentSize();
        return renderedContentSize > 0 ? renderedContentSize : null;
    }

    private resolveFixedItemSize(): number | null {
        const itemSize = this.fixedSizeVirtualScroll?.itemSize;
        return itemSize !== undefined && Number.isFinite(itemSize) && itemSize > 0
            ? itemSize
            : null;
    }

    /** Watches wrapper and preceding sibling size changes that alter available height. */
    private observeLayout(): void {
        const window = this.hostElement.ownerDocument.defaultView;
        if (!window?.ResizeObserver) {
            return;
        }

        const wrapperElement = this.resolveLayoutWrapper(window);
        if (!wrapperElement) {
            return;
        }

        this.wrapperElement = wrapperElement;
        this.previousWrapperOverflowY = wrapperElement.style.overflowY;
        this.renderer.setStyle(wrapperElement, 'overflow-y', 'hidden');

        const resizeObserver = new window.ResizeObserver(() => this.scheduleMeasure());
        this.resizeObserver = resizeObserver;
        resizeObserver.observe(wrapperElement);
        this.observePrecedingSiblings(resizeObserver, wrapperElement, window);

        if (window.MutationObserver) {
            this.mutationObserver = new window.MutationObserver(() => {
                resizeObserver.disconnect();
                resizeObserver.observe(wrapperElement);
                this.observePrecedingSiblings(resizeObserver, wrapperElement, window);
                this.scheduleMeasure();
            });
            this.mutationObserver.observe(wrapperElement, {childList: true});
        }
    }

    private resolveLayoutWrapper(window: Window): HTMLElement | null {
        let wrapperElement = this.hostElement.parentElement;
        while (wrapperElement && window.getComputedStyle(wrapperElement).display === 'contents') {
            wrapperElement = wrapperElement.parentElement;
        }

        return wrapperElement;
    }

    private observePrecedingSiblings(
        resizeObserver: ResizeObserver,
        wrapperElement: HTMLElement,
        window: Window
    ): void {
        let element: HTMLElement | null = this.hostElement;
        while (element?.parentElement && element !== wrapperElement) {
            this.observePreviousSiblings(resizeObserver, element, window);
            element = element.parentElement;
        }
    }

    private observePreviousSiblings(
        resizeObserver: ResizeObserver,
        element: HTMLElement,
        window: Window
    ): void {
        let sibling = element.previousElementSibling;
        while (sibling) {
            if (sibling instanceof HTMLElement) {
                this.observeLayoutElement(resizeObserver, sibling, window);
            }
            sibling = sibling.previousElementSibling;
        }
    }

    private observeLayoutElement(
        resizeObserver: ResizeObserver,
        element: HTMLElement,
        window: Window
    ): void {
        if (window.getComputedStyle(element).display !== 'contents') {
            resizeObserver.observe(element);
            return;
        }

        for (const child of Array.from(element.children)) {
            if (child instanceof HTMLElement) {
                this.observeLayoutElement(resizeObserver, child, window);
            }
        }
    }

    /** Watches browser viewport resizing. */
    private listenForViewportChanges(): void {
        const window = this.hostElement.ownerDocument.defaultView;
        if (!window) {
            return;
        }

        const schedule = () => this.scheduleMeasure();
        window.addEventListener('resize', schedule, {passive: true});
        this.cleanupListeners.push(() => {
            window.removeEventListener('resize', schedule);
        });

        const visualViewport = window.visualViewport;
        if (visualViewport) {
            visualViewport.addEventListener('resize', schedule, {passive: true});
            this.cleanupListeners.push(() => {
                visualViewport.removeEventListener('resize', schedule);
            });
        }
    }

    /** Releases DOM observers and pending animation work. */
    private cleanup(): void {
        const window = this.hostElement.ownerDocument.defaultView;
        if (window && this.animationFrameId !== null) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.mutationObserver?.disconnect();
        this.mutationObserver = null;
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        if (this.wrapperElement && this.previousWrapperOverflowY !== null) {
            if (this.previousWrapperOverflowY) {
                this.renderer.setStyle(
                    this.wrapperElement,
                    'overflow-y',
                    this.previousWrapperOverflowY
                );
            } else {
                this.renderer.removeStyle(this.wrapperElement, 'overflow-y');
            }
        }
        this.previousWrapperOverflowY = null;
        this.wrapperElement = null;

        for (const cleanupListener of this.cleanupListeners) {
            cleanupListener();
        }
        this.cleanupListeners.length = 0;
    }
}

function parseCssPixels(value: string): number {
    const pixels = Number.parseFloat(value);
    return Number.isFinite(pixels) ? pixels : 0;
}

function resolveCssLength(value: string | number | undefined, contextElement: HTMLElement): number | null {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const normalized = value.trim();
    if (!normalized || normalized === 'auto' || normalized === 'none') {
        return null;
    }

    const unitless = Number(normalized);
    if (Number.isFinite(unitless)) {
        return unitless;
    }

    if (normalized.endsWith('px')) {
        const pixels = Number(normalized.slice(0, -2));
        return Number.isFinite(pixels) ? pixels : null;
    }

    const document = contextElement.ownerDocument;
    if (!document.body) {
        return null;
    }

    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.contain = 'strict';
    probe.style.width = '0';
    probe.style.height = normalized;
    document.body.appendChild(probe);

    const pixels = probe.getBoundingClientRect().height;
    probe.remove();

    return Number.isFinite(pixels) ? pixels : null;
}
