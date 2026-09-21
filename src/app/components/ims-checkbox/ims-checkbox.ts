import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    forwardRef,
    input,
    model,
    OnChanges,
    output,
    signal,
    SimpleChanges,
    viewChild
} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';

/** Visual style of the box: a rounded square, or a circle that fills with a checkmark. */
export type ImsCheckboxAppearance = 'checkbox' | 'check';

/** The two shapes one appearance's mark morphs between. */
interface ImsCheckboxMarkPaths {
    readonly checkmark: string;
    readonly dash: string;
}

// Within an appearance the checkmark and the dash share the same SVG commands
// (M L L), which lets the browser interpolate between them via the CSS `d`
// transition. Both appearances draw in the same 18-unit viewBox and differ only
// in how far the mark is inset: the circle's round edge cuts the corners a
// square leaves free, so its mark is drawn smaller. The check appearance's
// checkmark is the one ims-radio draws, so the two components match.
const MARK_PATHS: Record<ImsCheckboxAppearance, ImsCheckboxMarkPaths> = {
    checkbox: {
        checkmark: 'M 3.5 9.5 L 7 13 L 14.5 5.5',
        dash: 'M 4.5 9 L 9 9 L 13.5 9'
    },
    check: {
        checkmark: 'M 5.05 9.3 L 7.6 11.8 L 12.95 6.45',
        dash: 'M 5.75 9 L 9 9 L 12.25 9'
    }
};

/** A user toggle, tied to the `checked` binding value it overrides. */
interface CheckedOverride {
    readonly binding: {readonly value: boolean | undefined};
    readonly checked: boolean;
}

@Component({
    selector: 'ims-checkbox',
    standalone: true,
    templateUrl: './ims-checkbox.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideValueAccessor(ImsCheckbox),
        {provide: NG_VALIDATORS, useExisting: forwardRef(() => ImsCheckbox), multi: true}
    ],
    host: {
        class: 'ims-checkbox-host'
    }
})
/**
 * Form-compatible checkbox with an optional indeterminate state.
 *
 * Checked state comes from the explicit `checked` input when bound, otherwise
 * from comparing the form value with `trueValue`. A user toggle writes
 * `trueValue` or `falseValue` to the form and emits `checkedChange`; form
 * writes and parent bindings never emit.
 */
export class ImsCheckbox<T = boolean, F = boolean> extends BasicValueAccessor<T | F>
    implements OnChanges, Validator {
    private validatorChange: (() => void) | null = null;
    private readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('native');

    readonly intermediate = model(false);
    readonly trueValue = input<T>(true as T);
    readonly falseValue = input<F>(false as F);
    // When bound, takes precedence over value/trueValue comparison.
    // undefined means "not provided — defer to value-based logic".
    readonly checked = input<boolean | undefined, unknown>(undefined, {
        transform: (v): boolean | undefined => v == null ? undefined : booleanAttribute(v as boolean | string)
    });
    /**
     * Requires the box to be checked: a bound form control gets a `required`
     * error while its value is anything other than `trueValue`. Angular's own
     * `required` validator counts an unchecked `false` as filled in.
     */
    readonly required = input(false, {transform: booleanAttribute});
    /**
     * `'checkbox'` (default) draws the rounded box; `'check'` draws the green
     * circle `ims-radio`'s check appearance uses, so a checkbox can sit in a
     * group of check options without standing out.
     */
    readonly appearance = input<ImsCheckboxAppearance>('checkbox');

    /**
     * Emitted only when the user toggles the checkbox, with the new checked state.
     * Form writes and `checked` bindings do not emit. Pairs with `checked` for
     * `[(checked)]` two-way binding.
     */
    readonly checkedChange = output<boolean>();

    // Local copy of `checked`: a user toggle sticks even when the parent binds a
    // static value (`<ims-checkbox checked/>`), and a new parent value resets it.
    // This is `linkedSignal(() => this.checked())` without `linkedSignal`, which
    // Angular 18 lacks: `checkedBinding` makes a new object only when `checked`
    // changes, so an override stops applying once its binding object is replaced.
    private readonly checkedBinding = computed(() => ({value: this.checked()}));
    private readonly checkedOverride = signal<CheckedOverride | null>(null);
    private readonly checkedState = computed(() => {
        const binding = this.checkedBinding();
        const override = this.checkedOverride();
        return override?.binding === binding ? override.checked : binding.value;
    });

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
    readonly svgPath = computed(() => {
        const paths = MARK_PATHS[this.appearance()];
        return this.intermediate() ? paths.dash : paths.checkmark;
    });
    readonly animationsReady = signal(false);

    constructor() {
        super();
        afterNextRender(() => this.animationsReady.set(true));
    }

    // Re-validates in the same pass that changed the rule, as Angular's own
    // validator directives do. On the first change no form has registered yet.
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['required'] || changes['trueValue']) {
            this.validatorChange?.();
        }
    }

    validate(control: AbstractControl): ValidationErrors | null {
        return this.required() && !Object.is(control.value, this.trueValue())
            ? {required: true}
            : null;
    }

    registerOnValidatorChange(fn: () => void): void {
        this.validatorChange = fn;
    }

    toggle(event: Event): void {
        // Keep the native change event inside the component; consumers listen to
        // checkedChange / valueChange instead of a raw bubbled DOM event.
        event.stopPropagation();
        if (this.interactionDisabled()) return;

        const nextChecked = this.intermediate() || !this.isChecked();
        const nextValue = nextChecked ? this.trueValue() : this.falseValue();

        if (this.checkedState() !== undefined) {
            this.checkedOverride.set({binding: this.checkedBinding(), checked: nextChecked});
        }

        this.value.set(nextValue);

        if (this.intermediate()) {
            this.intermediate.set(false);
        }

        this.onChange(nextValue);
        this.checkedChange.emit(nextChecked);
    }

    /**
     * The native checkbox. Every visual state is drawn from its pseudo-classes,
     * so it is the element that must hold focus for the ring to appear.
     */
    protected override focusTarget(): HTMLElement | null {
        return this.nativeInput()?.nativeElement ?? null;
    }
}
