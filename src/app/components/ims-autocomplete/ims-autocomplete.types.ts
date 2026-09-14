import {Observable} from 'rxjs';
import {
    ImsSelectionAutoMode,
    ImsSelectionCompareWith,
    ImsSelectionEditDialogMode,
    ImsSelectionToolbarSide,
    ImsSelectionViewMode
} from '../../shared/ims-selection/ims-selection.types';

export type ImsAutocompleteSortMode = 'default' | 'asc' | 'desc';
export type ImsAutocompleteToolbarMode = ImsSelectionAutoMode;
export type ImsAutocompleteToolbarSide = ImsSelectionToolbarSide;
export type ImsAutocompleteViewMode = ImsSelectionViewMode;
export type ImsAutocompleteEditDialogMode = ImsSelectionEditDialogMode;
export type ImsAutocompleteValue<T> = T | string | readonly T[] | null | undefined;

export interface ImsAutocompleteOption<T = unknown> {
    readonly value: T;
    readonly label: string;
    readonly disabled?: boolean;
}

export type ImsAutocompleteCompareWith<T> = ImsSelectionCompareWith<T>;

/** Label for a selected value that no known option describes. */
export type ImsAutocompleteDisplayWith<T> = (value: T) => string;

export type ImsAutocompleteOptionsResult<T> =
    | readonly ImsAutocompleteOption<T>[]
    | Promise<readonly ImsAutocompleteOption<T>[]>
    | Observable<readonly ImsAutocompleteOption<T>[]>;

export type ImsAutocompleteOptionsLoader<T> = (
    query: string
) => ImsAutocompleteOptionsResult<T>;

export interface ImsAutocompleteHighlightPart {
    readonly text: string;
    readonly match: boolean;
}
