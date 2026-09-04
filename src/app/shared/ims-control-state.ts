import { Signal, computed, effect, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReadonlyDirective } from './readonly.directive';

/** Native text field whose state this helper tracks. */
export type ImsTextFieldElement = HTMLInputElement | HTMLTextAreaElement;

/** Reactive disabled and readonly state of one native form field. */
export interface ImsControlState {
  /** True while the Angular control or the native element is disabled. */
  readonly disabled: Signal<boolean>;
  /** True while the element is natively readonly or sits in a readonly scope. */
  readonly readonly: Signal<boolean>;
  /** True only while the field accepts user edits. */
  readonly editable: Signal<boolean>;
  /** The element's own `maxlength`, or `null` when it declares none. */
  readonly nativeMaxLength: Signal<number | null>;
  /** True when the element carries its own `required` attribute. */
  readonly nativeRequired: Signal<boolean>;
}

export interface ImsControlStateSources {
  /** The observed element. A `null` value reports an editable, unknown field. */
  readonly element: Signal<ImsTextFieldElement | null>;
  /** The Angular control bound to that element, when the field has one. */
  readonly control: Signal<AbstractControl | null>;
  /** Replaces the inherited `ims-readonly` scope resolved at call time. */
  readonly inheritedReadonly?: Signal<boolean>;
}

/**
 * Tracks the disabled and readonly state of a native field across every source
 * that can change it: the Angular control, native attributes, and the nearest
 * `ims-readonly` provider.
 *
 * Native `disabled` and `readonly` are reflected IDL properties, so a property
 * write reaches the attribute and therefore the observer. That is what makes a
 * control disabled through Angular's value accessor, through `ImsInputDirective`,
 * or through plain DOM code all visible here.
 *
 * Call from an injection context. Observers and subscriptions are released with
 * the calling context.
 */
export function imsControlState(sources: ImsControlStateSources): ImsControlState {
  const inheritedReadonly = sources.inheritedReadonly ?? ReadonlyDirective.injectSignal();
  const controlDisabled = signal(false);
  const nativeDisabled = signal(false);
  const nativeReadonly = signal(false);
  const nativeMaxLength = signal<number | null>(null);
  const nativeRequired = signal(false);

  const syncNative = (element: ImsTextFieldElement | null): void => {
    nativeDisabled.set(
      element !== null && (element.disabled || element.getAttribute('aria-disabled') === 'true'),
    );
    nativeReadonly.set(element !== null && element.readOnly);
    // `maxLength` reports -1 when the attribute is absent.
    nativeMaxLength.set(element !== null && element.maxLength > 0 ? element.maxLength : null);
    nativeRequired.set(element !== null && element.required);
  };

  effect((onCleanup) => {
    const element = sources.element();
    syncNative(element);

    if (!element) {
      return;
    }

    const observer = new MutationObserver(() => syncNative(element));
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['disabled', 'readonly', 'aria-disabled', 'maxlength', 'required'],
    });
    onCleanup(() => observer.disconnect());
  });

  effect((onCleanup) => {
    const control = sources.control();
    controlDisabled.set(control?.disabled ?? false);

    if (!control) {
      return;
    }

    const subscription: Subscription = control.events.subscribe(() =>
      controlDisabled.set(control.disabled),
    );
    onCleanup(() => subscription.unsubscribe());
  });

  const disabled = computed(() => controlDisabled() || nativeDisabled());
  const readonly = computed(() => nativeReadonly() || inheritedReadonly());

  return {
    disabled,
    readonly,
    editable: computed(() => !disabled() && !readonly()),
    nativeMaxLength: nativeMaxLength.asReadonly(),
    nativeRequired: nativeRequired.asReadonly(),
  };
}

/** Narrows an unknown element to a supported native text field. */
export function isImsTextField(value: unknown): value is ImsTextFieldElement {
  return value instanceof HTMLInputElement || value instanceof HTMLTextAreaElement;
}
