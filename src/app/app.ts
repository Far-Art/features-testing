import {Component, signal} from '@angular/core';
import {ImsGrid} from './components/ims-grid';
import {ImsGridRow} from './components/ims-grid';
import {ImsGridCell} from './components/ims-grid';
import {ImsSortHeaderDirective} from './components/ims-grid';
import {MatAccordion, MatExpansionPanel, MatExpansionPanelHeader} from '@angular/material/expansion';
import {ImsLongTextDirective} from './ims-long-text.directive';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {ImsSortChangeEvent} from './components/ims-grid/ims-grid.tokens';

interface PolicyRow {
    id: number;
    policy: string;
    version: number;
    olderVersions: PolicyRow[];
}

@Component({
    selector: 'app-root',
    imports: [
        ImsGrid,
        ImsGridRow,
        ImsGridCell,
        ImsSortHeaderDirective,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        ImsLongTextDirective,
        MatAccordion,
        ScrollingModule
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly rows = signal<readonly PolicyRow[]>(createRows(100));
    private readonly initialOrderById = new Map<number, number>(
        this.rows().map((row, index) => [row.id, index])
    );

    readonly trackById = (_index: number, row: PolicyRow): number => row.id;

    onGridSortChange(event: ImsSortChangeEvent): void {
        const sortedData = event.sortedData;
        if (!sortedData) {
            return;
        }

        if (!event.state.active || !event.state.direction) {
            const restored = [...(sortedData as readonly PolicyRow[])].sort(
                (left, right) => this.resolveInitialOrder(left) - this.resolveInitialOrder(right)
            );
            this.rows.set(restored);
            return;
        }

        this.rows.set(sortedData as readonly PolicyRow[]);
    }

    private resolveInitialOrder(row: PolicyRow): number {
        return this.initialOrderById.get(row.id) ?? Number.MAX_SAFE_INTEGER;
    }
}

function createRows(count: number): PolicyRow[] {
    return Array.from({length: count}, (_, index) => createPolicyRow(index));
}

function createPolicyRow(index: number): PolicyRow {
    const policyNumber = 1000 + index;
    const currentVersion = 3 + (index % 4);
    const olderVersionCount = Math.min(currentVersion - 1, 1 + (index % 3));

    const olderVersions: PolicyRow[] = Array.from({length: olderVersionCount}, (_, olderIndex) => {
        const version = currentVersion - (olderIndex + 1);
        return {
            id: ((index + 1) * 1000) + (olderIndex + 1),
            policy: `Policy #${policyNumber}`,
            version,
            olderVersions: []
        };
    });

    return {
        id: index + 1,
        policy: `Policy #${policyNumber}`,
        version: currentVersion,
        olderVersions
    };
}
