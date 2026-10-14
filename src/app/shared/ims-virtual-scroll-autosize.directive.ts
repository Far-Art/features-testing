import {ListRange} from '@angular/cdk/collections';
import {CdkVirtualScrollViewport, VIRTUAL_SCROLL_STRATEGY, VirtualScrollStrategy} from '@angular/cdk/scrolling';
import {Directive, effect, forwardRef, inject, input, NgZone, numberAttribute, untracked} from '@angular/core';
import {distinctUntilChanged, Observable, Subject} from 'rxjs';

/** What the strategy reads from its directive, as functions so it always reads the current inputs. */
interface ImsAutosizeVirtualScrollConfig {
    /** Size assumed for an item that has not been rendered yet, in px. */
    readonly itemSize: () => number;
    /** Rendered space kept beyond the viewport before more is rendered, in px. */
    readonly minBufferPx: () => number;
    /** Rendered space beyond the viewport once more is rendered, in px. */
    readonly maxBufferPx: () => number;
}

/**
 * A virtual scroll strategy for items of different heights: rows that expand,
 * rows that wrap.
 *
 * CDK's `itemSize` strategy places item `i` at `i * itemSize`, which only holds
 * while every item is that tall. This one measures each item once it is
 * rendered and keeps the measurement, so an item's offset is the sum of the
 * sizes before it: measured where known, `itemSize` where not. A
 * `ResizeObserver` keeps the measurements current while an item grows or
 * shrinks, an expansion panel's animation included.
 *
 * When an item above the first visible one changes size — measured for the
 * first time while scrolling up, or closing above the viewport — the scroll
 * offset moves by the same amount, so what is on screen stays where it is.
 * That is the job scroll anchoring does on an ordinary page. The directive
 * turns the browser's own off on its viewport: it would make the same
 * correction a step ahead of this one, doubling it.
 *
 * Vertical only. Each rendered item must be exactly one element in the
 * viewport's content wrapper: the strategy matches elements to indexes by
 * their order.
 */
export class ImsAutosizeVirtualScrollStrategy implements VirtualScrollStrategy {
    private readonly scrolledIndex = new Subject<number>();
    readonly scrolledIndexChange: Observable<number> = this.scrolledIndex.pipe(distinctUntilChanged());

    private viewport: CdkVirtualScrollViewport | null = null;
    /** Measured size of each item, by index; `undefined` until it has been rendered. */
    private sizes: (number | undefined)[] = [];
    /** Where each item starts, and at the end the total size: one more entry than there are items. */
    private offsets: number[] = [0];
    private resizeObserver: ResizeObserver | null = null;
    private mutationObserver: MutationObserver | null = null;
    private readonly observedItems = new Set<Element>();
    private measureFrame: ReturnType<typeof requestAnimationFrame> | null = null;
    private renderMeasurePending = false;
    /**
     * The index the first rendered element stands for, and that element, as of
     * the last render. The viewport's range runs ahead of the DOM between a
     * range change and its render, and a range shifted by whole items can have
     * as many elements as the old one, so the element count alone would not
     * catch it: measuring then would credit each size to its neighbour's index.
     */
    private domStart = 0;
    private domFirst: Element | null = null;

    constructor(
        private readonly config: ImsAutosizeVirtualScrollConfig,
        private readonly ngZone: NgZone
    ) {}

    attach(viewport: CdkVirtualScrollViewport): void {
        this.viewport = viewport;

        const wrapper = this.contentWrapper();
        if (wrapper && typeof ResizeObserver !== 'undefined') {
            // Outside Angular: these fire every frame while an item animates, and
            // the viewport runs change detection itself when a range or size changes.
            this.ngZone.runOutsideAngular(() => {
                this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
                this.mutationObserver = new MutationObserver(() => this.observeRenderedItems());
                this.mutationObserver.observe(wrapper, {childList: true});
            });
        }

        this.onDataLengthChanged();
    }

    detach(): void {
        if (this.measureFrame !== null) {
            cancelAnimationFrame(this.measureFrame);
            this.measureFrame = null;
        }
        this.scrolledIndex.complete();
        this.resizeObserver?.disconnect();
        this.mutationObserver?.disconnect();
        this.observedItems.clear();
        this.viewport = null;
    }

    onContentScrolled(): void {
        this.updateRenderedRange();
    }

    onDataLengthChanged(): void {
        const viewport = this.viewport;
        if (!viewport) {
            return;
        }

        // Measurements stay with their index: after a change in length they may
        // belong to other items, and the next render corrects whichever are seen.
        this.sizes.length = viewport.getDataLength();
        this.rebuildOffsets();
        this.updateRenderedRange();
    }

    onContentRendered(): void {
        const wrapper = this.contentWrapper();
        this.domStart = this.viewport?.getRenderedRange().start ?? 0;
        this.domFirst = wrapper?.firstElementChild ?? null;
        this.observeRenderedItems();
        this.measureAfterRender();
    }

    onRenderedOffsetChanged(): void {
        // Nothing to do: the offset is always set from the measured sizes.
    }

