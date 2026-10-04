import {ChangeDetectionStrategy, Component, signal, WritableSignal} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ImsErrorPopoverDirective} from '../../components/ims-error-popover';
import {ImsFormField, ImsFormFieldGrid} from '../../components/ims-form-layout';
import {ImsToggleSwitch, ImsToggleSwitchOption} from '../../components/ims-toggle-switch';
import {ImsTooltip} from '../../components/ims-tooltip';
import {ReadonlyDirective} from '../../shared/readonly.directive';

type Decision = 'approved' | 'rejected';

interface CoveragePlan {
    readonly id: number;
    readonly label: string;
}

interface ReviewDocument {
    readonly id: number;
    readonly label: string;
    readonly decision: WritableSignal<Decision | null | undefined>;
}

@Component({
    selector: 'app-toggle-switch-demo',
    imports: [
        ReactiveFormsModule,
        ImsErrorPopoverDirective,
        ImsFormField,
        ImsFormFieldGrid,
        ImsToggleSwitch,
        ImsToggleSwitchOption,
        ImsTooltip,
        ReadonlyDirective
    ],
    templateUrl: './toggle-switch-demo.html',
    styleUrl: './toggle-switch-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleSwitchDemo {
    readonly plans: readonly CoveragePlan[] = [
        {id: 1, label: 'בסיסי'},
        {id: 2, label: 'מורחב'}
    ];

    // Starts with nothing selected, the state only a reset can bring back.
    readonly answer = signal<boolean | null | undefined>(null);
    readonly decision = signal<Decision | null | undefined>('approved');
    readonly mixedAccent = signal<Decision | null | undefined>('rejected');
    readonly ltrDecision = signal<Decision | null | undefined>('approved');
    readonly partlyDisabled = signal<Decision | null | undefined>('rejected');

    readonly documents: readonly ReviewDocument[] = [
        {id: 1, label: 'תעודת זהות', decision: signal<Decision | null | undefined>('approved')},
        {id: 2, label: 'אישור ניהול חשבון', decision: signal<Decision | null | undefined>('rejected')},
        {id: 3, label: 'הצהרת בריאות', decision: signal<Decision | null | undefined>(null)}
    ];

    readonly smokerControl = new FormControl<boolean | null>(null, Validators.required);
    readonly decisionControl = new FormControl<Decision | null>(null, Validators.required);
    // Object values, so the switch needs compareWith: the form holds copies.
    readonly planControl = new FormControl<CoveragePlan | null>(null);

    readonly disabledDecision = new FormControl<Decision | null>({value: 'approved', disabled: true});
    readonly disabledAnswer = new FormControl<boolean | null>({value: false, disabled: true});
    readonly readonlyDecision = new FormControl<Decision | null>('rejected');
    readonly readonlyAnswer = new FormControl<boolean | null>(true);

    // A handler that writes the value back in the same turn as the click.
    readonly guardedControl = new FormControl<Decision | null>(null);
    readonly guardMessage = signal<string | null>(null);
    private lastAcceptedGuarded: Decision | null = null;

    readonly selectionLog = signal<readonly string[]>([]);

    readonly compareById = (first: CoveragePlan, second: CoveragePlan) => first.id === second.id;

    logSelection(source: string, value: unknown): void {
        this.selectionLog.update((log) => [`${source}: ${this.describe(value)}`, ...log].slice(0, 6));
    }

    // Typed `unknown`: the switch infers its value type from no input here.
    guardSelection(value: unknown): void {
        if (value !== 'approved') {
            this.guardedControl.setValue(this.lastAcceptedGuarded);
            this.guardMessage.set('הדחייה בוטלה: נדרש אישור מנהל');
            return;
        }
        this.lastAcceptedGuarded = value;
        this.guardMessage.set(null);
    }

    setFromCode(): void {
        this.smokerControl.setValue(false);
        this.decisionControl.setValue('rejected');
        this.planControl.setValue({...this.plans[1]});
    }

    resetForm(): void {
        this.smokerControl.reset();
        this.decisionControl.reset();
        this.planControl.reset();
    }

    describe(value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'object' && 'label' in value) return String(value.label);
        return String(value);
    }
}
