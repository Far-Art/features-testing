import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ImsButton} from '../../components/ims-button';
import {ImsCheckbox} from '../../components/ims-checkbox';
import {
    ImsAccordionDirective,
    ImsExpansionPanel,
    ImsExpansionPanelBody,
    ImsExpansionPanelContent,
    ImsExpansionPanelHeader,
    ImsExpansionPanelSeverity,
    ImsExpansionPanelToggle
} from '../../components/ims-expansion-panel';
import {ImsGrid, ImsGridCell, ImsGridRow} from '../../components/ims-grid';
import {ImsTableDirective, ImsTableRowDirective} from '../../components/ims-table';
import {ImsVirtualScrollAutosizeDirective} from '../../shared/ims-virtual-scroll-autosize.directive';

interface DemoPolicyClaim {
    readonly id: number;
    readonly number: string;
    readonly description: string;
    readonly amount: number;
}

interface DemoPolicy {
    readonly id: number;
    readonly number: string;
    readonly customerName: string;
    readonly premium: number;
    readonly claims: readonly DemoPolicyClaim[];
}

const POLICY_CUSTOMERS = ['דנה כהן', 'יוסי לוי', 'מיכל אברהם', 'אורי פרץ', 'נועה מזרחי', 'אבי שושן', 'שרה ביטון'];
const CLAIM_DESCRIPTIONS = ['נזק מים בדירה', 'שבר שמשה קדמית', 'גניבת רכב', 'החזר הוצאות רפואיות', 'נזקי סערה לגג'];

/** Deterministic policies, each with one to five claims, so the page reads the same on every load. */
function createPolicies(count: number): DemoPolicy[] {
    return Array.from({length: count}, (_, index) => ({
        id: index + 1,
        number: `41-${String(220 + (index % 9) * 17).padStart(3, '0')}-${String(1000 + index * 37).slice(-4)}`,
        customerName: POLICY_CUSTOMERS[index % POLICY_CUSTOMERS.length],
        premium: 380 + ((index * 211) % 2400),
        claims: Array.from({length: 1 + (index % 5)}, (__, claim) => ({
            id: claim + 1,
            number: `77-${String(300 + index).slice(-3)}-${String(4000 + claim * 113 + index).slice(-4)}`,
            description: CLAIM_DESCRIPTIONS[(index + claim) % CLAIM_DESCRIPTIONS.length],
            amount: 150 + ((index * 97 + claim * 431) % 9000)
        }))
    }));
}

interface DemoClaim {
    readonly id: number;
    readonly claimNumber: string;
    readonly customerName: string;
    readonly amount: number;
    readonly description: string;
}

@Component({
    selector: 'app-expansion-panel-demo',
    imports: [
        DecimalPipe,
        ReactiveFormsModule,
        ImsAccordionDirective,
        ImsButton,
        ImsCheckbox,
        ImsExpansionPanel,
        ImsExpansionPanelBody,
        ImsExpansionPanelContent,
        ImsExpansionPanelHeader,
        ImsExpansionPanelToggle,
        ImsGrid,
        ImsGridCell,
        ImsGridRow,
        ImsTableDirective,
        ImsTableRowDirective,
        ImsVirtualScrollAutosizeDirective,
        ScrollingModule
    ],
    templateUrl: './expansion-panel-demo.html',
    styleUrl: './expansion-panel-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpansionPanelDemo {
    readonly claims: readonly DemoClaim[] = [
        {
            id: 1,
            claimNumber: '77-310-4402',
            customerName: 'דנה כהן',
            amount: 12_480,
            description: 'נזק מים בדירה. השמאי ביקר ב-02/10 והדוח שלו צורף לתיק.'
        },
        {
            id: 2,
            claimNumber: '77-310-4519',
            customerName: 'יוסי לוי',
            amount: 3_150.5,
            description: 'שבר שמשה קדמית. ממתין לחשבונית מהמוסך.'
        },
        {
            id: 3,
            claimNumber: '77-311-0087',
            customerName: 'מיכל אברהם',
            amount: 48_900,
            description: 'גניבת רכב. התקבל אישור משטרה; נדרש מפתח שני לפני תשלום.'
        },
        {
            id: 4,
            claimNumber: '77-311-0145',
            customerName: 'אורי פרץ',
            amount: 860,
            description: 'החזר הוצאות רפואיות. אושר לתשלום.'
        },
        {
            id: 5,
            claimNumber: '77-311-0202',
            customerName: 'נועה מזרחי',
            amount: 1_240,
            description: ''
        }
    ];

    readonly multi = new FormControl(false, {nonNullable: true});
    readonly includeCancelled = new FormControl(false, {nonNullable: true});
    readonly contentInvalid = new FormControl(true, {nonNullable: true});
    readonly policyExpanded = signal(true);
    readonly policyDisabled = signal(false);
    readonly policyToggleHidden = signal(false);
    readonly lastEvent = signal('');

    readonly severities: readonly ImsExpansionPanelSeverity[] = ['neutral', 'info', 'success', 'warning', 'danger'];
    readonly policies = createPolicies(400);
    /** The first few, for the example without a virtual viewport. */
    readonly samplePolicies = this.policies.slice(0, 5);
    /**
     * The open policy lives here rather than in the panel: the virtual viewport
     * destroys a panel that scrolls out, and a panel scrolled back in reads its
     * state from this.
     */
    readonly openPolicyId = signal<number | null>(null);

    trackPolicy(_index: number, policy: DemoPolicy): number {
        return policy.id;
    }

    onPolicyExpanded(id: number, expanded: boolean): void {
        if (expanded) {
            this.openPolicyId.set(id);
        } else if (this.openPolicyId() === id) {
            this.openPolicyId.set(null);
        }
    }
}