    scrollToIndex(index: number, behavior: ScrollBehavior): void {
        const count = this.sizes.length;
        if (!this.viewport || count === 0) {
            return;
        }

        this.viewport.scrollToOffset(this.offsets[Math.max(0, Math.min(index, count - 1))], behavior);
    }

    /** Applies a changed `itemSize` or buffer. */
    refresh(): void {
        if (!this.viewport) {
            return;
        }

        this.rebuildOffsets();
        this.updateRenderedRange();
    }

    private contentWrapper(): HTMLElement | null {
        return this.viewport?.elementRef.nativeElement.querySelector<HTMLElement>('.cdk-virtual-scroll-content-wrapper') ?? null;
    }

    /**
     * Measures the rows just rendered once the render has settled: in a
     * microtask, after the change detection pass that rendered them and before
     * the browser paints. Not in the viewport's callback itself. It runs among
     * the render hooks of that pass, ahead of hooks the rows register for
     * themselves, and a row may finish its layout in one: `ims-grid-row-v2` places
     * the cells projected through a panel's header there. Measured in the
     * callback, every new row came out at the height of its unfinished layout
     * — 209px, its cells stacked in one column, for a 33px row — and was put
     * right only a frame later. In that frame, rows rendered above the viewport
     * while scrolling up threw the list down by their error, and rows rendered
     * below cut the next range short.
     */
    private measureAfterRender(): void {
        if (this.renderMeasurePending) {
            return;
        }

        this.renderMeasurePending = true;
        this.ngZone.runOutsideAngular(() =>
            Promise.resolve().then(() => {
                this.renderMeasurePending = false;
                this.measureRenderedItems();
            })
        );
    }

    /**
     * Measures in the next frame rather than in the observer's callback. Acting
     * there renders rows and observes them while the browser is still
     * delivering resize notifications, which it reports as "ResizeObserver loop
     * completed with undelivered notifications". Nothing is lost by waiting: the
     * next frame has already advanced any running transition when its
     * animation callbacks run, so the sizes read there are that frame's, and a
     * scroll correction made there lands before it paints.
     */
    private scheduleMeasure(): void {
        if (this.measureFrame !== null) {
            return;
        }

        this.measureFrame = requestAnimationFrame(() => {
            this.measureFrame = null;
            this.measureRenderedItems();
        });
    }

    /** Observes the items rendered now, and stops observing the ones that left. */
    private observeRenderedItems(): void {
        const observer = this.resizeObserver;
        const wrapper = this.contentWrapper();
        if (!observer || !wrapper) {
            return;
        }

        const rendered = new Set<Element>(Array.from(wrapper.children));
        for (const item of this.observedItems) {
            if (!rendered.has(item)) {
                observer.unobserve(item);
                this.observedItems.delete(item);
            }
        }
        for (const item of rendered) {
            if (!this.observedItems.has(item)) {
                observer.observe(item);
                this.observedItems.add(item);
            }
        }
    }

    /**
     * Measures every rendered item. An item's size is the distance to the next
     * one's start, or to the wrapper's end for the last, so a margin between
     * items is counted with the item it belongs to.
     */
    private measureRenderedItems(): void {
        const viewport = this.viewport;
        const wrapper = this.contentWrapper();
        if (!viewport || !wrapper) {
            return;
        }

        const items = Array.from(wrapper.children);
        // Between a range change and its render the elements do not match the
        // indexes yet. The render that follows calls back here.
        const range = viewport.getRenderedRange();
        if (
            items[0] !== this.domFirst ||
            range.start !== this.domStart ||
            items.length !== range.end - range.start ||
            range.end > this.sizes.length
        ) {
            return;
        }

        const estimate = this.config.itemSize();
        const firstVisible = this.indexAt(viewport.measureScrollOffset());
        const tops = items.map((item) => item.getBoundingClientRect().top);
        const end = wrapper.getBoundingClientRect().bottom;
        let changed = false;
        let shiftAbove = 0;

        tops.forEach((top, position) => {
            const index = range.start + position;
            const size = (tops[position + 1] ?? end) - top;
            const known = this.sizes[index];
            if (known !== undefined && Math.abs(size - known) < 0.5) {
                return;
            }

            if (index < firstVisible) {
                shiftAbove += size - (known ?? estimate);
            }
            this.sizes[index] = size;
            changed = true;
        });

        if (!changed) {
            return;
        }

        this.rebuildOffsets();
        if (Math.abs(shiftAbove) >= 0.5) {
            // The items above the first visible one moved what follows them by
            // this much; scrolling by the same amount puts it back on screen.
            // Instant, whatever `scroll-behavior` the page sets: a smooth
            // correction would read the offset back before it had moved.
            viewport.scrollToOffset(viewport.measureScrollOffset() + shiftAbove, 'instant');
        }
        this.updateRenderedRange();
    }

    private rebuildOffsets(): void {
        const estimate = this.config.itemSize();
        const count = this.sizes.length;
        const offsets = new Array<number>(count + 1);
        offsets[0] = 0;
        for (let index = 0; index < count; index++) {
            offsets[index + 1] = offsets[index] + (this.sizes[index] ?? estimate);
        }

        this.offsets = offsets;
        this.viewport?.setTotalContentSize(Math.round(offsets[count]));
    }

