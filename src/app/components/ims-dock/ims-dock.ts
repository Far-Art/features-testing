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
        '[style.--ims-dock-base-size.px]': 'baseSize()',
        '[style.--ims-dock-transition]': 'itemTransition()'
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

    /** Pointer position along the dock axis, relative to the row's left edge; null when away. */
    private readonly pointer = signal<number | null>(null);

    /** Resting centre x (relative to the row) of every icon, snapshotted at rest. */
    private readonly restingCenters = signal<readonly number[]>([]);

    /** True when the user prefers reduced motion — magnification is then disabled. */
    private readonly reducedMotion = signal(false);

    /** Eased size tween used when the wave ramps in (enter) and out (leave). */
    private readonly easedTransition =
        'width 200ms cubic-bezier(0.22, 1, 0.36, 1), height 200ms cubic-bezier(0.22, 1, 0.36, 1)';

    /** True once the enter ramp has finished, so live tracking becomes instant. */
    private readonly tracking = signal(false);

    /** Timer that flips {@link tracking} on after the enter ramp completes. */
    private trackTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Size transition for icons:
     * - entering / leaving → eased ramp so the wave grows and settles smoothly;
     * - actively tracking the pointer → instant, so the wave stays glued to the cursor.
     * Inherited by items through a CSS variable.
     */
    readonly itemTransition = computed(() =>
        this.pointer() !== null && this.tracking() ? 'none' : this.easedTransition
    );

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
        return this.items().map((_, index) => {
            const center = centers[index] ?? 0;
            return magnifiedSize(Math.abs(pointer - center), range, base, max);
        });
    });

    constructor() {
        afterNextRender(() => {
            this.measureRestingCenters();

            const media = window.matchMedia('(prefers-reduced-motion: reduce)');
            const syncMotion = () => this.reducedMotion.set(media.matches);
            syncMotion();
            media.addEventListener('change', syncMotion);

            const resizeObserver = new ResizeObserver(() => {
                if (this.pointer() === null) {
                    this.measureRestingCenters();
                }
            });
            resizeObserver.observe(this.row().nativeElement);

            this.destroyRef.onDestroy(() => {
                media.removeEventListener('change', syncMotion);
                resizeObserver.disconnect();
                if (this.trackTimer !== null) {
                    clearTimeout(this.trackTimer);
                }
            });
        });
    }

    onPointerEnter(event: MouseEvent): void {
        // Ramp the wave in smoothly, then switch to instant tracking once it settles.
        this.tracking.set(false);
        this.onPointerMove(event);
        if (this.trackTimer !== null) {
            clearTimeout(this.trackTimer);
        }
        this.trackTimer = setTimeout(() => this.tracking.set(true), 200);
    }

    onPointerMove(event: MouseEvent): void {
        const rowLeft = this.row().nativeElement.getBoundingClientRect().left;
        this.pointer.set(event.clientX - rowLeft);
    }

    onPointerLeave(): void {
        if (this.trackTimer !== null) {
            clearTimeout(this.trackTimer);
            this.trackTimer = null;
        }
        this.tracking.set(false);
        this.pointer.set(null);
    }

    onItemFocus(index: number): void {
        const center = this.restingCenters()[index];
        if (center !== undefined) {
            this.pointer.set(center);
        }
    }

    onItemBlur(): void {
        this.pointer.set(null);
    }

    /** Reads each icon's centre while the dock is at its resting size. */
    private measureRestingCenters(): void {
        const rowLeft = this.row().nativeElement.getBoundingClientRect().left;
        const centers = this.itemEls().map((item) => {
            const rect = item.host.nativeElement.getBoundingClientRect();
            return rect.left - rowLeft + rect.width / 2;
        });
        this.restingCenters.set(centers);
    }
}
