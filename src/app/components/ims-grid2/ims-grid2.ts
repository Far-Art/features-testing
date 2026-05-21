import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    forwardRef,
    input,
    signal
} from '@angular/core';
import {IMS_GRID2_CONTEXT, ImsGrid2Context, ImsGrid2RowContext} from './ims-grid2.tokens';

@Component({
    selector: 'ims-grid2',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[style.--ims-grid2-column-gap]': 'columnGap()',
        '[style.--ims-grid2-offset-start]': 'offsetStartCss()',
        '[style.--ims-grid2-offset-end]': 'offsetEndCss()',
        '[style.--ims-grid2-template]': 'resolvedColumnTemplate()',
        '[style.row-gap]': 'rowGap()'
    },
    providers: [
        {
            provide: IMS_GRID2_CONTEXT,
            useExisting: forwardRef(() => ImsGrid2)
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Root grid container that owns the shared column template for `ims-grid2-row`,
 * `ims-grid2-header`, and nested subgrid wrappers.
 *
 * The component intentionally keeps layout state at the root and exposes it
 * through CSS custom properties so projected rows can align with the header
 * using CSS `subgrid`.
 */
export class ImsGrid2 implements ImsGrid2Context {
    private readonly rows = signal<readonly ImsGrid2RowContext[]>([]);

    /** Horizontal gap between logical columns. */
    readonly gap = input<string | number>(3, {alias: 'columnGap'});
    /** Vertical gap between top-level grid rows. */
    readonly rowGapInput = input<string | number>(0, {alias: 'rowGap'});
    /** Start rail applied once on the root grid. */
    readonly offsetStart = input<string | number>(0);
    /** End rail applied once on the root grid. */
    readonly offsetEnd = input<string | number>(0);
    /** Track used for header columns that do not declare width/minWidth/maxWidth. */
    readonly defaultColumnTrack = input<string>('minmax(0, 1fr)');
    /** Optional complete CSS grid-template-columns override. */
    readonly columnTemplate = input<string | undefined>(undefined);

    /** Normalized CSS length for the column gap custom property. */
    readonly columnGap: Signal<string> = computed(() => toCssLength(this.gap()));
    /** Normalized CSS length for the host row gap style. */
    readonly rowGap: Signal<string> = computed(() => toCssLength(this.rowGapInput()));
    /** Normalized CSS length for the root start rail. */
    readonly offsetStartCss: Signal<string> = computed(() => toCssLength(this.offsetStart()));
    /** Normalized CSS length for the root end rail. */
    readonly offsetEndCss: Signal<string> = computed(() => toCssLength(this.offsetEnd()));
    /** Maximum logical column count across header rows, falling back to body rows. */
    readonly columnCount: Signal<number> = computed(() => {
        const rows = this.rows();
        if (rows.length === 0) {
            return 0;
        }

        const headerCounts = rows.map((row) => row.headerCellCount()).filter((count) => count > 0);
        if (headerCounts.length > 0) {
            return Math.max(...headerCounts);
        }

        return Math.max(...rows.map((row) => row.cellCount()));
    });
    /**
     * CSS `grid-template-columns` value applied to the root grid.
     *
     * Header cell `width`, `minWidth`, and `maxWidth` inputs win per column.
     * Columns without explicit header sizing use `defaultColumnTrack`.
     */
    readonly resolvedColumnTemplate: Signal<string> = computed(() => {
        const explicitTemplate = this.columnTemplate()?.trim();
        if (explicitTemplate) {
            return explicitTemplate;
        }

        const columnCount = this.columnCount();
        if (columnCount <= 0) {
            return 'none';
        }

        const headerRow = this.rows().find((row) => row.headerCellCount() > 0);
        const defaultTrack = this.defaultColumnTrack().trim() || 'minmax(0, 1fr)';
        const tracks: string[] = [];
        for (let index = 0; index < columnCount; index += 1) {
            tracks.push(headerRow?.resolveColumnTrack(index) ?? defaultTrack);
        }

        return tracks.join(' ');
    });

    /** Adds a row/header to the root grid's column calculations. */
    registerRow(row: ImsGrid2RowContext): void {
        this.rows.update((rows) => rows.includes(row) ? rows : [...rows, row]);
    }

    /** Removes a row/header from the root grid's column calculations. */
    unregisterRow(row: ImsGrid2RowContext): void {
        this.rows.update((rows) => rows.filter((current) => current !== row));
    }
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
