import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    effect,
    forwardRef,
    input,
    signal
} from '@angular/core';
import {
    IMS_GRID_CONTEXT,
    ImsGridContext,
    ImsGridRowContext,
    ImsSortDirection,
    ImsSortHeaderContext,
    ImsSortState
} from './ims-grid.tokens';

@Component({
    selector: 'ims-grid',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-grid.scss',
    host: {
        '[style.row-gap]': 'rowGap()'
    },
    providers: [
        {
            provide: IMS_GRID_CONTEXT,
            useExisting: forwardRef(() => ImsGrid)
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGrid implements ImsGridContext {
    private readonly rows = signal<readonly ImsGridRowContext[]>([]);
    private readonly sortHeaders = signal<readonly ImsSortHeaderContext[]>([]);

    readonly gap = input<string | number>(16, {alias: 'columnGap'});
    readonly rowGapInput = input<string | number>(0, {alias: 'rowGap'});
    readonly sortState = signal<ImsSortState>({active: null, direction: ''});
    readonly columnGap: Signal<string> = computed(() => toCssLength(this.gap()));
    readonly rowGap: Signal<string> = computed(() => toCssLength(this.rowGapInput()));
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
    readonly defaultOffsetStart: Signal<string> = computed(() => {
        const anchorRow = resolveAnchorRow(this.rows());
        return anchorRow?.rowOffsetStartCss() ?? '0px';
    });
    readonly defaultOffsetEnd: Signal<string> = computed(() => {
        const anchorRow = resolveAnchorRow(this.rows());
        return anchorRow?.rowOffsetEndCss() ?? '0px';
    });

    constructor() {
        effect(() => {
            this.applyRowOrder(this.rows(), this.sortState(), this.sortHeaders());
        });
    }

    registerRow(row: ImsGridRowContext): void {
        this.rows.update((rows) => rows.includes(row) ? rows : [...rows, row]);
    }

    unregisterRow(row: ImsGridRowContext): void {
        this.rows.update((rows) => rows.filter((current) => current !== row));
    }

    registerSortHeader(header: ImsSortHeaderContext): void {
        this.sortHeaders.update((headers) => headers.includes(header) ? headers : [...headers, header]);
    }

    unregisterSortHeader(header: ImsSortHeaderContext): void {
        this.sortHeaders.update((headers) => headers.filter((current) => current !== header));
    }

    toggleSort(field: string): void {
        const state = this.sortState();
        if (state.active !== field) {
            this.sortState.set({active: field, direction: 'asc'});
            return;
        }

        if (state.direction === 'asc') {
            this.sortState.set({active: field, direction: 'desc'});
            return;
        }

        if (state.direction === 'desc') {
            this.sortState.set({active: null, direction: ''});
            return;
        }

        this.sortState.set({active: field, direction: 'asc'});
    }

    getSortDirection(field: string): ImsSortDirection {
        const state = this.sortState();
        return state.active === field ? state.direction : '';
    }

    private applyRowOrder(
        rows: readonly ImsGridRowContext[],
        sortState: ImsSortState,
        sortHeaders: readonly ImsSortHeaderContext[]
    ): void {
        const headerRows = rows.filter((row) => row.isHeaderRow);
        const bodyRows = rows.filter((row) => !row.isHeaderRow);
        let orderedBodyRows = bodyRows;

        if (sortState.active && sortState.direction) {
            const activeField = sortState.active;
            const columnIndex = resolveSortColumnIndex(activeField, sortHeaders);
            const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

            orderedBodyRows = bodyRows
                .map((row, index) => ({row, index}))
                .sort((left, right) => {
                    const leftValue = left.row.resolveSortValue(columnIndex);
                    const rightValue = right.row.resolveSortValue(columnIndex);
                    const result = compareSortValues(leftValue, rightValue) * directionMultiplier;
                    return result !== 0 ? result : left.index - right.index;
                })
                .map(({row}) => row);
        }

        let visualOrder = 0;
        for (const row of headerRows) {
            row.setRenderOrder(visualOrder++);
        }
        for (const row of orderedBodyRows) {
            row.setRenderOrder(visualOrder++);
        }
    }
}

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

function resolveAnchorRow(rows: readonly ImsGridRowContext[]): ImsGridRowContext | undefined {
    if (rows.length === 0) {
        return undefined;
    }

    return rows.find((row) => row.headerCellCount() > 0) ?? rows[0];
}

function resolveSortColumnIndex(
    field: string,
    headers: readonly ImsSortHeaderContext[]
): number {
    const header = headers.find((current) => current.getField() === field);
    return header?.getColumnIndex() ?? 0;
}

function compareSortValues(left: unknown, right: unknown): number {
    const normalizedLeft = normalizeSortValue(left);
    const normalizedRight = normalizeSortValue(right);

    if (typeof normalizedLeft === 'number' && typeof normalizedRight === 'number') {
        return normalizedLeft - normalizedRight;
    }

    return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}

function normalizeSortValue(value: unknown): number | string {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'number') {
        return Number.isNaN(value) ? 0 : value;
    }

    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    const stringValue = String(value).trim();
    const compactNumber = stringValue.replace(/[$,%\s,]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(compactNumber)) {
        return Number(compactNumber);
    }

    return stringValue.toLocaleLowerCase();
}
