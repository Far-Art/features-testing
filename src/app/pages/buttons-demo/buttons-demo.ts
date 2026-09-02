import {Component, ChangeDetectionStrategy} from '@angular/core';
import {
    ImsButton,
    ImsButtonDelete,
    ImsButtonEdit,
    ImsButtonIcon
} from '../../components/ims-button';
import {ImsIcon} from '../../components/ims-icon';
import {ImsLongPressDirective} from '../../ims-long-press.directive';
import {ReadonlyDirective} from '../../shared/readonly.directive';

@Component({
    selector: 'app-buttons-demo',
    imports: [
        ImsButton,
        ImsButtonIcon,
        ImsButtonDelete,
        ImsButtonEdit,
        ImsIcon,
        ImsLongPressDirective,
        ReadonlyDirective
    ],
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
