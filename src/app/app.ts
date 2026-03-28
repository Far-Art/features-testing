import {Component, OnInit, signal} from '@angular/core';
import {InsuredQuery} from './components/query/insured-query/insured-query';
import {PolicyQuery} from './components/query/policy-query/policy-query';
import {ImsCheckbox} from './components/ims-checkbox/ims-checkbox';
import {ImsGrid, ImsGridCell, ImsGridRow} from './components/ims-grid';

@Component({
    selector: 'app-root',
    imports: [
        InsuredQuery,
        PolicyQuery,
        ImsCheckbox,
        ImsGrid,
        ImsGridRow,
        ImsGridCell
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App implements OnInit {
    readonly title = 'Generic Query Infrastructure Demo';


    ngOnInit() {

    }

    onChange(event: any) {
        console.log(event)
    }
}
