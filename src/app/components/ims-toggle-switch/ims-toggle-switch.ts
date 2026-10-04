import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    contentChildren,
    forwardRef,
    input,
    output
} from '@angular/core';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {ImsSelectionCompareWith} from '../../shared/ims-selection/ims-selection.types';
import {ImsToggleSwitchOption} from './ims-toggle-switch-option';
import {IMS_TOGGLE_SWITCH, ImsToggleSwitchParent} from './ims-toggle-switch.types';

const defaultCompare = <T>(first: T, second: T) => first === second;

let nextToggleSwitchId = 0;

@Component({
    selector: 'ims-toggle-switch',
    standalone: true,
    template: '<ng-content />',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideValueAccessor(ImsToggleSwitch),
        {provide: IMS_TOGGLE_SWITCH, useExisting: forwardRef(() => ImsToggleSwitch)}
    ],
    host: {
        class: 'ims-toggle-switch-host',
        // Static, not bound: ims-error-popover reads the role to put the
        // validation ARIA on this host rather than on the first option.
        role: 'radiogroup',
        // The switch, not its first option, owns the field label and the
        // validation ARIA: see ims-form-field and ims-error-popover.
        'data-ims-main-control': '',
        'data-ims-labelled-group': '',
        // BasicValueAccessor clears the host id and forwards it to an inner
        // native control. The switch has two: its host is the element that ARIA
        // references point at, so the id stays here. Declared after the
        // inherited binding, so it runs later and wins.
        '[attr.id]': 'id()',
        '[attr.aria-required]': 'required() || null',
        '[attr.aria-disabled]': 'disabled() || null',
        '(focusout)': 'onFocusOut($event)'
    }
})
/**
 * Form-compatible switch between two `ims-toggle-switch-option`s, such as
 * yes / no or approve / reject.
 *
 * Behaves as a radio group: the options render native radios sharing a
 * generated `name`, and a selected option stays selected when clicked again.
 * Nothing is selected until the user picks an option or a value is written,
 * and a form reset clears the selection again.
 *
 * A user pick writes the form and emits `selectionChange`; form writes and
 * `value` bindings never emit.
 */
export class ImsToggleSwitch<T = unknown> extends BasicValueAccessor<T | null>
    implements ImsToggleSwitchParent<T> {
    private readonly options = contentChildren<ImsToggleSwitchOption<T>>(ImsToggleSwitchOption, {descendants: true});

    /** Matches the form value against option values, for object values. */
    readonly compareWith = input<ImsSelectionCompareWith<T>>(defaultCompare);
    /**
     * Announces the switch as required. Validation itself comes from Angular's
     * `required` validator, which already treats `null` as empty.
     */
    readonly required = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});

    /**
     * Emitted only when the user picks an option, with its value. Form writes
     * and `value` bindings do not emit.
     */
    readonly selectionChange = output<T>();

    // Generated, with no input to set it: a name repeated across table rows
    // would make the browser treat every row's radios as one group.
    readonly groupName = `ims-toggle-switch-${nextToggleSwitchId++}`;

    isSelected(value: T): boolean {
        const current = this.value();
        // `== null` rather than a falsy test: `false` and `0` are option values.
        if (current == null) return false;
        return this.compareWith()(current, value);
    }

    selectFromUser(value: T): void {
        if (!this.interactionDisabled() && !this.isSelected(value)) {
            this.value.set(value);
            this.onChange(value);
            this.selectionChange.emit(value);
        }
        this.syncNativeChecked();
    }

    // Arrow keys move between the options; only leaving the switch touches it.
    onFocusOut(event: FocusEvent): void {
        const nextFocus = event.relatedTarget;
        if (nextFocus instanceof Node && this.hostElement.contains(nextFocus)) return;
        this.markAsTouched();
    }

    /**
     * The option a user tabbing into the switch would land on: the checked
     * one, else the first that is not disabled. `checked` is safe to read here
     * because `syncNativeChecked` keeps it equal to the value.
     */
    protected override focusTarget(): HTMLElement | null {
        const inputs = this.options()
            .map((option) => option.nativeInput()?.nativeElement)
            .filter((input): input is HTMLInputElement => input !== undefined && !input.disabled);

        return inputs.find((input) => input.checked) ?? inputs[0] ?? null;
    }

    /**
     * Puts every native radio's checked state back in line with the value.
     *
     * By the time `change` fires, the browser has already moved its check to
     * the radio the user clicked. A handler that writes the value back in the
     * same turn changes no `[checked]` binding, so without this the clicked
     * radio would stay checked: it would be drawn and announced as selected,
     * and clicking it again would fire no `change`.
     */
    private syncNativeChecked(): void {
        for (const option of this.options()) {
            const input = option.nativeInput()?.nativeElement;
            if (input !== undefined) {
                input.checked = option.selected();
            }
        }
    }
}
