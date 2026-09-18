import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    forwardRef,
    inject,
    input,
    output
} from '@angular/core';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {ImsSelectionCompareWith} from '../../shared/ims-selection/ims-selection.types';
import {toggleSelectedValue} from '../../shared/ims-selection/ims-selection.utils';
import {
    IMS_RADIO_GROUP,
    ImsRadioAppearance,
    ImsRadioGroupLayout,
    ImsRadioGroupParent
} from './ims-radio.types';

/** Single mode holds one value, multiple mode an array; `null` is no selection. */
export type ImsRadioGroupValue<T> = T | readonly T[] | null;

const defaultCompare = <T>(first: T, second: T) => first === second;

let nextRadioGroupId = 0;

@Component({
    selector: 'ims-radio-group',
    standalone: true,
    template: '<ng-content />',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideValueAccessor(ImsRadioGroup),
        {provide: IMS_RADIO_GROUP, useExisting: forwardRef(() => ImsRadioGroup)}
    ],
    host: {
        class: 'ims-radio-group-host',
        // The group, not its first option, owns the field label and the
        // validation ARIA: see ims-form-field and ims-error-popover.
        'data-ims-main-control': '',
        'data-ims-labelled-group': '',
        '[attr.role]': 'multiple() ? "group" : "radiogroup"',
        '[attr.aria-required]': '(required() && !multiple()) || null',
        '[attr.aria-disabled]': 'disabled() || null',
        '[attr.data-layout]': 'layout()',
        '(focusout)': 'onFocusOut($event)'
    }
})
/**
 * Form-compatible group of `ims-radio` options.
 *
 * Single mode writes the selected option's value and renders native radios
 * that share one `name`. Multiple mode writes a new array of values, in the
 * order the user selected them, and renders native checkboxes drawn as
 * circles, so assistive technology announces a multi-select correctly.
 *
 * A user selection writes the form and emits `selectionChange`; form writes
 * and `value` bindings never emit.
 */
export class ImsRadioGroup<T = unknown> extends BasicValueAccessor<ImsRadioGroupValue<T>>
    implements ImsRadioGroupParent<T> {
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private readonly generatedName = `ims-radio-group-${nextRadioGroupId++}`;

    /** Lets the user select any number of options; the value becomes an array. */
    readonly multiple = input(false, {transform: booleanAttribute});
    /** Style of every option that does not set its own `appearance`. */
    readonly appearance = input<ImsRadioAppearance>('radio');
    readonly layout = input<ImsRadioGroupLayout>('stacked');
    /** Matches the form value against option values, for object values. */
    readonly compareWith = input<ImsSelectionCompareWith<T>>(defaultCompare);
    /** Native `name` shared by the options in single mode. Generated when omitted. */
    readonly name = input<string | null>(null);
    /**
     * Announces the group as required. Validation itself comes from Angular's
     * `required` validator, which already treats `null` and `[]` as empty.
     */
    readonly required = input(false, {transform: booleanAttribute});

    /**
     * Emitted only when the user changes the selection, with the new group
     * value. Form writes and `value` bindings do not emit.
     */
    readonly selectionChange = output<ImsRadioGroupValue<T>>();

    readonly groupName = computed(() => this.name() ?? this.generatedName);

    // A scalar in multiple mode counts as a one-value selection, as in ims-select.
    readonly selectedValues = computed<readonly T[]>(() => {
        const value = this.value();
        if (value === null || value === undefined) return [];
        if (this.multiple() && Array.isArray(value)) return value as readonly T[];
        return [value as T];
    });

    isSelected(value: T): boolean {
        const equals = this.compareWith();
        return this.selectedValues().some((selectedValue) => equals(selectedValue, value));
    }

    selectFromUser(value: T, checked: boolean): void {
        if (this.interactionDisabled() || this.isSelected(value) === checked) return;
        // A native radio only reports being checked; it is unchecked by its sibling.
        if (!this.multiple() && !checked) return;

        const nextValue = this.multiple()
            ? toggleSelectedValue(this.selectedValues(), value, this.compareWith())
            : value;

        this.value.set(nextValue);
        this.onChange(nextValue);
        this.selectionChange.emit(nextValue);
    }

    // Arrow keys move focus between options; only leaving the group touches it.
    onFocusOut(event: FocusEvent): void {
        const nextFocus = event.relatedTarget;
        if (nextFocus instanceof Node && this.hostElement.contains(nextFocus)) return;
        this.markAsTouched();
    }
}
