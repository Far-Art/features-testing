import {InjectionToken, Signal} from '@angular/core';

/**
 * Mark an option draws when selected: the green checkmark, or the grey X of a
 * reject option.
 */
export type ImsToggleSwitchAppearance = 'check' | 'reject';

/** What an `ims-toggle-switch-option` reads from, and reports to, its switch. */
export interface ImsToggleSwitchParent<T = unknown> {
    /** Native `name` the two radios share. Generated, so every switch is its own group. */
    readonly groupName: string;
    readonly interactionDisabled: Signal<boolean>;
    isSelected(value: T): boolean;
    /** Applies the user picking an option through its native radio. */
    selectFromUser(value: T): void;
}

export const IMS_TOGGLE_SWITCH = new InjectionToken<ImsToggleSwitchParent>('IMS_TOGGLE_SWITCH');
