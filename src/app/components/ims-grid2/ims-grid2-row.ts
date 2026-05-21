import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Signal,
    computed,
    contentChildren,
    effect,
    inject
} from '@angular/core';
import {ImsGrid2Cell} from './ims-grid2-cell';
import {IMS_GRID2_CONTEXT, ImsGrid2RowContext} from './ims-grid2.tokens';

@Component({
    selector: 'ims-grid2-row, ims-grid2-header',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGrid2Row implements ImsGrid2RowContext {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly grid = inject(IMS_GRID2_CONTEXT, {optional: true});
    private readonly cells = contentChildren(ImsGrid2Cell, {descendants: true});
    readonly isHeaderRow = this.hostElement.tagName === 'IMS-GRID2-HEADER';

    readonly cellCount: Signal<number> = computed(() => this.resolveMaxContainerCellCount(this.ownCells()));
    readonly headerCellCount: Signal<number> = computed(() =>
        this.isHeaderRow ? this.resolveMaxContainerCellCount(this.ownCells()) : 0
    );

    constructor() {
        this.grid?.registerRow(this);

        this.destroyRef.onDestroy(() => {
            this.grid?.unregisterRow(this);
        });

        effect(
            () => {
                this.assignColumnIndexes(this.ownCells());
            },
            {allowSignalWrites: true}
        );
    }

    getHostElement(): HTMLElement {
        return this.hostElement;
    }

    resolveColumnTrack(columnIndex: number): string | null {
        const cells = this.resolvePrimaryContainerCells(this.ownCells());
        return cells[columnIndex]?.columnTrackCss ?? null;
    }

    private ownCells(): readonly ImsGrid2Cell[] {
        return this.cells().filter((cell) => this.belongsToThisRow(cell));
    }

    private belongsToThisRow(cell: ImsGrid2Cell): boolean {
        const nearestRow = cell.getHostElement().closest('ims-grid2-row, ims-grid2-header');
        return nearestRow === this.hostElement;
    }

    private assignColumnIndexes(cells: readonly ImsGrid2Cell[]): void {
        const cellsByContainer = this.groupCellsByContainer(cells);
        for (const containerCells of cellsByContainer.values()) {
            containerCells.forEach((cell, index) => cell.setColumnIndex(index));
        }
    }

    private groupCellsByContainer(cells: readonly ImsGrid2Cell[]): Map<HTMLElement, ImsGrid2Cell[]> {
        const map = new Map<HTMLElement, ImsGrid2Cell[]>();
        for (const cell of cells) {
            const container = cell.parentElement ?? this.hostElement;
            const group = map.get(container);
            if (group) {
                group.push(cell);
            } else {
                map.set(container, [cell]);
            }
        }

        return map;
    }

    private resolveMaxContainerCellCount(cells: readonly ImsGrid2Cell[]): number {
        const grouped = this.groupCellsByContainer(cells);
        let max = 0;
        for (const group of grouped.values()) {
            if (group.length > max) {
                max = group.length;
            }
        }

        return max;
    }

    private resolvePrimaryContainerCells(cells: readonly ImsGrid2Cell[]): readonly ImsGrid2Cell[] {
        if (cells.length === 0) {
            return [];
        }

        const primaryContainer = cells[0].parentElement ?? this.hostElement;
        return cells.filter((cell) => (cell.parentElement ?? this.hostElement) === primaryContainer);
    }
}
