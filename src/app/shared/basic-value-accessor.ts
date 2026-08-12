import {booleanAttribute, computed, DestroyRef, Directive, forwardRef, inject, input, model, signal, Type} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {ReadonlyDirective} from './readonly.directive';

/**
 * Abstract base class that provides the ControlValueAccessor boilerplate for
 * components that integrate with Angular reactive and template-driven forms.
 *
 * - `value` — the current form value, updated by writeValue and by the component
 * - `id` — forwarded to the inner native form element; the host element's own
 *   `id` attribute is nulled out so assistive technology targets the real input
 * - `readonlyMode` — inherited from the nearest `ims-readonly` provider
 * - `interactionDisabled` — true when disabled or readonly
 * - All CVA callbacks are wired up automatically
 *
 * Usage:
 *   @Component({ providers: [provideValueAccessor(MyComponent)] })
 *   export class MyComponent extends BasicValueAccessor { ... }
 */
@Directive({
    host: {
        // Prevent the id from landing on the host element so it can be
        // forwarded to the inner native form control instead.
        '[attr.id]': 'null',
        '[class.ims-readonly]': 'readonlyMode()'
    }
})
export abstract class BasicValueAccessor<T = unknown> implements ControlValueAccessor {
    protected readonly destroyRef = inject(DestroyRef);

    protected readonly formDisabled = signal(false);
    protected onChange: (value: T) => void = () => undefined;
    protected onTouched: () => void = () => undefined;

    /** The current form value. Starts undefined (no form binding yet). */
    readonly value = model<T>();

    /**
     * Forwarded to the inner native form element via `[attr.id]="id()"` in
     * the component template. Defaults to null (no id).
     */
    readonly id = input<string | null>(null);

    /** Disabled state set via the `disabled` attribute or property binding. */
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    /** True when disabled via an attribute binding or by a parent form. */
    readonly disabled = computed(() => this.disabledInput() || this.formDisabled());

    /** True when inherited from the nearest `ims-readonly` provider. */
    readonly readonlyMode = ReadonlyDirective.injectSignal();

    /** True when interaction should be blocked by disabled or readonly state. */
    readonly interactionDisabled = computed(() => this.disabled() || this.readonlyMode());

    writeValue(value: T): void {
        this.value.set(value);
    }

    /** Sets the value and notifies the form, as if the user had changed it. */
    setValue(value: T): void {
        this.value.set(value);
        this.onChange(value);
    }

    registerOnChange(fn: (value: T) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.formDisabled.set(isDisabled);
    }

    markAsTouched(): void {
        this.onTouched();
    }
}

/**
 * Builds the NG_VALUE_ACCESSOR provider for a component.
 *
 * @example
 * providers: [provideValueAccessor(MyComponent)]
 */
export function provideValueAccessor(type: Type<unknown>) {
    return {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => type),
        multi: true
    };
}
