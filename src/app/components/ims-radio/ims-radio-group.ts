import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChildren,
    forwardRef,
    input,
    output,
    signal
} from '@angular/core';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {ImsSelectionCompareWith} from '../../shared/ims-selection/ims-selection.types';
import {toggleSelectedValue} from '../../shared/ims-selection/ims-selection.utils';
import {ImsRadio} from './ims-radio';
import {
    IMS_RADIO_GROUP,
    ImsRadioAppearance,
    ImsRadioGroupLayout,
    ImsRadioGroupParent,
    ImsRadioOption
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
        // BasicValueAccessor clears the host id and forwards it to an inner
        // native control. The group has none: its host is the element that ARIA
        // references point at, so the id stays here. Declared after the
        // inherited binding, so it runs later and wins.
        '[attr.id]': 'id()',
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
    private readonly generatedName = `ims-radio-group-${nextRadioGroupId++}`;
    private readonly optionComponents = contentChildren<ImsRadio<T>>(ImsRadio, {descendants: true});
    /**
     * The option the user last selected in single mode. While its value stays
     * selected, it alone holds the native check among options sharing that value.
     */
    private readonly userPickedOption = signal<ImsRadioOption | null>(null);

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

    // Reads only the asking option's value and the picked option's. Another
    // option's required `value` may not be set yet while this one renders.
    isNativeChecked(option: ImsRadioOption<T>): boolean {
        if (!this.isSelected(option.value())) return false;
        // Checkboxes have no `name` limit, so every option holding a value is checked.
        if (this.multiple()) return true;
        // A `name` holds only one checked radio, and the browser unchecks the rest
        // as soon as another is checked. Among options sharing the selected value,
        // the one the user picked keeps the check, so the binding never fights the
        // browser over it. Before any pick they are all bound checked and the
        // browser keeps the last one it was given.
        const picked = this.userPickedOption();
        return picked === null || picked === option || !this.isSelected(picked.value() as T);
    }

    removeOption(option: ImsRadioOption<T>): void {
        if (this.userPickedOption() === option) {
            this.userPickedOption.set(null);
        }
    }

    selectFromUser(option: ImsRadioOption<T>, checked: boolean): void {
        if (this.interactionDisabled()) return;
        const value = option.value();

        if (this.multiple()) {
            if (this.isSelected(value) === checked) return;
        } else {
            // A native radio only reports being checked; it is unchecked by its sibling.
            if (!checked) return;
            // Picking a duplicate of the selected value changes no value, but that
            // option now holds the browser's check, so the binding follows it.
            this.userPickedOption.set(option);
            if (this.isSelected(value)) return;
        }

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

    /**
     * The option a user tabbing into the group would land on: the one the
     * browser holds checked, else the first that is not disabled. The host
     * carries the group's ARIA but takes no focus of its own, and the first
     * option is only one of several the group may offer.
     */
    protected override focusTarget(): HTMLElement | null {
        const inputs = this.optionComponents()
            .map((option) => option.nativeInput()?.nativeElement)
            .filter((input): input is HTMLInputElement => input !== undefined && !input.disabled);

        return inputs.find((input) => input.checked) ?? inputs[0] ?? null;
    }
}
