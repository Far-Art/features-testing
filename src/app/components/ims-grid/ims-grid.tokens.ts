import {InjectionToken, Signal} from '@angular/core';

export type ImsSortDirection = 'asc' | 'desc' | '';

export interface ImsSortState {
    readonly active: string | null;
    readonly direction: ImsSortDirection;
}

export interface ImsSortHeaderContext {
    getField(): string;
    getColumnIndex(): number;
}

export interface ImsGridRowContext {
    readonly cellCount: Signal<number>;
    readonly headerCellCount: Signal<number>;
    readonly rowOffsetStartCss: Signal<string>;
    readonly rowOffsetEndCss: Signal<string>;
    readonly isHeaderRow: boolean;
    getHostElement(): HTMLElement;
    setRenderOrder(order: number): void;
    resolveSortValue(columnIndex: number): unknown;
    resolveColumnWidth(columnIndex: number): string | null;
}

export interface ImsGridContext {
    readonly columnCount: Signal<number>;
    readonly columnTemplate: Signal<string>;
    readonly columnGap: Signal<string>;
    readonly defaultOffsetStart: Signal<string>;
    readonly defaultOffsetEnd: Signal<string>;
    readonly viewportScrollbarWidth: Signal<number>;
    readonly sortState: Signal<ImsSortState>;
    readonly activeColumnIndex: Signal<number | null>;
    registerRow(row: ImsGridRowContext): void;
    unregisterRow(row: ImsGridRowContext): void;
    registerSortHeader(header: ImsSortHeaderContext): void;
    unregisterSortHeader(header: ImsSortHeaderContext): void;
    toggleSort(field: string): void;
    getSortDirection(field: string): ImsSortDirection;
    setHoveredColumn(columnIndex: number | null): void;
    setFocusedColumn(columnIndex: number | null): void;
}

export const IMS_GRID_CONTEXT = new InjectionToken<ImsGridContext>('IMS_GRID_CONTEXT');
