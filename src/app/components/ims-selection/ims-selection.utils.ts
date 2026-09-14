import {
    IMS_SELECTION_EMPTY_DISPLAY,
    ImsSelectionCompareWith,
    ImsSelectionDisplayState,
    ImsSelectionOverlaySide,
    ImsSelectionToolbarSide,
    ImsSelectionViewMode
} from './ims-selection.types';

/** Space kept between a panel and the viewport edge when sizing or placing it. */
const VIEWPORT_MARGIN = 12;
/** Width assumed for the toolbar before it has rendered once. */
const TOOLBAR_FALLBACK_WIDTH = 40;
/** Gap between the options panel and the toolbar beside it. */
const TOOLBAR_GAP = 8;
/** Flex gap between the items of a selection trigger. */
const TRIGGER_ITEM_GAP = 8;

/** Height reserved for a filter field that has not rendered yet. */
export const SELECTION_FILTER_FALLBACK_HEIGHT = 56;

/** Smallest and largest height a listbox may be given. */
export interface ImsSelectionListboxBounds {
    readonly min: number;
    readonly max: number;
}

/** Trims, collapses whitespace and lowercases text for search matching. */
export function normalizeSearchText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** True when every space-separated term of an already normalized query occurs in the text. */
export function matchesSearchQuery(text: string, normalizedQuery: string): boolean {
    const normalizedText = normalizeSearchText(text);
    return normalizedQuery.split(' ').every((term) => normalizedText.includes(term));
}

/** Narrows options to a view mode without touching the selection. */
export function optionsForViewMode<O>(
    options: readonly O[],
    mode: ImsSelectionViewMode,
    isSelected: (option: O) => boolean
): readonly O[] {
    if (mode === 'selected') {
        return options.filter((option) => isSelected(option));
    }

    if (mode === 'unselected') {
        return options.filter((option) => !isSelected(option));
    }

    return options;
}

/** Number of options each view mode would list. */
export function countViewModes<O>(
    options: readonly O[],
    isSelected: (option: O) => boolean
): Record<ImsSelectionViewMode, number> {
    let selected = 0;

    for (const option of options) {
        if (isSelected(option)) selected++;
    }

    return {
        all: options.length,
        selected,
        unselected: options.length - selected
    };
}

/** Adds a value to a multi selection, or removes it when it is already there. */
export function toggleSelectedValue<T>(
    selectedValues: readonly T[],
    value: T,
    equals: ImsSelectionCompareWith<T>
): T[] {
    const exists = selectedValues.some((selectedValue) => equals(selectedValue, value));

    return exists
        ? selectedValues.filter((selectedValue) => !equals(selectedValue, value))
        : [...selectedValues, value];
}

/**
 * Merges an edit-dialog result into a multi selection. Values the dialog
 * listed are replaced by the ones it returned checked; values it never listed,
 * such as disabled or filtered-out options, pass through untouched.
 */
export function mergeEditDialogResult<T>(
    selectedValues: readonly T[],
    listedValues: readonly T[],
    checkedValues: readonly T[],
    equals: ImsSelectionCompareWith<T>
): T[] {
    const retainedValues = selectedValues.filter(
        (selectedValue) => !listedValues.some((listedValue) => equals(selectedValue, listedValue))
    );

    return [...retainedValues, ...checkedValues];
}

/**
 * Picks the side of the panel with room for the toolbar, or the roomier side
 * when neither has enough.
 */
export function resolveToolbarSide(
    panelRect: DOMRect,
    toolbarWidth: number | undefined
): ImsSelectionToolbarSide {
    const viewportWidth = document.documentElement.clientWidth;
    const requiredSpace = (toolbarWidth ?? TOOLBAR_FALLBACK_WIDTH) + TOOLBAR_GAP;
    const spaceRight = viewportWidth - panelRect.right - VIEWPORT_MARGIN;
    const spaceLeft = panelRect.left - VIEWPORT_MARGIN;

    if (spaceRight >= requiredSpace) return 'right';
    if (spaceLeft >= requiredSpace) return 'left';
    return spaceRight >= spaceLeft ? 'right' : 'left';
}

/**
 * Largest listbox height that fits the viewport on the side the panel opened
 * on. Before the overlay reports a side, below is preferred whenever it can
 * hold the minimum height.
 */
export function resolveListboxMaxHeight(
    originRect: DOMRect,
    reservedHeight: number,
    preferredSide: ImsSelectionOverlaySide | undefined,
    bounds: ImsSelectionListboxBounds
): number {
    const viewportHeight = window.visualViewport?.height ?? document.documentElement.clientHeight;
    const roomBelow = viewportHeight - originRect.bottom - VIEWPORT_MARGIN - reservedHeight;
    const roomAbove = originRect.top - VIEWPORT_MARGIN - reservedHeight;
    const preferredRoom = preferredSide === 'above'
        ? roomAbove
        : preferredSide === 'below'
            ? roomBelow
            : roomBelow >= bounds.min
                ? roomBelow
                : roomAbove;

    return Math.min(bounds.max, Math.max(bounds.min, Math.floor(preferredRoom)));
}

/**
 * Width the value row of a trigger may fill, counting the space an overflow
 * badge already rendered beside it occupies, since the next layout may not
 * need that badge.
 */
export function resolveAvailableValueWidth(
    valueRow: HTMLElement | undefined,
    badgeSelector: string
): number {
    if (!valueRow) return 0;

    const renderedBadge = valueRow.parentElement?.querySelector<HTMLElement>(
        `:scope > ${badgeSelector}`
    );

    return valueRow.clientWidth + (
        renderedBadge
            ? renderedBadge.getBoundingClientRect().width + TRIGGER_ITEM_GAP
            : 0
    );
}

/** Rendered width of text placed in a hidden measuring element. */
export function measureTextWidth(element: HTMLElement | undefined, text: string): number {
    if (!element) return 0;

    element.textContent = text;
    return element.getBoundingClientRect().width;
}

/**
 * Lists as many selected labels as fit the available width and counts the rest
 * in a badge. When not even one label fits beside the badge, the first label is
 * shown truncated.
 */
export function resolveMultiDisplay(
    labels: readonly string[],
    availableWidth: number,
    measureText: (text: string) => number,
    measureBadge: (count: number) => number
): ImsSelectionDisplayState {
    if (labels.length === 0) return IMS_SELECTION_EMPTY_DISPLAY;

    if (labels.length === 1) {
        return {
            text: labels[0],
            overflowCount: 0,
            firstTruncated: false
        };
    }

    const truncatedFirst: ImsSelectionDisplayState = {
        text: labels[0],
        overflowCount: labels.length - 1,
        firstTruncated: true
    };

    if (availableWidth <= 0) return truncatedFirst;

    for (let visibleCount = labels.length; visibleCount >= 1; visibleCount--) {
        const overflowCount = labels.length - visibleCount;
        const text = overflowCount > 0
            ? `${labels.slice(0, visibleCount).join(', ')}, ...`
            : labels.join(', ');
        const badgeWidth = overflowCount > 0
            ? measureBadge(overflowCount) + TRIGGER_ITEM_GAP
            : 0;

        if (measureText(text) + badgeWidth <= availableWidth) {
            return {
                text,
                overflowCount,
                firstTruncated: false
            };
        }
    }

    return truncatedFirst;
}

/** Replaces `{name}` placeholders in a label template. Unknown names are left as written. */
export function formatSelectionLabel(
    template: string,
    values: Readonly<Record<string, string | number>>
): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        name in values ? String(values[name]) : placeholder
    );
}
