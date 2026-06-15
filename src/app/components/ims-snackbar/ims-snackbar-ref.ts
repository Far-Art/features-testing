import {OverlayRef} from '@angular/cdk/overlay';
import {Observable, Subject} from 'rxjs';
import {ImsSnackbarDismiss} from './ims-snackbar.types';

export class ImsSnackbarRef {
    private readonly action = new Subject<void>();
    private readonly dismissed = new Subject<ImsSnackbarDismiss>();
    private dismissedValue = false;

    constructor(private readonly overlayRef: OverlayRef) {}

    dismiss(): void {
        this.finishDismiss(false);
    }

    dismissWithAction(): void {
        if (this.dismissedValue) {
            return;
        }

        this.action.next();
        this.action.complete();
        this.finishDismiss(true);
    }

    onAction(): Observable<void> {
        return this.action.asObservable();
    }

    afterDismissed(): Observable<ImsSnackbarDismiss> {
        return this.dismissed.asObservable();
    }

    private finishDismiss(dismissedByAction: boolean): void {
        if (this.dismissedValue) {
            return;
        }

        this.dismissedValue = true;
        this.overlayRef.dispose();
        this.action.complete();
        this.dismissed.next({dismissedByAction});
        this.dismissed.complete();
    }
}
