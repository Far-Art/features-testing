import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output
} from '@angular/core';
import {ImsButtonIcon} from '../../components/ims-button';
import {ImsIcon} from '../../components/ims-icon';
import {
    ImsSelectionEditDialogMode,
    ImsSelectionLabels,
    ImsSelectionViewMode
} from './ims-selection.types';

interface ImsSelectionToolbarSegment {
    readonly mode: ImsSelectionViewMode;
    readonly icon: string;
    readonly label: string;
}

/**
 * Actions beside a multi-selection options panel: an optional edit action and
 * three view-mode segments that narrow the listed options without touching the
 * selection itself.
 *
 * Presentational only. The owning select or autocomplete decides whether it
 * renders, which actions are disabled and what an edit request does, and places
 * this element beside its panel.
 */
@Component({
    selector: 'ims-selection-toolbar',
    standalone: true,
    imports: [ImsButtonIcon, ImsIcon],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (editMode() !== 'off') {
            <button
                ims-button-icon
                type="button"
                class="ims-selection-toolbar__action"
                [attr.aria-label]="editAriaLabel() ?? labels().editSelection"
                [disabled]="editDisabled()"
                (click)="editRequested.emit()"
            >
                <ims-icon>edit_square</ims-icon>
            </button>
        }

        <div class="ims-selection-toolbar__segments" role="group" [attr.aria-label]="labels().viewModes">
            @for (segment of segments(); track segment.mode) {
                <button
                    ims-button-icon
                    type="button"
                    class="ims-selection-toolbar__action ims-selection-toolbar__segment"
                    [class.ims-selection-toolbar__segment--active]="viewMode() === segment.mode"
                    [attr.aria-label]="segment.label"
                    [attr.aria-pressed]="viewMode() === segment.mode"
                    [disabled]="viewModeCounts()[segment.mode] === 0"
                    (click)="viewModeChange.emit(segment.mode)"
                >
                    <ims-icon>{{ segment.icon }}</ims-icon>
                </button>
            }
        </div>
    `,
    host: {
        class: 'ims-selection-toolbar',
        role: 'group',
        '[attr.aria-label]': 'labels().toolbar'
    }
})
export class ImsSelectionToolbar {
    /** Resolved texts of the owning component. */
    readonly labels = input.required<ImsSelectionLabels>();

    /** The view mode currently narrowing the options. */
    readonly viewMode = input.required<ImsSelectionViewMode>();

    /** Options each view mode would list; a mode with none is disabled. */
    readonly viewModeCounts = input.required<Readonly<Record<ImsSelectionViewMode, number>>>();

    /** Hides the edit action when `off`; any other mode only changes what the owner does with a request. */
    readonly editMode = input<ImsSelectionEditDialogMode>('default');

    /** Disables the edit action. */
    readonly editDisabled = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});

    /** Accessible name of the edit action. Falls back to `labels().editSelection`. */
    readonly editAriaLabel = input<string | null>(null);

    /** Emits the view mode a segment asks for. */
    readonly viewModeChange = output<ImsSelectionViewMode>();

    /** Emits when the edit action is activated. */
    readonly editRequested = output<void>();

    protected readonly segments = computed<readonly ImsSelectionToolbarSegment[]>(() => {
        const labels = this.labels();

        // One checkbox family, so the segments read as a set: checked and empty
        // boxes for the two halves, and the mixed box for both together. The edit
        // action's `edit_square` shares the same frame.
        return [
            {mode: 'all', icon: 'indeterminate_check_box', label: labels.showAll},
            {mode: 'selected', icon: 'check_box', label: labels.showSelected},
            {mode: 'unselected', icon: 'check_box_outline_blank', label: labels.showUnselected}
        ];
    });
}
