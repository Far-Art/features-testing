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
import {
    IMS_SNACKBAR_CONFIG,
    ImsSnackbarConfig,
    ImsSnackbarPoliteness
} from './ims-snackbar.types';

@Component({
    selector: 'ims-snackbar',
    standalone: true,
    imports: [NgComponentOutlet, FetchIndicator],
    templateUrl: './ims-snackbar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-snackbar',
        role: 'status',
        '[attr.aria-live]': 'politeness',
        '[attr.dir]': 'config.direction',
        '[class.ims-snackbar--info]': 'config.severity === "info"',
        '[class.ims-snackbar--success]': 'config.severity === "success"',
        '[class.ims-snackbar--warning]': 'config.severity === "warning"',
        '[class.ims-snackbar--danger]': 'config.severity === "danger"',
        '[class.ims-snackbar--progress]': 'snackbarRef.isProgress()'
    }
})
export class ImsSnackbar {
    readonly snackbarRef = inject(ImsSnackbarRef);
    readonly config = inject(IMS_SNACKBAR_CONFIG) as ImsSnackbarConfig;
    readonly contentInjector = inject(Injector);

    message = '';
    contentComponent: Type<unknown> | null = null;

    get politeness(): ImsSnackbarPoliteness {
        return this.config.politeness;
    }
}
