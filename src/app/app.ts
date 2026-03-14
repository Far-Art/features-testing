import {Component, signal} from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import {ImsGrid} from './components/ims-grid/ims-grid';
import {ImsGridRow} from './components/ims-grid/ims-grid-row';
import {ImsGridCell} from './components/ims-grid/ims-grid-cell';
import {ImsSortHeaderDirective} from './components/ims-grid/ims-sort-header.directive';
import {CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport} from '@angular/cdk/scrolling';


@Component({
    selector: 'app-root',
    imports: [
        MatExpansionModule,
        ImsGrid,
        ImsGridRow,
        ImsGridCell,
        ImsSortHeaderDirective,
        CdkVirtualScrollViewport,
        CdkFixedSizeVirtualScroll
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    protected readonly title = signal('features-testing');

    stubData = Array.from({length: 100}, (_, i) => ({
        id: i,
        policy: `Policy ${i}`,
        status: Math.random() < 0.5 ? 'active' : 'inactive'
    }));
}
