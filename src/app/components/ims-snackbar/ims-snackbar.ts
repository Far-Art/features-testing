import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ImsSnackbarRef} from './ims-snackbar-ref';
import {
    IMS_SNACKBAR_CONFIG,
    ImsSnackbarConfig,
    ImsSnackbarPoliteness
} from './ims-snackbar.types';

@Component({
    selector: 'ims-snackbar',
    standalone: true,
    templateUrl: './ims-snackbar.html',
    styleUrl: './ims-snackbar.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-snackbar',
        role: 'status',
        '[attr.aria-live]': 'politeness',
        '[attr.dir]': 'config.direction'
    }
})
export class ImsSnackbar {
    readonly snackbarRef = inject(ImsSnackbarRef);
    readonly config = inject(IMS_SNACKBAR_CONFIG) as ImsSnackbarConfig;

    message = '';
    action = '';

    get politeness(): ImsSnackbarPoliteness {
        return this.config.politeness ?? 'polite';
    }
}
