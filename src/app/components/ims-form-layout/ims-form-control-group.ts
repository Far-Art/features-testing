import {ChangeDetectionStrategy, Component, input, ViewEncapsulation} from '@angular/core';

/**
 * Supported arrangements for the label/control pairs projected into an
 * `ims-form-control-group`.
 */
export type ImsFormControlGroupLayout = 'stacked' | 'inline';

@Component({
    selector: 'ims-form-control-group',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-form-control-group.scss',
    host: {
        '[attr.layout]': 'layout()'
    },
    encapsulation: ViewEncapsulation.None,
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
export class ImsFormControlGroup {
    /**
     * Arrangement of the projected local label/control pairs.
     *
     * `stacked` renders one pair per row. `inline` renders two equal tracks and
     * lets their controls fill the available width.
     */
    readonly layout = input<ImsFormControlGroupLayout>('stacked');
}
