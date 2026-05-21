import {Component} from '@angular/core';
import {GlassButton} from './glass-button/glass-button';
import {InsuredQuery} from './components/query/insured-query/insured-query';
import {ImsCollapsibleContainer} from './components/ims-collapsible-container/ims-collapsible-container';
import {ImsExpandCollapseButtonDirective} from './components/ims-expand-collapse-button/ims-expand-collapse-button.directive';
import {ImsGrid, ImsGridCell, ImsGridRow} from './components/ims-grid';
import {ImsGrid2, ImsGrid2Cell, ImsGrid2ClipDirective, ImsGrid2Row} from './components/ims-grid2';
import {MatExpansionPanel, MatExpansionPanelHeader} from '@angular/material/expansion';
import {FetchIndicator} from './components/fetch-indicator/fetch-indicator.component';
import {map, timer} from 'rxjs';

@Component({
    selector: 'app-root',
    imports: [GlassButton, ImsCollapsibleContainer, ImsExpandCollapseButtonDirective, InsuredQuery, ImsGridCell, ImsGrid, ImsGridRow, ImsGrid2Cell, ImsGrid2, ImsGrid2Row, ImsGrid2ClipDirective, MatExpansionPanel, MatExpansionPanelHeader, FetchIndicator],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly title = 'Generic Query Infrastructure Demo';
    readonly fetchResult$ = timer(2000).pipe(map(() => ({ ok: false })));
    readonly resolveFetchState = (result: unknown) => (result as { ok: boolean }).ok ? 'success' as const : 'error' as const;
}
