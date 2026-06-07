import {ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, effect, ElementRef, inject, input, Signal} from '@angular/core';
import {ImsGridCell} from './ims-grid-cell';
import {IMS_GRID_CONTEXT, ImsGridAppearance, ImsGridRowContext} from './ims-grid.tokens';


@Component({
    selector: 'ims-grid-row, ims-grid-header',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[attr.appearance]': 'effectiveAppearance()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Logical grid row/header that participates in an owning `ims-grid` subgrid.
 *
 * `ims-grid-header` contributes column sizing metadata. `ims-grid-row`
 * contributes body cells and can contain nested wrappers; CSS `:has()` turns
 * those wrappers into subgrid bridges.
 */
export class ImsGridRow implements ImsGridRowContext {
    /** Optional header appearance override. Ignored for body rows. */
    readonly appearance = input<ImsGridAppearance | undefined>(undefined);
    /** Number of cells in this row's largest direct cell container. */
    readonly cellCount: Signal<number> = computed(() => this.resolveMaxContainerCellCount(this.ownCells()));
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly grid = inject(IMS_GRID_CONTEXT, {optional: true});
    /** Header appearance after applying the optional row override over the root grid value. */
    readonly effectiveAppearance: Signal<ImsGridAppearance | null> = computed(() => {
        if (!this.isHeaderRow) {
            return null;
        }

        return this.appearance() ?? this.grid?.appearance() ?? 'default';
    });
    private readonly cells = contentChildren(ImsGridCell, {descendants: true});

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

    /** Returns cells whose nearest grid row/header is this row. */
    private ownCells(): readonly ImsGridCell[] {
        return this.cells().filter((cell) => this.belongsToThisRow(cell));
    }

    /** Excludes cells projected into nested rows from this row's calculations. */
    private belongsToThisRow(cell: ImsGridCell): boolean {
        const nearestRow = cell.getHostElement().closest('ims-grid-row, ims-grid-header');
        return nearestRow === this.hostElement;
    }

    /** Assigns logical column indexes independently for each direct cell container. */
    private assignColumnIndexes(cells: readonly ImsGridCell[]): void {
        const cellsByContainer = this.groupCellsByContainer(cells);
        for (const containerCells of cellsByContainer.values()) {
            containerCells.forEach((cell, index) => cell.setColumnIndex(index));
        }
    }

    /** Groups cells by their direct parent so wrapped header/body content can index independently. */
    private groupCellsByContainer(cells: readonly ImsGridCell[]): Map<HTMLElement, ImsGridCell[]> {
        const map = new Map<HTMLElement, ImsGridCell[]>();
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
    private resolveMaxContainerCellCount(cells: readonly ImsGridCell[]): number {
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
    private resolvePrimaryContainerCells(cells: readonly ImsGridCell[]): readonly ImsGridCell[] {
        if (cells.length === 0) {
            return [];
        }

        const primaryContainer = cells[0].parentElement ?? this.hostElement;
        return cells.filter((cell) => (cell.parentElement ?? this.hostElement) === primaryContainer);
    }

    /** Whether this instance was created from the `ims-grid-header` selector. */
    readonly isHeaderRow = this.hostElement.tagName === 'IMS-GRID-HEADER';

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
