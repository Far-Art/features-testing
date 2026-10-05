import {SpecChoiceOption, SpecProps, SpecResizeMode} from '../core/spec-builder.types';

// Choices several blocks share, so a severity or a field width reads the same
// in every inspector.

export const SEVERITY_OPTIONS: readonly SpecChoiceOption[] = [
    {value: 'info', label: 'מידע'},
    {value: 'success', label: 'הצלחה'},
    {value: 'warning', label: 'אזהרה'},
    {value: 'danger', label: 'סכנה'}
];

/** A `width` property value: the item is as wide as it is dragged to, and the control fills it. */
export const FREE_WIDTH = 'free';

/** A `width` property value: the control is as wide as its content. */
export const CONTENT_WIDTH = 'content';

/** Width of a field: free, or one of the design system's `field-*` size classes. */
export const FIELD_WIDTH_OPTIONS: readonly SpecChoiceOption[] = [
    {value: FREE_WIDTH, label: 'חופשי, לפי גודל הפריט'},
    {value: 'field-xs', label: 'קטן מאוד'},
    {value: 'field-s', label: 'קטן'},
    {value: 'field-m', label: 'בינוני'},
    {value: 'field-l', label: 'גדול'},
    {value: 'field-xl', label: 'גדול מאוד'},
    {value: 'field-xxl', label: 'ענק'}
];

/** Width of a control that is as wide as its content unless it is given a width. */
export const CONTENT_WIDTH_OPTIONS: readonly SpecChoiceOption[] = [
    {value: CONTENT_WIDTH, label: 'לפי התוכן'},
    {value: FREE_WIDTH, label: 'חופשי, לפי גודל הפריט'}
];

/** Width of a control that is as wide as its content unless given a width: free, or one of the `field-*` sizes. */
export const SIZED_CONTENT_WIDTH_OPTIONS: readonly SpecChoiceOption[] = [
    ...CONTENT_WIDTH_OPTIONS,
    ...FIELD_WIDTH_OPTIONS.filter((option) => option.value !== FREE_WIDTH)
];

/**
 * The resize mode of a block with a `width` property: its width can be
 * dragged while the width is free, and follows the control otherwise.
 */
export function widthResize(props: SpecProps): SpecResizeMode {
    return props['width'] === FREE_WIDTH ? 'width' : 'none';
}

/** The size class a field takes for a `width` value. A free width stretches the field over what it is given. */
export function fieldClass(width: unknown): string {
    return width === FREE_WIDTH ? 'field-stretch' : String(width);
}

/** The size class a control as wide as its content takes for a `width` value: none while it follows its content. */
export function contentWidthClass(width: unknown): string {
    return width === CONTENT_WIDTH ? '' : fieldClass(width);
}

/** The weights `--ims-font-weight-*` defines. */
export const FONT_WEIGHT_OPTIONS: readonly SpecChoiceOption[] = [
    {value: 'regular', label: 'רגיל'},
    {value: 'medium', label: 'בינוני'},
    {value: 'semibold', label: 'חצי מודגש'},
    {value: 'bold', label: 'מודגש'},
    {value: 'extrabold', label: 'מודגש מאוד'}
];

/** A token name as a CSS value, or `fallback` when no token is chosen. */
export function tokenColor(name: string, fallback = 'transparent'): string {
    return name ? `var(${name})` : fallback;
}

/** The cells of one line of a grid or table, separated by commas. */
export function splitCells(line: string): string[] {
    return line.split(',').map((cell) => cell.trim());
}
