import {Component} from '@angular/core';
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

@Component({
    selector: 'app-root',
    imports: [ImsCollapsibleContainer, ImsExpandCollapseButtonDirective, ImsGrid2Cell, ImsGrid2, ImsGrid2Row, ImsGrid2SortDirective, ImsGrid2SortHeader, ImsVirtualScrollAutoHeightDirective, MatExpansionPanel, MatExpansionPanelHeader, FetchIndicator, CdkVirtualScrollViewport, CdkVirtualForOf, CdkFixedSizeVirtualScroll, CdkAccordion],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly trackByFunction = (index: number, row: Grid2DemoRow) => row.id;
    readonly title = 'Generic Query Infrastructure Demo';
    readonly fetchResult$ = timer(2000).pipe(map(() => ({ ok: false })));
    readonly resolveFetchState = (result: unknown) => (result as { ok: boolean }).ok ? 'success' as const : 'error' as const;
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
}
