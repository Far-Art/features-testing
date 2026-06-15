import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
    selector: 'ims-snackbar-stack-control',
    standalone: true,
    template: `
        <button type="button" class="ims-snackbar-stack-control__button" (click)="dismissAll()">
            Dismiss all
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-snackbar-stack-control'
    }
})
export class ImsSnackbarStackControl {
    dismissAll: () => void = () => {};
}
