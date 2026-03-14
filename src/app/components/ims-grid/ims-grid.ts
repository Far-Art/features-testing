import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    computed,
    forwardRef,
    input,
    signal
} from '@angular/core';
import {IMS_GRID_CONTEXT, ImsGridContext, ImsGridRowContext} from './ims-grid.tokens';

@Component({
    selector: 'ims-grid',
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

    readonly gap = input<string | number>(16, {alias: 'columnGap'});
    readonly columnGap: Signal<string> = computed(() => toCssLength(this.gap()));
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

    registerRow(row: ImsGridRowContext): void {
        this.rows.update((rows) => rows.includes(row) ? rows : [...rows, row]);
    }

    unregisterRow(row: ImsGridRowContext): void {
        this.rows.update((rows) => rows.filter((current) => current !== row));
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
