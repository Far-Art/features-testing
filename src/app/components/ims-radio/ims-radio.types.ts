import {InjectionToken, Signal} from '@angular/core';

/** Visual style of an option: a dotted circle, or a circle that fills with a checkmark. */
export type ImsRadioAppearance = 'radio' | 'check';

/** Arrangement of the options inside a group: one per row, or a wrapping row. */
export type ImsRadioGroupLayout = 'stacked' | 'inline';

/** What an `ims-radio` reads from, and reports to, its group. */
export interface ImsRadioGroupParent<T = unknown> {
    readonly multiple: Signal<boolean>;
    readonly appearance: Signal<ImsRadioAppearance>;
    /** Native `name` shared by the options in single mode. */
    readonly groupName: Signal<string>;
    readonly interactionDisabled: Signal<boolean>;
    isSelected(value: T): boolean;
    /** Applies a user selection change made through one option's native input. */
    selectFromUser(value: T, checked: boolean): void;
}

export const IMS_RADIO_GROUP = new InjectionToken<ImsRadioGroupParent>('IMS_RADIO_GROUP');
