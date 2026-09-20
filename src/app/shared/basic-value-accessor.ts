import {
    booleanAttribute,
    computed,
    DestroyRef,
    Directive,
    ElementRef,
    forwardRef,
    inject,
    input,
    model,
    signal,
    Type
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {findFocusable, findMainControl} from './ims-focus-target';
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
 * - `focus()` — moves focus to the control from code
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
    protected readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;

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

    /**
     * Moves focus to the control, landing where a user tabbing into the field
     * would, and doing nothing where tabbing would reach nothing: before the
     * view has rendered, or while the control renders a disabled native
     * element. `ims-checkbox` and `ims-datepicker` disable theirs in readonly
     * mode as well as disabled, so neither takes focus in either state.
     *
     * Focus has whatever effect the control gives a real one: an
     * `ims-autocomplete` opens its panel, as clicking its input does.
     */
    focus(options?: FocusOptions): void {
        this.focusTarget()?.focus(options);
    }

    /**
     * The element `focus()` moves focus to. Every control here overrides this
     * with a view or content reference to the element it actually renders,
     * because the fallback below answers from template order and would pick a
     * different element the moment one is added before it.
     *
     * The fallback stands for controls that have not: the
     * `[data-ims-main-control]` part of the field when it marks one, else the
     * first focusable element inside it. That is also how `ims-error-popover`
     * picks the element it puts `aria-invalid` on, so a control leaving this
     * alone keeps focus and validation ARIA on the same element. One that
     * overrides it is responsible for keeping them together.
     */
    protected focusTarget(): HTMLElement | null {
        return findFocusable(findMainControl(this.hostElement));
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
