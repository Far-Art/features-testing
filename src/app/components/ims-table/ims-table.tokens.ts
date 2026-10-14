import {InjectionToken, Signal} from '@angular/core';


/** A row registered with its table: what the table needs to move focus through it. */
export interface ImsTableRowRef {
    /** The row element, a `tr` or an `ims-grid-row-v2`. */
    readonly element: HTMLElement;
    /** The row's item index in a virtual viewport, when the template binds it. */
    readonly index: Signal<number | null>;

    /** Makes the row the table's tab stop (`0`), focusable by script only (`-1`), or not focusable (`null`). */
    setTabIndex(tabIndex: number | null): void;

    /**
     * Puts the controls inside the row in the tab order (`true`), or takes them
     * out of it (`false`) while leaving them clickable.
     */
    setContentTabbable(tabbable: boolean): void;

    /** Re-applies the current setting after content inside the row changed. */
    refreshContentTabbable(): void;
}

/** The table contract injected by `ims-table-row` and by an `ims-grid-v2` that carries `ims-table`. */
export interface ImsTableContext {
    /** Whether rows take focus, answer the keyboard, and emit their click outputs. */
    readonly interactive: Signal<boolean>;

    /** Adds a row to keyboard navigation. */
    registerRow(row: ImsTableRowRef): void;

    /** Removes a row from keyboard navigation. */
    unregisterRow(row: ImsTableRowRef): void;

    /** Records that focus moved into `row`, making it the table's tab stop. */
    activateRow(row: ImsTableRowRef): void;

    /** Moves focus for a navigation key pressed on `row`. Returns whether the key was handled. */
    navigate(row: ImsTableRowRef, event: KeyboardEvent): boolean;
}

/** Connects rows, and the `ims-grid-v2` the directive sits on, to their nearest `ims-table`. */
export const IMS_TABLE_CONTEXT = new InjectionToken<ImsTableContext>('IMS_TABLE_CONTEXT');
