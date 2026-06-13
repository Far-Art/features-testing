import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
    selector: 'ims-form-field-row',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {'[style.visibility]': '!visible() ? "hidden" : null'}
})
/**
 * Full-width row wrapper for fields inside an `ims-form-field-grid`.
 *
 * The row spans every field track of the parent grid and adopts those tracks
 * through CSS `subgrid`. Use it when a set of fields must remain on one visual
 * row even when sibling fields are conditionally added or removed.
 *
 * Child `ims-form-field` instances can use their `column` input to target a
 * stable one-based logical form column within the row.
 */
export class ImsFormFieldRow {
    /**
     * Controls whether the row is visible while preserving its grid space.
     *
     * @example
     * ```html
     * <ims-form-field-row [visible]="showContactFields">...</ims-form-field-row>
     * <ims-form-field-row [visible]="false">...</ims-form-field-row>
     * ```
     */
    visible = input<boolean>(true);
}
