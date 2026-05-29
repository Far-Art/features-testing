import {InjectionToken, Signal} from '@angular/core';

export type ImsSelectFilterMode = 'on' | 'off' | 'auto';
export type ImsSelectToolbarMode = 'on' | 'off' | 'auto';
export type ImsSelectViewMode = 'all' | 'selected' | 'unselected';
export type ImsSelectToolbarSide = 'left' | 'right';
export type ImsSelectCompareWith<T> = (first: T, second: T) => boolean;

export interface ImsSelectOptionLike<T = unknown> {
    readonly id: string;
    readonly value: Signal<T>;
    readonly disabled: Signal<boolean>;
    readonly selectionLabel: Signal<string>;
    scrollIntoView(): void;
}

export type ImsSelectFilterPredicate<T> = (
    query: string,
    option: ImsSelectOptionLike<T>
) => boolean;

export interface ImsSelectParent<T = unknown> {
    isOptionSelected(option: ImsSelectOptionLike<T>): boolean;
    isOptionActive(option: ImsSelectOptionLike<T>): boolean;
    isOptionVisible(option: ImsSelectOptionLike<T>): boolean;
    selectOption(option: ImsSelectOptionLike<T>, event?: Event): void;
    activateOption(option: ImsSelectOptionLike<T>): void;
}

export const IMS_SELECT_PARENT = new InjectionToken<ImsSelectParent>('IMS_SELECT_PARENT');
