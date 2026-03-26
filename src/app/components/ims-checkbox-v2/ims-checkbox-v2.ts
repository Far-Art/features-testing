import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    forwardRef,
    inject,
    input,
    model,
    signal
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

const IMS_CHECKBOX_V2_UNSET = Symbol('ims-checkbox-v2-unset');
const IMS_CHECKBOX_V2_RIPPLE_MS = 400;

type CheckboxV2VisualState = 'unchecked' | 'checked' | 'intermediate';

@Component({
    selector: 'ims-checkbox-v2',
    standalone: true,
    templateUrl: './ims-checkbox-v2.html',
    styleUrl: './ims-checkbox-v2.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ImsCheckboxV2),
            multi: true
        }
    ]
})
export class ImsCheckboxV2 implements ControlValueAccessor {
    private readonly destroyRef = inject(DestroyRef);
    private readonly formDisabled = signal(false);
    private previousVisualState: CheckboxV2VisualState = 'unchecked';
    private rippleResetHandle: ReturnType<typeof setTimeout> | null = null;
    private onChange: (value: unknown) => void = () => undefined;
    private onTouched: () => void = () => undefined;

    readonly value = model<unknown | typeof IMS_CHECKBOX_V2_UNSET>(IMS_CHECKBOX_V2_UNSET);
    readonly intermediate = model(false);
    readonly trueValue = input<unknown>(true);
    readonly falseValue = input<unknown>(false);
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    readonly currentValue = computed(() =>
        this.value() === IMS_CHECKBOX_V2_UNSET ? this.falseValue() : this.value()
    );
    readonly checked = computed(() => Object.is(this.currentValue(), this.trueValue()));
    readonly disabled = computed(() => this.disabledInput() || this.formDisabled());
    readonly visualState = computed<CheckboxV2VisualState>(() => {
        if (this.intermediate()) return 'intermediate';
        return this.checked() ? 'checked' : 'unchecked';
    });
    readonly rippleActive = signal(false);
    readonly ariaChecked = computed<'true' | 'false' | 'mixed'>(() => {
        if (this.intermediate()) return 'mixed';
        return this.checked() ? 'true' : 'false';
    });

    constructor() {
        effect(() => {
            const currentState = this.visualState();
            const previousState = this.previousVisualState;
            this.previousVisualState = currentState;

            if (currentState !== previousState) {
                this.triggerRipple();
            }
        });

        this.destroyRef.onDestroy(() => this.clearRipple());
    }

    toggle(): void {
        if (this.disabled()) return;

        const nextValue = this.intermediate() || !this.checked()
            ? this.trueValue()
            : this.falseValue();

        this.value.set(nextValue);

        if (this.intermediate()) {
            this.intermediate.set(false);
        }

        this.onChange(nextValue);
    }

    markAsTouched(): void {
        this.onTouched();
    }

    writeValue(value: unknown): void {
        this.value.set(value);
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.formDisabled.set(isDisabled);
    }

    private triggerRipple(): void {
        this.clearRipple();
        this.rippleActive.set(true);
        this.rippleResetHandle = setTimeout(() => {
            this.rippleActive.set(false);
            this.rippleResetHandle = null;
        }, IMS_CHECKBOX_V2_RIPPLE_MS);
    }

    private clearRipple(): void {
        if (this.rippleResetHandle === null) return;
        clearTimeout(this.rippleResetHandle);
        this.rippleResetHandle = null;
    }
}
