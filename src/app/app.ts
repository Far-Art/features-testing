import {Component, signal} from '@angular/core';
import {
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';
import {ImsGrid} from './components/ims-grid';
import {ImsGridRow} from './components/ims-grid';
import {ImsGridCell} from './components/ims-grid';
import {ImsSortHeaderDirective} from './components/ims-grid';
import {MatExpansionPanel, MatExpansionPanelHeader} from '@angular/material/expansion';
import {TextOverflow} from './text-overflow';

interface PolicyRow {
    id: number;
    policy: string;
    status: 'active' | 'inactive' | 'pending';
    premium: number;
}

@Component({
    selector: 'app-root',
    imports: [
        ImsGrid,
        ImsGridRow,
        ImsGridCell,
        ImsSortHeaderDirective,
        CdkVirtualScrollViewport,
        CdkVirtualForOf,
        CdkFixedSizeVirtualScroll,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        TextOverflow
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly rows = signal<readonly PolicyRow[]>(createRows(50000));

    readonly trackById = (_index: number, row: PolicyRow): number => row.id;
}

function createRows(count: number): PolicyRow[] {
    const statuses: PolicyRow['status'][] = ['active', 'inactive', 'pending'];

    return Array.from({length: count}, (_, id) => ({
        id,
        policy: `Policy #${1000 + id}`,
        status: statuses[id % statuses.length],
        premium: 150 + ((id * 37) % 1200)
    }));
}
