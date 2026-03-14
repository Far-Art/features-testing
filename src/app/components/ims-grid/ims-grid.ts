import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Signal,
    computed,
    effect,
    forwardRef,
    inject,
    input,
    output,
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
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly rows = signal<readonly ImsGridRowContext[]>([]);
    private readonly sortHeaders = signal<readonly ImsSortHeaderContext[]>([]);
    private readonly hoveredColumnIndex = signal<number | null>(null);
    private readonly focusedColumnIndex = signal<number | null>(null);
    private readonly rowRegistrationOrder = new Map<ImsGridRowContext, number>();
    private nextRegistrationOrder = 0;
    private hasSortedOrderApplied = false;
    private pendingApply = false;
    private pendingAnimationFrame: number | null = null;
    private scheduledRows: readonly ImsGridRowContext[] = [];
    private scheduledSortState: ImsSortState = {active: null, direction: ''};
    private scheduledSortHeaders: readonly ImsSortHeaderContext[] = [];
    private scheduledSortStrategy: 'dom' | 'data' = 'dom';
    private observedViewport: HTMLElement | null = null;
    private viewportResizeObserver: ResizeObserver | null = null;

    readonly gap = input<string | number>(16, {alias: 'columnGap'});
    readonly rowGapInput = input<string | number>(0, {alias: 'rowGap'});
    readonly sortStrategy = input<'dom' | 'data'>('dom');
    readonly viewportScrollbarWidth = signal(0);
    readonly sortState = signal<ImsSortState>({active: null, direction: ''});
    readonly sortChange = output<ImsSortState>();
    readonly activeColumnIndex = computed(() => this.focusedColumnIndex() ?? this.hoveredColumnIndex());
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
            this.scheduledRows = this.rows();
            this.scheduledSortState = this.sortState();
            this.scheduledSortHeaders = this.sortHeaders();
            this.scheduledSortStrategy = this.sortStrategy();
            this.attachViewportObserver();
            this.scheduleApplyRowOrder();
        });

        this.destroyRef.onDestroy(() => {
            if (this.pendingAnimationFrame !== null) {
                cancelAnimationFrame(this.pendingAnimationFrame);
            }
            this.viewportResizeObserver?.disconnect();
        });
    }

    registerRow(row: ImsGridRowContext): void {
        if (!this.rowRegistrationOrder.has(row)) {
            this.rowRegistrationOrder.set(row, this.nextRegistrationOrder++);
        }
        this.rows.update((rows) => rows.includes(row) ? rows : [...rows, row]);
    }

    unregisterRow(row: ImsGridRowContext): void {
        this.rowRegistrationOrder.delete(row);
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
            this.sortChange.emit(this.sortState());
            return;
        }

        if (state.direction === 'asc') {
            this.sortState.set({active: field, direction: 'desc'});
            this.sortChange.emit(this.sortState());
            return;
        }

        if (state.direction === 'desc') {
            this.sortState.set({active: null, direction: ''});
            this.sortChange.emit(this.sortState());
            return;
        }

        this.sortState.set({active: field, direction: 'asc'});
        this.sortChange.emit(this.sortState());
    }

    getSortDirection(field: string): ImsSortDirection {
        const state = this.sortState();
        return state.active === field ? state.direction : '';
    }

    setHoveredColumn(columnIndex: number | null): void {
        this.hoveredColumnIndex.set(columnIndex);
    }

    setFocusedColumn(columnIndex: number | null): void {
        this.focusedColumnIndex.set(columnIndex);
    }

    private scheduleApplyRowOrder(): void {
        if (this.pendingApply) {
            return;
        }

        this.pendingApply = true;
        this.pendingAnimationFrame = requestAnimationFrame(() => {
            this.pendingApply = false;
            this.pendingAnimationFrame = null;
            this.updateViewportCompensation(this.scheduledRows);
            this.applyRowOrder(
                this.scheduledRows,
                this.scheduledSortState,
                this.scheduledSortHeaders,
                this.scheduledSortStrategy
            );
        });
    }

    private applyRowOrder(
        rows: readonly ImsGridRowContext[],
        sortState: ImsSortState,
        sortHeaders: readonly ImsSortHeaderContext[],
        sortStrategy: 'dom' | 'data'
    ): void {
        if (sortStrategy !== 'dom') {
            if (this.hasSortedOrderApplied) {
                this.restoreNaturalOrder(rows);
            }
            return;
        }

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
            this.hasSortedOrderApplied = true;
        } else {
            if (!this.hasSortedOrderApplied) {
                return;
            }
            orderedBodyRows = bodyRows.sort(
                (left, right) =>
                    this.resolveRegistrationOrder(left) - this.resolveRegistrationOrder(right)
            );
            this.hasSortedOrderApplied = false;
        }

        let visualOrder = 0;
        for (const row of headerRows) {
            row.setRenderOrder(visualOrder++);
        }
        for (const row of orderedBodyRows) {
            row.setRenderOrder(visualOrder++);
        }

        // Fallback for non-flex parents (e.g. cdk-virtual-scroll content wrapper):
        // move row elements in DOM order so sorting is visible regardless of layout mode.
        this.reorderRowsInDom([...headerRows, ...orderedBodyRows]);
    }

    private restoreNaturalOrder(rows: readonly ImsGridRowContext[]): void {
        const headerRows = rows.filter((row) => row.isHeaderRow);
        const bodyRows = rows
            .filter((row) => !row.isHeaderRow)
            .sort((left, right) => this.resolveRegistrationOrder(left) - this.resolveRegistrationOrder(right));

        let visualOrder = 0;
        for (const row of headerRows) {
            row.setRenderOrder(visualOrder++);
        }
        for (const row of bodyRows) {
            row.setRenderOrder(visualOrder++);
        }

        this.reorderRowsInDom([...headerRows, ...bodyRows]);
        this.hasSortedOrderApplied = false;
    }

    private reorderRowsInDom(rows: readonly ImsGridRowContext[]): void {
        const rowsByParent = new Map<HTMLElement, HTMLElement[]>();

        for (const row of rows) {
            const element = row.getHostElement();
            const parent = element.parentElement;
            if (!parent) {
                continue;
            }

            const group = rowsByParent.get(parent);
            if (group) {
                group.push(element);
            } else {
                rowsByParent.set(parent, [element]);
            }
        }

        for (const [parent, orderedElements] of rowsByParent) {
            if (orderedElements.length < 2) {
                continue;
            }

            const firstElement = orderedElements.find((element) => element.parentElement === parent);
            if (!firstElement) {
                continue;
            }

            const marker = document.createComment('ims-grid-sort-marker');
            parent.insertBefore(marker, firstElement);
            for (const element of orderedElements) {
                parent.insertBefore(element, marker);
            }
            parent.removeChild(marker);
        }
    }

    private resolveRegistrationOrder(row: ImsGridRowContext): number {
        return this.rowRegistrationOrder.get(row) ?? Number.MAX_SAFE_INTEGER;
    }

    private attachViewportObserver(): void {
        const viewport = this.hostElement.querySelector('cdk-virtual-scroll-viewport') as HTMLElement | null;
        if (viewport === this.observedViewport) {
            return;
        }

        this.viewportResizeObserver?.disconnect();
        this.viewportResizeObserver = null;
        this.observedViewport = viewport;

        if (!viewport) {
            this.viewportScrollbarWidth.set(0);
            return;
        }

        if (typeof ResizeObserver !== 'undefined') {
            this.viewportResizeObserver = new ResizeObserver(() => this.updateViewportCompensation(this.rows()));
            this.viewportResizeObserver.observe(viewport);
        }

        this.updateViewportCompensation(this.rows());
    }

    private updateViewportCompensation(rows: readonly ImsGridRowContext[]): void {
        let compensation = 0;

        const headerRow = rows.find((row) => row.isHeaderRow && !isInsideViewport(row.getHostElement()));
        const viewportBodyRow = rows.find((row) => !row.isHeaderRow && isInsideViewport(row.getHostElement()));

        if (headerRow && viewportBodyRow) {
            const headerWidth = headerRow.getHostElement().getBoundingClientRect().width;
            const bodyWidth = viewportBodyRow.getHostElement().getBoundingClientRect().width;
            compensation = Math.max(0, headerWidth - bodyWidth);
        }

        if (compensation <= 0 && this.observedViewport) {
            compensation = Math.max(0, this.hostElement.clientWidth - this.observedViewport.clientWidth);
        }

        this.viewportScrollbarWidth.set(Number(compensation.toFixed(3)));
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

function isInsideViewport(element: HTMLElement): boolean {
    return element.closest('cdk-virtual-scroll-viewport') !== null;
}
