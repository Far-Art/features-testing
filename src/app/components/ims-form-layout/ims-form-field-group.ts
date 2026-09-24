import {ChangeDetectionStrategy, Component, booleanAttribute, input} from '@angular/core';

/**
 * Supported arrangements for the label/control pairs projected into an
 * `ims-form-field-group`.
 */
export type ImsFormControlGroupLayout = 'stacked' | 'inline';

@Component({
    selector: 'ims-form-field-group',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[attr.data-layout]': 'layout()',
        '[attr.data-fill]': 'fill() ? "" : null',
        '[attr.data-wide]': 'wide() ? "" : null'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Groups multiple related controls inside the value column of one
 * `ims-form-field`, or across the whole field with `wide`.
 *
 * This is intended for compound values such as a from/to date range. Each
 * direct child should normally be a native `label` containing its local label
 * text and control. A control that carries its own label, such as an
 * `ims-checkbox` with projected text, can be a direct child instead, and is
 * placed like a pair's control. The surrounding `ims-form-field` still
 * supplies the main label for the complete value.
 *
 * The component only owns the inner layout and interaction styles. The inline
 * layout's columns and width, packed or with `fill`, are held at the
 * specificity of the element name, so a class on the group can replace them.
 * Accessible group semantics remain the consumer's responsibility, usually
 * through `role="group"` and `aria-labelledby` referencing the main field
 * label.
 */
export class ImsFormFieldGroup {
    /**
     * Arrangement of the projected local label/control pairs.
     *
     * `stacked` renders one pair per row with shared label and control tracks,
     * aligning every control after the widest local label. `inline` places the
     * pairs side by side, two to a row, each at its natural width and packed
     * at the start, in a group only as wide as they are, unless `fill` is set.
     * In both modes, each pair's non-`span` child fills its control track and
     * may be a native element or component host.
     *
     * @example
     * ```html
     * <ims-form-field-group layout="stacked">...</ims-form-field-group>
     * <ims-form-field-group layout="inline">...</ims-form-field-group>
     * ```
     */
    readonly layout = input<ImsFormControlGroupLayout>('inline');
    /**
     * Spreads the pairs of an inline group across the value, an even share
     * each.
     *
     * Without it, the pairs keep their natural widths, packed at the start. A
     * pair never gets less than its natural width: when an even share is too
     * small for one, it keeps that width and the other pair takes the rest.
     * A control with a width of its own, such as `ims-datepicker` or one with
     * a `field-*` class, keeps it inside its wider pair. A stacked group
     * always spans the value, so `fill` has no effect there.
     *
     * @example
     * ```html
     * <ims-form-field-group fill>...</ims-form-field-group>
     * <ims-form-field-group [fill]="spreadPairs">...</ims-form-field-group>
     * ```
     */
    readonly fill = input<boolean, boolean | string | null | undefined>(false, {
        transform: booleanAttribute
    });
    /**
     * Places the group across the whole field: the label column as well as
     * the value column.
     *
     * An inline group then starts where the field's labels start. A stacked
     * group puts each pair's text in the label column and its control in the
     * value column, so its pairs line up with the fields around them as if
     * they were fields of their own, and like theirs, the texts move above the
     * controls when the field stacks its label. A control with its own label,
     * such as an `ims-checkbox` with projected text, spans the whole field
     * instead, from where the labels start. A main label moves to its own
     * line above the group. Applies to a group placed directly in an
     * `ims-form-field`; the field's `labelSpan` and `valueSpan` do not divide
     * it.
     *
     * @example
     * ```html
     * <ims-form-field-group wide>...</ims-form-field-group>
     * <ims-form-field-group [wide]="useWholeField">...</ims-form-field-group>
     * ```
     */
    readonly wide = input<boolean, boolean | string | null | undefined>(false, {
        transform: booleanAttribute
    });
}
