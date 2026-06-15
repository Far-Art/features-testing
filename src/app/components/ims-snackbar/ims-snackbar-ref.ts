import {OverlayRef} from '@angular/cdk/overlay';
import {signal} from '@angular/core';
import {
    Observable,
    ReplaySubject,
    Subject,
    Subscription,
    from,
    isObservable
} from 'rxjs';
import {
    ImsSnackbarDismiss,
    ImsSnackbarProgressResult,
    ImsSnackbarProgressState,
    ImsSnackbarResolvedProgressConfig
} from './ims-snackbar.types';

const IMS_SNACKBAR_EXIT_DURATION_MS = 180;

export class ImsSnackbarRef {
    private readonly action = new Subject<void>();
    private readonly dismissed = new Subject<ImsSnackbarDismiss>();
    private readonly progressResolved = new ReplaySubject<ImsSnackbarProgressResult>(1);
    private readonly progressConfig: ImsSnackbarResolvedProgressConfig | null;
    private progressSubscription: Subscription | null = null;
    private closeDelayTimer: ReturnType<typeof setTimeout> | null = null;
    private settleTimer: ReturnType<typeof setTimeout> | null = null;
    private dismissedValue = false;

    readonly progressState = signal<ImsSnackbarProgressState>('loading');
    readonly progressCloseVisible = signal(false);

    constructor(
        private readonly overlayRef: OverlayRef,
        progressConfig: ImsSnackbarResolvedProgressConfig | null
    ) {
        this.progressConfig = progressConfig;
        this.startProgress();
    }

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

    onDismiss(): Observable<ImsSnackbarDismiss> {
        return this.dismissed.asObservable();
    }

    onProgressResolved(): Observable<ImsSnackbarProgressResult> {
        return this.progressResolved.asObservable();
    }

    isProgress(): boolean {
        return this.progressConfig !== null;
    }

    isProgressPending(): boolean {
        return this.isProgress() && this.progressState() === 'loading';
    }

    resolveProgress(value?: unknown): void {
        this.settleProgress({state: 'success', value});
    }

    rejectProgress(error?: unknown): void {
        this.settleProgress({state: 'error', error});
    }

    private finishDismiss(dismissedByAction: boolean): void {
        if (this.dismissedValue) {
            return;
        }

        this.dismissedValue = true;
        this.clearProgressTimers();
        if (this.progressConfig?.cancelOnDismiss) {
            this.progressSubscription?.unsubscribe();
        }
        this.action.complete();
        const overlayElement = this.overlayRef.overlayElement;
        overlayElement.classList.add('ims-snackbar-stack-item--leaving');
        overlayElement.style.opacity = '0';

        setTimeout(() => {
            this.dismissed.next({dismissedByAction});
            this.dismissed.complete();
            this.progressResolved.complete();
            this.overlayRef.dispose();
        }, IMS_SNACKBAR_EXIT_DURATION_MS);
    }

    private startProgress(): void {
        const config = this.progressConfig;
        if (!config) {
            return;
        }

        if (config.closeDelay <= 0) {
            this.progressCloseVisible.set(true);
        } else {
            this.closeDelayTimer = setTimeout(() => {
                this.progressCloseVisible.set(true);
                this.closeDelayTimer = null;
            }, config.closeDelay);
        }

        if (!config.source) {
            return;
        }

        const source$ = isObservable(config.source)
            ? config.source
            : from(config.source);
        let lastValue: unknown;

        this.progressSubscription = source$.subscribe({
            next: (value) => {
                lastValue = value;
            },
            error: (error) => this.rejectProgress(error),
            complete: () => this.resolveProgress(lastValue)
        });
    }

    private settleProgress(result: ImsSnackbarProgressResult): void {
        if (!this.isProgressPending() || this.dismissedValue) {
            return;
        }

        this.progressState.set(result.state);
        this.progressResolved.next(result);
        this.progressResolved.complete();
        this.progressSubscription?.unsubscribe();
        this.progressSubscription = null;

        if (this.closeDelayTimer !== null) {
            clearTimeout(this.closeDelayTimer);
            this.closeDelayTimer = null;
        }

        this.settleTimer = setTimeout(() => {
            this.settleTimer = null;
            this.dismiss();
        }, this.progressConfig?.settleDuration ?? 0);
    }

    private clearProgressTimers(): void {
        if (this.closeDelayTimer !== null) {
            clearTimeout(this.closeDelayTimer);
            this.closeDelayTimer = null;
        }
        if (this.settleTimer !== null) {
            clearTimeout(this.settleTimer);
            this.settleTimer = null;
        }
    }
}
