import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {
    ImsSnackbarConfig,
    ImsSnackbarHorizontalPosition,
    ImsSnackbarService,
    ImsSnackbarVerticalPosition
} from '../../components/ims-snackbar';

@Component({
    selector: 'app-snackbar-demo',
    standalone: true,
    templateUrl: './snackbar-demo.html',
    styleUrl: './snackbar-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackbarDemo {
    private readonly snackbar = inject(ImsSnackbarService);

    readonly lastEvent = signal('טרם הופעלה הודעה');

    showTimed(): void {
        this.open('הפעולה הושלמה בהצלחה', '', {duration: 3000});
    }

    showPersistent(): void {
        this.open('הודעה זו תישאר עד לסגירה ידנית');
    }

    showWithAction(): void {
        const ref = this.snackbar.open('הפריט נמחק', 'ביטול', {
            duration: 5000,
            direction: 'rtl'
        });

        this.lastEvent.set('הודעת מחיקה נפתחה');
        ref.onAction().subscribe(() => this.lastEvent.set('פעולת הביטול נבחרה'));
        ref.afterDismissed().subscribe(({dismissedByAction}) => {
            if (!dismissedByAction) {
                this.lastEvent.set('הודעת המחיקה נסגרה ללא פעולה');
            }
        });
    }

    showAt(
        verticalPosition: ImsSnackbarVerticalPosition,
        horizontalPosition: ImsSnackbarHorizontalPosition
    ): void {
        this.open(`מיקום: ${verticalPosition} / ${horizontalPosition}`, '', {
            duration: 3000,
            verticalPosition,
            horizontalPosition
        });
    }

    dismiss(): void {
        this.snackbar.dismiss();
        this.lastEvent.set('ההודעה נסגרה ידנית');
    }

    private open(message: string, action = '', config: ImsSnackbarConfig = {}): void {
        const ref = this.snackbar.open(message, action, {
            direction: 'rtl',
            ...config
        });

        this.lastEvent.set(`נפתחה הודעה: ${message}`);
        ref.afterDismissed().subscribe(({dismissedByAction}) => {
            this.lastEvent.set(dismissedByAction
                ? 'ההודעה נסגרה באמצעות הפעולה'
                : 'ההודעה נסגרה'
            );
        });
    }
}
