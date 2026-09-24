import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import {IMS_RADIO_GROUP, ImsRadioAppearance, ImsRadioGroupParent} from './ims-radio.types';

@Component({
    selector: 'ims-radio',
    standalone: true,
    templateUrl: './ims-radio.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-radio-host',
        // Both are forwarded to the native input, where assistive technology reads them.
        '[attr.id]': 'null',
        '[attr.aria-label]': 'null'
    }
})
/**
 * One option of an `ims-radio-group`.
 *
 * The option holds no value state of its own: it renders what the group says
 * is selected and reports user changes back to the group.
 */
export class ImsRadio<T = unknown> {
    private readonly group = injectRadioGroup<T>();

    /**
     * The native control this option renders, which is the element that takes
     * focus. The group reads it to focus the option a user would land on.
     */
    readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('native');

    readonly value = input.required<T>();
    /** Disables this option only; the group's disabled and readonly state still apply. */
    readonly disabledInput = input<boolean, boolean | string | null | undefined>(false, {alias: 'disabled', transform: booleanAttribute});
    /** Overrides the group's appearance for this option. `null` inherits it. */
    readonly appearanceInput = input<ImsRadioAppearance | null>(null, {alias: 'appearance'});
    /** Forwarded to the native input, not the host. */
    readonly id = input<string | null>(null);
    /** Accessible name for an option without projected text. */
    readonly ariaLabel = input<string | null>(null, {alias: 'aria-label'});

    readonly appearance = computed(() => this.appearanceInput() ?? this.group.appearance());
    readonly inputType = computed(() => this.group.multiple() ? 'checkbox' : 'radio');
    readonly name = computed(() => this.group.multiple() ? null : this.group.groupName());
    /** Shown as selected: true for every option holding a selected value. */
    readonly selected = computed(() => this.group.isSelected(this.value()));
    /** The native input's checked state, which can differ from `selected` for duplicates. */
    readonly nativeChecked = computed(() => this.group.isNativeChecked(this));
    readonly disabled = computed(() => this.disabledInput() || this.group.interactionDisabled());
    readonly animationsReady = signal(false);

    constructor() {
        afterNextRender(() => this.animationsReady.set(true));
        inject(DestroyRef).onDestroy(() => this.group.removeOption(this));
    }

    onNativeChange(event: Event): void {
        // Keep the native change event inside the component; consumers listen to
        // the group's selectionChange / valueChange instead.
        event.stopPropagation();
        this.group.selectFromUser(this, (event.target as HTMLInputElement).checked);
    }
}

function injectRadioGroup<T>(): ImsRadioGroupParent<T> {
    const group = inject(IMS_RADIO_GROUP, {optional: true});
    if (group === null) {
        throw new Error('ims-radio must be placed inside an ims-radio-group.');
    }
    return group as ImsRadioGroupParent<T>;
}
