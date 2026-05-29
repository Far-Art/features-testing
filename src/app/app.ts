import {Component} from '@angular/core';
import {FormsModule, ReactiveFormsModule, FormControl} from '@angular/forms';
import {ImsCollapsibleContainer} from './components/ims-collapsible-container/ims-collapsible-container';
import {ImsExpandCollapseButtonDirective} from './components/ims-expand-collapse-button/ims-expand-collapse-button.directive';
import {
    ImsGrid2,
    ImsGrid2Cell,
    ImsGrid2Row,
    ImsGrid2SortDirective,
    ImsGrid2SortHeader
} from './components/ims-grid2';
import {MatExpansionPanel, MatExpansionPanelHeader} from '@angular/material/expansion';
import {FetchIndicator} from './components/fetch-indicator/fetch-indicator.component';
import {map, timer} from 'rxjs';
import {CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {ImsVirtualScrollAutoHeightDirective} from './shared/ims-virtual-scroll-auto-height.directive';
import {CdkAccordion} from '@angular/cdk/accordion';
import {ImsOption, ImsSelect} from './components/ims-select';

interface Grid2DemoRow {
    readonly id: number;
    readonly firstName: string;
    readonly lastName: string;
    readonly identity: string;
    readonly policyNumber: string;
    readonly product: string;
    readonly premium: boolean;
    readonly status: string;
    readonly details?: readonly {
        readonly identity: string;
        readonly policyNumber: string;
        readonly product: string;
    }[];
}

interface SelectDemoBag {
    readonly id: number;
    readonly label: string;
    readonly count: number;
    readonly disabled?: boolean;
}

@Component({
    selector: 'app-root',
    imports: [FormsModule, ReactiveFormsModule, ImsCollapsibleContainer, ImsExpandCollapseButtonDirective, ImsGrid2Cell, ImsGrid2, ImsGrid2Row, ImsGrid2SortDirective, ImsGrid2SortHeader, ImsVirtualScrollAutoHeightDirective, MatExpansionPanel, MatExpansionPanelHeader, FetchIndicator, CdkVirtualScrollViewport, CdkVirtualForOf, CdkFixedSizeVirtualScroll, CdkAccordion, ImsSelect, ImsOption],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly trackByFunction = (index: number, row: Grid2DemoRow) => row.id;
    readonly title = 'Generic Query Infrastructure Demo';
    readonly fetchResult$ = timer(2000).pipe(map(() => ({ ok: false })));
    readonly resolveFetchState = (result: unknown) => (result as { ok: boolean }).ok ? 'success' as const : 'error' as const;
    readonly bagOptions: readonly SelectDemoBag[] = [
        {id: 1, label: 'Documents', count: 35},
        {id: 2, label: 'Receipts', count: 12},
        {id: 3, label: 'Policies', count: 8},
        {id: 4, label: 'Claims', count: 19},
        {id: 5, label: 'Invoices', count: 22},
        {id: 6, label: 'Photos', count: 4},
        {id: 7, label: 'Medical files', count: 16},
        {id: 8, label: 'Vehicle reports', count: 9},
        {id: 9, label: 'Legal notices', count: 11},
        {id: 10, label: 'Travel forms', count: 6},
        {id: 11, label: 'Approvals', count: 18},
        {id: 12, label: 'Renewals', count: 21},
        {id: 13, label: 'Audits', count: 7},
        {id: 14, label: 'Statements', count: 13},
        {id: 15, label: 'Schedules', count: 15},
        {id: 16, label: 'Archived bags', count: 3},
        {id: 17, label: 'Pending review', count: 10},
        {id: 18, label: 'Long retention category', count: 5}
    ];
    readonly selectedBagsControl = new FormControl<readonly SelectDemoBag[]>(
        [this.bagOptions[0], this.bagOptions[1], this.bagOptions[2], this.bagOptions[3], this.bagOptions[4]],
        {nonNullable: true}
    );
    selectedBagModel: SelectDemoBag | null = this.bagOptions[0];
    readonly compareBagById = (first: unknown, second: unknown) => {
        if (this.isSelectDemoBag(first) && this.isSelectDemoBag(second)) {
            return first.id === second.id;
        }

        return first === second;
    };
    readonly grid2Rows: readonly Grid2DemoRow[] = [
        {
            id: 1,
            firstName: 'artur',
            lastName: 'cohen',
            identity: '123456',
            policyNumber: '1234',
            product: 'policy',
            premium: true,
            status: 'active',
            details: [
                {
                    identity: '123456',
                    policyNumber: '1234',
                    product: 'policy'
                },
                {
                    identity: '123456',
                    policyNumber: '1234',
                    product: 'policy'
                },
                {
                    identity: '123456',
                    policyNumber: '1234',
                    product: 'policy'
                }
            ]
        },
        {
            id: 2,
            firstName: 'mira',
            lastName: 'levi',
            identity: '789012',
            policyNumber: '9876',
            product: 'claim',
            premium: false,
            status: 'pending'
        }
    ];

    private isSelectDemoBag(value: unknown): value is SelectDemoBag {
        return typeof value === 'object' && value !== null && 'id' in value;
    }
}
