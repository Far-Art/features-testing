import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    signal
} from '@angular/core';
import {ImsButton} from '../../components/ims-button';

/** Narrowest width, in CSS pixels, the frame can be dragged to. */
const MIN_WIDTH = 160;
/** Width change, in CSS pixels, for one arrow-key press. Shift makes it four times larger. */
const KEYBOARD_STEP = 16;

@Component({
    selector: 'app-demo-resize-frame',
    imports: [ImsButton],
    template: `
        <div class="demo-resize-frame__toolbar">
            <span class="demo-resize-frame__readout">
                רוחב: <span dir="ltr">{{ displayWidth() }}px</span>
                @if (width() === null) {
                    (מלא)
                }
            </span>
            <button ims-button type="button" [disabled]="width() === null" (click)="reset()">
                חזרה לרוחב מלא
            </button>
        </div>

        <div class="demo-resize-frame__stage" [style.inline-size.px]="width()">
            <div class="demo-resize-frame__content">
                <ng-content/>
            </div>

            <div
                class="demo-resize-frame__handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="רוחב אזור ההדגמה"
                tabindex="0"
                [attr.aria-valuemin]="minWidth"
                [attr.aria-valuemax]="availableWidth()"
                [attr.aria-valuenow]="displayWidth()"
                [attr.aria-valuetext]="displayWidth() + ' פיקסלים'"
                [attr.data-dragging]="dragging() ? '' : null"
                (pointerdown)="startDrag($event)"
                (pointermove)="drag($event)"
                (pointerup)="endDrag($event)"
                (pointercancel)="endDrag($event)"
                (lostpointercapture)="endDrag($event)"
                (keydown)="resizeWithKeyboard($event)"
            ></div>
        </div>
    `,
    styleUrl: './demo-resize-frame.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Demo-only frame whose width follows a drag of the handle on its inline-end
 * edge, or the arrow keys while the handle has focus.
 *
 * It lets a demo show how a layout answers the room it gets without resizing
 * the window. Home narrows it to the minimum, End returns it to full width.
 */
export class DemoResizeFrame {
    protected readonly minWidth = MIN_WIDTH;
    /** Dragged width in CSS pixels, or `null` for all the width available. */
    protected readonly width = signal<number | null>(null);
    /** Width the frame's container offers, followed as the window changes. */
    protected readonly availableWidth = signal(0);
    /** Width the frame is shown at, never more than its container offers. */
    protected readonly displayWidth = computed(() => {
        const width = this.width();
        const available = this.availableWidth();
        return width === null ? available : Math.min(width, available);
    });
    protected readonly dragging = signal(false);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private dragStart: {pointerId: number; x: number; width: number} | null = null;

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            this.availableWidth.set(this.hostElement.clientWidth);

            const view = this.hostElement.ownerDocument.defaultView;
            if (!view?.ResizeObserver) {
                return;
            }

            const observer = new view.ResizeObserver(() => {
                this.availableWidth.set(this.hostElement.clientWidth);
            });
            observer.observe(this.hostElement);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    protected startDrag(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.dragStart = {pointerId: event.pointerId, x: event.clientX, width: this.currentWidth()};
        this.dragging.set(true);
        // Keeps the drag from selecting the text it passes over.
        event.preventDefault();
    }

    protected drag(event: PointerEvent): void {
        if (this.dragStart?.pointerId !== event.pointerId) {
            return;
        }

        // The handle sits on the inline-end edge, so moving it away from the
        // inline start widens the frame: leftwards in RTL, rightwards in LTR.
        const moved = event.clientX - this.dragStart.x;
        this.resizeTo(this.dragStart.width + (this.isRtl() ? -moved : moved));
    }

    protected endDrag(event: PointerEvent): void {
        if (this.dragStart?.pointerId !== event.pointerId) {
            return;
        }

        this.dragStart = null;
        this.dragging.set(false);
    }

    protected resizeWithKeyboard(event: KeyboardEvent): void {
        const step = event.shiftKey ? KEYBOARD_STEP * 4 : KEYBOARD_STEP;
        const widen = this.isRtl() ? 'ArrowLeft' : 'ArrowRight';
        const narrow = this.isRtl() ? 'ArrowRight' : 'ArrowLeft';

        if (event.key === widen) {
            this.resizeTo(this.currentWidth() + step);
        } else if (event.key === narrow) {
            this.resizeTo(this.currentWidth() - step);
        } else if (event.key === 'Home') {
            this.resizeTo(MIN_WIDTH);
        } else if (event.key === 'End') {
            this.reset();
        } else {
            return;
        }

        event.preventDefault();
    }

    protected reset(): void {
        this.width.set(null);
    }

    /** Applies a width in whole pixels. Reaching the container's width means full width again. */
    private resizeTo(width: number): void {
        const available = this.hostElement.clientWidth;
        const clamped = Math.round(Math.min(Math.max(width, MIN_WIDTH), available));
        this.width.set(clamped >= available ? null : clamped);
    }

    /**
     * Width the frame is at, taken from state rather than layout: a key press
     * can arrive before the previous one has been rendered, and has to build
     * on it all the same.
     */
    private currentWidth(): number {
        const available = this.hostElement.clientWidth;
        const width = this.width();
        return width === null ? available : Math.min(width, available);
    }

    private isRtl(): boolean {
        return getComputedStyle(this.hostElement).direction === 'rtl';
    }
}
