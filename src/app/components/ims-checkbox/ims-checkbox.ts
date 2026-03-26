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
    selector: 'ims-checkbox',
    standalone: true,
    templateUrl: './ims-checkbox.html',
    styleUrl: './ims-checkbox.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ImsCheckbox),
            multi: true
        }
    ]
})
export class ImsCheckbox implements ControlValueAccessor {
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
    // When bound, takes precedence over value/trueValue comparison.
    // undefined means "not provided — defer to value-based logic".
    readonly checked = input<boolean | undefined>(undefined);
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    readonly currentValue = computed(() =>
        this.value() === IMS_CHECKBOX_V2_UNSET ? this.falseValue() : this.value()
    );
    readonly isChecked = computed(() => {
        const explicit = this.checked();
        return explicit !== undefined ? explicit : Object.is(this.currentValue(), this.trueValue());
    });
    readonly disabled = computed(() => this.disabledInput() || this.formDisabled());
    readonly visualState = computed<CheckboxV2VisualState>(() => {
        if (this.intermediate()) return 'intermediate';
        return this.isChecked() ? 'checked' : 'unchecked';
    });
    readonly rippleActive = signal(false);

    // Checkmark path and dash path share the same number of SVG commands (M L L),
    // which allows the browser to interpolate between them via CSS `d` transition.
    // stroke-dasharray stays constant at 22 (larger than both path lengths),
    // so stroke-dashoffset alone controls the pen-draw / erase effect.
    readonly svgPath = computed(() =>
        this.visualState() === 'intermediate'
            ? 'M 4.5 9 L 9 9 L 13.5 9'
            : 'M 3.5 9.5 L 7 13 L 14.5 5.5'
    );

    readonly ariaChecked = computed<'true' | 'false' | 'mixed'>(() => {
        if (this.intermediate()) return 'mixed';
        return this.isChecked() ? 'true' : 'false';
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

        const nextValue = this.intermediate() || !this.isChecked()
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
