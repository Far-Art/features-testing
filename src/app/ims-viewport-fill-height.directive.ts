import {
    booleanAttribute,
    Directive,
    DestroyRef,
    ElementRef,
    effect,
    inject,
    input,
    NgZone,
    numberAttribute,
    Renderer2
} from '@angular/core';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';

@Directive({
    selector: 'cdk-virtual-scroll-viewport[imsViewportFillHeight]',
    standalone: true
})
export class ImsViewportFillHeightDirective {
    private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly viewport = inject(CdkVirtualScrollViewport, {host: true});
    private readonly destroyRef = inject(DestroyRef);
    private readonly zone = inject(NgZone);
    private readonly renderer = inject(Renderer2);
    private readonly observedSiblings = new Set<HTMLElement>();
    private observedContainer: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private mutationObserver: MutationObserver | null = null;
    private pendingAnimationFrame: number | null = null;
    private lastAppliedHeight = -1;
    private lastProcessedOffset = 0;
    private unlistenWindowResize: (() => void) | null = null;

    readonly listenWindowResize = input(false, {
        alias: 'imsViewportFillHeightListenWindowResize',
        transform: booleanAttribute
    });
    readonly heightOffset = input(0, {
        alias: 'imsViewportFillHeightOffset',
        transform: (value: unknown) => numberAttribute(value, 0)
    });

    constructor() {
        this.zone.runOutsideAngular(() => {
            this.ensureObservers();
            this.scheduleHeightUpdate();
        });

        effect(() => {
            const shouldListen = this.listenWindowResize();
            this.zone.runOutsideAngular(() => {
                this.syncWindowResizeListener(shouldListen);
            });
        });
        effect(() => {
            this.heightOffset();
            this.zone.runOutsideAngular(() => {
                this.scheduleHeightUpdate();
            });
        });

        this.destroyRef.onDestroy(() => {
            this.resizeObserver?.disconnect();
            this.mutationObserver?.disconnect();
            this.unlistenWindowResize?.();
            if (this.pendingAnimationFrame !== null) {
                cancelAnimationFrame(this.pendingAnimationFrame);
            }
        });
    }

    private ensureObservers(): void {
        const container = this.host.parentElement;
        if (container === this.observedContainer && this.resizeObserver !== null) {
            return;
        }

        this.resizeObserver?.disconnect();
        this.mutationObserver?.disconnect();
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.observedContainer = container;
        this.observedSiblings.clear();

        if (!container || typeof ResizeObserver === 'undefined') {
            return;
        }

        this.resizeObserver = new ResizeObserver(() => this.scheduleHeightUpdate());
        this.resizeObserver.observe(container);
        this.resizeObserver.observe(this.host);
        this.observePrecedingSiblings();

        if (typeof MutationObserver !== 'undefined') {
            this.mutationObserver = new MutationObserver(() => {
                this.observePrecedingSiblings();
                this.scheduleHeightUpdate();
            });
            this.mutationObserver.observe(container, {childList: true});
        }
    }

    private observePrecedingSiblings(): void {
        const container = this.observedContainer;
        if (!container || !this.resizeObserver) {
            return;
        }

        const nextObserved = new Set<HTMLElement>();
        for (const child of Array.from(container.children)) {
            if (!(child instanceof HTMLElement)) {
                continue;
            }

            if (child === this.host) {
                break;
            }

            nextObserved.add(child);
            if (!this.observedSiblings.has(child)) {
                this.resizeObserver.observe(child);
            }
        }

        for (const previous of this.observedSiblings) {
            if (nextObserved.has(previous)) {
                continue;
            }
            this.resizeObserver.unobserve(previous);
        }

        this.observedSiblings.clear();
        for (const element of nextObserved) {
            this.observedSiblings.add(element);
        }
    }

    private scheduleHeightUpdate(): void {
        if (this.pendingAnimationFrame !== null) {
            return;
        }

        this.pendingAnimationFrame = requestAnimationFrame(() => {
            this.pendingAnimationFrame = null;
            this.ensureObservers();
            this.updateHeight();
        });
    }

    private updateHeight(): void {
        const hostRect = this.host.getBoundingClientRect();
        const container = this.observedContainer;
        const offset = this.heightOffset();
        const measuredInContainer = container ? this.measureAvailableHeightInContainer(hostRect, container) : 0;
        let nextHeight = measuredInContainer;

        // If parent height is content-driven, container-based available space can collapse to 0.
        // In that case fill to the viewport bottom so the virtual viewport stays visible.
        if (nextHeight <= 0) {
            nextHeight = this.measureAvailableHeightInViewport(hostRect);
        }

        // When container measurement mirrors current host height, applying absolute offset each pass
        // creates a feedback loop (height keeps growing/shrinking). In this case apply offset delta only.
        const isSelfReferentialContainer =
            measuredInContainer > 0 && Math.abs(measuredInContainer - hostRect.height) < 0.5;
        if (isSelfReferentialContainer) {
            nextHeight = Math.max(0, hostRect.height + (offset - this.lastProcessedOffset));
        } else {
            nextHeight = Math.max(0, nextHeight + offset);
        }
        this.lastProcessedOffset = offset;

        if (Math.abs(nextHeight - this.lastAppliedHeight) < 0.5) {
            return;
        }

        this.lastAppliedHeight = nextHeight;
        this.renderer.setStyle(this.host, 'height', `${nextHeight.toFixed(3)}px`);
        this.viewport.checkViewportSize();
    }

    private syncWindowResizeListener(shouldListen: boolean): void {
        if (shouldListen) {
            if (!this.unlistenWindowResize) {
                this.unlistenWindowResize = this.renderer.listen('window', 'resize', () => {
                    this.scheduleHeightUpdate();
                });
            }
            return;
        }

        this.unlistenWindowResize?.();
        this.unlistenWindowResize = null;
    }

    private measureAvailableHeightInContainer(hostRect: DOMRect, container: HTMLElement): number {
        const containerRect = container.getBoundingClientRect();
        const styles = getComputedStyle(container);
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;
        const contentTop = containerRect.top + paddingTop;
        const contentBottom = containerRect.bottom - paddingBottom;
        const start = Math.max(hostRect.top, contentTop);
        return Math.max(0, contentBottom - start);
    }

    private measureAvailableHeightInViewport(hostRect: DOMRect): number {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        return Math.max(0, viewportHeight - hostRect.top);
    }
}
