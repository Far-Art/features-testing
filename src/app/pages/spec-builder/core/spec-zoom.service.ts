import {Injectable, computed, inject, signal} from '@angular/core';
import {SpecBuilderStore} from './spec-builder.store';
import {SPEC_BUILDER_CONFIG} from './spec-builder.tokens';
import {SpecSize} from './spec-builder.types';

/** Zoom levels closer than this are treated as equal, so a level reached by fitting is not skipped. */
const ZOOM_EPSILON = 0.001;

/**
 * How large the page is drawn, as a browser zooms a page.
 *
 * In fit mode the zoom follows the room the canvas has, so the whole page is
 * always visible. Any manual step leaves fit mode, as in Chrome, until Fit is
 * chosen again.
 */
@Injectable()
export class SpecZoomService {
    private readonly config = inject(SPEC_BUILDER_CONFIG);
    private readonly store = inject(SpecBuilderStore);
    private readonly steps = this.config.zoomSteps.map((percent) => percent / 100);
    private readonly manualZoom = signal(1);
    private readonly fitMode = signal(true);
    /** Room the canvas has for the page, in CSS pixels. Null until it is measured. */
    private readonly room = signal<SpecSize | null>(null);
    private readonly fitZoom = computed(() => {
        const room = this.room();
        const page = this.store.page().size;
        if (!room || room.width <= 0 || room.height <= 0) {
            return 1;
        }

        const zoom = Math.min(room.width / page.width, room.height / page.height);
        return Math.min(Math.max(zoom, this.steps[0]), this.steps[this.steps.length - 1]);
    });

    /** True while the zoom follows the room the canvas has. */
    readonly fitting = this.fitMode.asReadonly();
    /** Scale the page is drawn at: 1 is 100%. */
    readonly zoom = computed(() => this.fitMode() ? this.fitZoom() : this.manualZoom());
    readonly percent = computed(() => Math.round(this.zoom() * 100));
    readonly canZoomIn = computed(() => this.zoom() < this.steps[this.steps.length - 1] - ZOOM_EPSILON);
    readonly canZoomOut = computed(() => this.zoom() > this.steps[0] + ZOOM_EPSILON);

    /** Tells the service how much room the canvas has. The canvas calls it whenever that changes. */
    setRoom(room: SpecSize): void {
        this.room.set(room);
    }

    /** Next step up from the current zoom. */
    zoomIn(): void {
        const zoom = this.zoom();
        this.setManual(this.steps.find((step) => step > zoom + ZOOM_EPSILON) ?? this.steps[this.steps.length - 1]);
    }

    /** Next step down from the current zoom. */
    zoomOut(): void {
        const zoom = this.zoom();
        let next = this.steps[0];
        // Walks down from the top, because findLast() is ES2023.
        for (let index = this.steps.length - 1; index >= 0; index--) {
            if (this.steps[index] < zoom - ZOOM_EPSILON) {
                next = this.steps[index];
                break;
            }
        }
        this.setManual(next);
    }

    /** Draws the page at its real size. */
    reset(): void {
        this.setManual(1);
    }

    fit(): void {
        this.fitMode.set(true);
    }

    private setManual(zoom: number): void {
        this.manualZoom.set(zoom);
        this.fitMode.set(false);
    }
}
