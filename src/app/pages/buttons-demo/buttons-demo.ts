import {Component, ChangeDetectionStrategy} from '@angular/core';
import {MatTooltip} from '@angular/material/tooltip';
import {
    ImsButton,
    ImsButtonDelete,
    ImsButtonEdit,
    ImsButtonIcon
} from '../../components/ims-button';
import {ImsIcon} from '../../components/ims-icon';
import {ImsLongPressDirective} from '../../ims-long-press.directive';
import {ImsTooltip} from '../../components/ims-tooltip';
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
        // The buttons carry no tooltip of their own, so `matTooltip` on one is
        // this directive, imported here like any other.
        MatTooltip,
        ImsTooltip,
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
