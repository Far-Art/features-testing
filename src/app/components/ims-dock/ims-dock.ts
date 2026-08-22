import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    numberAttribute,
    output,
    signal,
    viewChild,
    viewChildren
} from '@angular/core';
import {magnifiedSize} from './dock-magnify';
import {ImsDockItem as ImsDockItemComponent} from './ims-dock-item';
import {ImsDockItem} from './ims-dock.model';

const ENTER_RAMP_DURATION_MS = 140;
const LEAVE_RAMP_DURATION_MS = 200;

/**
 * A macOS Dock-style navbar.
 *
 * Icons sit at a resting `baseSize`; as the pointer (or keyboard focus) approaches an
 * icon it and its neighbours magnify towards `maxSize`, following a cosine falloff
 * across `influenceRange` pixels. Sizes are derived from each icon's **resting** centre
 * (a snapshot taken while the row is at rest) rather than its live, already-magnified
 * position — this keeps the wave stable and free of feedback jitter.
 *
 * The maths is pointer-position driven through a single {@link pointer} signal, so the
 * effect works identically for mouse hover and for tab-focus.
 */
@Component({
    selector: 'ims-dock',
    standalone: true,
    imports: [ImsDockItemComponent],
    templateUrl: './ims-dock.html',
    styleUrl: './ims-dock.scss',
    host: {
        class: 'ims-dock',
        '[style.--ims-dock-gap.px]': 'gap()',
        '[style.--ims-dock-base-size.px]': 'baseSize()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsDock {
    /** Icons to render, in visual order. */
    readonly items = input.required<readonly ImsDockItem[]>();

    /** Resting icon size in pixels. */
    readonly baseSize = input(48, {transform: numberAttribute});

    /** Fully magnified icon size in pixels. */
    readonly maxSize = input(96, {transform: numberAttribute});

    /** Pixel radius around the pointer over which icons are magnified. */
    readonly influenceRange = input(140, {transform: numberAttribute});

    /** Gap between icons in pixels. */
    readonly gap = input(12, {transform: numberAttribute});

    /** Emitted when an icon is activated (click or keyboard). */
    readonly activated = output<ImsDockItem>();

    private readonly destroyRef = inject(DestroyRef);

    private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
    private readonly itemEls = viewChildren(ImsDockItemComponent);

    /**
     * The row's left edge captured at the instant resting centres were measured (at
     * rest). Both the resting centres and the live pointer are expressed relative to
     * this frozen anchor, so they stay in one coordinate frame even as the row grows
     * and slides while magnifying — otherwise the wave drifts sideways.
     */
    private restAnchorLeft = 0;

    /** Pointer position along the dock axis, relative to the row's left edge; null when away. */
    private readonly pointer = signal<number | null>(null);

    /** Resting centre x (relative to the row) of every icon, snapshotted at rest. */
    private readonly restingCenters = signal<readonly number[]>([]);

    /** True when the user prefers reduced motion — magnification is then disabled. */
    private readonly reducedMotion = signal(false);

    /** Current magnification amplitude; pointer position remains independently responsive. */
    private readonly magnificationProgress = signal(0);

    /** Active animation frame for the entry/exit amplitude ramp. */
    private rampFrame: number | null = null;

    /** Keeps the wave alive when the cursor passes through gaps above the row. */
    private readonly globalPointerMove = (event: MouseEvent) => this.onGlobalPointerMove(event);

    /** Ends an active pointer gesture when the browser window loses focus. */
    private readonly globalPointerEnd = () => this.endPointerGesture();

    /** True while global pointer listeners are installed for the active hover gesture. */
    private trackingPointerGlobally = false;

    /** Magnified pixel size for each icon, in item order. */
    readonly sizes = computed<readonly number[]>(() => {
        const centers = this.restingCenters();
        const pointer = this.pointer();
        const base = this.baseSize();
        if (pointer === null || this.reducedMotion() || centers.length === 0) {
            return this.items().map(() => base);
        }
        const range = this.influenceRange();
        const max = this.maxSize();
        const progress = this.magnificationProgress();
        return this.items().map((_, index) => {
            const center = centers[index] ?? 0;
            const target = magnifiedSize(Math.abs(pointer - center), range, base, max);
            return base + (target - base) * progress;
        });
    });

    constructor() {
        afterNextRender(() => {
            this.measureRestingCenters();

            const media = window.matchMedia('(prefers-reduced-motion: reduce)');
            const syncMotion = () => this.reducedMotion.set(media.matches);
            syncMotion();
            media.addEventListener('change', syncMotion);

            // Re-snapshot on viewport changes while idle (the dock recentres). The row
            // itself is re-measured at each gesture start, so we don't observe its
            // (animating) size here — that would capture mid-magnification geometry.
            const onResize = () => {
                if (this.pointer() === null) {
                    this.measureRestingCenters();
                }
            };
            window.addEventListener('resize', onResize);

            this.destroyRef.onDestroy(() => {
                media.removeEventListener('change', syncMotion);
                window.removeEventListener('resize', onResize);
                this.endPointerGesture(false);
            });
        });
    }

    onPointerEnter(event: MouseEvent): void {
        if (this.trackingPointerGlobally) {
            this.onPointerMove(event);
            return;
        }
        if (this.pointer() === null) {
            this.measureRestingCenters();
        }
        this.startGlobalPointerTracking();
        this.onPointerMove(event);
        this.animateMagnification(1, ENTER_RAMP_DURATION_MS);
    }

    onPointerMove(event: MouseEvent): void {
        // Use the frozen rest anchor, not the live row edge — the row slides as it grows.
        this.pointer.set(event.clientX - this.restAnchorLeft);
    }

    onPointerLeave(event: MouseEvent): void {
        if (this.isPointerInsideDockHoverZone(event)) {
            return;
        }
        this.endPointerGesture();
    }

    private onGlobalPointerMove(event: MouseEvent): void {
        if (this.pointer() === null) {
            this.stopGlobalPointerTracking();
            return;
        }
        if (this.isPointerInsideDockHoverZone(event)) {
            this.onPointerMove(event);
            return;
        }
        this.endPointerGesture();
    }

    private startGlobalPointerTracking(): void {
        if (this.trackingPointerGlobally) {
            return;
        }
        window.addEventListener('mousemove', this.globalPointerMove);
        window.addEventListener('blur', this.globalPointerEnd);
        this.trackingPointerGlobally = true;
    }

    private stopGlobalPointerTracking(): void {
        if (!this.trackingPointerGlobally) {
            return;
        }
        window.removeEventListener('mousemove', this.globalPointerMove);
        window.removeEventListener('blur', this.globalPointerEnd);
        this.trackingPointerGlobally = false;
    }

    private endPointerGesture(measureAfterSettle = true): void {
        this.stopGlobalPointerTracking();
        if (!measureAfterSettle) {
            this.cancelMagnificationAnimation();
            this.magnificationProgress.set(0);
            this.pointer.set(null);
            return;
        }
        this.animateMagnification(0, LEAVE_RAMP_DURATION_MS, () => this.pointer.set(null));
    }

    onItemFocus(index: number): void {
        // Keyboard focus arrives with the dock at rest — snapshot before centring.
        if (this.pointer() === null) {
            this.measureRestingCenters();
        }
        const center = this.restingCenters()[index];
        if (center !== undefined) {
            this.pointer.set(center);
            this.animateMagnification(1, ENTER_RAMP_DURATION_MS);
        }
    }

    onItemBlur(): void {
        if (this.trackingPointerGlobally) {
            return;
        }
        this.endPointerGesture();
    }

    private isPointerInsideDockHoverZone(event: MouseEvent): boolean {
        const rect = this.row().nativeElement.getBoundingClientRect();
        const iconOverflow = Math.max(0, this.maxSize() - this.baseSize());
        const horizontalSlack = Math.max(0, this.gap() / 2);
        return (
            event.clientX >= rect.left - horizontalSlack &&
            event.clientX <= rect.right + horizontalSlack &&
            event.clientY >= rect.top - iconOverflow &&
            event.clientY <= rect.bottom
        );
    }

    /**
     * Ramps only the wave's amplitude. Pointer movement continues to update the wave
     * position directly, so moving during entry never restarts or stalls the animation.
     */
    private animateMagnification(
        target: 0 | 1,
        fullDurationMs: number,
        onComplete?: () => void
    ): void {
        this.cancelMagnificationAnimation();

        const start = this.magnificationProgress();
        const distance = Math.abs(target - start);
        if (distance === 0 || this.reducedMotion()) {
            this.magnificationProgress.set(target);
            onComplete?.();
            return;
        }

        const startedAt = performance.now();
        const duration = fullDurationMs * distance;
        const step = (now: number) => {
            const elapsed = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - elapsed, 3);
            this.magnificationProgress.set(start + (target - start) * eased);

            if (elapsed < 1) {
                this.rampFrame = requestAnimationFrame(step);
                return;
            }

            this.rampFrame = null;
            onComplete?.();
        };

        this.rampFrame = requestAnimationFrame(step);
    }

    private cancelMagnificationAnimation(): void {
        if (this.rampFrame !== null) {
            cancelAnimationFrame(this.rampFrame);
            this.rampFrame = null;
        }
    }

    /** Snapshots each icon's centre, and the anchor they're relative to, while at rest. */
    private measureRestingCenters(): void {
        const anchorLeft = this.row().nativeElement.getBoundingClientRect().left;
        this.restAnchorLeft = anchorLeft;
        const centers = this.itemEls().map((item) => {
            const rect = item.host.nativeElement.getBoundingClientRect();
            return rect.left - anchorLeft + rect.width / 2;
        });
        this.restingCenters.set(centers);
    }
}
