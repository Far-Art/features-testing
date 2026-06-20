/**
 * Computes a Dock-style magnified size for one icon.
 *
 * Uses a cosine falloff: the size peaks at `maxSize` when the pointer sits on the
 * icon's centre (`distance === 0`) and eases back to `baseSize` once the pointer is
 * `influenceRange` pixels away or further. This produces the smooth "wave" that
 * lifts the focused icon together with its neighbours.
 *
 * @param distance Absolute pixel distance between the pointer and the icon's resting centre.
 * @param influenceRange Pixel radius over which neighbours are affected.
 * @param baseSize Resting icon size in pixels.
 * @param maxSize Fully magnified icon size in pixels.
 */
export function magnifiedSize(
    distance: number,
    influenceRange: number,
    baseSize: number,
    maxSize: number
): number {
    if (influenceRange <= 0 || distance >= influenceRange) {
        return baseSize;
    }
    const factor = Math.cos((distance / influenceRange) * (Math.PI / 2));
    return baseSize + (maxSize - baseSize) * Math.max(0, factor);
}
