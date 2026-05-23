import {ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal} from '@angular/core';

type ResolvedCellSpan =
    | {kind: 'cell'}
    | {kind: 'row'}
    | {kind: 'range'; startColumn: number; endColumn: number};


@Component({
    selector: 'ims-grid2-cell',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[class.ims-grid2-cell-row-span]': 'isRowSpan()',
        '[style.grid-column-start]': 'gridColumnStart()',
        '[style.grid-column-end]': 'gridColumnEnd()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Logical cell rendered in a shared `ims-grid2` column.
 *
 * Cells receive their column index from the nearest owning row/header. Header
 * cells may also provide column track sizing through `width`, `minWidth`, and
 * `maxWidth`.
 *
 * Use `span="row"` for detail content that should occupy the full parent row
 * data area, such as an independent nested grid. Use logical ranges like
 * `span="1 / 3"` to span visible grid columns one through two.
 */
export class ImsGrid2Cell {
    /** Fixed column track width consumed from the header row. */
    readonly width = input<string | number | undefined>(undefined);
    /** Minimum column track width consumed from the header row. */
    readonly minWidth = input<string | number | undefined>(undefined);
    /** Maximum column track width consumed from the header row. */
    readonly maxWidth = input<string | number | undefined>(undefined);
    /**
     * Logical span mode.
     *
     * `cell` uses the owning row's automatic column index, `row` spans all
     * parent data columns, and `N / M` spans logical visible columns from `N`
     * up to, but not including, `M`.
     */
    readonly span = input<'cell' | 'row' | string>('cell');
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly columnIndex = signal(0);
    private readonly resolvedSpan = computed(() => resolveCellSpan(this.span()));
    /** Whether this cell spans the full parent row data area. */
    readonly isRowSpan = computed(() => this.resolvedSpan().kind === 'row');
    /**
     * One-based CSS grid column start assigned by the owning row/header.
     *
     * The root grid template uses one start offset rail, then alternates data
     * columns and gutter tracks. Logical column `0` therefore starts on grid
     * line `2`, logical column `1` on line `4`, and so on.
     */
    readonly gridColumnStart = computed(() => {
        const span = this.resolvedSpan();
        if (span.kind === 'row') {
            return '2';
        }

        if (span.kind === 'range') {
            return `${span.startColumn * 2}`;
        }

        return `${this.columnIndex() * 2 + 2}`;
    });
    /**
     * CSS grid column end for the cell.
     *
     * Regular cells occupy one data track. Explicit ranges translate logical
     * visible column boundaries into the underlying offset/gutter grid lines.
     * Row-span cells end before the final offset rail, so offsets do not shrink
     * or move the full-width content.
     */
    readonly gridColumnEnd = computed(() => {
        const span = this.resolvedSpan();
        if (span.kind === 'row') {
            return '-2';
        }

        if (span.kind === 'range') {
            return `${span.endColumn * 2 - 1}`;
        }

        return 'span 1';
    });

    /** Direct parent element used by the row to group wrapped cell containers. */
    get parentElement(): HTMLElement | null {
        return this.elementRef.nativeElement.parentElement;
    }

    /** Normalized fixed width input, when supplied. */
    get widthCss(): string | null {
        const width = this.width();
        if (width === undefined || width === null) {
            return null;
        }

        return toCssLength(width);
    }

    /** Normalized minimum width input, when supplied. */
    get minWidthCss(): string | null {
        const minWidth = this.minWidth();
        if (minWidth === undefined || minWidth === null) {
            return null;
        }

        return toCssLength(minWidth);
    }

    /** Normalized maximum width input, when supplied. */
    get maxWidthCss(): string | null {
        const maxWidth = this.maxWidth();
        if (maxWidth === undefined || maxWidth === null) {
            return null;
        }

        return toCssLength(maxWidth);
    }

    /** CSS grid track expression contributed by this cell when it is in a header row. */
    get columnTrackCss(): string | null {
        const width = this.widthCss;
        if (width) {
            return width;
        }

        const minWidth = this.minWidthCss;
        const maxWidth = this.maxWidthCss;
        if (minWidth && maxWidth) {
            return `minmax(${minWidth}, ${maxWidth})`;
        }

        if (minWidth) {
            return `minmax(${minWidth}, 1fr)`;
        }

        if (maxWidth) {
            return `minmax(0px, ${maxWidth})`;
        }

        return null;
    }

    /** Minimum visible column count implied by an explicit logical range. */
    get minimumExplicitColumnCount(): number | null {
        const span = this.resolvedSpan();
        if (span.kind !== 'range') {
            return null;
        }

        return span.endColumn - 1;
    }

    /** Returns the cell host element. */
    getHostElement(): HTMLElement {
        return this.elementRef.nativeElement;
    }

    /** Sets the zero-based logical column index for this cell. */
    setColumnIndex(index: number): void {
        this.columnIndex.set(index);
    }
}

/** Parses the public span input into a controlled logical placement mode. */
function resolveCellSpan(value: string): ResolvedCellSpan {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'cell') {
        return {kind: 'cell'};
    }

    if (normalized === 'row') {
        return {kind: 'row'};
    }

    const rangeMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(normalized);
    if (!rangeMatch) {
        return {kind: 'cell'};
    }

    const startColumn = Number(rangeMatch[1]);
    const endColumn = Number(rangeMatch[2]);
    if (
        !Number.isInteger(startColumn) ||
        !Number.isInteger(endColumn) ||
        startColumn < 1 ||
        endColumn <= startColumn
    ) {
        return {kind: 'cell'};
    }

    return {kind: 'range', startColumn, endColumn};
}

/** Converts numeric or unitless length inputs into valid CSS length strings. */
function toCssLength(value: string | number): string {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    const normalized = value.trim();
    if (!normalized) {
        return '0px';
    }

    if (/^-?\d+(\.\d+)?$/.test(normalized)) {
        return `${normalized}px`;
    }

    return normalized;
}
