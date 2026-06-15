import {OverlayRef} from '@angular/cdk/overlay';
import {Signal, WritableSignal, computed, signal} from '@angular/core';
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
    ImsSnackbarPoliteness,
    ImsSnackbarProgressResult,
    ImsSnackbarProgressState,
    ImsSnackbarResolvedProgressConfig,
    ImsSnackbarSeverity
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
    private settleStartedAt: number | null = null;
    private remainingSettleDuration = 0;
    private settled = false;
    private dismissedValue = false;

    readonly message = signal('');
    readonly title = signal('');
    readonly severity: WritableSignal<ImsSnackbarSeverity>;
    readonly politeness: Signal<ImsSnackbarPoliteness>;
    readonly progressState = signal<ImsSnackbarProgressState>('loading');
    readonly progressCloseVisible = signal(false);

    constructor(
        private readonly overlayRef: OverlayRef,
        progressConfig: ImsSnackbarResolvedProgressConfig | null,
        severity: ImsSnackbarSeverity
    ) {
        this.progressConfig = progressConfig;
        this.severity = signal(severity);
        this.politeness = computed(() =>
            this.severity() === 'danger' ? 'assertive' : 'polite'
        );
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

    updateMessage(message: string): void {
        this.message.set(message);
    }

    updateTitle(title: string): void {
        this.title.set(title);
    }

    updateSeverity(severity: ImsSnackbarSeverity): void {
        const element = this.overlayRef.overlayElement;
        element.classList.remove(`ims-snackbar-overlay--${this.severity()}`);
        element.classList.add(`ims-snackbar-overlay--${severity}`);
        this.severity.set(severity);
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

    pauseSettle(): void {
        if (!this.settled || this.settleTimer === null || this.settleStartedAt === null) {
            return;
        }

        clearTimeout(this.settleTimer);
        this.settleTimer = null;
        this.remainingSettleDuration = Math.max(
            0,
            this.remainingSettleDuration - (Date.now() - this.settleStartedAt)
        );
        this.settleStartedAt = null;
    }

    resumeSettle(): void {
        if (!this.settled || this.settleTimer !== null || this.dismissedValue) {
            return;
        }

        this.startSettleTimer();
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

        this.settled = true;
        this.remainingSettleDuration = this.progressConfig?.settleDuration ?? 0;
        this.startSettleTimer();
    }

    private startSettleTimer(): void {
        if (this.remainingSettleDuration <= 0) {
            this.dismiss();
            return;
        }

        this.settleStartedAt = Date.now();
        this.settleTimer = setTimeout(() => {
            this.settleTimer = null;
            this.settleStartedAt = null;
            this.remainingSettleDuration = 0;
            this.dismiss();
        }, this.remainingSettleDuration);
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
