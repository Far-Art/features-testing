import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    linkedSignal,
    model,
    output,
    signal
} from '@angular/core';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';

const IMS_CHECKBOX_RIPPLE_MS = 350;

type CheckboxVisualState = 'unchecked' | 'checked' | 'intermediate';

@Component({
    selector: 'ims-checkbox',
    standalone: true,
    templateUrl: './ims-checkbox.html',
    styleUrl: './ims-checkbox.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideValueAccessor(ImsCheckbox)]
})
export class ImsCheckbox<T = boolean, F = boolean> extends BasicValueAccessor<T> {
    private rippleResetHandle: ReturnType<typeof setTimeout> | null = null;

    readonly intermediate = model(false);
    readonly trueValue = input<T>(true as T);
    readonly falseValue = input<F>(false as F);
    // When bound, takes precedence over value/trueValue comparison.
    // undefined means "not provided — defer to value-based logic".
    readonly checked = input<boolean | undefined, unknown>(undefined, {
        transform: (v): boolean | undefined => v == null ? undefined : booleanAttribute(v as boolean | string)
    });

    /**
     * Emitted only when the user toggles the checkbox, with the new checked state.
     * Form writes and `checked` bindings do not emit. Pairs with `checked` for
     * `[(checked)]` two-way binding.
     */
    readonly checkedChange = output<boolean>();

    // Local copy of `checked`: a user toggle sticks even when the parent binds a
    // static value (`<ims-checkbox checked/>`), and a new parent value resets it.
    private readonly checkedState = linkedSignal(() => this.checked());

    // value is undefined until a form binding calls writeValue; fall back to
    // falseValue so the checkbox renders unchecked on first paint.
    readonly currentValue = computed(() => {
        const v = this.value();
        return v !== undefined ? v : this.falseValue();
    });
    readonly isChecked = computed(() => {
        const explicit = this.checkedState();
        return explicit !== undefined ? explicit : Object.is(this.currentValue(), this.trueValue());
    });
    readonly visualState = computed<CheckboxVisualState>(() => {
        if (this.intermediate()) return 'intermediate';
        return this.isChecked() ? 'checked' : 'unchecked';
    });
    readonly animationsReady = signal(false);
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

    constructor() {
        super();
        afterNextRender(() => this.animationsReady.set(true));
        this.destroyRef.onDestroy(() => this.clearRipple());
    }

    toggle(event: Event): void {
        // Keep the native change event inside the component; consumers listen to
        // checkedChange / valueChange instead of a raw bubbled DOM event.
        event.stopPropagation();
        if (this.interactionDisabled()) return;

        const nextChecked = this.intermediate() || !this.isChecked();
        const nextValue = nextChecked ? this.trueValue() : this.falseValue();

        if (this.checkedState() !== undefined) {
            this.checkedState.set(nextChecked);
        }

        this.value.set(nextValue as never);

        if (this.intermediate()) {
            this.intermediate.set(false);
        }

        this.onChange(nextValue as never);
        this.checkedChange.emit(nextChecked);

        // Ripple is feedback for the user's click, not for programmatic updates.
        if (nextChecked) {
            this.triggerRipple();
        }
    }

    private triggerRipple(): void {
        this.clearRipple();
        this.rippleActive.set(true);
        this.rippleResetHandle = setTimeout(() => {
            this.rippleActive.set(false);
            this.rippleResetHandle = null;
        }, IMS_CHECKBOX_RIPPLE_MS);
    }

    private clearRipple(): void {
        if (this.rippleResetHandle === null) return;
        clearTimeout(this.rippleResetHandle);
        this.rippleResetHandle = null;
    }
}
