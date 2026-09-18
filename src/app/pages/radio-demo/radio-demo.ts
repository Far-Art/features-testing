import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ImsErrorPopoverDirective} from '../../components/ims-error-popover';
import {ImsFormField, ImsFormFieldGrid} from '../../components/ims-form-layout';
import {ImsRadio, ImsRadioGroup, type ImsRadioGroupValue} from '../../components/ims-radio';
import {ReadonlyDirective} from '../../shared/readonly.directive';

type Channel = 'email' | 'sms' | 'phone' | 'mail';

interface ChannelOption {
    readonly value: Channel;
    readonly label: string;
}

interface CoverageOption {
    readonly id: number;
    readonly label: string;
    readonly disabled?: boolean;
}

type DemoGroupValue<T> = ImsRadioGroupValue<T> | undefined;

@Component({
    selector: 'app-radio-demo',
    imports: [
        ReactiveFormsModule,
        ImsErrorPopoverDirective,
        ImsFormField,
        ImsFormFieldGrid,
        ImsRadio,
        ImsRadioGroup,
        ReadonlyDirective
    ],
    templateUrl: './radio-demo.html',
    styleUrl: './radio-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadioDemo {
    readonly channels: readonly ChannelOption[] = [
        {value: 'email', label: 'דואר אלקטרוני'},
        {value: 'sms', label: 'SMS'},
        {value: 'phone', label: 'שיחה טלפונית'},
        {value: 'mail', label: 'דואר רגיל'}
    ];

    readonly plans: readonly CoverageOption[] = [
        {id: 1, label: 'בסיסי'},
        {id: 2, label: 'מורחב'},
        {id: 3, label: 'פרימיום'},
        {id: 4, label: 'עסקי (לא זמין)', disabled: true}
    ];

    readonly addons: readonly CoverageOption[] = [
        {id: 10, label: 'רפואה משלימה'},
        {id: 11, label: 'שיניים'},
        {id: 12, label: 'נסיעות לחו״ל'},
        {id: 13, label: 'סיעוד'}
    ];

    readonly singleRadio = signal<DemoGroupValue<Channel>>('email');
    readonly singleCheck = signal<DemoGroupValue<Channel>>('sms');
    readonly multipleRadio = signal<DemoGroupValue<Channel>>(['email', 'phone']);
    readonly multipleCheck = signal<DemoGroupValue<Channel>>(['sms']);
    readonly mixedAppearance = signal<DemoGroupValue<Channel>>('phone');
    readonly customAccent = signal<DemoGroupValue<Channel>>(['email']);
    readonly customCheckAccent = signal<DemoGroupValue<Channel>>('mail');

    // Object values, so the groups need compareWith: the form holds copies.
    readonly planControl = new FormControl<CoverageOption | null>(null, Validators.required);
    readonly addonsControl = new FormControl<readonly CoverageOption[]>([], {
        nonNullable: true,
        validators: Validators.required
    });

    readonly disabledSingle = new FormControl({value: 'sms' as Channel, disabled: true});
    readonly disabledMultiple = new FormControl({value: ['email', 'mail'] as Channel[], disabled: true});
    readonly readonlySingle = new FormControl<Channel>('phone');
    readonly readonlyMultiple = new FormControl<Channel[]>(['sms', 'mail']);

    readonly selectionLog = signal<readonly string[]>([]);

    readonly compareById = (first: CoverageOption, second: CoverageOption) => first.id === second.id;

    logSelection(source: string, value: unknown): void {
        this.selectionLog.update((log) => [`${source}: ${this.describe(value)}`, ...log].slice(0, 6));
    }

    setPlanFromCode(): void {
        this.planControl.setValue({...this.plans[2]});
        this.addonsControl.setValue([{...this.addons[1]}, {...this.addons[3]}]);
    }

    resetForm(): void {
        this.planControl.reset();
        this.addonsControl.reset();
    }

    describe(value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (Array.isArray(value)) return value.length === 0 ? '[]' : `[${value.map((item) => this.describe(item)).join(', ')}]`;
        if (typeof value === 'object' && 'label' in value) return String(value.label);
        return String(value);
    }
}
