import {ChangeDetectionStrategy, Component, computed, Signal, signal, WritableSignal} from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {ImsInputDirective} from '../../ims-input.directive';
import {ImsTextTruncateDirective} from '../../shared/ims-text-truncate.directive';
import {ImsButton, ImsButtonDark, ImsButtonIcon, ImsButtonWhite} from '../ims-button';
import {ImsCheckbox} from '../ims-checkbox/ims-checkbox';
import {ImsAbstractDialog, ImsDialogActions, ImsDialogContent} from '../ims-dialog';
import {ImsScrollContainer} from '../ims-scroll-container/ims-scroll-container';
import {
    ImsTransferDialogData,
    ImsTransferDialogResult,
    ImsTransferList,
    ImsTransferResultRow,
    ImsTransferRow
} from './ims-transfer-dialog.types';

export type ImsTransferSortDirection = 'asc' | 'desc';

interface ImsTransferListState<T, ListId extends string> {
    readonly id: ListId;
    readonly title: string;
    readonly dropListId: string;
    readonly rows: WritableSignal<ImsTransferResultRow<T>[]>;
    readonly sort: WritableSignal<ImsTransferSortDirection | null>;
    readonly filteredRows: Signal<ImsTransferResultRow<T>[]>;
    connectedTo: string[];
}

let nextDialogInstanceId = 0;

@Component({
    selector: 'ims-transfer-dialog',
    standalone: true,
    imports: [
        CdkDropList,
        CdkDrag,
        ImsButton,
        ImsButtonDark,
        ImsButtonIcon,
        ImsButtonWhite,
        ImsCheckbox,
        ImsDialogActions,
        ImsDialogContent,
        ImsInputDirective,
        ImsScrollContainer,
        ImsTextTruncateDirective
    ],
    templateUrl: './ims-transfer-dialog.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-transfer-dialog'
    }
})
/**
 * Non-destructive editor for checking rows independently and moving them
 * between one or more named lists. The caller receives a normalized snapshot
 * only after confirmation; cancel and dismiss leave caller-owned data untouched.
 */
export class ImsTransferDialog<T, ListId extends string = string> extends ImsAbstractDialog<
    ImsTransferDialogData<T, ListId>,
    ImsTransferDialogResult<T, ListId>
> {
    private readonly data = this.dialogData;
    private readonly instanceId = nextDialogInstanceId++;
    private readonly initialLists = this.data.lists.map((list) => ({
        ...list,
        rows: list.rows.map((row) => this.normalizeRow(row))
    }));

    readonly filterQuery = signal('');
    readonly listStates = this.createListStates(this.initialLists);

    onFilterInput(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.filterQuery.set(target.value);
    }

    toggleChecked(
        list: ImsTransferListState<T, ListId>,
        row: ImsTransferResultRow<T>
    ): void {
        if (row.disabled) return;

        list.rows.update((rows) =>
            rows.map((candidate) =>
                candidate === row ? {...candidate, checked: !candidate.checked} : candidate
            )
        );
    }

    toggleSort(list: ImsTransferListState<T, ListId>): void {
        list.sort.update((direction) => this.nextSortDirection(direction));
    }

    /**
     * Reorders an unfiltered list or transfers a row between lists. A filtered
     * transfer is appended because rendered indices do not map to the full list.
     */
    drop(
        event: CdkDragDrop<ImsTransferResultRow<T>[]>,
        targetList: ImsTransferListState<T, ListId>
    ): void {
        const sourceList = this.listStates.find(
            (list) => list.dropListId === event.previousContainer.id
        );
        if (!sourceList) return;

        if (sourceList === targetList) {
            this.reorderList(targetList, event.previousIndex, event.currentIndex);
            return;
        }

        const movedRow = event.previousContainer.data[event.previousIndex];
        if (!movedRow || movedRow.disabled) return;

        const dropIndex = this.filterQuery().trim() ? undefined : event.currentIndex;
        sourceList.rows.update((rows) => rows.filter((candidate) => candidate !== movedRow));
        targetList.rows.update((rows) => {
            const next = dropIndex === undefined ? rows.slice() : this.sortedRows(rows, targetList.sort());
            next.splice(dropIndex ?? next.length, 0, movedRow);
            return next;
        });
        if (dropIndex !== undefined) targetList.sort.set(null);
    }

    reset(): void {
        this.listStates.forEach((list, index) => {
            list.rows.set(this.initialLists[index].rows.map((row) => ({...row})));
            list.sort.set(null);
        });
        this.filterQuery.set('');
    }

    confirm(): void {
        const entries = this.listStates.map((list) => {
            const rows = this.sortedRows(list.rows(), list.sort()).map((row) => ({...row}));
            return [list.id, rows] as const;
        });
        const checked = entries.flatMap(([, rows]) =>
            rows.filter((row) => row.checked).map((row) => row.value)
        );

        this.dialogRef.close({
            lists: Object.fromEntries(entries) as unknown as Readonly<
                Record<ListId, readonly ImsTransferResultRow<T>[]>
            >,
            checked
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }

    private createListStates(
        lists: readonly ImsTransferList<T, ListId>[]
    ): ImsTransferListState<T, ListId>[] {
        const states = lists.map((list, index) => {
            const rows = signal(list.rows.map((row) => this.normalizeRow(row)));
            const sort = signal<ImsTransferSortDirection | null>(null);
            const state: ImsTransferListState<T, ListId> = {
                id: list.id,
                title: list.title,
                dropListId: `ims-transfer-list-${this.instanceId}-${index}`,
                rows,
                sort,
                filteredRows: computed(() =>
                    this.filterRows(this.sortedRows(rows(), sort()))
                ),
                connectedTo: []
            };
            return state;
        });

        for (const state of states) {
            state.connectedTo = states
                .filter((candidate) => candidate !== state)
                .map((candidate) => candidate.dropListId);
        }

        return states;
    }

    private reorderList(
        list: ImsTransferListState<T, ListId>,
        previousIndex: number,
        currentIndex: number
    ): void {
        if (this.filterQuery().trim() || previousIndex === currentIndex) return;

        list.rows.update((rows) => {
            const next = this.sortedRows(rows, list.sort());
            moveItemInArray(next, previousIndex, currentIndex);
            return next;
        });
        list.sort.set(null);
    }

    private normalizeRow(row: ImsTransferRow<T>): ImsTransferResultRow<T> {
        return {
            id: row.id,
            label: row.label,
            value: row.value,
            checked: row.checked ?? false,
            disabled: row.disabled
        };
    }

    private sortedRows(
        rows: readonly ImsTransferResultRow<T>[],
        direction: ImsTransferSortDirection | null
    ): ImsTransferResultRow<T>[] {
        if (direction === null) return rows.slice();

        const sorted = rows
            .slice()
            .sort((first, second) => first.label.localeCompare(second.label, undefined, {numeric: true}));

        return direction === 'asc' ? sorted : sorted.reverse();
    }

    private nextSortDirection(
        direction: ImsTransferSortDirection | null
    ): ImsTransferSortDirection | null {
        if (direction === null) return 'asc';
        return direction === 'asc' ? 'desc' : null;
    }

    private filterRows(rows: readonly ImsTransferResultRow<T>[]): ImsTransferResultRow<T>[] {
        const query = this.filterQuery().trim().replace(/\s+/g, ' ').toLocaleLowerCase();
        if (!query) return rows.slice();

        const terms = query.split(' ');
        return rows.filter((row) => {
            const label = row.label.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
            return terms.every((term) => label.includes(term));
        });
    }
}
