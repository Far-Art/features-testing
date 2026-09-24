/** Delay used to collapse rapid resize callbacks into one layout update. */
export const RESIZE_DEBOUNCE_MS = 200;
/** Minimum inline-size change treated as meaningful, filtering subpixel observer noise. */
export const RESIZE_INLINE_SIZE_TOLERANCE = 10;
/**
 * Host attribute that moves labels above their values.
 *
 * A standalone field sets it on itself. A grid or standalone row sets it on
 * its own host, so every field it lays out stacks together, and a grid also
 * sets it on each of those fields, since a field can reach the grid through an
 * element with `display: contents` that a child combinator cannot cross. The
 * styles live in `ims-form-field.scss`.
 */
export const STACKED_ATTRIBUTE = 'data-ims-stacked';
/**
 * Attribute a row or field sets on itself when an `ims-form-field-grid` lays
 * it out, so it adopts the grid's tracks through `subgrid`.
 *
 * The styles also match a direct child of the grid or of its row, but a row or
 * field can reach the grid through an element with `display: contents`, such
 * as the host of a component that only groups fields, and a child combinator
 * cannot cross that element.
 */
export const SUBGRID_ATTRIBUTE = 'data-ims-subgrid';

/**
 * Returns the element whose layout the given element takes part in: its
 * nearest ancestor that generates a box. An ancestor with `display: contents`
 * is passed over, as the layout itself passes over it.
 */
export function layoutParent(element: HTMLElement): HTMLElement | null {
    const view = element.ownerDocument.defaultView;
    let parent = element.parentElement;
    while (parent !== null && view?.getComputedStyle(parent).display === 'contents') {
        parent = parent.parentElement;
    }
    return parent;
}

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
