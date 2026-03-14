import {
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
    selector: 'ims-grid-row',
    standalone: true,
    template: '<ng-content/>',
    styles: [
        `
            :host {
                display: block;
                width: 100%;
            }
        `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGridRow implements ImsGridRowContext {
    private readonly renderer = inject(Renderer2);
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly grid = inject(IMS_GRID_CONTEXT, {optional: true});
    private readonly cells = contentChildren(ImsGridCell, {descendants: true});
    private activeContainers = new Set<HTMLElement>();

    readonly offsetStart = input<string | number | undefined>(undefined);
    readonly offsetEnd = input<string | number | undefined>(undefined);

    readonly cellCount: Signal<number> = computed(() => this.cells().length);
    readonly headerCellCount: Signal<number> = computed(() =>
        this.cells().filter((cell) => cell.isHeader).length
    );
    readonly rowOffsetStartCss: Signal<string> = computed(() => toCssLength(this.offsetStart() ?? 0));
    readonly rowOffsetEndCss: Signal<string> = computed(() => toCssLength(this.offsetEnd() ?? 0));

    constructor() {
        this.grid?.registerRow(this);
        this.destroyRef.onDestroy(() => {
            this.grid?.unregisterRow(this);
            this.cleanupContainers();
        });

        effect(
            () => {
                const cells = this.cells();
                this.assignColumnIndexes(cells);
                this.syncContainers(cells);
            },
            {allowSignalWrites: true}
        );

        effect(() => {
            const columnCount = Math.max(this.grid?.columnCount() ?? this.cellCount(), 1);
            const columnGap = this.grid?.columnGap() ?? '0px';
            const offsetStart = this.resolveOffsetStart();
            const offsetEnd = this.resolveOffsetEnd();
            this.applyContainerStyles(columnCount, columnGap, offsetStart, offsetEnd);
        });
    }

    private assignColumnIndexes(cells: readonly ImsGridCell[]): void {
        cells.forEach((cell, index) => cell.setColumnIndex(index));
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
        this.applyContainerStyles(
            Math.max(this.grid?.columnCount() ?? this.cellCount(), 1),
            this.grid?.columnGap() ?? '0px',
            this.resolveOffsetStart(),
            this.resolveOffsetEnd()
        );
    }

    private applyContainerStyles(
        columnCount: number,
        columnGap: string,
        baseOffsetStart: string,
        baseOffsetEnd: string
    ): void {
        const hostRect = this.hostElement.getBoundingClientRect();

        for (const container of this.activeContainers) {
            const containerRect = container.getBoundingClientRect();
            const insetStart = Math.max(0, containerRect.left - hostRect.left);
            const insetEnd = Math.max(0, hostRect.right - containerRect.right);
            const offsetStart = compensateOffset(baseOffsetStart, insetStart);
            const offsetEnd = compensateOffset(baseOffsetEnd, insetEnd);

            this.renderer.setStyle(container, 'display', 'grid');
            this.renderer.setStyle(container, 'align-items', 'start');
            this.setStyle(container, 'column-gap', 'var(--ims-grid-column-gap)');
            this.setStyle(
                container,
                'grid-template-columns',
                'var(--ims-grid-offset-start) repeat(var(--ims-grid-column-count), minmax(0, 1fr)) var(--ims-grid-offset-end)'
            );
            this.setStyle(container, '--ims-grid-column-count', `${columnCount}`);
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
        this.removeStyle(container, 'column-gap');
        this.removeStyle(container, 'grid-template-columns');
        this.removeStyle(container, '--ims-grid-column-count');
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
