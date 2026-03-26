import {Component, OnInit, signal} from '@angular/core';
import {InsuredQuery} from './components/query/insured-query/insured-query';
import {PolicyQuery} from './components/query/policy-query/policy-query';
import {ImsCheckbox} from './components/ims-checkbox/ims-checkbox';

@Component({
    selector: 'app-root',
    imports: [
        InsuredQuery,
        PolicyQuery,
        ImsCheckbox
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App implements OnInit {
    readonly title = 'Generic Query Infrastructure Demo';

    isIntermediate = signal(false)

    ngOnInit() {
        setInterval(() => {
            this.isIntermediate.update(v => !v);
        }, 2000)
    }
}
