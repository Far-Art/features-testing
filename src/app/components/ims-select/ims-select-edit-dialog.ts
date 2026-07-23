import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';

export interface ImsSelectEditRow<T> {
    readonly id: string;
    readonly label: string;
    readonly value: T;
}

export interface ImsSelectEditDialogData<T> {
    readonly checked: readonly ImsSelectEditRow<T>[];
    readonly unchecked: readonly ImsSelectEditRow<T>[];
}

/** Values of the rows left in the checked column when the dialog is confirmed. */
export type ImsSelectEditDialogResult<T> = readonly T[];

let nextDialogInstanceId = 0;

@Component({
    selector: 'ims-select-edit-dialog',
    standalone: true,
    imports: [CdkDropList, CdkDrag, CdkDragHandle],
    templateUrl: './ims-select-edit-dialog.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-select-edit-dialog'
    }
})
/**
 * Non-destructive dual-list editor for a multi-select's checked/unchecked options.
 *
 * Rows can be moved between the checked and unchecked columns (but not reordered
 * within a column) by dragging or by toggling the row checkbox, and can be narrowed
 * down with the filter field. Nothing is reported back to the caller until
 * `confirm()` closes the dialog with the final checked values; cancelling or
 * dismissing the dialog closes it with `undefined` and discards all changes.
 */
export class ImsSelectEditDialog<T> {
    private readonly dialogRef = inject(DialogRef<ImsSelectEditDialogResult<T>, ImsSelectEditDialog<T>>);
    private readonly data = inject<ImsSelectEditDialogData<T>>(DIALOG_DATA);

    private readonly instanceId = nextDialogInstanceId++;
    readonly checkedListId = `ims-select-edit-checked-${this.instanceId}`;
    readonly uncheckedListId = `ims-select-edit-unchecked-${this.instanceId}`;

    readonly checkedRows = signal(this.data.checked.slice());
    readonly uncheckedRows = signal(this.data.unchecked.slice());
    readonly filterQuery = signal('');

    readonly filteredCheckedRows = computed(() => this.filterRows(this.checkedRows()));
    readonly filteredUncheckedRows = computed(() => this.filterRows(this.uncheckedRows()));

    onFilterInput(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.filterQuery.set(target.value);
    }

    moveToChecked(row: ImsSelectEditRow<T>): void {
        this.uncheckedRows.update((rows) => rows.filter((candidate) => candidate !== row));
        this.checkedRows.update((rows) => [...rows, row]);
    }

    moveToUnchecked(row: ImsSelectEditRow<T>): void {
        this.checkedRows.update((rows) => rows.filter((candidate) => candidate !== row));
        this.uncheckedRows.update((rows) => [...rows, row]);
    }

    /** Checks every row currently visible in the unchecked column (respects the active filter). */
    checkAllVisible(): void {
        const rows = this.filteredUncheckedRows();
        if (rows.length === 0) return;

        this.uncheckedRows.update((current) => current.filter((row) => !rows.includes(row)));
        this.checkedRows.update((current) => [...current, ...rows]);
    }

    /** Unchecks every row currently visible in the checked column (respects the active filter). */
    uncheckAllVisible(): void {
        const rows = this.filteredCheckedRows();
        if (rows.length === 0) return;

        this.checkedRows.update((current) => current.filter((row) => !rows.includes(row)));
        this.uncheckedRows.update((current) => [...current, ...rows]);
    }

    /** Reordering within a column is disabled (`cdkDropListSortingDisabled`), so a drop only ever means "move to the other column". */
    drop(event: CdkDragDrop<ImsSelectEditRow<T>[]>): void {
        if (event.previousContainer === event.container) return;

        const movedRow = event.previousContainer.data[event.previousIndex];
        if (event.container.id === this.checkedListId) {
            this.moveToChecked(movedRow);
        } else {
            this.moveToUnchecked(movedRow);
        }
    }

    confirm(): void {
        this.dialogRef.close(this.checkedRows().map((row) => row.value));
    }

    cancel(): void {
        this.dialogRef.close();
    }

    private filterRows(rows: readonly ImsSelectEditRow<T>[]): ImsSelectEditRow<T>[] {
        const query = this.filterQuery().trim().replace(/\s+/g, ' ').toLocaleLowerCase();
        if (!query) return rows.slice();

        const terms = query.split(' ');
        return rows.filter((row) => {
            const label = row.label.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
            return terms.every((term) => label.includes(term));
        });
    }
}
