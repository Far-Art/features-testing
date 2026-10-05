import {DestroyRef, Directive, ElementRef, inject, output} from '@angular/core';

/**
 * Reports a pointer drag that starts on the host: press, every move, release.
 *
 * The pointer is captured, so the drag continues when it leaves the host, and
 * the move listeners exist only while a drag is on: hovering costs nothing.
 * Used by the resize handles, which CDK drag-drop has no counterpart for.
 */
@Directive({
    selector: '[appSpecPointerDrag]',
    standalone: true,
    host: {
        '(pointerdown)': 'start($event)'
    }
})
export class SpecPointerDrag {
    readonly dragStarted = output<PointerEvent>();
    readonly dragMoved = output<PointerEvent>();
    readonly dragEnded = output<PointerEvent>();

    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    private pointerId: number | null = null;
    private readonly move = (event: PointerEvent) => {
        if (event.pointerId === this.pointerId) {
            this.dragMoved.emit(event);
        }
    };
    private readonly end = (event: PointerEvent) => {
        if (event.pointerId === this.pointerId) {
            this.stopListening();
            this.dragEnded.emit(event);
        }
    };

    constructor() {
        inject(DestroyRef).onDestroy(() => this.stopListening());
    }

    protected start(event: PointerEvent): void {
        if (event.button !== 0 || this.pointerId !== null) {
            return;
        }

        // The handle sits inside a draggable item: the press must not reach it.
        event.stopPropagation();
        // Keeps the drag from selecting text, and stops the compatibility mouse
        // events that would start the item's own drag.
        event.preventDefault();

        this.pointerId = event.pointerId;
        try {
            this.host.setPointerCapture(event.pointerId);
        } catch {
            // The pointer is already gone; the listeners below still end the drag.
        }
        this.host.addEventListener('pointermove', this.move);
        this.host.addEventListener('pointerup', this.end);
        this.host.addEventListener('pointercancel', this.end);
        this.host.addEventListener('lostpointercapture', this.end);
        this.dragStarted.emit(event);
    }

    private stopListening(): void {
        this.pointerId = null;
        this.host.removeEventListener('pointermove', this.move);
        this.host.removeEventListener('pointerup', this.end);
        this.host.removeEventListener('pointercancel', this.end);
        this.host.removeEventListener('lostpointercapture', this.end);
    }
}
