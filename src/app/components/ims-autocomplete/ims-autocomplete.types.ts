import {Observable} from 'rxjs';

export type ImsAutocompleteSortMode = 'default' | 'asc' | 'desc';
export type ImsAutocompleteToolbarMode = 'on' | 'off' | 'auto';
export type ImsAutocompleteToolbarSide = 'left' | 'right';
export type ImsAutocompleteViewMode = 'all' | 'selected' | 'unselected';
export type ImsAutocompleteValue<T> = T | string | readonly T[] | null | undefined;

export interface ImsAutocompleteOption<T = unknown> {
    readonly value: T;
    readonly label: string;
    readonly disabled?: boolean;
}

export type ImsAutocompleteCompareWith<T> = (first: T, second: T) => boolean;
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