    /** The item at `offset`: the last one starting at or before it. */
    private indexAt(offset: number): number {
        let low = 0;
        let high = Math.max(0, this.sizes.length - 1);
        while (low < high) {
            const middle = (low + high + 1) >> 1;
            if (this.offsets[middle] <= offset) {
                low = middle;
            } else {
                high = middle - 1;
            }
        }

        return low;
    }

    /**
     * Keeps the rendered range covering the viewport plus `minBufferPx` on each
     * side, and when it no longer does, renders out to `maxBufferPx`, as CDK's
     * fixed-size strategy does.
     */
    private updateRenderedRange(): void {
        const viewport = this.viewport;
        if (!viewport) {
            return;
        }

        const count = this.sizes.length;
        const scrollOffset = viewport.measureScrollOffset();
        const viewportSize = viewport.getViewportSize();
        const minBuffer = this.config.minBufferPx();
        const maxBuffer = this.config.maxBufferPx();
        const current = viewport.getRenderedRange();
        let range: ListRange = current;

        if (count === 0) {
            range = {start: 0, end: 0};
        } else {
            const valid = current.start < current.end && current.end <= count;
            const coversStart = current.start === 0 || this.offsets[current.start] <= scrollOffset - minBuffer;
            const coversEnd = current.end === count || this.offsets[current.end] >= scrollOffset + viewportSize + minBuffer;
            if (!valid || !coversStart || !coversEnd) {
                range = {
                    start: this.indexAt(Math.max(0, scrollOffset - maxBuffer)),
                    end: Math.min(count, this.indexAt(scrollOffset + viewportSize + maxBuffer) + 1)
                };
            }
        }

        viewport.setRenderedRange(range);
        // Whole pixels, as CDK's own strategy does: a fractional translate
        // blurs every row on a low-DPI screen.
        viewport.setRenderedContentOffset(Math.round(this.offsets[range.start] ?? 0));
        this.scrolledIndex.next(this.indexAt(scrollOffset));
    }
}

/**
 * Lets a `cdk-virtual-scroll-viewport` hold items of different heights, such
 * as rows holding an `ims-expansion-panel-v2` that opens:
 *
 * ```html
 * <cdk-virtual-scroll-viewport imsVirtualScrollAutosize="33">
 *     <ims-grid-row-v2 *cdkVirtualFor="let item of items; templateCacheSize: 0">…</ims-grid-row-v2>
 * </cdk-virtual-scroll-viewport>
 * ```
 *
 * In place of CDK's `itemSize`, not beside it: both provide the strategy. The
 * value is the size of an item not yet rendered — the closed height, for rows
 * that expand. See {@link ImsAutosizeVirtualScrollStrategy}.
 */
@Directive({
    selector: 'cdk-virtual-scroll-viewport[imsVirtualScrollAutosize]',
    standalone: true,
    host: {
        // The strategy keeps what is on screen in place itself. Left on, the
        // browser's own scroll anchoring makes the same correction first, and
        // the two together scroll twice as far as the content moved.
        '[style.overflow-anchor]': '"none"'
    },
    providers: [
        {
            provide: VIRTUAL_SCROLL_STRATEGY,
            useFactory: (directive: ImsVirtualScrollAutosizeDirective) => directive.strategy,
            deps: [forwardRef(() => ImsVirtualScrollAutosizeDirective)]
        }
    ]
})
export class ImsVirtualScrollAutosizeDirective {
    /** Size of an item that has not been rendered yet, in px. A bare attribute means 32. */
    readonly itemSize = input(32, {
        alias: 'imsVirtualScrollAutosize',
        transform: (value: unknown) => numberAttribute(value, 32)
    });
    /**
     * Rendered space kept beyond the viewport before more is rendered, in px.
     * Named as on CDK's `itemSize` directive, which this replaces.
     *
     * Three times CDK's default. A trackpad swipe on a Mac scrolls on the
     * compositor, which does not wait for the page, at up to about 8000px/s:
     * over 130px a frame, more than CDK's 100px in a single frame. The rows
     * added after that arrive a frame or two late, and until they do the
     * viewport shows an empty edge, so the list blinks as it scrolls. 300px
     * covers the frames the page needs to catch up.
     */
    readonly minBufferPx = input(300, {transform: numberAttribute});
    /**
     * Rendered space beyond the viewport once more is rendered, in px. At least
     * `minBufferPx`. The difference is how much one update renders.
     */
    readonly maxBufferPx = input(600, {transform: numberAttribute});

    readonly strategy = new ImsAutosizeVirtualScrollStrategy(
        {
            itemSize: () => this.itemSize(),
            minBufferPx: () => this.minBufferPx(),
            maxBufferPx: () => Math.max(this.minBufferPx(), this.maxBufferPx())
        },
        inject(NgZone)
    );

    constructor() {
        effect(() => {
            this.itemSize();
            this.minBufferPx();
            this.maxBufferPx();
            untracked(() => this.strategy.refresh());
        });
    }
}
