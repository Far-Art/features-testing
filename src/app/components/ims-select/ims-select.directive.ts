import {booleanAttribute, DestroyRef, Directive, effect, ElementRef, inject, input, untracked} from '@angular/core';
// TODO: Angular 22 — uncomment this import in place of the one above (it
// swaps `effect` for `afterRenderEffect`); see the other two TODOs below.
// import {afterRenderEffect, booleanAttribute, DestroyRef, Directive, ElementRef, inject, input, untracked} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {NG_VALUE_ACCESSOR} from '@angular/forms';
import {ReadonlyDirective} from '../../shared/readonly.directive';

/**
 * A native `<select>` dressed as `ims-select`, for a field that only needs one
 * value picked from a list.
 *
 * The browser does what `ims-select` does in code — the options panel, keyboard
 * navigation, typeahead — and Angular's built-in select value accessor connects
 * it to forms. A page can hold many of these without a component, an overlay,
 * option components or measuring per field.
 *
 * The directive adds the shared field classes (`ims-input` and
 * `ims-native-select`, styled in ims-native-select.scss) and joins the nearest
 * `ims-readonly` scope: a readonly select is disabled and takes the readable
 * readonly appearance, as `ims-select` does.
 *
 * Single value only. A `multiple` select is a list box, not a dropdown, so the
 * selector leaves it alone; use `<ims-select multiple>` there.
 *
 * Written against Angular 18: signal inputs, `effect()` and `untracked()`, no
 * later API. The `TODO: Angular 22` comments hold the `afterRenderEffect`
 * version to switch to after the upgrade.
 *
 * ```html
 * <select ims-select [formControl]="status">
 *     <option [ngValue]="null" disabled hidden>Choose a status</option>
 *     @for (status of statuses; track status.id) {
 *         <option [ngValue]="status">{{ status.label }}</option>
 *     }
 * </select>
 * ```
 */
@Directive({
    selector: 'select[ims-select]:not([multiple])',
    standalone: true,
    host: {
        class: 'ims-input ims-native-select',
        '[class.ims-readonly]': 'readonlyMode()'
    }
})
export class ImsSelectDirective {
    private readonly select = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly valueAccessors = inject(NG_VALUE_ACCESSOR, {optional: true, self: true});

    /**
     * Disabled state last requested by a bound form control. A plain field
     * rather than a signal: a control can be disabled from inside an effect,
     * and Angular 18 rejects signal writes there.
     */
    private formDisabled = false;

    /** Disabled state set via the `disabled` attribute or property binding. */
    readonly disabledInput = input<boolean, boolean | string | null | undefined>(false, {alias: 'disabled', transform: booleanAttribute});

    /** True when inherited from the nearest `ims-readonly` provider. */
    protected readonly readonlyMode = ReadonlyDirective.injectSignal();

    constructor() {
        this.synchronizeValueAccessorDisabledState();
        this.observeSelect(this.renderSelectedContent());

        // Follows the `disabled` input and the readonly scope. The form control
        // applies its own changes through the wrapper below.
        effect(() => this.applyDisabledState());

        // TODO: Angular 22 — uncomment this in place of the effect above. It
        // writes after every host binding, `ims-readonly`'s included, so
        // observeSelect() no longer has to watch the `disabled` attribute.
        // afterRenderEffect({write: () => this.applyDisabledState()});
    }

    /** True while the `disabled` input, the form control or readonly asks for it. */
    private shouldDisable(): boolean {
        // Both signals are read on every call, never skipped by `||`: the form
        // control's state is not a signal, so while it alone decides the result
        // the effect must still be tracking both.
        const disabled = this.disabledInput();
        const readonly = this.readonlyMode();
        return disabled || readonly || this.formDisabled;
    }

    private applyDisabledState(): void {
        const disabled = this.shouldDisable();
        if (this.select.disabled !== disabled) {
            this.select.disabled = disabled;
        }
    }

    /**
     * Routes a bound form control's disabled state through this directive,
     * so enabling the control does not enable a readonly select.
     *
     * Wraps the value accessors on this element rather than the form
     * directive's `valueAccessor`, which newer Angular versions only pick in
     * the form directive's first `ngOnChanges` — the same call that first sets
     * the disabled state. The accessors exist by the time this constructor
     * runs, so the wrapper sees that call whatever order the directives run in.
     */
    private synchronizeValueAccessorDisabledState(): void {
        for (const valueAccessor of this.valueAccessors ?? []) {
            const setDisabledState = valueAccessor.setDisabledState;
            if (!setDisabledState) continue;

            const synchronizedSetDisabledState = (isDisabled: boolean): void => {
                this.formDisabled = isDisabled;
                // Untracked: this can run inside a caller's own effect.
                setDisabledState.call(valueAccessor, untracked(() => this.shouldDisable()));
            };

            valueAccessor.setDisabledState = synchronizedSetDisabledState;
            this.destroyRef.onDestroy(() => {
                if (valueAccessor.setDisabledState === synchronizedSetDisabledState) {
                    valueAccessor.setDisabledState = setDisabledState;
                }
            });
        }
    }

    /**
     * Renders the value through a `<selectedcontent>` inside the select's own
     * `<button>`, and returns it. Chrome's built-in value label keeps its full
     * width, so a long value would run on under the chevron; `selectedcontent`
     * is an element the stylesheet can shrink and truncate instead.
     *
     * Both elements are created through `document`, not Renderer2: under
     * emulated encapsulation Renderer2 stamps new elements with the host
     * component's content attribute, and that component's own `button` rules
     * would then restyle the value — a page's white button text included.
     */
    private renderSelectedContent(): HTMLElement {
        const button = this.document.createElement('button');
        const selectedContent = this.document.createElement('selectedcontent');

        // A plain button, so that inside a form it never becomes the form's
        // default button for implicit submission.
        button.type = 'button';
        button.append(selectedContent);
        this.select.prepend(button);

        return selectedContent;
    }

    /**
     * Watches the select for two changes made behind this directive's back.
     *
     * An option's content: Chrome copies the selected option into
     * `selectedcontent` only when the selection changes, and Angular fills in
     * an option's text after that option can already be selected — an
     * interpolated label, or options that arrive after the value.
     *
     * The select's own `disabled` attribute: `ims-readonly` placed on this
     * select binds it too. Angular 18 runs the effect above after that binding
     * and later versions before it, so without this a select that its form
     * control keeps disabled could come out enabled — on first render, or when
     * the readonly state is lifted.
     */
    private observeSelect(selectedContent: HTMLElement): void {
        const observer = new MutationObserver((records) => {
            // TODO: Angular 22 — once the constructor uses afterRenderEffect,
            // remove this check, the `attributeFilter` line below, and the
            // `disabled` paragraph of this method's comment.
            if (records.some((record) => record.target === this.select && record.attributeName === 'disabled')) {
                this.applyDisabledState();
            }

            // Chrome's copies, and this callback's own, land in `selectedcontent`.
            const optionChanged = records.some(
                (record) => record.type !== 'attributes' && !selectedContent.contains(record.target)
            );

            if (optionChanged) {
                const option = this.select.selectedOptions[0];
                selectedContent.replaceChildren(...Array.from(option?.childNodes ?? [], (node) => node.cloneNode(true)));
            }
        });

        observer.observe(this.select, {
            childList: true,
            characterData: true,
            subtree: true,
            attributeFilter: ['disabled']
        });
        this.destroyRef.onDestroy(() => observer.disconnect());
    }
}
