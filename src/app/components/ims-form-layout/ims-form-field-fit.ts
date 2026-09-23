/** Delay used to collapse rapid resize callbacks into one layout update. */
export const RESIZE_DEBOUNCE_MS = 200;
/** Minimum inline-size change treated as meaningful, filtering subpixel observer noise. */
export const RESIZE_INLINE_SIZE_TOLERANCE = 10;
/**
 * Host attribute that moves labels above their values.
 *
 * A standalone field sets it on itself. A grid or standalone row sets it on
 * its own host, so every field it lays out stacks together. The styles live
 * in `ims-form-field.scss`.
 */
export const STACKED_ATTRIBUTE = 'data-ims-stacked';

/**
 * Calls `onResize` once the element's inline size has changed meaningfully and
 * then stopped changing.
 *
 * Height changes are ignored, so stacking labels, which only makes a layout
 * taller, never restarts fitting. Returns a function that stops observing.
 * Where `ResizeObserver` does not exist, such as jsdom, nothing is observed.
 */
export function observeInlineSize(
    element: HTMLElement,
    onResize: (inlineSize: number) => void
): () => void {
    const view = element.ownerDocument.defaultView;
    if (!view?.ResizeObserver) {
        return () => {};
    }

    let lastObservedInlineSize: number | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new view.ResizeObserver(([entry]) => {
        const inlineSize = entry.contentRect.width;
        if (
            lastObservedInlineSize !== null &&
            Math.abs(inlineSize - lastObservedInlineSize) < RESIZE_INLINE_SIZE_TOLERANCE
        ) {
            return;
        }
        lastObservedInlineSize = inlineSize;

        if (debounceTimer !== null) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            onResize(inlineSize);
        }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(element);

    return () => {
        observer.disconnect();
        if (debounceTimer !== null) {
            clearTimeout(debounceTimer);
        }
    };
}

/** Reports whether content extends past the element's inline box. */
export function overflowsInline(element: HTMLElement): boolean {
    return element.scrollWidth > element.clientWidth + 1;
}
