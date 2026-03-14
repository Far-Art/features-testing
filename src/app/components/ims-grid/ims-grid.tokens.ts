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
}

export interface ImsGridContext {
    readonly columnCount: Signal<number>;
    readonly columnGap: Signal<string>;
    readonly defaultOffsetStart: Signal<string>;
    readonly defaultOffsetEnd: Signal<string>;
    readonly sortState: Signal<ImsSortState>;
    registerRow(row: ImsGridRowContext): void;
    unregisterRow(row: ImsGridRowContext): void;
    registerSortHeader(header: ImsSortHeaderContext): void;
    unregisterSortHeader(header: ImsSortHeaderContext): void;
    toggleSort(field: string): void;
    getSortDirection(field: string): ImsSortDirection;
}

export const IMS_GRID_CONTEXT = new InjectionToken<ImsGridContext>('IMS_GRID_CONTEXT');
