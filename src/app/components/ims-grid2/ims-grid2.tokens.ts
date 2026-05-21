import {InjectionToken, Signal} from '@angular/core';

export interface ImsGrid2RowContext {
    readonly cellCount: Signal<number>;
    readonly headerCellCount: Signal<number>;
    readonly isHeaderRow: boolean;
    getHostElement(): HTMLElement;
    resolveColumnTrack(columnIndex: number): string | null;
}

export interface ImsGrid2Context {
    readonly columnCount: Signal<number>;
    registerRow(row: ImsGrid2RowContext): void;
    unregisterRow(row: ImsGrid2RowContext): void;
}

export const IMS_GRID2_CONTEXT = new InjectionToken<ImsGrid2Context>('IMS_GRID2_CONTEXT');
