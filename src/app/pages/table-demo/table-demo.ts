import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
import {DatePipe, DecimalPipe} from '@angular/common';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {FormArray, FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ImsButton, ImsButtonIcon} from '../../components/ims-button';
import {ImsGridV2, ImsGridCellV2, ImsGridRowV2, ImsGridSortDirectiveV2, ImsGridSortHeaderV2} from '../../components/ims-grid-v2';
import {ImsIcon} from '../../components/ims-icon';
import {ImsTableDirective, ImsTableRowDirective, ImsTableRowTrigger} from '../../components/ims-table';
import {ImsInputDirective} from '../../ims-input.directive';

type DemoPolicyStatus = 'active' | 'pending' | 'cancelled';

interface DemoPolicy {
    readonly id: number;
    readonly policyNumber: string;
    readonly customerName: string;
    readonly status: DemoPolicyStatus;
    readonly validUntil: Date;
    readonly premium: number;
}

const CUSTOMER_NAMES = [
    'דנה כהן',
    'יוסי לוי',
    'מיכל אברהם',
    'אורי פרץ',
    'נועה מזרחי',
    'אבי שושן',
    'שרה ביטון',
    'עומר דהן',
    'רונית אזולאי',
    'גיל פרידמן'
];

/** Deterministic rows, so the page reads the same on every load. */
/** One editable row of the FormArray example. */
function createPolicyRow(policy: Pick<DemoPolicy, 'policyNumber' | 'customerName' | 'premium'>) {
    return new FormGroup({
        policyNumber: new FormControl(policy.policyNumber, {nonNullable: true}),
        customerName: new FormControl(policy.customerName, {nonNullable: true}),
        premium: new FormControl(policy.premium, {nonNullable: true})
    });
}

type PolicyRow = ReturnType<typeof createPolicyRow>;

function createPolicies(count: number): DemoPolicy[] {
    return Array.from({length: count}, (_, index) => ({
        id: index + 1,
        policyNumber: `40-${String(118 + (index % 7) * 31).padStart(3, '0')}-${String(2231 + index * 457).slice(-4)}`,
        customerName: CUSTOMER_NAMES[index % CUSTOMER_NAMES.length],
        status: index % 7 === 3 ? 'cancelled' : index % 5 === 2 ? 'pending' : 'active',
        validUntil: new Date(Date.UTC(2026 + (index % 3), (index * 5) % 12, 1 + ((index * 11) % 28))),
        premium: 480 + ((index * 173) % 1900) + (index % 4) * 0.25
    }));
}

@Component({
    selector: 'app-table-demo',
    imports: [
        DatePipe,
        DecimalPipe,
        ReactiveFormsModule,
        ScrollingModule,
        ImsButton,
        ImsButtonIcon,
        ImsGridV2,
        ImsGridCellV2,
        ImsGridRowV2,
        ImsGridSortDirectiveV2,
        ImsGridSortHeaderV2,
        ImsIcon,
        ImsInputDirective,
        ImsTableDirective,
        ImsTableRowDirective
    ],
    templateUrl: './table-demo.html',
    styleUrl: './table-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableDemo {
    readonly statusLabels: Readonly<Record<DemoPolicyStatus, string>> = {
        active: 'פעילה',
        pending: 'ממתינה',
        cancelled: 'בוטלה'
    };

    readonly policies = createPolicies(8);
    /** The FormArray example: rows sorted as controls, edited in place. */
    readonly policyRows = new FormArray(createPolicies(5).map(createPolicyRow));
    readonly manyPolicies = createPolicies(2000);
    readonly totalPremium = sumPremiums(this.policies);
    readonly manyTotalPremium = sumPremiums(this.manyPolicies);

    /** The row the color picker paints, and the cell that shows a cell-only fill. */
    readonly highlightedRowId = 2;
    readonly highlightedCellRowId = 6;
    readonly customFill = signal('#FFE0B2');
    readonly zebra = signal(true);

    readonly nativeSelectedId = signal<number | null>(null);
    readonly nativeOpenedId = signal<number | null>(null);
    readonly gridSelectedId = signal<number | null>(3);
    readonly gridOpenedId = signal<number | null>(null);
    readonly virtualSelectedId = signal<number | null>(null);
    readonly virtualOpenedId = signal<number | null>(null);

    readonly events = signal<readonly string[]>([]);
    readonly latestEvents = computed(() => this.events().slice(0, 5));

    readonly trackPolicy = (_: number, policy: DemoPolicy): number => policy.id;

    onZebraChange(event: Event): void {
        this.zebra.set((event.target as HTMLInputElement).checked);
    }

    onFillInput(event: Event): void {
        this.customFill.set((event.target as HTMLInputElement).value);
    }

    select(target: 'native' | 'grid' | 'virtual', policy: DemoPolicy, trigger: ImsTableRowTrigger): void {
        this.selectedSignal(target).set(policy.id);
        this.log(`rowClick · ${policy.customerName} · ${describeTrigger(trigger)}`);
    }

    open(target: 'native' | 'grid' | 'virtual', policy: DemoPolicy, trigger: ImsTableRowTrigger): void {
        this.openedSignal(target).set(policy.id);
        this.log(`rowDblclick · ${policy.customerName} · ${describeTrigger(trigger)}`);
    }

    onDetailsButton(policy: DemoPolicy): void {
        this.log(`כפתור פרטים · ${policy.customerName} · השורה לא קיבלה את הלחיצה`);
    }

    private selectedSignal(target: 'native' | 'grid' | 'virtual') {
        return target === 'native' ? this.nativeSelectedId : target === 'grid' ? this.gridSelectedId : this.virtualSelectedId;
    }

    private openedSignal(target: 'native' | 'grid' | 'virtual') {
        return target === 'native' ? this.nativeOpenedId : target === 'grid' ? this.gridOpenedId : this.virtualOpenedId;
    }

    private log(entry: string): void {
        this.events.update((events) => [entry, ...events].slice(0, 20));
    }

    addPolicyRow(): void {
        const number = this.policyRows.length + 1;
        this.policyRows.push(createPolicyRow({
            policyNumber: `40-900-${String(1000 + number * 37).slice(-4)}`,
            customerName: 'לקוח חדש',
            premium: 500
        }));
    }

    removePolicyRow(row: PolicyRow): void {
        this.policyRows.removeAt(this.policyRows.controls.indexOf(row));
    }
}

function sumPremiums(policies: readonly DemoPolicy[]): number {
    return policies.reduce((total, policy) => total + policy.premium, 0);
}

function describeTrigger(trigger: ImsTableRowTrigger): string {
    if (trigger instanceof KeyboardEvent) {
        return `מקלדת (${trigger.key === ' ' ? 'Space' : trigger.key})`;
    }

    return 'עכבר';
}
