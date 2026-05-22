import {AfterViewInit, DestroyRef, Directive, effect, inject, input, NgZone, Renderer2} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport} from '@angular/cdk/scrolling';


@Directive({
    selector: 'cdk-virtual-scroll-viewport[imsVirtualScrollAutoHeight]',
    standalone: true
})
/**
 * Automatically assigns a concrete height to a CDK virtual-scroll viewport.
 *
 * CDK virtual scrolling requires a real viewport height. This directive derives
 * that height from the available browser viewport space and asks the CDK
 * viewport to re-measure whenever layout, scroll position, or rendered range
 * changes. Rendered-content resize events keep height measurement active while
 * temporarily hiding the scrollbar during row expand/collapse animations.
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
    readonly fitContent = input<boolean>(true, {alias: 'imsVirtualScrollFitContent'});

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
    private contentResizeTimeoutId: number | null = null;
    private lastHeight: number | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private viewInitialized = false;

    constructor() {
        this.viewport.renderedRangeStream
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.scheduleMeasure());

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

    /** Hides the scrollbar while rendered content animations are changing size. */
    private scheduleContentResizeMeasure(): void {
        if (!this.viewInitialized) {
            return;
        }

        const window = this.hostElement.ownerDocument.defaultView;
        if (!window) {
            return;
        }

        this.renderer.addClass(this.hostElement, 'ims-virtual-scroll-content-resizing');
        this.scheduleMeasure();

        if (this.contentResizeTimeoutId !== null) {
            window.clearTimeout(this.contentResizeTimeoutId);
        }

        this.contentResizeTimeoutId = window.setTimeout(() => {
            this.contentResizeTimeoutId = null;
            this.renderer.removeClass(this.hostElement, 'ims-virtual-scroll-content-resizing');
            this.viewport.checkViewportSize();
        }, 100);
    }

    /** Measures and applies the next viewport height. */
    private measure(): void {
        const window = this.hostElement.ownerDocument.defaultView;
        if (!window) {
            return;
        }

        const availableHeight = this.resolveAvailableHeight(window);
        const minHeight = Math.max(0, resolveCssLength(this.minHeight(), this.hostElement) ?? 0);
        const maxHeight = resolveCssLength(this.maxHeight(), this.hostElement) ?? availableHeight;
        const contentHeight = this.resolveContentHeight();

        let nextHeight = Math.min(availableHeight, maxHeight);
        if (this.fitContent() && contentHeight !== null) {
            nextHeight = Math.min(nextHeight, contentHeight);
        }

        nextHeight = Math.max(minHeight, nextHeight);
        nextHeight = Math.max(0, Math.round(nextHeight));

        if (nextHeight === this.lastHeight) {
            return;
        }

        this.lastHeight = nextHeight;
        this.renderer.setStyle(this.hostElement, 'height', `${nextHeight}px`);
        this.viewport.checkViewportSize();
    }

    /** Returns the available vertical space from the viewport's top edge. */
    private resolveAvailableHeight(window: Window): number {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const rect = this.hostElement.getBoundingClientRect();
        const bottomOffset = resolveCssLength(this.bottomOffset(), this.hostElement) ?? 0;

        return Math.max(0, viewportHeight - Math.max(rect.top, 0) - bottomOffset);
    }

    /** Returns total content height when it can be derived safely. */
    private resolveContentHeight(): number | null {
        const renderedContentSize = this.viewport.measureRenderedContentSize();
        const itemSize = this.fixedSizeVirtualScroll?.itemSize;
        if (itemSize !== undefined && Number.isFinite(itemSize) && itemSize > 0) {
            return Math.max(this.viewport.getDataLength() * itemSize, renderedContentSize);
        }

        return renderedContentSize > 0 ? renderedContentSize : null;
    }

    /** Watches ancestor and document size changes that can alter available height. */
    private observeLayout(): void {
        const window = this.hostElement.ownerDocument.defaultView;
        if (!window?.ResizeObserver) {
            return;
        }

        const contentWrapper = this.hostElement.querySelector('.cdk-virtual-scroll-content-wrapper');
        const resizeObserver = new window.ResizeObserver((entries: ResizeObserverEntry[]) => {
            if (contentWrapper instanceof HTMLElement && entries.some((entry) => entry.target === contentWrapper)) {
                this.scheduleContentResizeMeasure();
                return;
            }

            this.scheduleMeasure();
        });
        this.resizeObserver = resizeObserver;
        resizeObserver.observe(this.hostElement.ownerDocument.documentElement);
        resizeObserver.observe(this.hostElement);

        const parentElement = this.hostElement.parentElement;
        if (parentElement) {
            resizeObserver.observe(parentElement);
        }

        if (contentWrapper instanceof HTMLElement) {
            resizeObserver.observe(contentWrapper);
        }
    }

    /** Watches browser viewport movement and resizing. */
    private listenForViewportChanges(): void {
        const window = this.hostElement.ownerDocument.defaultView;
        if (!window) {
            return;
        }

        const schedule = () => this.scheduleMeasure();
        window.addEventListener('resize', schedule, {passive: true});
        window.addEventListener('scroll', schedule, {passive: true});
        this.cleanupListeners.push(() => {
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', schedule);
        });

        const visualViewport = window.visualViewport;
        if (visualViewport) {
            visualViewport.addEventListener('resize', schedule, {passive: true});
            visualViewport.addEventListener('scroll', schedule, {passive: true});
            this.cleanupListeners.push(() => {
                visualViewport.removeEventListener('resize', schedule);
                visualViewport.removeEventListener('scroll', schedule);
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

        if (window && this.contentResizeTimeoutId !== null) {
            window.clearTimeout(this.contentResizeTimeoutId);
            this.contentResizeTimeoutId = null;
        }

        this.renderer.removeClass(this.hostElement, 'ims-virtual-scroll-content-resizing');

        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        for (const cleanupListener of this.cleanupListeners) {
            cleanupListener();
        }
        this.cleanupListeners.length = 0;
    }
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
