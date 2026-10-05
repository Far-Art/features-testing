import {Injectable, inject, signal} from '@angular/core';
import {SpecPoint, SpecSize} from './spec-builder.types';
import {containsPoint, placeInZone, snap} from './spec-geometry.utils';
import {SpecZoomService} from './spec-zoom.service';

/**
 * The builder's link to the page as it is drawn: which element each zone is,
 * and how a point on the screen maps into a zone.
 *
 * All conversions from screen pixels to page pixels happen here, so nothing
 * else needs to know about zoom, scrolling or reading direction. Zones and the
 * canvas register their elements when they render.
 */
@Injectable()
export class SpecSurfaceService {
    private readonly zoom = inject(SpecZoomService);
    private readonly zones = new Map<string, HTMLElement>();
    private page: HTMLElement | null = null;
    private viewport: HTMLElement | null = null;

    /** Zone under the pointer while a block or an item is dragged, so it can be highlighted. */
    readonly dropZoneId = signal<string | null>(null);

    /** Registers a zone's element. Returns the function that unregisters it. */
    registerZone(zoneId: string, element: HTMLElement): () => void {
        this.zones.set(zoneId, element);
        return () => {
            // Only while it is still this element: a zone with the same id
            // that registered since then keeps its entry.
            if (this.zones.get(zoneId) === element) {
                this.zones.delete(zoneId);
            }
        };
    }

    /** Registers the page element and the scrolling area it is shown in. Returns the function that unregisters them. */
    registerCanvas(page: HTMLElement, viewport: HTMLElement): () => void {
        this.page = page;
        this.viewport = viewport;
        return () => {
            if (this.page === page) {
                this.page = null;
                this.viewport = null;
            }
        };
    }

    pageElement(): HTMLElement | null {
        return this.page;
    }

    viewportElement(): HTMLElement | null {
        return this.viewport;
    }

    itemElement(itemId: string): HTMLElement | null {
        return this.page?.querySelector<HTMLElement>(`[data-spec-item="${CSS.escape(itemId)}"]`) ?? null;
    }

    /** Moves keyboard focus to an item, so the canvas shortcuts act on it. */
    focusItem(itemId: string): void {
        this.itemElement(itemId)?.querySelector<HTMLElement>('[tabindex]')?.focus({preventScroll: true});
    }

    /** The zone at a point of the viewport, such as where the pointer is. */
    zoneAt(client: SpecPoint): string | null {
        for (const [zoneId, element] of this.zones) {
            if (containsPoint(element.getBoundingClientRect(), client)) {
                return zoneId;
            }
        }
        return null;
    }

    /**
     * A point of the viewport in a zone's coordinates: page pixels from the
     * zone's inline-start edge and its top.
     *
     * Reads the zone's position as it is drawn, so scrolling and the zoom are
     * already in it; dividing by the zoom turns screen pixels into page pixels.
     */
    toZonePoint(zoneId: string, client: SpecPoint): SpecPoint {
        const element = this.zones.get(zoneId);
        if (!element) {
            return {x: 0, y: 0};
        }

        const box = element.getBoundingClientRect();
        const zoom = this.zoom.zoom();
        const fromInlineStart = isRtl(element) ? box.right - client.x : client.x - box.left;
        return {x: fromInlineStart / zoom, y: (client.y - box.top) / zoom};
    }

    /** The corner an item is positioned by, its inline-start top, of a rect drawn on the screen. */
    toZoneOrigin(zoneId: string, clientRect: DOMRect): SpecPoint {
        const element = this.zones.get(zoneId);
        const inlineStart = element && isRtl(element) ? clientRect.right : clientRect.left;
        return this.toZonePoint(zoneId, {x: inlineStart, y: clientRect.top});
    }

    /**
     * Moves the top-left corner of an item being dragged, in viewport pixels,
     * so that the item sits on the zone's grid. Snaps the item's inline-start
     * edge, which is what its position is measured from.
     *
     * @param width The item's drawn width, in viewport pixels.
     */
    snapDraggedCorner(zoneId: string, topLeft: SpecPoint, width: number, step: number): SpecPoint {
        const element = this.zones.get(zoneId);
        if (!element) {
            return topLeft;
        }

        const box = element.getBoundingClientRect();
        const zoom = this.zoom.zoom();
        const rtl = isRtl(element);
        const inlineStart = rtl ? topLeft.x + width : topLeft.x;
        const fromInlineStart = snap((rtl ? box.right - inlineStart : inlineStart - box.left) / zoom, step) * zoom;
        return {
            x: rtl ? box.right - fromInlineStart - width : box.left + fromInlineStart,
            y: box.top + snap((topLeft.y - box.top) / zoom, step) * zoom
        };
    }

    /** A zone's size in page pixels. */
    zoneSize(zoneId: string): SpecSize {
        const element = this.zones.get(zoneId);
        return {width: element?.clientWidth ?? 0, height: element?.clientHeight ?? 0};
    }

    /** An item's drawn size in page pixels. Unlike its rect, this holds for sides that follow the content. */
    itemSize(itemId: string): SpecSize {
        const element = this.itemElement(itemId);
        return {width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0};
    }

    /** Where an item of `size` lands in a zone when put at `origin`: snapped to `step` and kept inside. */
    fitInZone(zoneId: string, origin: SpecPoint, size: SpecSize, step: number): SpecPoint {
        return placeInZone(origin, size, this.zoneSize(zoneId), step);
    }

    /** True when a zone is laid out right to left. Read from the element, since the page may differ from the builder. */
    isRtl(zoneId: string): boolean {
        const element = this.zones.get(zoneId);
        return element ? isRtl(element) : false;
    }
}

function isRtl(element: HTMLElement): boolean {
    return getComputedStyle(element).direction === 'rtl';
}
