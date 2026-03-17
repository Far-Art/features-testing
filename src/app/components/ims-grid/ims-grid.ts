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
    ImsSortChangeEvent,
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
        '[style.row-gap]': 'rowGap()',
        '[attr.appearance]': 'appearance()'
    },
    providers: [
        {
            provide: IMS_GRID_CONTEXT,
            useExisting: forwardRef(() => ImsGrid)
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGrid<T> implements ImsGridContext {
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
    private scheduledHasExternalSortData = false;
    private observedViewport: HTMLElement | null = null;
    private viewportResizeObserver: ResizeObserver | null = null;

    /** Horizontal gap between logical data columns (not including offset columns). Default: `0`. */
    readonly gap = input<string | number>(0, {alias: 'columnGap'});
    /** Vertical spacing between top-level grid rows. Default: `0`. */
    readonly rowGapInput = input<string | number>(0, {alias: 'rowGap'});
    /** Appearance marker mirrored to `appearance` attribute on host. Default: `default`. */
    readonly appearance = input<string>('default');
    /** Optional full dataset to sort externally (required for virtual scroll correctness). Default: `null`. */
    readonly toSortList = input<readonly T[] | null>(null);
    /** Enables header highlight reaction to hovered/focused body cells. Default: `false` (disabled). */
    readonly headerHighlightEnabled = signal(false);
    /** Width delta between header and viewport body used to keep columns aligned. */
    readonly viewportScrollbarWidth = signal(0);
    /** Current active sort state shared with sort header directives. */
    readonly sortState = signal<ImsSortState>({active: null, direction: ''});
    /** Emits sort state and optional externally sorted data (asc -> desc -> none cycle). */
    readonly sortChange = output<ImsSortChangeEvent<T>>();
    readonly activeColumnIndex = computed(() =>
        this.headerHighlightEnabled() ? (this.focusedColumnIndex() ?? this.hoveredColumnIndex()) : null
    );
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
    readonly columnTemplate: Signal<string> = computed(() => {
        const columnCount = this.columnCount();
        if (columnCount <= 0) {
            return '';
        }

        const headerRow = this.rows().find((row) => row.headerCellCount() > 0);
        const tracks: string[] = [];
        for (let index = 0; index < columnCount; index += 1) {
            tracks.push(headerRow?.resolveColumnWidth(index) ?? 'minmax(0, 1fr)');
        }

        return tracks.join(' ');
    });
    readonly defaultOffsetStart: Signal<string> = computed(() => {
        const anchorRow = resolveBodyAnchorRow(this.rows());
        return anchorRow ? anchorRow.rowOffsetStartCss() : '0px';
    });
    readonly defaultOffsetEnd: Signal<string> = computed(() => {
        const anchorRow = resolveBodyAnchorRow(this.rows());
        return anchorRow ? anchorRow.rowOffsetEndCss() : '0px';
    });

    constructor() {
        effect(() => {
            this.scheduledRows = this.rows();
            this.scheduledSortState = this.sortState();
            this.scheduledSortHeaders = this.sortHeaders();
            this.scheduledHasExternalSortData = this.toSortList() !== null;
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

    /** Cycles sort direction for a field and emits the updated state. */
    toggleSort(field: string): void {
        const state = this.sortState();
        if (state.active !== field) {
            this.applySortState({active: field, direction: 'asc'});
            return;
        }

        if (state.direction === 'asc') {
            this.applySortState({active: field, direction: 'desc'});
            return;
        }

        if (state.direction === 'desc') {
            this.applySortState({active: null, direction: ''});
            return;
        }

        this.applySortState({active: field, direction: 'asc'});
    }

    getSortDirection(field: string): ImsSortDirection {
        const state = this.sortState();
        return state.active === field ? state.direction : '';
    }

    setHoveredColumn(columnIndex: number | null): void {
        if (!this.headerHighlightEnabled()) {
            return;
        }
        this.hoveredColumnIndex.set(columnIndex);
    }

    setFocusedColumn(columnIndex: number | null): void {
        if (!this.headerHighlightEnabled()) {
            return;
        }
        this.focusedColumnIndex.set(columnIndex);
    }

    /** Batches row ordering work into a single animation frame to avoid sync layout thrash. */
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
                this.scheduledHasExternalSortData
            );
        });
    }

    /** Applies sorting and visual order to registered header/body rows. */
    private applyRowOrder(
        rows: readonly ImsGridRowContext[],
        sortState: ImsSortState,
        sortHeaders: readonly ImsSortHeaderContext[],
        hasExternalSortData: boolean
    ): void {
        if (hasExternalSortData) {
            this.clearRowOrderStyles(rows);
            this.hasSortedOrderApplied = false;
            return;
        }

        const headerRows = rows.filter((row) => row.isHeaderRow);
        const bodyRows = rows.filter((row) => !row.isHeaderRow);
        let orderedBodyRows = bodyRows;

        if (sortState.active && sortState.direction) {
            const activeField = sortState.active;
            const columnIndex = resolveSortColumnIndex(activeField, sortHeaders);
            const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;
            const sortValueByRow = new Map<ImsGridRowContext, unknown>();
            for (const row of bodyRows) {
                sortValueByRow.set(row, row.resolveSortValue(columnIndex));
            }

            orderedBodyRows = bodyRows
                .map((row, index) => ({row, index}))
                .sort((left, right) => {
                    const leftValue = sortValueByRow.get(left.row) ?? '';
                    const rightValue = sortValueByRow.get(right.row) ?? '';
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

        const orderedRows = [...headerRows, ...orderedBodyRows];
        this.ensureParentsSupportCssOrder(orderedRows);
        if (this.requiresDomReorder(orderedRows)) {
            this.reorderRowsInDom(orderedRows);
        }
    }

    private applySortState(state: ImsSortState): void {
        this.sortState.set(state);
        this.sortChange.emit({
            state,
            sortedData: this.computeExternalSortedData(state)
        });
    }

    private computeExternalSortedData(state: ImsSortState): readonly T[] | null {
        const list = this.toSortList();
        if (list === null) {
            return null;
        }

        if (!state.active || !state.direction) {
            return [...list];
        }

        const activeField = state.active;
        const directionMultiplier = state.direction === 'asc' ? 1 : -1;

        return list
            .map((item, index) => ({item, index}))
            .sort((left, right) => {
                const leftValue = resolveListSortValue(left.item, activeField);
                const rightValue = resolveListSortValue(right.item, activeField);
                const result = compareSortValues(leftValue, rightValue) * directionMultiplier;
                return result !== 0 ? result : left.index - right.index;
            })
            .map(({item}) => item);
    }

    /** Removes explicit CSS order when sorting is delegated to external data list handling. */
    private clearRowOrderStyles(rows: readonly ImsGridRowContext[]): void {
        for (const row of rows) {
            row.clearRenderOrder();
        }
    }

    /** Ensures parent containers support CSS `order` (flex/grid required). */
    private ensureParentsSupportCssOrder(rows: readonly ImsGridRowContext[]): void {
        const parents = new Set<HTMLElement>();
        for (const row of rows) {
            const parent = row.getHostElement().parentElement;
            if (!parent) {
                continue;
            }
            parents.add(parent);
        }

        for (const parent of parents) {
            if (supportsCssOrder(parent)) {
                continue;
            }

            parent.style.setProperty('display', 'flex', 'important');
            parent.style.setProperty('flex-direction', 'column', 'important');
            parent.style.setProperty('align-items', 'stretch', 'important');
        }
    }

    /** DOM reordering is only needed in containers like virtual scroll where CSS order is insufficient. */
    private requiresDomReorder(rows: readonly ImsGridRowContext[]): boolean {
        for (const row of rows) {
            const parent = row.getHostElement().parentElement;
            if (!parent) {
                continue;
            }

            if (isInsideViewport(parent)) {
                return true;
            }
        }

        return false;
    }

    /** Reorders row elements inside each parent container to match computed sorted order. */
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

    /** Tracks viewport size changes used for header/body width compensation. */
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

    /** Calculates end-offset compensation to keep header columns aligned with viewport rows. */
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

function resolveBodyAnchorRow(rows: readonly ImsGridRowContext[]): ImsGridRowContext | undefined {
    return rows.find((row) => !row.isHeaderRow);
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
    const compactNumber = stringValue.replace(/[$,%\s]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(compactNumber)) {
        return Number(compactNumber);
    }

    return stringValue.toLocaleLowerCase();
}

function resolveListSortValue<T>(item: T, field: string): unknown {
    if (item === null || item === undefined) {
        return '';
    }

    const path = field
        .split('.')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (path.length === 0) {
        return item;
    }

    // Allow sort keys like "item.code" where "item" is an explicit root alias.
    if (path[0] === 'item') {
        path.shift();
    }

    if (path.length === 0) {
        return item;
    }

    let current: unknown = item;
    for (const segment of path) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return '';
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return current ?? '';
}

function isInsideViewport(element: HTMLElement): boolean {
    return element.closest('cdk-virtual-scroll-viewport') !== null;
}

function supportsCssOrder(parent: HTMLElement): boolean {
    const display = getComputedStyle(parent).display;
    return display.includes('flex') || display.includes('grid');
}
