import {booleanAttribute, ChangeDetectionStrategy, Component, input} from '@angular/core';
import {MatSortHeader, SortDirection, SortHeaderArrowPosition} from '@angular/material/sort';


@Component({
    selector: 'ims-grid-sort-header',
    standalone: true,
    imports: [MatSortHeader],
    template: `
        <div
            class="ims-grid-sort-header-trigger"
            [mat-sort-header]="field()"
            [arrowPosition]="arrowPosition()"
            [start]="start()"
            [disabled]="disabled()"
            [disableClear]="disableClear()"
            [sortActionDescription]="sortActionDescription()"
        >
            <ng-content />
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Convenience wrapper around Angular Material `MatSortHeader` for `ims-grid` headers.
 *
 * This keeps the grid API consistent while preserving Material's sort arrow,
 * animation, keyboard handling, and ARIA behavior.
 */
export class ImsGridSortHeader {
    /** Sort field id matched against `ImsGridSortDirective` data access. */
    readonly field = input.required<string>();
    /** Position of the Material sort arrow. */
    readonly arrowPosition = input<SortHeaderArrowPosition>('after');
    /** First direction used when this header becomes active. */
    readonly start = input<SortDirection>('asc');
    /** Disables sorting interaction for this header. */
    readonly disabled = input(false, {transform: booleanAttribute});
    /** Prevents the third click from clearing the sort direction. */
    readonly disableClear = input(false, {transform: booleanAttribute});
    /** Accessible description of the sort action delegated to Material. */
    readonly sortActionDescription = input('');
}
