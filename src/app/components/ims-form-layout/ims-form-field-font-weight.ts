/**
 * Font weights a form field's label or value can take. Each names one of the
 * `--ims-font-weight-*` design tokens.
 */
export type ImsFormFieldFontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

/**
 * Returns the CSS value for a `labelFontWeight` or `valueFontWeight` input, or
 * `null` when the input is unset, so the host passes on the weight it
 * inherits.
 */
export function fontWeightToken(weight: ImsFormFieldFontWeight | null): string | null {
    return weight === null ? null : `var(--ims-font-weight-${weight})`;
}
