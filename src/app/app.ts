import {Component, computed, signal} from '@angular/core';
import {
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';
import {ImsGrid} from './components/ims-grid/ims-grid';
import {ImsGridRow} from './components/ims-grid/ims-grid-row';
import {ImsGridCell} from './components/ims-grid/ims-grid-cell';
import {ImsSortHeaderDirective} from './components/ims-grid/ims-sort-header.directive';
import {ImsSortState} from './components/ims-grid/ims-grid.tokens';
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
    private readonly baseRows = signal<readonly PolicyRow[]>(createRows(50000));
    private readonly sort = signal<ImsSortState>({active: null, direction: ''});

    readonly rows = computed(() => sortRows(this.baseRows(), this.sort()));

    onSortChange(sortState: ImsSortState): void {
        this.sort.set(sortState);
    }

    trackById = (_index: number, row: PolicyRow): number => row.id;
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

function sortRows(rows: readonly PolicyRow[], sort: ImsSortState): readonly PolicyRow[] {
    const activeField = sort.active;
    if (!activeField || !sort.direction) {
        return rows;
    }

    const directionFactor = sort.direction === 'asc' ? 1 : -1;
    const copy = [...rows];

    copy.sort((left, right) => {
        const result = compareField(left, right, activeField);
        if (result !== 0) {
            return result * directionFactor;
        }

        return left.id - right.id;
    });

    return copy;
}

function compareField(left: PolicyRow, right: PolicyRow, field: string): number {
    switch (field) {
        case 'policy':
            return left.policy.localeCompare(right.policy, undefined, {numeric: true, sensitivity: 'base'});
        case 'status':
            return left.status.localeCompare(right.status, undefined, {sensitivity: 'base'});
        case 'premium':
            return left.premium - right.premium;
        default:
            return 0;
    }
}
