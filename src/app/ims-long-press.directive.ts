import {
    DestroyRef,
    Directive,
    ElementRef,
    NgZone,
    booleanAttribute,
    inject,
    input
} from '@angular/core';

const DEFAULT_HOLD_MS = 500;

const coerceHoldMs = (value: unknown): number => {
    if (value === '' || value === null || value === undefined) return DEFAULT_HOLD_MS;

    const holdMs = Number(value);
    return Number.isFinite(holdMs) && holdMs > 0 ? holdMs : DEFAULT_HOLD_MS;
};

type HoldSource = 'pointer' | 'keyboard';
export type ImsLongPressActivation = 'release' | 'timeout';

@Directive({
    selector: '[imsLongPress]',
    standalone: true,
    host: {
        class: 'ims-long-press'
    }
})
export class ImsLongPressDirective {
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly zone = inject(NgZone);
    private readonly eventCleanups: Array<() => void> = [];
    private readonly captureOptions: AddEventListenerOptions = {capture: true};
    private activeSource: HoldSource | null = null;
    private activePointerId: number | null = null;
    private startedAt = 0;
    private ready = false;
    private allowNextClick = false;
    private frameId: ReturnType<typeof requestAnimationFrame> | null = null;
    private cancelClassTimer: ReturnType<typeof setTimeout> | null = null;
    private resetTimer: ReturnType<typeof setTimeout> | null = null;

    /** Duration, in milliseconds, that must elapse before releasing activates the click. */
    readonly holdMs = input(DEFAULT_HOLD_MS, {alias: 'imsLongPress', transform: coerceHoldMs});

    /** Allows consumers to temporarily bypass long-press handling without removing the directive. */
    readonly disabled = input(false, {alias: 'imsLongPressDisabled', transform: booleanAttribute});

    /** Controls whether activation happens when the hold completes or when the user releases afterward. */
    readonly activation = input<ImsLongPressActivation>('release', {
        alias: 'imsLongPressActivation'
    });

    constructor() {
        this.zone.runOutsideAngular(() => {
            this.listen('pointerdown', this.onPointerDown);
            this.listen('pointerup', this.onPointerUp);
            this.listen('pointercancel', this.onPointerCancel);
            this.listen('lostpointercapture', this.onLostPointerCapture);
            this.listen('keydown', this.onKeyDown);
            this.listen('keyup', this.onKeyUp);
            this.listen('blur', this.onBlur);
            this.listen('click', this.onClick);

            const document = this.host.ownerDocument;
            this.listenTo(document, 'pointerup', this.onPointerUp);
            this.listenTo(document, 'pointercancel', this.onPointerCancel);
            this.listenTo(document, 'visibilitychange', this.onVisibilityChange);

            if (document.defaultView) {
                this.listenTo(document.defaultView, 'blur', this.onWindowBlur);
            }
        });

        this.destroyRef.onDestroy(() => {
            this.eventCleanups.forEach((cleanup) => cleanup());
            this.cancelFrame();
            this.clearCancelClassTimer();
            this.clearResetTimer();
        });
    }

