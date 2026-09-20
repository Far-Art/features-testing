/** What a browser moves focus to when the user tabs to, or clicks, a field. */
const FOCUSABLE_SELECTOR = 'input, select, textarea, button, [tabindex]';

/** Marks the element of a composite field that owns its ARIA and its focus. */
const MAIN_CONTROL_SELECTOR = '[data-ims-main-control]';

/** Resolves the primary native focus target within a simple or composite host. */
export function findFocusable(root: HTMLElement): HTMLElement | null {
    if (root.matches(FOCUSABLE_SELECTOR)) return root;
    return root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
}

/**
 * The element a composite field marks as its main control, or the host itself
 * when it marks none. A field whose host wraps more than the control — a
 * datepicker's field holds an input and a calendar button — marks the part
 * that stands for the field.
 */
export function findMainControl(host: HTMLElement): HTMLElement {
    if (host.matches(MAIN_CONTROL_SELECTOR)) return host;
    return host.querySelector<HTMLElement>(MAIN_CONTROL_SELECTOR) ?? host;
}
