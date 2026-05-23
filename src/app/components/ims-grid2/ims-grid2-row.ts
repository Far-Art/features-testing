import {ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, effect, ElementRef, inject, input, Signal} from '@angular/core';
import {ImsGrid2Cell} from './ims-grid2-cell';
import {IMS_GRID2_CONTEXT, ImsGrid2Appearance, ImsGrid2RowContext} from './ims-grid2.tokens';


@Component({
    selector: 'ims-grid2-row, ims-grid2-header',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[attr.appearance]': 'effectiveAppearance()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Logical grid row/header that participates in an owning `ims-grid2` subgrid.
 *
 * `ims-grid2-header` contributes column sizing metadata. `ims-grid2-row`
 * contributes body cells and can contain nested wrappers; CSS `:has()` turns
 * those wrappers into subgrid bridges.
 */
export class ImsGrid2Row implements ImsGrid2RowContext {
    /** Optional header appearance override. Ignored for body rows. */
    readonly appearance = input<ImsGrid2Appearance | undefined>(undefined);
    /** Number of cells in this row's largest direct cell container. */
    readonly cellCount: Signal<number> = computed(() => this.resolveMaxContainerCellCount(this.ownCells()));
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly grid = inject(IMS_GRID2_CONTEXT, {optional: true});
    /** Header appearance after applying the optional row override over the root grid value. */
    readonly effectiveAppearance: Signal<ImsGrid2Appearance | null> = computed(() => {
        if (!this.isHeaderRow) {
            return null;
        }

        return this.appearance() ?? this.grid?.appearance() ?? 'default';
    });
    private readonly cells = contentChildren(ImsGrid2Cell, {descendants: true});

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

    /** Returns cells whose nearest grid2 row/header is this row. */
    private ownCells(): readonly ImsGrid2Cell[] {
        return this.cells().filter((cell) => this.belongsToThisRow(cell));
    }

    /** Excludes cells projected into nested rows from this row's calculations. */
    private belongsToThisRow(cell: ImsGrid2Cell): boolean {
        const nearestRow = cell.getHostElement().closest('ims-grid2-row, ims-grid2-header');
        return nearestRow === this.hostElement;
    }

    /** Assigns logical column indexes independently for each direct cell container. */
    private assignColumnIndexes(cells: readonly ImsGrid2Cell[]): void {
        const cellsByContainer = this.groupCellsByContainer(cells);
        for (const containerCells of cellsByContainer.values()) {
            containerCells.forEach((cell, index) => cell.setColumnIndex(index));
        }
    }

    /** Groups cells by their direct parent so wrapped header/body content can index independently. */
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

    /** Finds the largest direct cell container, used as this row's logical column count. */
    private resolveMaxContainerCellCount(cells: readonly ImsGrid2Cell[]): number {
        const grouped = this.groupCellsByContainer(cells);
        let max = 0;
        for (const group of grouped.values()) {
            let groupColumnCount = group.length;
            for (const cell of group) {
                const explicitColumnCount = cell.minimumExplicitColumnCount;
                if (explicitColumnCount !== null && explicitColumnCount > groupColumnCount) {
                    groupColumnCount = explicitColumnCount;
                }
            }

            if (groupColumnCount > max) {
                max = groupColumnCount;
            }
        }

        return max;
    }

    /** Uses the first direct cell container as the source for header column track metadata. */
    private resolvePrimaryContainerCells(cells: readonly ImsGrid2Cell[]): readonly ImsGrid2Cell[] {
        if (cells.length === 0) {
            return [];
        }

        const primaryContainer = cells[0].parentElement ?? this.hostElement;
        return cells.filter((cell) => (cell.parentElement ?? this.hostElement) === primaryContainer);
    }

    /** Whether this instance was created from the `ims-grid2-header` selector. */
    readonly isHeaderRow = this.hostElement.tagName === 'IMS-GRID2-HEADER';

    /** Header column count reported to the root grid, or `0` for body rows. */
    readonly headerCellCount: Signal<number> = computed(() =>
        this.isHeaderRow ? this.resolveMaxContainerCellCount(this.ownCells()) : 0
    );

    /** Returns the row/header host element. */
    getHostElement(): HTMLElement {
        return this.hostElement;
    }

    /** Returns the CSS track declared by the header cell at `columnIndex`, when set. */
    resolveColumnTrack(columnIndex: number): string | null {
        const cells = this.resolvePrimaryContainerCells(this.ownCells());
        return cells[columnIndex]?.columnTrackCss ?? null;
    }

}