    private listen<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (event: HTMLElementEventMap[K]) => void
    ): void {
        this.listenTo(this.host, type, listener);
    }

    private listenTo<TEvent extends Event>(
        target: EventTarget,
        type: string,
        listener: (event: TEvent) => void
    ): void {
        const wrappedListener = (event: Event) => listener.call(this, event as TEvent);
        target.addEventListener(type, wrappedListener, this.captureOptions);
        this.eventCleanups.push(() =>
            target.removeEventListener(type, wrappedListener, this.captureOptions)
        );
    }

    private onPointerDown(event: PointerEvent): void {
        if (this.shouldIgnoreInteraction()) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        this.capturePointer(event);
        this.startHold('pointer');
        this.activePointerId = event.pointerId;
    }

    private onPointerUp(event: PointerEvent): void {
        if (this.activeSource !== 'pointer' || event.pointerId !== this.activePointerId) return;

        if (this.activation() === 'release' && !this.isPointerInsideHost(event)) {
            this.cancelHold();
            return;
        }

        if (this.ready) {
            this.clearActiveInteraction();
            this.allowNextClick = true;
            this.scheduleReset(500);
            return;
        }

        this.cancelHold();
    }

    private onPointerCancel(event: PointerEvent): void {
        if (this.activeSource !== 'pointer' || event.pointerId !== this.activePointerId) return;
        this.cancelHold();
    }

    private onLostPointerCapture(event: PointerEvent): void {
        if (this.activeSource !== 'pointer' || event.pointerId !== this.activePointerId) return;
        this.cancelHold();
    }

    private onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this.activeSource === 'keyboard') {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.cancelHold();
            return;
        }

        if (!this.isActivationKey(event)) return;
        if (this.shouldIgnoreInteraction()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (event.repeat || this.activeSource === 'keyboard') return;
        this.startHold('keyboard');
    }

    private onKeyUp(event: KeyboardEvent): void {
        if (!this.isActivationKey(event) || this.activeSource !== 'keyboard') return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (this.ready) {
            this.allowNextClick = true;
            this.dispatchClick();
            this.scheduleReset();
            return;
        }

        this.cancelHold();
    }

    private onBlur(): void {
        if (this.activeSource === 'keyboard') {
            this.cancelHold();
        }
    }

    private onWindowBlur(): void {
        if (this.activeSource) {
            this.cancelHold();
        }
    }

    private onVisibilityChange(): void {
        if (this.host.ownerDocument.visibilityState === 'hidden' && this.activeSource) {
            this.cancelHold();
        }
    }

    private onClick(event: MouseEvent): void {
        if (this.disabled()) return;

        if (this.allowNextClick || this.ready) {
            this.allowNextClick = false;
            this.scheduleReset();
            return;
        }

        this.cancelHold();
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    private startHold(source: HoldSource): void {
        this.resetHold();
        this.activeSource = source;
        this.startedAt = performance.now();
        this.ready = false;
        this.allowNextClick = false;
        this.clearResetTimer();
        this.clearCancelClassTimer();
        this.host.classList.add('ims-long-press--holding');
        this.host.classList.remove('ims-long-press--ready', 'ims-long-press--cancelled');
        this.setProgress(0);
        this.frameId = requestAnimationFrame(this.updateProgress);
    }

    private readonly updateProgress = (timestamp: number): void => {
        if (!this.activeSource) return;

        const progress = Math.min((timestamp - this.startedAt) / this.holdMs(), 1);
        this.setProgress(progress);

        if (progress >= 1) {
            this.markReady();
            return;
        }

        this.frameId = requestAnimationFrame(this.updateProgress);
    };

    private markReady(): void {
        this.cancelFrame();
        this.ready = true;
        this.allowNextClick = false;
        this.setProgress(1);
        this.host.classList.add('ims-long-press--ready');

        if (this.activation() === 'timeout') {
            this.allowNextClick = true;
            this.dispatchClick();
        }
    }

    private resetHold(): void {
        this.cancelFrame();
        this.clearActiveInteraction();
        this.startedAt = 0;
        this.ready = false;
        this.allowNextClick = false;
        this.clearResetTimer();
        this.setProgress(0);
        this.host.classList.remove(
            'ims-long-press--holding',
            'ims-long-press--ready',
            'ims-long-press--cancelled',
            'ims-long-press--completed'
        );
    }

    private cancelHold(): void {
        this.cancelFrame();
        this.clearActiveInteraction();
        this.startedAt = 0;
        this.ready = false;
        this.allowNextClick = false;
        this.clearResetTimer();
        this.host.classList.add('ims-long-press--cancelled');
        this.host.classList.remove('ims-long-press--holding', 'ims-long-press--ready');
        this.clearCancelClassTimer();
        this.cancelClassTimer = setTimeout(() => {
            this.setProgress(0);
            this.host.classList.remove('ims-long-press--cancelled');
            this.cancelClassTimer = null;
        }, 220);
    }

    private scheduleReset(delayMs = 0): void {
        this.clearResetTimer();
        this.resetTimer = setTimeout(() => {
            this.resetTimer = null;
            this.finishHold();
        }, delayMs);
    }

    private finishHold(): void {
        this.cancelFrame();
        this.clearActiveInteraction();
        this.startedAt = 0;
        this.ready = false;
        this.allowNextClick = false;
        this.host.classList.add('ims-long-press--completed');
        this.host.classList.remove('ims-long-press--holding', 'ims-long-press--ready');
        this.clearCancelClassTimer();
        this.cancelClassTimer = setTimeout(() => {
            this.setProgress(0);
            this.host.classList.remove('ims-long-press--completed');
            this.cancelClassTimer = null;
        }, 220);
    }

    private cancelFrame(): void {
        if (this.frameId === null) return;

        cancelAnimationFrame(this.frameId);
        this.frameId = null;
    }

    private clearCancelClassTimer(): void {
        if (this.cancelClassTimer === null) return;

        clearTimeout(this.cancelClassTimer);
        this.cancelClassTimer = null;
    }

    private clearResetTimer(): void {
        if (this.resetTimer === null) return;

        clearTimeout(this.resetTimer);
        this.resetTimer = null;
    }

    private setProgress(progress: number): void {
        const {width, height} = this.host.getBoundingClientRect();
        const maxRadius = Math.hypot(width / 2, height / 2);

        this.host.style.setProperty('--ims-long-press-progress', String(progress));
        this.host.style.setProperty('--ims-long-press-fill-radius', `${maxRadius * progress}px`);
    }

    private capturePointer(event: PointerEvent): void {
        if (!this.host.hasPointerCapture || this.host.hasPointerCapture(event.pointerId)) return;

        try {
            this.host.setPointerCapture(event.pointerId);
        } catch {
            // Pointer capture can fail when the browser has already cancelled the pointer.
        }
    }

    private isPointerInsideHost(event: PointerEvent): boolean {
        const bounds = this.host.getBoundingClientRect();

        return event.clientX >= bounds.left
            && event.clientX <= bounds.right
            && event.clientY >= bounds.top
            && event.clientY <= bounds.bottom;
    }

    private clearActiveInteraction(): void {
        const pointerId = this.activePointerId;
        this.activeSource = null;
        this.activePointerId = null;
        this.releaseCapturedPointer(pointerId);
    }

    private releaseCapturedPointer(pointerId: number | null): void {
        if (pointerId === null) return;
        if (!this.host.hasPointerCapture || !this.host.hasPointerCapture(pointerId)) return;

        try {
            this.host.releasePointerCapture(pointerId);
        } catch {
            // Pointer capture can already be released by the browser.
        }
    }

    private dispatchClick(): void {
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: this.host.ownerDocument.defaultView
        });

        this.host.dispatchEvent(event);
    }

    private isActivationKey(event: KeyboardEvent): boolean {
        return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
    }

    private shouldIgnoreInteraction(): boolean {
        return this.disabled() || this.isHostDisabled();
    }

    private isHostDisabled(): boolean {
        return this.host.hasAttribute('disabled') || this.host.getAttribute('aria-disabled') === 'true';
    }

    private get host(): HTMLElement {
        return this.element.nativeElement;
    }
}
