import {NgComponentOutlet} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Injector,
    Type,
    inject
} from '@angular/core';
import {FetchIndicator} from '../fetch-indicator/fetch-indicator.component';
import {ImsSnackbarRef} from './ims-snackbar-ref';
import {IMS_SNACKBAR_CONFIG, ImsSnackbarConfig} from './ims-snackbar.types';

@Component({
    selector: 'ims-snackbar',
    standalone: true,
    imports: [NgComponentOutlet, FetchIndicator],
    templateUrl: './ims-snackbar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-snackbar',
        role: 'status',
        '[attr.aria-live]': 'snackbarRef.politeness()',
        '[attr.dir]': 'config.direction',
        '[class.ims-snackbar--info]': 'snackbarRef.severity() === "info"',
        '[class.ims-snackbar--success]': 'snackbarRef.severity() === "success"',
        '[class.ims-snackbar--warning]': 'snackbarRef.severity() === "warning"',
        '[class.ims-snackbar--danger]': 'snackbarRef.severity() === "danger"',
        '[class.ims-snackbar--progress]': 'snackbarRef.isProgress()'
    }
})
export class ImsSnackbar {
    readonly snackbarRef = inject(ImsSnackbarRef);
    readonly config = inject(IMS_SNACKBAR_CONFIG) as ImsSnackbarConfig;
    readonly contentInjector = inject(Injector);

    contentComponent: Type<unknown> | null = null;
}
