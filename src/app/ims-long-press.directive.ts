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

/** Keeps completion or cancellation feedback visible long enough for its CSS fade-out. */
const FEEDBACK_MS = 220;

/** Maximum time to authorize the native click generated after a successful pointer release. */
const NATIVE_CLICK_WAIT_MS = 500;

const coerceHoldMs = (value: unknown): number => {
    if (value === '' || value === null || value === undefined) return DEFAULT_HOLD_MS;

    const holdMs = Number(value);
    return Number.isFinite(holdMs) && holdMs > 0 ? holdMs : DEFAULT_HOLD_MS;
};

type HoldSource = 'pointer' | 'keyboard';
export type ImsLongPressActivation = 'release' | 'timeout';
export type ImsLongPressVisual = 'background' | 'circle';

@Directive({
    selector: '[imsLongPress]',
    standalone: true,
    host: {
        class: 'ims-long-press',
        '[class.ims-long-press--visual-background]': 'visual() === "background"',
        '[class.ims-long-press--visual-circle]': 'visual() === "circle"'
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
    private maxRadius = 0;
    private ready = false;
    private allowNextClick = false;
    private syntheticClick: MouseEvent | null = null;
    private frameId: ReturnType<typeof requestAnimationFrame> | null = null;
    private timerId: ReturnType<typeof setTimeout> | null = null;

    /** Duration, in milliseconds, that must elapse before releasing activates the click. */
    readonly holdMs = input(DEFAULT_HOLD_MS, {alias: 'imsLongPress', transform: coerceHoldMs});

    /** Allows consumers to temporarily bypass long-press handling without removing the directive. */
    readonly disabled = input(false, {alias: 'imsLongPressDisabled', transform: booleanAttribute});

    /** Controls whether activation happens when the hold completes or when the user releases afterward. */
    readonly activation = input<ImsLongPressActivation>('release', {
        alias: 'imsLongPressActivation'
    });

    /** Visual progress treatment. `circle` is intended primarily for icon buttons. */
    readonly visual = input<ImsLongPressVisual>('background', {
        alias: 'imsLongPressVisual'
    });

    constructor() {
        this.zone.runOutsideAngular(() => {
            this.listen('pointerdown', this.onPointerDown);
            this.listen('lostpointercapture', this.onPointerAbort);
            this.listen('keydown', this.onKeyDown);
            this.listen('keyup', this.onKeyUp);
            this.listen('blur', this.onBlur);
            this.listen('click', this.onClick);

            const document = this.host.ownerDocument;
            this.listenTo(document, 'pointerup', this.onPointerUp);
            this.listenTo(document, 'pointercancel', this.onPointerAbort);
            this.listenTo(document, 'visibilitychange', this.onVisibilityChange);

            if (document.defaultView) {
                this.listenTo(document.defaultView, 'blur', this.onWindowBlur);
            }
        });

        this.destroyRef.onDestroy(() => {
            this.eventCleanups.forEach((cleanup) => cleanup());
            this.cancelFrame();
            this.clearTimer();
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
        if (this.shouldIgnoreInteraction(event.target)) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        if (this.host instanceof HTMLLabelElement) {
            event.preventDefault();
        }
        this.startHold('pointer');
        this.activePointerId = event.pointerId;
        this.capturePointer(event);
    }

    private onPointerUp(event: PointerEvent): void {
        if (this.activeSource !== 'pointer' || event.pointerId !== this.activePointerId) return;

        if (this.shouldIgnoreInteraction(event.target)) {
            this.cancelHold();
            return;
        }

        if (this.activation() === 'release' && !this.isPointerInsideHost(event)) {
            this.cancelHold();
            return;
        }

        if (this.ready) {
            this.clearActiveInteraction();
            this.allowNextClick = true;
            this.scheduleFinish(NATIVE_CLICK_WAIT_MS);
            return;
        }

        this.cancelHold();
    }

    private onPointerAbort(event: PointerEvent): void {
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
        if (this.shouldIgnoreInteraction(event.target)) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (event.repeat || this.activeSource === 'keyboard') return;
        this.startHold('keyboard');
    }

    private onKeyUp(event: KeyboardEvent): void {
        if (!this.isActivationKey(event) || this.activeSource !== 'keyboard') return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (this.shouldIgnoreInteraction(event.target)) {
            this.cancelHold();
            return;
        }

        if (this.ready) {
            this.activate();
            return;
        }

        this.cancelHold();
    }

    private onBlur(): void {
        if (this.activeSource === 'keyboard') {
            this.cancelHold();
        }
    }

    private onWindowBlur(event: FocusEvent): void {
        if (event.target !== this.host.ownerDocument.defaultView) return;

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

        if (event === this.syntheticClick) return;

        if (this.allowNextClick) {
            this.allowNextClick = false;
            this.scheduleFinish();
            return;
        }

        if (this.activeSource) {
            this.cancelHold();
        }
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    private startHold(source: HoldSource): void {
        this.resetHold();
        this.activeSource = source;
        this.startedAt = performance.now();
        const {width, height} = this.host.getBoundingClientRect();
        this.maxRadius = Math.hypot(width / 2, height / 2);
        this.host.classList.add('ims-long-press--holding');
        this.frameId = requestAnimationFrame(this.updateProgress);
    }

    private readonly updateProgress = (timestamp: number): void => {
        if (!this.activeSource) return;
        if (this.shouldIgnoreInteraction()) {
            this.cancelHold();
            return;
        }

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
        this.setProgress(1);
        this.host.classList.add('ims-long-press--ready');

        if (this.activation() === 'timeout') {
            this.activate();
        }
    }

    private resetHold(): void {
        this.stopInteraction();
        this.setProgress(0);
        this.host.classList.remove(
            'ims-long-press--holding',
            'ims-long-press--ready',
            'ims-long-press--cancelled',
            'ims-long-press--completed'
        );
    }

    private cancelHold(): void {
        this.endHold('cancelled');
    }

    private activate(): void {
        this.clearActiveInteraction();
        this.dispatchClick();
        this.scheduleFinish();
    }

    private scheduleFinish(delayMs = 0): void {
        this.schedule(this.finishHold, delayMs);
    }

    private readonly finishHold = (): void => {
        this.endHold('completed');
    };

    private endHold(outcome: 'cancelled' | 'completed'): void {
        const outcomeClass = `ims-long-press--${outcome}`;
        const otherOutcomeClass = outcome === 'cancelled'
            ? 'ims-long-press--completed'
            : 'ims-long-press--cancelled';

        this.stopInteraction();
        this.host.classList.add(outcomeClass);
        this.host.classList.remove(
            'ims-long-press--holding',
            'ims-long-press--ready',
            otherOutcomeClass
        );
        this.schedule(() => {
            this.setProgress(0);
            this.host.classList.remove(outcomeClass);
        }, FEEDBACK_MS);
    }

    private stopInteraction(): void {
        this.cancelFrame();
        this.clearActiveInteraction();
        this.startedAt = 0;
        this.ready = false;
        this.allowNextClick = false;
        this.clearTimer();
    }

    private schedule(callback: () => void, delayMs: number): void {
        this.clearTimer();
        this.timerId = setTimeout(() => {
            this.timerId = null;
            callback();
        }, delayMs);
    }

    private cancelFrame(): void {
        if (this.frameId === null) return;

        cancelAnimationFrame(this.frameId);
        this.frameId = null;
    }

    private clearTimer(): void {
        if (this.timerId === null) return;

        clearTimeout(this.timerId);
        this.timerId = null;
    }

    private setProgress(progress: number): void {
        const targetPercentage = progress * 100;
        const sourcePercentage = 100 - targetPercentage;

        this.host.style.setProperty('--ims-long-press-progress', String(progress));
        this.host.style.setProperty('--ims-long-press-fill-radius', `${this.maxRadius * progress}px`);
        this.host.style.setProperty('--ims-long-press-circle-angle', `${progress * 360}deg`);
        this.host.style.setProperty(
            '--ims-long-press-fill-color',
            `color-mix(in oklch, var(--ims-long-press-fill-start) ${sourcePercentage}%, var(--ims-long-press-fill-target) ${targetPercentage}%)`
        );
        this.host.style.setProperty(
            '--ims-long-press-circle-color',
            `color-mix(in oklch, var(--ims-long-press-circle-start) ${sourcePercentage}%, var(--ims-long-press-circle-target) ${targetPercentage}%)`
        );
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
        const MouseEventConstructor = this.host.ownerDocument.defaultView?.MouseEvent ?? MouseEvent;
        const event = new MouseEventConstructor('click', {
            bubbles: true,
            cancelable: true
        });

        this.syntheticClick = event;
        try {
            this.host.dispatchEvent(event);
        } finally {
            this.syntheticClick = null;
        }
    }

    private isActivationKey(event: KeyboardEvent): boolean {
        return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
    }

    private shouldIgnoreInteraction(target?: EventTarget | null): boolean {
        return this.disabled() || this.isHostDisabled() || this.isTargetDisabled(target);
    }

    private isHostDisabled(): boolean {
        return this.host.hasAttribute('disabled') || this.host.getAttribute('aria-disabled') === 'true';
    }

    private isTargetDisabled(target?: EventTarget | null): boolean {
        return (target instanceof HTMLButtonElement
            || target instanceof HTMLInputElement
            || target instanceof HTMLSelectElement
            || target instanceof HTMLTextAreaElement)
            && target.disabled;
    }

    private get host(): HTMLElement {
        return this.element.nativeElement;
    }
}
