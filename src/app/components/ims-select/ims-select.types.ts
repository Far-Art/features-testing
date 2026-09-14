import {InjectionToken, Signal} from '@angular/core';
import {
    ImsSelectionAutoMode,
    ImsSelectionCompareWith,
    ImsSelectionEditDialogMode,
    ImsSelectionToolbarSide,
    ImsSelectionViewMode
} from '../../shared/ims-selection/ims-selection.types';

export type ImsSelectFilterMode = ImsSelectionAutoMode;
export type ImsSelectToolbarMode = ImsSelectionAutoMode;
export type ImsSelectEditDialogMode = ImsSelectionEditDialogMode;
export type ImsSelectViewMode = ImsSelectionViewMode;
export type ImsSelectToolbarSide = ImsSelectionToolbarSide;
export type ImsSelectActivationSource = 'selection' | 'pointer';
export type ImsSelectCompareWith<T> = ImsSelectionCompareWith<T>;

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
    activateOption(
        option: ImsSelectOptionLike<T>,
        source?: ImsSelectActivationSource
    ): void;
}

export const IMS_SELECT_PARENT = new InjectionToken<ImsSelectParent>('IMS_SELECT_PARENT');
