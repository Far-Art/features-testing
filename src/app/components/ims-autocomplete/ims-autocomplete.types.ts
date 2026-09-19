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

/**
 * An option as the components accept it: a full option, or a string that is
 * both the value and the label of one. A `string[]` source makes `T` `string`.
 * Written as a conditional type because TypeScript infers `T` through it, and
 * not through `T & string`.
 */
export type ImsAutocompleteOptionInput<T = unknown> =
    | ImsAutocompleteOption<T>
    | (T extends string ? T : never);

export type ImsAutocompleteCompareWith<T> = ImsSelectionCompareWith<T>;

/** Label for a selected value that no known option describes. */
export type ImsAutocompleteDisplayWith<T> = (value: T) => string;

export type ImsAutocompleteOptionsResult<T> =
    | readonly ImsAutocompleteOptionInput<T>[]
    | Promise<readonly ImsAutocompleteOptionInput<T>[]>
    | Observable<readonly ImsAutocompleteOptionInput<T>[]>;

export type ImsAutocompleteOptionsLoader<T> = (
    query: string
) => ImsAutocompleteOptionsResult<T>;

export interface ImsAutocompleteHighlightPart {
    readonly text: string;
    readonly match: boolean;
}
