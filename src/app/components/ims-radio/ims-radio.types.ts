import {InjectionToken, Signal} from '@angular/core';

/** Visual style of an option: a dotted circle, or a circle that fills with a checkmark. */
export type ImsRadioAppearance = 'radio' | 'check';

/** Arrangement of the options inside a group: one per row, or a wrapping row. */
export type ImsRadioGroupLayout = 'stacked' | 'inline';

/** The part of an `ims-radio` its group reads. */
export interface ImsRadioOption<T = unknown> {
    readonly value: Signal<T>;
}

/** What an `ims-radio` reads from, and reports to, its group. */
export interface ImsRadioGroupParent<T = unknown> {
    readonly multiple: Signal<boolean>;
    readonly appearance: Signal<ImsRadioAppearance>;
    /** Native `name` shared by the options in single mode. */
    readonly groupName: Signal<string>;
    readonly interactionDisabled: Signal<boolean>;
    /** Whether the value is selected; every option holding it shows as selected. */
    isSelected(value: T): boolean;
    /**
     * Whether this option's native input is checked. In single mode a `name`
     * holds only one checked radio, so of several options sharing the selected
     * value only one is natively checked.
     */
    isNativeChecked(option: ImsRadioOption<T>): boolean;
    /** Applies a user selection change made through one option's native input. */
    selectFromUser(option: ImsRadioOption<T>, checked: boolean): void;
    /** Forgets a destroyed option, so it stops holding the native check. */
    removeOption(option: ImsRadioOption<T>): void;
}

export const IMS_RADIO_GROUP = new InjectionToken<ImsRadioGroupParent>('IMS_RADIO_GROUP');
