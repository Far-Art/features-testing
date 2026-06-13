import {ChangeDetectionStrategy, Component, input} from '@angular/core';

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
        '[attr.data-layout]': 'layout()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Groups multiple related controls inside the value column of one
 * `ims-form-field`.
 *
 * This is intended for compound values such as a from/to date range. Each
 * direct child should normally be a native `label` containing its local label
 * text and control. The surrounding `ims-form-field` still supplies the main
 * label for the complete value.
 *
 * The component only owns the inner layout and interaction styles. Accessible
 * group semantics remain the consumer's responsibility, usually through
 * `role="group"` and `aria-labelledby` referencing the main field label.
 */
export class ImsFormFieldGroup {
    /**
     * Arrangement of the projected local label/control pairs.
     *
     * `stacked` renders one pair per row with shared label and control tracks,
     * aligning every control after the widest local label. `inline` renders two
     * equal pair tracks side by side. In both modes, each pair's non-`span`
     * child fills its control track and may be a native element or component
     * host.
     *
     * @example
     * ```html
     * <ims-form-field-group layout="stacked">...</ims-form-field-group>
     * <ims-form-field-group layout="inline">...</ims-form-field-group>
     * ```
     */
    readonly layout = input<ImsFormControlGroupLayout>('inline');
}
