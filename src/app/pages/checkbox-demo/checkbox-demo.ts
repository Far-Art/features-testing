import {ChangeDetectionStrategy, Component, computed, signal, WritableSignal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ImsCheckbox, type ImsCheckboxAppearance} from '../../components/ims-checkbox';
import {ImsErrorPopoverDirective} from '../../components/ims-error-popover';
import {ImsFormField, ImsFormFieldGrid} from '../../components/ims-form-layout';
import {ImsRadio, ImsRadioGroup, type ImsRadioGroupValue} from '../../components/ims-radio';
import {ReadonlyDirective} from '../../shared/readonly.directive';

type Channel = 'email' | 'sms' | 'phone';

interface ChannelOption {
    readonly value: Channel;
    readonly label: string;
}

type SubscriptionStatus = 'active' | 'inactive';

const CHANNELS: readonly ChannelOption[] = [
    {value: 'email', label: 'דואר אלקטרוני'},
    {value: 'sms', label: 'SMS'},
    {value: 'phone', label: 'שיחה טלפונית'}
];

/**
 * A list of channels under a "select all" box, drawn in one appearance. The box
 * is checked while every channel is, and indeterminate while only some are.
 */
class ChannelSelection {
    readonly appearance: ImsCheckboxAppearance;
    readonly selected: WritableSignal<readonly Channel[]>;
    readonly all = computed(() => this.selected().length === CHANNELS.length);
    readonly some = computed(() => this.selected().length > 0 && !this.all());

    constructor(appearance: ImsCheckboxAppearance, initial: readonly Channel[]) {
        this.appearance = appearance;
        this.selected = signal(initial);
    }

    isSelected(channel: Channel): boolean {
        return this.selected().includes(channel);
    }

    // Kept in list order, whatever order the user checks the channels in.
    toggle(channel: Channel, checked: boolean): void {
        this.selected.update((selected) =>
            CHANNELS.map((option) => option.value).filter((value) => (value === channel ? checked : selected.includes(value)))
        );
    }

    setAll(checked: boolean): void {
        this.selected.set(checked ? CHANNELS.map((option) => option.value) : []);
    }
}

@Component({
    selector: 'app-checkbox-demo',
    imports: [
        ReactiveFormsModule,
        ImsCheckbox,
        ImsErrorPopoverDirective,
        ImsFormField,
        ImsFormFieldGrid,
        ImsRadio,
        ImsRadioGroup,
        ReadonlyDirective
    ],
    templateUrl: './checkbox-demo.html',
    styleUrl: './checkbox-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxDemo {
    readonly channels = CHANNELS;

    readonly selections: readonly ChannelSelection[] = [
        new ChannelSelection('checkbox', ['email']),
        new ChannelSelection('check', ['email'])
    ];

    // `required` on the checkbox adds the validator: Angular's own `required`
    // counts an unchecked `false` as filled in.
    readonly termsControl = new FormControl(false, {nonNullable: true});
    readonly statusControl = new FormControl<SubscriptionStatus>('inactive', {nonNullable: true});
    readonly vipControl = new FormControl(false, {nonNullable: true});

    readonly checkedLog = signal<readonly string[]>([]);

    readonly deliveryChannel = signal<ImsRadioGroupValue<Channel> | undefined>('sms');
    readonly sendCopy = signal(true);

    logChecked(source: string, checked: boolean): void {
        this.checkedLog.update((log) => [`${source}: ${checked}`, ...log].slice(0, 6));
    }

    setFromCode(): void {
        this.termsControl.setValue(true);
        this.statusControl.setValue('active');
        this.vipControl.setValue(true);
    }

    resetForm(): void {
        this.termsControl.reset();
        this.statusControl.reset();
        this.vipControl.reset();
    }

    describe(value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (Array.isArray(value)) return value.length === 0 ? '[]' : `[${value.map((item) => this.describe(item)).join(', ')}]`;
        return String(value);
    }
}
