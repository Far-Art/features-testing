import {booleanAttribute, computed, DestroyRef, Directive, effect, ElementRef, inject, input, signal, untracked} from '@angular/core';
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
 * later API.
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
     * Disabled state last requested by a bound form control. Written through
     * `untracked()`: a control can be disabled from inside an effect, and
     * Angular 18 rejects a tracked signal write there.
     */
    private readonly formDisabled = signal(false);

    /** Disabled state set via the `disabled` attribute or property binding. */
    readonly disabledInput = input<boolean, boolean | string | null | undefined>(false, {alias: 'disabled', transform: booleanAttribute});

    /** True when inherited from the nearest `ims-readonly` provider. */
    protected readonly readonlyMode = ReadonlyDirective.injectSignal();

    /** True while the `disabled` input, the form control or readonly asks for it. */
    private readonly shouldDisable = computed(() => this.disabledInput() || this.readonlyMode() || this.formDisabled());

    constructor() {
        this.synchronizeValueAccessorDisabledState();
        this.observeSelect(this.renderSelectedContent());

        // An `ims-readonly` on this same select binds `disabled` too. Sharing
        // this state makes both bindings agree, whichever of them runs last.
        ReadonlyDirective.shareHostDisabled(this.shouldDisable);

        // Follows the `disabled` input and the readonly scope. The form control
        // applies its own changes through the wrapper below.
        effect(() => this.applyDisabledState());
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
                // Untracked: this can run inside a caller's own effect.
                untracked(() => this.formDisabled.set(isDisabled));
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
     * Watches the options for content changes made behind this directive's
     * back. Chrome copies the selected option into `selectedcontent` only when
     * the selection changes, and Angular fills in an option's text after that
     * option can already be selected — an interpolated label, or options that
     * arrive after the value.
     */
    private observeSelect(selectedContent: HTMLElement): void {
        const observer = new MutationObserver((records) => {
            // Chrome's copies, and this callback's own, land in `selectedcontent`.
            const optionChanged = records.some((record) => !selectedContent.contains(record.target));

            if (optionChanged) {
                const option = this.select.selectedOptions[0];
                selectedContent.replaceChildren(...Array.from(option?.childNodes ?? [], (node) => node.cloneNode(true)));
                this.reserveSelectedWeight();
            }
        });

        observer.observe(this.select, {
            childList: true,
            characterData: true,
            subtree: true
        });
        this.destroyRef.onDestroy(() => observer.disconnect());
    }

    /**
     * Copies each option's label into its `data-ims-label` attribute, which the
     * stylesheet lays out, unseen, at the selected weight, so a row is as wide
     * unselected as once selected. Not observed, so writing it never calls
     * observeSelect() back.
     */
    private reserveSelectedWeight(): void {
        for (const option of Array.from(this.select.options)) {
            if (option.dataset['imsLabel'] !== option.label) {
                option.dataset['imsLabel'] = option.label;
            }
        }
    }
}
