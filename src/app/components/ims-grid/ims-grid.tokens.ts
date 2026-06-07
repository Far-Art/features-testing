import {InjectionToken, Signal} from '@angular/core';


export type ImsGridAppearance = 'default' | 'styled';

/** Internal row contract consumed by the root grid to derive column count and track sizing. */
export interface ImsGridRowContext {
    /** Number of logical cells in the row's largest direct cell container. */
    readonly cellCount: Signal<number>;
    /** Number of logical header cells, or `0` for body rows. */
    readonly headerCellCount: Signal<number>;
    /** Whether the row host is an `ims-grid-header`. */
    readonly isHeaderRow: boolean;

    /** Returns the row/header host element used for ownership and DOM relation checks. */
    getHostElement(): HTMLElement;

    /** Returns a header-declared CSS track for the requested column, when one exists. */
    resolveColumnTrack(columnIndex: number): string | null;
}

/** Internal root grid contract injected by rows and related directives. */
export interface ImsGridContext {
    /** Appearance selected on the root grid. */
    readonly appearance: Signal<ImsGridAppearance>;
    /** Number of logical data columns shared by all subgrid rows. */
    readonly columnCount: Signal<number>;

    /** Registers a row/header so the root grid can derive the shared column template. */
    registerRow(row: ImsGridRowContext): void;

    /** Removes a row/header from root grid calculations. */
    unregisterRow(row: ImsGridRowContext): void;
}

/** Injection token used to connect projected grid rows/cells to their owning root grid. */
export const IMS_GRID_CONTEXT = new InjectionToken<ImsGridContext>('IMS_GRID_CONTEXT');
