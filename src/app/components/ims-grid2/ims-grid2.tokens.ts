import {InjectionToken, Signal} from '@angular/core';

export type ImsGrid2Appearance = 'default' | 'styled';

/** Internal row contract consumed by the root grid to derive column count and track sizing. */
export interface ImsGrid2RowContext {
    /** Number of logical cells in the row's largest direct cell container. */
    readonly cellCount: Signal<number>;
    /** Number of logical header cells, or `0` for body rows. */
    readonly headerCellCount: Signal<number>;
    /** Whether the row host is an `ims-grid2-header`. */
    readonly isHeaderRow: boolean;
    /** Returns the row/header host element used for ownership and DOM relation checks. */
    getHostElement(): HTMLElement;
    /** Returns a header-declared CSS track for the requested column, when one exists. */
    resolveColumnTrack(columnIndex: number): string | null;
}

/** Internal root grid contract injected by rows and related directives. */
export interface ImsGrid2Context {
    /** Appearance selected on the root grid. */
    readonly appearance: Signal<ImsGrid2Appearance>;
    /** Number of logical data columns shared by all subgrid rows. */
    readonly columnCount: Signal<number>;
    /** Registers a row/header so the root grid can derive the shared column template. */
    registerRow(row: ImsGrid2RowContext): void;
    /** Removes a row/header from root grid calculations. */
    unregisterRow(row: ImsGrid2RowContext): void;
}

/** Injection token used to connect projected grid rows/cells to their owning root grid. */
export const IMS_GRID2_CONTEXT = new InjectionToken<ImsGrid2Context>('IMS_GRID2_CONTEXT');
