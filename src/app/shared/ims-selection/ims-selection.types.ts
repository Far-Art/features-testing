import {InjectionToken} from '@angular/core';

/** Which options a multi-selection panel lists: all, only the selected, or only the unselected. */
export type ImsSelectionViewMode = 'all' | 'selected' | 'unselected';

/** Whether a panel feature is always shown, never shown, or shown once the option count reaches a threshold. */
export type ImsSelectionAutoMode = 'on' | 'off' | 'auto';

/** Side of the options panel the multi-selection toolbar sits on. */
export type ImsSelectionToolbarSide = 'left' | 'right';

/**
 * What the toolbar edit action does: open the built-in transfer dialog
 * (`default`), emit a request for a consumer-owned workflow (`custom`), or
 * nothing, because it is hidden (`off`).
 */
export type ImsSelectionEditDialogMode = 'default' | 'custom' | 'off';

/** Side of the field the options panel opened on. */
export type ImsSelectionOverlaySide = 'above' | 'below';

/** Equality used to match values against options. */
export type ImsSelectionCompareWith<T> = (first: T, second: T) => boolean;

/** A multi selection compacted to fit its trigger. */
export interface ImsSelectionDisplayState {
    /** Labels that fit, comma-joined, ending in an ellipsis when some were left out. */
    readonly text: string;
    /** Selected values counted in the overflow badge instead of listed. */
    readonly overflowCount: number;
    /** True when not even the first label fits whole, so it is truncated. */
    readonly firstTruncated: boolean;
}

export const IMS_SELECTION_EMPTY_DISPLAY: ImsSelectionDisplayState = {
    text: '',
    overflowCount: 0,
    firstTruncated: false
};

/** Text rendered by `ims-select` and `ims-autocomplete`. */
export interface ImsSelectionLabels {
    /** Placeholder of an empty `ims-select`. */
    readonly selectPlaceholder: string;
    /** Placeholder of an empty `ims-autocomplete`. */
    readonly autocompletePlaceholder: string;
    /** Visible label of the `ims-select` filter field. */
    readonly filter: string;
    /** Visible label of the multi `ims-autocomplete` search field. */
    readonly search: string;
    /** Shown when no option matches. */
    readonly noOptions: string;
    /** Shown while async options load. */
    readonly loading: string;
    /** Accessible name of the `clearable` single-select clear button. */
    readonly clear: string;
    /** Accessible name of the multi-selection toolbar. */
    readonly toolbar: string;
    /** Accessible name of the view-mode segment group. */
    readonly viewModes: string;
    /** Accessible name of the segment listing every option. */
    readonly showAll: string;
    /** Accessible name of the segment listing selected options. */
    readonly showSelected: string;
    /** Accessible name of the segment listing unselected options. */
    readonly showUnselected: string;
    /** Default accessible name of the toolbar edit action. */
    readonly editSelection: string;
    /** Title of the built-in edit dialog. */
    readonly editDialogTitle: string;
    /** Title of the option list inside the built-in edit dialog. */
    readonly editDialogOptions: string;
    /** Readonly panel title when exactly one value is selected. */
    readonly selectedOne: string;
    /** Readonly panel title otherwise. `{count}` is replaced with the number of values. */
    readonly selectedMany: string;
    /** Readonly panel body when nothing is selected. */
    readonly noneSelected: string;
}

export const IMS_SELECTION_DEFAULT_LABELS: ImsSelectionLabels = {
    selectPlaceholder: 'בחר',
    autocompletePlaceholder: 'חיפוש',
    filter: 'סינון',
    search: 'חיפוש',
    noOptions: 'אין אפשרויות',
    loading: 'טוען...',
    clear: 'נקה בחירה',
    toolbar: 'סרגל בחירה',
    viewModes: 'אפשרויות מוצגות',
    showAll: 'הצג את כל האפשרויות',
    showSelected: 'הצג אפשרויות שנבחרו',
    showUnselected: 'הצג אפשרויות שלא נבחרו',
    editSelection: 'ערוך בחירה',
    editDialogTitle: 'עריכת בחירה',
    editDialogOptions: 'אפשרויות',
    selectedOne: 'ערך אחד נבחר',
    selectedMany: '{count} ערכים שנבחרו',
    noneSelected: 'לא נבחרו ערכים'
};

/**
 * Application-wide selection labels. Override with a root provider; a single
 * instance can still replace individual texts through its `labels` input.
 */
export const IMS_SELECTION_LABELS = new InjectionToken<ImsSelectionLabels>(
    'IMS_SELECTION_LABELS',
    {
        providedIn: 'root',
        factory: () => IMS_SELECTION_DEFAULT_LABELS
    }
);
