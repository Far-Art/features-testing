import {
    afterNextRender,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import {IMS_TOGGLE_SWITCH, ImsToggleSwitchAppearance, ImsToggleSwitchParent} from './ims-toggle-switch.types';

@Component({
    selector: 'ims-toggle-switch-option',
    standalone: true,
    templateUrl: './ims-toggle-switch-option.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-toggle-switch-option-host',
        // Both are forwarded to the native input, where assistive technology reads them.
        '[attr.id]': 'null',
        '[attr.aria-label]': 'null'
    }
})
/**
 * One of the two options of an `ims-toggle-switch`.
 *
 * The option holds no value state of its own: it renders what the switch says
 * is selected and reports the user's pick back to it.
 */
export class ImsToggleSwitchOption<T = unknown> {
    private readonly toggleSwitch = injectToggleSwitch<T>();

    /**
     * The native radio this option renders, which is the element that takes
     * focus. The switch reads it to focus the option a user would land on, and
     * to keep its checked state in line with the value.
     */
    readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('native');

    readonly value = input.required<T>();
    /** `'check'` draws the green checkmark when selected, `'reject'` the grey X. */
    readonly appearance = input<ImsToggleSwitchAppearance>('check');
    /** Disables this option only; the switch's disabled and readonly state still apply. */
    readonly disabled = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});
    /** Forwarded to the native input, not the host. */
    readonly id = input<string | null>(null);
    /** Accessible name for an option without projected text. */
    readonly ariaLabel = input<string | null>(null, {alias: 'aria-label'});

    readonly name = this.toggleSwitch.groupName;
    readonly selected = computed(() => this.toggleSwitch.isSelected(this.value()));
    readonly interactionDisabled = computed(() => this.disabled() || this.toggleSwitch.interactionDisabled());
    readonly animationsReady = signal(false);

    constructor() {
        afterNextRender(() => this.animationsReady.set(true));
    }

    onNativeChange(event: Event): void {
        // Keep the native change event inside the component; consumers listen to
        // the switch's selectionChange / valueChange instead. A radio fires
        // `change` only when it becomes checked, so this is always a pick.
        event.stopPropagation();
        this.toggleSwitch.selectFromUser(this.value());
    }
}

function injectToggleSwitch<T>(): ImsToggleSwitchParent<T> {
    const toggleSwitch = inject(IMS_TOGGLE_SWITCH, {optional: true});
    if (toggleSwitch === null) {
        throw new Error('ims-toggle-switch-option must be placed inside an ims-toggle-switch.');
    }
    return toggleSwitch as ImsToggleSwitchParent<T>;
}
