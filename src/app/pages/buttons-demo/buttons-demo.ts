import {Component} from '@angular/core';
import {ImsLongPressDirective} from '../../ims-long-press.directive';

@Component({
    selector: 'app-buttons-demo',
    imports: [ImsLongPressDirective],
    templateUrl: './buttons-demo.html',
    styleUrl: './buttons-demo.scss'
})
export class ButtonsDemo {
    criticalActionCount = 0;

    registerCriticalAction(): void {
        this.criticalActionCount++;
    }
}
