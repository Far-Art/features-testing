import {Component} from '@angular/core';
import {GlassButton} from './glass-button/glass-button';
import {InsuredQuery} from './components/query/insured-query/insured-query';
import {ImsCollapsibleContainer} from './components/ims-collapsible-container/ims-collapsible-container';
import {ImsExpandCollapseButtonDirective} from './components/ims-expand-collapse-button/ims-expand-collapse-button.directive';
import {ImsGrid, ImsGridCell, ImsGridRow} from './components/ims-grid';
import {
    ImsGrid2,
    ImsGrid2Cell,
    ImsGrid2ClipDirective,
    ImsGrid2Row,
    ImsGrid2SortDirective,
    ImsGrid2SortHeader
} from './components/ims-grid2';
import {MatExpansionPanel, MatExpansionPanelHeader} from '@angular/material/expansion';
import {FetchIndicator} from './components/fetch-indicator/fetch-indicator.component';
import {map, timer} from 'rxjs';

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
    imports: [GlassButton, ImsCollapsibleContainer, ImsExpandCollapseButtonDirective, InsuredQuery, ImsGridCell, ImsGrid, ImsGridRow, ImsGrid2Cell, ImsGrid2, ImsGrid2Row, ImsGrid2ClipDirective, ImsGrid2SortDirective, ImsGrid2SortHeader, MatExpansionPanel, MatExpansionPanelHeader, FetchIndicator],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
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
