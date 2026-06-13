import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

@Component({
    selector: 'ims-form-field-row',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-form-field-row.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Full-width row wrapper for fields inside an `ims-form-field-grid`.
 *
 * The row spans every track of the parent group and adopts those tracks through
 * CSS `subgrid`. Use it when a set of fields must remain on one visual row even
 * when sibling fields are conditionally added or removed.
 *
 * Child `ims-form-field` instances can use their `column` input to target a
 * stable one-based logical form column within the row.
 */
export class ImsFormFieldRow {
}
