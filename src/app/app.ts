import {Component, signal} from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import {ImsGrid} from './components/ims-grid/ims-grid';
import {ImsGridRow} from './components/ims-grid/ims-grid-row';
import {ImsGridCell} from './components/ims-grid/ims-grid-cell';
import {ImsSortHeaderDirective} from './components/ims-grid/ims-sort-header.directive';


@Component({
    selector: 'app-root',
    imports: [
        MatExpansionModule,
        ImsGrid,
        ImsGridRow,
        ImsGridCell,
        ImsSortHeaderDirective
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    protected readonly title = signal('features-testing');
}
