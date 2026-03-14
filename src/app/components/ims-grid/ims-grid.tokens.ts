import {InjectionToken, Signal} from '@angular/core';

export interface ImsGridRowContext {
    readonly cellCount: Signal<number>;
    readonly headerCellCount: Signal<number>;
    readonly rowOffsetStartCss: Signal<string>;
    readonly rowOffsetEndCss: Signal<string>;
}

export interface ImsGridContext {
    readonly columnCount: Signal<number>;
    readonly columnGap: Signal<string>;
    readonly defaultOffsetStart: Signal<string>;
    readonly defaultOffsetEnd: Signal<string>;
    registerRow(row: ImsGridRowContext): void;
    unregisterRow(row: ImsGridRowContext): void;
}

export const IMS_GRID_CONTEXT = new InjectionToken<ImsGridContext>('IMS_GRID_CONTEXT');
