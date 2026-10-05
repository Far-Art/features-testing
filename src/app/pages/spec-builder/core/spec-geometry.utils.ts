import {SpecPoint, SpecRect, SpecSize} from './spec-builder.types';

/** Smallest width or height, in CSS pixels, an item can be resized to. */
export const SPEC_MIN_ITEM_SIZE = 8;

/** Which edge of an item a resize handle drags. The corner drags both. */
export type SpecResizeEdge = 'inline-end' | 'block-end' | 'corner';

/** Rounds to the nearest multiple of `step`, or to a whole pixel when `step` is 1 or less. */
export function snap(value: number, step: number): number {
    return step > 1 ? Math.round(value / step) * step : Math.round(value);
}

/** `value` kept between `min` and `max`. When the range is empty, `min` wins. */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

/**
 * Where an item of `size` lands when its corner is put at `origin`: snapped to
 * the grid, and moved back inside the zone so it can never get lost outside it.
 */
export function placeInZone(origin: SpecPoint, size: SpecSize, zone: SpecSize, step: number): SpecPoint {
    return {
        x: clamp(snap(origin.x, step), 0, zone.width - size.width),
        y: clamp(snap(origin.y, step), 0, zone.height - size.height)
    };
}

/**
 * The rect an item gets when the edge a handle drags is moved to `point`.
 *
 * The edge itself is snapped rather than the size, so a resized item ends on
 * a grid line whatever its start was. It never shrinks below
 * {@link SPEC_MIN_ITEM_SIZE} nor grows out of the zone.
 */
export function resizeToPoint(rect: SpecRect, edge: SpecResizeEdge, point: SpecPoint, zone: SpecSize, step: number): SpecRect {
    const dragsInlineEnd = edge === 'inline-end' || edge === 'corner';
    const dragsBlockEnd = edge === 'block-end' || edge === 'corner';

    return {
        ...rect,
        width: dragsInlineEnd ? clamp(snap(point.x, step) - rect.x, SPEC_MIN_ITEM_SIZE, zone.width - rect.x) : rect.width,
        height: dragsBlockEnd ? clamp(snap(point.y, step) - rect.y, SPEC_MIN_ITEM_SIZE, zone.height - rect.y) : rect.height
    };
}

/** True when both rects have the same position and size. */
export function sameRect(first: SpecRect, second: SpecRect): boolean {
    return first.x === second.x && first.y === second.y && first.width === second.width && first.height === second.height;
}

/** True when `point` lies inside `rect`. Both are in the same coordinates, such as the viewport's. */
export function containsPoint(rect: DOMRect, point: SpecPoint): boolean {
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}
