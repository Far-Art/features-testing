import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ImsButton, ImsButtonDark, ImsButtonWhite} from '../../components/ims-button';
import {ImsLongPressDirective} from '../../ims-long-press.directive';
import {ReadonlyDirective} from '../../shared/readonly.directive';

@Component({
    selector: 'app-buttons-demo',
    imports: [ImsButton, ImsButtonDark, ImsButtonWhite, ImsLongPressDirective, ReadonlyDirective],
    templateUrl: './buttons-demo.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './buttons-demo.scss'
})
export class ButtonsDemo {
    criticalActionCount = 0;

    registerCriticalAction(): void {
        this.criticalActionCount++;
    }
}
