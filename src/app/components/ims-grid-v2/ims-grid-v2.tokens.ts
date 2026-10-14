import {InjectionToken, Signal} from '@angular/core';


export type ImsGridAppearanceV2 = 'default';

/**
 * What an `ims-grid-v2` is to assistive technology.
 *
 * `null` is a bare grid used for layout, such as a form; `table` and `grid` are
 * what `ims-table` makes it, without and with `interactive`.
 */
export type ImsGridSemanticsV2 = 'table' | 'grid' | null;

/** Internal row contract consumed by the root grid to derive column count and track sizing. */
export interface ImsGridRowContextV2 {
    /** Number of logical cells in the row's largest direct cell container. */
    readonly cellCount: Signal<number>;
    /** Number of logical header cells, or `0` for body rows. */
    readonly headerCellCount: Signal<number>;
    /** Whether the row host is an `ims-grid-header-v2`. */
    readonly isHeaderRow: boolean;

    /** Returns the row/header host element used for ownership and DOM relation checks. */
    getHostElement(): HTMLElement;

    /** Returns a header-declared CSS track for the requested column, when one exists. */
    resolveColumnTrack(columnIndex: number): string | null;
}

/** Internal root grid contract injected by rows and related directives. */
export interface ImsGridContextV2 {
    /** Appearance selected on the root grid. */
    readonly appearance: Signal<ImsGridAppearanceV2>;
    /** Number of logical data columns shared by all subgrid rows. */
    readonly columnCount: Signal<number>;
    /** ARIA semantics rows and cells take their roles from. */
    readonly semantics: Signal<ImsGridSemanticsV2>;

    /** Registers a row/header so the root grid can derive the shared column template. */
    registerRow(row: ImsGridRowContextV2): void;

    /** Removes a row/header from root grid calculations. */
    unregisterRow(row: ImsGridRowContextV2): void;
}

/** Injection token used to connect projected grid rows/cells to their owning root grid. */
export const IMS_GRID_CONTEXT_V2 = new InjectionToken<ImsGridContextV2>('IMS_GRID_CONTEXT_V2');

/** Connects projected cells to their nearest row or header. */
export const IMS_GRID_ROW_CONTEXT_V2 = new InjectionToken<ImsGridRowContextV2>('IMS_GRID_ROW_CONTEXT_V2');
