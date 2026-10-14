import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChildren,
    DestroyRef,
    effect,
    ElementRef,
    forwardRef,
    inject,
    Injector,
    input,
    Signal,
    signal,
    untracked
} from '@angular/core';
import {ImsGridCellV2} from './ims-grid-cell-v2';
import {IMS_GRID_CONTEXT_V2, IMS_GRID_ROW_CONTEXT_V2, ImsGridAppearanceV2, ImsGridRowContextV2} from './ims-grid-v2.tokens';


@Component({
    selector: 'ims-grid-row-v2, ims-grid-header-v2, ims-grid-footer-v2',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[attr.appearance]': 'effectiveAppearance()',
        '[attr.role]': 'role()'
    },
    providers: [
        {
            provide: IMS_GRID_ROW_CONTEXT_V2,
            useExisting: forwardRef(() => ImsGridRowV2)
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Logical grid row/header that participates in an owning `ims-grid-v2` subgrid.
 *
 * `ims-grid-header-v2` contributes column sizing metadata. `ims-grid-footer-v2` is a
 * closing row, such as totals, laid out like a body row. `ims-grid-row-v2`
 * contributes body cells and can contain nested wrappers; CSS `:has()` turns
 * those wrappers into subgrid bridges.
 */
export class ImsGridRowV2 implements ImsGridRowContextV2 {
    /** Optional header appearance override. Ignored for body rows. */
    readonly appearance = input<ImsGridAppearanceV2 | undefined>(undefined);
    /** Number of cells in this row's largest direct cell container. */
    readonly cellCount: Signal<number> = computed(() => this.resolveMaxContainerCellCount(this.ownCells()));
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly grid = inject(IMS_GRID_CONTEXT_V2, {optional: true});
    /** Header appearance after applying the optional row override over the root grid value. */
    readonly effectiveAppearance: Signal<ImsGridAppearanceV2 | null> = computed(() => {
        if (!this.isHeaderRow) {
            return null;
        }

        return this.appearance() ?? this.grid?.appearance() ?? 'default';
    });
    private readonly cells = contentChildren(ImsGridCellV2, {descendants: true});
    private readonly injector = inject(Injector);
    /**
     * Bumped after a render. Which cells are this row's own is read from the
     * DOM, and a cell projected through another component — an expansion
     * panel's header, written in the row — reaches the row there only once
     * that component has rendered, after the effect below first runs. Reading
     * this in {@link ownCells} makes the row count and index its cells again
     * once they are in place.
     */
    private readonly layoutVersion = signal(0);
    /** `row` once the owning grid is an `ims-table`; a layout grid's rows have no role. */
    readonly role: Signal<'row' | null> = computed(() => (this.grid?.semantics() ? 'row' : null));

    constructor() {
        this.grid?.registerRow(this);

        this.destroyRef.onDestroy(() => {
            this.grid?.unregisterRow(this);
        });

        // The cells' index signals are written untracked rather than under
        // `allowSignalWrites`. Angular 18 needs one of the two to let an effect
        // write; later versions need neither, and in development log a
        // deprecation warning for every effect created with the flag — one per
        // row, which a virtual viewport creating rows as it scrolls turned into
        // a stream of console calls on the scroll path.
        effect(() => {
            const cells = this.ownCells();
            untracked(() => this.assignColumnIndexes(cells));
        });

        effect(() => {
            this.cells();
            afterNextRender(() => this.layoutVersion.update((version) => version + 1), {injector: this.injector});
        });
    }

    /** Returns cells whose nearest grid row/header is this row. */
    private ownCells(): readonly ImsGridCellV2[] {
        this.layoutVersion();
        return this.cells().filter((cell) => this.belongsToThisRow(cell));
    }

    /** Excludes cells projected into nested rows from this row's calculations. */
    private belongsToThisRow(cell: ImsGridCellV2): boolean {
        const nearestRow = cell.getHostElement().closest('ims-grid-row-v2, ims-grid-header-v2, ims-grid-footer-v2');
        return nearestRow === this.hostElement;
    }

    /** Assigns logical column indexes independently for each direct cell container. */
    private assignColumnIndexes(cells: readonly ImsGridCellV2[]): void {
        const cellsByContainer = this.groupCellsByContainer(cells);
        for (const containerCells of cellsByContainer.values()) {
            containerCells.forEach((cell, index) => cell.setColumnIndex(index));
        }
    }

    /** Groups cells by their direct parent so wrapped header/body content can index independently. */
    private groupCellsByContainer(cells: readonly ImsGridCellV2[]): Map<HTMLElement, ImsGridCellV2[]> {
        const map = new Map<HTMLElement, ImsGridCellV2[]>();
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
    private resolveMaxContainerCellCount(cells: readonly ImsGridCellV2[]): number {
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
    private resolvePrimaryContainerCells(cells: readonly ImsGridCellV2[]): readonly ImsGridCellV2[] {
        if (cells.length === 0) {
            return [];
        }

        const primaryContainer = cells[0].parentElement ?? this.hostElement;
        return cells.filter((cell) => (cell.parentElement ?? this.hostElement) === primaryContainer);
    }

    /** Whether this instance was created from the `ims-grid-header-v2` selector. */
    readonly isHeaderRow = this.hostElement.tagName === 'IMS-GRID-HEADER-V2';

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
