import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {ImsTransferDialogData, ImsTransferDialogResult, ImsTransferRow} from './ims-transfer-dialog.types';

export type ImsTransferSortDirection = 'asc' | 'desc';

let nextDialogInstanceId = 0;

@Component({
    selector: 'ims-transfer-dialog',
    standalone: true,
    imports: [CdkDropList, CdkDrag],
    templateUrl: './ims-transfer-dialog.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-transfer-dialog'
    }
})
/**
 * Non-destructive dual-list editor for moving opaque rows between two named
 * columns ("start"/"end").
 *
 * Rows can be moved between columns by dragging, toggling the row checkbox,
 * or double-clicking a row's label, and can be reordered within a column by
 * dragging (while unfiltered). Rows can be narrowed down with the filter
 * field. Nothing is reported back to the
 * caller until `confirm()` closes the dialog with both columns' final
 * contents; cancelling or dismissing the dialog closes it with `undefined`
 * and discards all changes.
 *
 * The dialog has no notion of "selection", value equality, or ownership — it
 * only ever moves rows between two arrays and returns their final contents.
 * This is what lets the same component serve both "edit one control's
 * selection" (caller only consumes one side of the result) and "transfer
 * items between two independent sources" (caller consumes and re-applies
 * both sides) equally well.
 */
export class ImsTransferDialog<T> {
    private readonly dialogRef = inject(DialogRef<ImsTransferDialogResult<T>, ImsTransferDialog<T>>);
    private readonly data = inject<ImsTransferDialogData<T>>(DIALOG_DATA);

    private readonly instanceId = nextDialogInstanceId++;
    readonly startListId = `ims-transfer-start-${this.instanceId}`;
    readonly endListId = `ims-transfer-end-${this.instanceId}`;

    readonly dialogTitle = this.data.dialogTitle ?? null;
    readonly startTitle = this.data.start.title;
    readonly endTitle = this.data.end.title;

    readonly startRows = signal(this.data.start.rows.slice());
    readonly endRows = signal(this.data.end.rows.slice());
    readonly filterQuery = signal('');
    readonly startSort = signal<ImsTransferSortDirection | null>(null);
    readonly endSort = signal<ImsTransferSortDirection | null>(null);

    readonly filteredStartRows = computed(() => this.filterRows(this.startRows()));
    readonly filteredEndRows = computed(() => this.filterRows(this.endRows()));

    onFilterInput(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.filterQuery.set(target.value);
    }

    /** `index` inserts the row at that position in the target column; omitted, it's appended. */
    moveToEnd(row: ImsTransferRow<T>, index?: number): void {
        if (row.disabled || this.endRows().includes(row)) return;

        this.startRows.update((rows) => rows.filter((candidate) => candidate !== row));
        this.endRows.update((rows) => {
            const next = rows.slice();
            next.splice(index ?? next.length, 0, row);
            return next;
        });
        if (index !== undefined) this.endSort.set(null);
    }

    /** `index` inserts the row at that position in the target column; omitted, it's appended. */
    moveToStart(row: ImsTransferRow<T>, index?: number): void {
        if (row.disabled || this.startRows().includes(row)) return;

        this.endRows.update((rows) => rows.filter((candidate) => candidate !== row));
        this.startRows.update((rows) => {
            const next = rows.slice();
            next.splice(index ?? next.length, 0, row);
            return next;
        });
        if (index !== undefined) this.startSort.set(null);
    }

    /** Sorts the start column by label, toggling between ascending and descending on repeated clicks. */
    toggleStartSort(): void {
        const direction: ImsTransferSortDirection = this.startSort() === 'asc' ? 'desc' : 'asc';
        this.startSort.set(direction);
        this.startRows.update((rows) => this.sortRows(rows, direction));
    }

    /** Sorts the end column by label, toggling between ascending and descending on repeated clicks. */
    toggleEndSort(): void {
        const direction: ImsTransferSortDirection = this.endSort() === 'asc' ? 'desc' : 'asc';
        this.endSort.set(direction);
        this.endRows.update((rows) => this.sortRows(rows, direction));
    }

    /** Moves every non-disabled row currently visible (respecting the filter) from start to end. */
    moveAllVisibleToEnd(): void {
        const rows = this.filteredStartRows().filter((row) => !row.disabled);
        if (rows.length === 0) return;

        this.startRows.update((current) => current.filter((row) => !rows.includes(row)));
        this.endRows.update((current) => [...current, ...rows]);
    }

    /** Moves every non-disabled row currently visible (respecting the filter) from end to start. */
    moveAllVisibleToStart(): void {
        const rows = this.filteredEndRows().filter((row) => !row.disabled);
        if (rows.length === 0) return;

        this.endRows.update((current) => current.filter((row) => !rows.includes(row)));
        this.startRows.update((current) => [...current, ...rows]);
    }

    /**
     * A drop within the same column reorders it (disabled while filtered, since
     * filtered indices don't map onto the column's full row order). A drop onto
     * the other column moves the row across, inserted at the dropped position
     * (also only while unfiltered, for the same reason).
     */
    drop(event: CdkDragDrop<ImsTransferRow<T>[]>): void {
        if (event.previousContainer === event.container) {
            this.reorderColumn(event.container.id, event.previousIndex, event.currentIndex);
            return;
        }

        const movedRow = event.previousContainer.data[event.previousIndex];
        const dropIndex = this.filterQuery().trim() ? undefined : event.currentIndex;

        if (event.container.id === this.endListId) {
            this.moveToEnd(movedRow, dropIndex);
        } else {
            this.moveToStart(movedRow, dropIndex);
        }
    }

    /** Restores both columns and the filter to the state the dialog was opened with, without closing. */
    reset(): void {
        this.startRows.set(this.data.start.rows.slice());
        this.endRows.set(this.data.end.rows.slice());
        this.filterQuery.set('');
        this.startSort.set(null);
        this.endSort.set(null);
    }

    confirm(): void {
        this.dialogRef.close({
            start: this.startRows().map((row) => row.value),
            end: this.endRows().map((row) => row.value)
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }

    private reorderColumn(containerId: string, previousIndex: number, currentIndex: number): void {
        if (this.filterQuery().trim() || previousIndex === currentIndex) return;

        const isEndColumn = containerId === this.endListId;
        const rowsSignal = isEndColumn ? this.endRows : this.startRows;
        rowsSignal.update((rows) => {
            const next = rows.slice();
            moveItemInArray(next, previousIndex, currentIndex);
            return next;
        });
        (isEndColumn ? this.endSort : this.startSort).set(null);
    }

    private sortRows(
        rows: readonly ImsTransferRow<T>[],
        direction: ImsTransferSortDirection
    ): ImsTransferRow<T>[] {
        const sorted = rows
            .slice()
            .sort((first, second) => first.label.localeCompare(second.label, undefined, {numeric: true}));

        return direction === 'asc' ? sorted : sorted.reverse();
    }

    private filterRows(rows: readonly ImsTransferRow<T>[]): ImsTransferRow<T>[] {
        const query = this.filterQuery().trim().replace(/\s+/g, ' ').toLocaleLowerCase();
        if (!query) return rows.slice();

        const terms = query.split(' ');
        return rows.filter((row) => {
            const label = row.label.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
            return terms.every((term) => label.includes(term));
        });
    }
}
