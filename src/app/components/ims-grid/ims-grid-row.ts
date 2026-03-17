import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Renderer2,
    RendererStyleFlags2,
    Signal,
    computed,
    contentChildren,
    effect,
    inject,
    input
} from '@angular/core';
import {ImsGridCell} from './ims-grid-cell';
import {IMS_GRID_CONTEXT, ImsGridRowContext} from './ims-grid.tokens';

@Component({
    selector: 'ims-grid-row, ims-grid-header',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-grid-row.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGridRow implements ImsGridRowContext {
    private readonly renderer = inject(Renderer2);
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly grid = inject(IMS_GRID_CONTEXT, {optional: true});
    private readonly cells = contentChildren(ImsGridCell, {descendants: true});
    private readonly insideVirtualViewport = this.hostElement.closest('cdk-virtual-scroll-viewport') !== null;
    private participatesInGrid = false;
    private isDestroyed = false;
    private activeContainers = new Set<HTMLElement>();
    readonly isHeaderRow = this.hostElement.tagName === 'IMS-GRID-HEADER';

    /** Optional left spacer for this row (aligns content with wrapped structures). Default: `undefined` (inherits grid default). */
    readonly offsetStart = input<string | number | undefined>(undefined);
    /** Optional right spacer for this row. Default: `undefined` (inherits grid default). */
    readonly offsetEnd = input<string | number | undefined>(undefined);
    /** When true, offsets are reduced by container insets (useful with padded wrappers). Default: `false`. */
    readonly compensateOffsets = input(false, {transform: booleanAttribute});

    readonly cellCount: Signal<number> = computed(() => this.resolveMaxContainerCellCount(this.ownCells()));
    readonly headerCellCount: Signal<number> = computed(() =>
        this.isHeaderRow ? this.resolveMaxContainerCellCount(this.ownCells()) : 0
    );
    readonly rowOffsetStartCss: Signal<string> = computed(() => toCssLength(this.offsetStart() ?? 0));
    readonly rowOffsetEndCss: Signal<string> = computed(() => toCssLength(this.offsetEnd() ?? 0));

    constructor() {
        // Delay registration until parent relations are stable so nested rows can be excluded.
        queueMicrotask(() => {
            if (this.isDestroyed) {
                return;
            }

            this.participatesInGrid = !hasAncestorGridRow(this.hostElement);
            if (this.participatesInGrid) {
                this.grid?.registerRow(this);
            }
        });

        this.destroyRef.onDestroy(() => {
            this.isDestroyed = true;
            if (this.participatesInGrid) {
                this.grid?.unregisterRow(this);
            }
            this.cleanupContainers();
        });

        effect(
            () => {
                const ownCells = this.ownCells();
                this.assignColumnIndexes(ownCells);
                this.syncContainers(ownCells);
            },
            {allowSignalWrites: true}
        );

        effect(() => {
            this.cells();
            const columnCount = Math.max(this.grid?.columnCount() ?? this.cellCount(), 1);
            const columnTemplate = this.grid?.columnTemplate() ?? `repeat(${columnCount}, minmax(0, 1fr))`;
            const columnGap = this.grid?.columnGap() ?? '0px';
            const offsetStart = this.resolveOffsetStart();
            const offsetEnd = this.resolveOffsetEnd();
            const viewportEndCompensation = this.isHeaderRow && !this.insideVirtualViewport
                ? (this.grid?.viewportScrollbarWidth() ?? 0)
                : 0;
            this.applyContainerStyles(
                columnTemplate,
                columnGap,
                offsetStart,
                offsetEnd,
                viewportEndCompensation
            );
        });
    }

    /** Returns only cells logically owned by this row (excluding nested row cells). */
    private ownCells(): readonly ImsGridCell[] {
        return this.cells().filter((cell) => this.belongsToThisRow(cell));
    }

    private belongsToThisRow(cell: ImsGridCell): boolean {
        const nearestRow = cell.getHostElement().closest('ims-grid-row, ims-grid-header');
        return nearestRow === this.hostElement;
    }

    private assignColumnIndexes(cells: readonly ImsGridCell[]): void {
        const cellsByContainer = this.groupCellsByContainer(cells);
        for (const containerCells of cellsByContainer.values()) {
            containerCells.forEach((cell, index) => cell.setColumnIndex(index));
        }
    }

    private syncContainers(cells: readonly ImsGridCell[]): void {
        const nextContainers = new Set<HTMLElement>();
        for (const cell of cells) {
            nextContainers.add(cell.parentElement ?? this.hostElement);
        }

        for (const container of this.activeContainers) {
            if (!nextContainers.has(container)) {
                this.clearContainerStyles(container);
            }
        }

        this.activeContainers = nextContainers;
    }

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

    private resolveMaxContainerCellCount(cells: readonly ImsGridCell[]): number {
        const grouped = this.groupCellsByContainer(cells);
        let max = 0;
        for (const group of grouped.values()) {
            if (group.length > max) {
                max = group.length;
            }
        }

        return max;
    }

    private resolvePrimaryContainerCells(cells: readonly ImsGridCell[]): readonly ImsGridCell[] {
        if (cells.length === 0) {
            return [];
        }

        const primaryContainer = cells[0].parentElement ?? this.hostElement;
        return cells.filter((cell) => (cell.parentElement ?? this.hostElement) === primaryContainer);
    }

    private resolveExpansionHeaderCells(): readonly HTMLElement[] {
        const header = this.hostElement.querySelector('mat-expansion-panel-header');
        if (!header) {
            return [];
        }

        return Array.from(header.querySelectorAll('ims-grid-cell')) as HTMLElement[];
    }

    private applyContainerStyles(
        columnTemplate: string,
        columnGap: string,
        baseOffsetStart: string,
        baseOffsetEnd: string,
        viewportEndCompensationInPx: number
    ): void {
        // Apply the same computed track template to every container that directly hosts row cells.
        const shouldCompensate = this.compensateOffsets();
        const hostRect = shouldCompensate ? this.hostElement.getBoundingClientRect() : null;

        for (const container of this.activeContainers) {
            let offsetStart = baseOffsetStart;
            let offsetEnd = baseOffsetEnd;

            if (shouldCompensate && hostRect) {
                const containerRect = container.getBoundingClientRect();
                const insetStart = Math.max(0, containerRect.left - hostRect.left);
                const insetEnd = Math.max(0, hostRect.right - containerRect.right);
                offsetStart = compensateOffset(baseOffsetStart, insetStart);
                offsetEnd = compensateOffset(baseOffsetEnd, insetEnd);
            }

            offsetEnd = addOffset(offsetEnd, viewportEndCompensationInPx);

            this.renderer.setStyle(container, 'display', 'grid');
            this.renderer.setStyle(container, 'align-items', 'center');
            this.renderer.setStyle(container, 'box-sizing', 'border-box');
            this.setStyle(container, 'column-gap', 'var(--ims-grid-column-gap)');
            this.setStyle(container, 'grid-template-columns', 'var(--ims-grid-column-template)');
            this.setStyle(container, 'padding-inline-start', 'var(--ims-grid-offset-start)');
            this.setStyle(container, 'padding-inline-end', 'var(--ims-grid-offset-end)');
            this.setStyle(container, '--ims-grid-column-template', columnTemplate);
            this.setStyle(container, '--ims-grid-column-gap', columnGap);
            this.setStyle(container, '--ims-grid-offset-start', offsetStart);
            this.setStyle(container, '--ims-grid-offset-end', offsetEnd);
        }
    }

    private cleanupContainers(): void {
        for (const container of this.activeContainers) {
            this.clearContainerStyles(container);
        }
        this.activeContainers.clear();
    }

    private clearContainerStyles(container: HTMLElement): void {
        this.renderer.removeStyle(container, 'display');
        this.renderer.removeStyle(container, 'align-items');
        this.renderer.removeStyle(container, 'box-sizing');
        this.removeStyle(container, 'column-gap');
        this.removeStyle(container, 'grid-template-columns');
        this.removeStyle(container, 'padding-inline-start');
        this.removeStyle(container, 'padding-inline-end');
        this.removeStyle(container, '--ims-grid-column-template');
        this.removeStyle(container, '--ims-grid-column-gap');
        this.removeStyle(container, '--ims-grid-offset-start');
        this.removeStyle(container, '--ims-grid-offset-end');
    }

    private setStyle(container: HTMLElement, name: string, value: string): void {
        this.renderer.setStyle(container, name, value, RendererStyleFlags2.DashCase);
    }

    private removeStyle(container: HTMLElement, name: string): void {
        this.renderer.removeStyle(container, name, RendererStyleFlags2.DashCase);
    }

    private resolveOffsetStart(): string {
        return this.offsetStart() !== undefined
            ? this.rowOffsetStartCss()
            : (this.grid?.defaultOffsetStart() ?? '0px');
    }

    private resolveOffsetEnd(): string {
        return this.offsetEnd() !== undefined
            ? this.rowOffsetEndCss()
            : (this.grid?.defaultOffsetEnd() ?? '0px');
    }

    setRenderOrder(order: number): void {
        this.renderer.setStyle(this.hostElement, 'order', `${order}`);
    }

    clearRenderOrder(): void {
        this.renderer.removeStyle(this.hostElement, 'order');
    }

    getHostElement(): HTMLElement {
        return this.hostElement;
    }

    /** Sort source priority: expansion-panel header cells, otherwise row primary container cells. */
    resolveSortValue(columnIndex: number): unknown {
        const headerCells = this.resolveExpansionHeaderCells();
        if (headerCells.length > 0) {
            return headerCells[columnIndex]?.textContent?.trim() ?? '';
        }

        const primaryContainerCells = this.resolvePrimaryContainerCells(this.ownCells());
        return primaryContainerCells[columnIndex]?.textValue ?? '';
    }

    resolveColumnWidth(columnIndex: number): string | null {
        const cells = this.resolvePrimaryContainerCells(this.ownCells());
        return cells[columnIndex]?.columnTrackCss ?? null;
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

function compensateOffset(baseOffset: string, insetInPx: number): string {
    if (insetInPx <= 0) {
        return baseOffset;
    }

    return `max(0px, calc(${baseOffset} - ${insetInPx.toFixed(3)}px))`;
}

function addOffset(baseOffset: string, additionInPx: number): string {
    if (additionInPx <= 0) {
        return baseOffset;
    }

    return `calc(${baseOffset} + ${additionInPx.toFixed(3)}px)`;
}

function hasAncestorGridRow(element: HTMLElement): boolean {
    const parent = element.parentElement;
    if (!parent) {
        return false;
    }

    return parent.closest('ims-grid-row, ims-grid-header') !== null;
}
