import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    effect,
    inject,
    input,
    numberAttribute,
    signal,
    ViewEncapsulation
} from '@angular/core';

/** Converts a column-count input to a positive integer or automatic mode. */
function positiveIntegerOrNull(value: number | string | null): number | null {
    const parsed = numberAttribute(value, Number.NaN);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Converts a minimum-width input to a finite positive pixel value. */
function positiveNumber(value: number | string): number {
    const parsed = numberAttribute(value, 320);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 320;
}

@Component({
    selector: 'ims-form-field-grid',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-form-field-grid.scss',
    host: {
        '[style.grid-template-columns]': 'columnTemplate()',
        '[style.--ims-form-column-gap]': 'columnGap()',
        '[style.--ims-form-row-gap]': 'rowGap()'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Responsive container that aligns multiple `ims-form-field` instances.
 *
 * Each logical form column consists of a shared label track and an equal
 * fractional value track. Because child fields use `subgrid`, every label in
 * the same logical column aligns to the widest label while the value tracks
 * divide the remaining width evenly.
 *
 * The number of logical columns can be fixed through `columns`. Without an
 * explicit count, a `ResizeObserver` derives the count from the host's
 * available width and `minColumnWidth`.
 *
 * Direct fields may flow naturally. Wrap fields in `ims-form-field-row` when
 * they must remain on the same visual row as fields are added or removed.
 */
export class ImsFormFieldGrid {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    /** Last observed inline size of the group host, measured in CSS pixels. */
    private readonly availableWidth = signal(0);
    private resizeObserver: ResizeObserver | null = null;

    /**
     * Optional fixed number of logical form columns.
     *
     * Positive integers select fixed mode. `null`, invalid values, and
     * non-positive values use automatic responsive mode.
     */
    readonly columns = input<number | null, number | string | null>(null, {
        transform: positiveIntegerOrNull
    });
    /**
     * Approximate minimum width, in CSS pixels, reserved for each logical form
     * column while calculating the automatic column count.
     */
    readonly minColumnWidth = input<number, number | string>(320, {
        transform: positiveNumber
    });
    /** Gap between adjacent generated label and value tracks. */
    readonly columnGap = input('0');
    /** Vertical gap between automatically placed fields or explicit rows. */
    readonly rowGap = input('1rem');
    /** Effective logical column count after fixed or responsive resolution. */
    readonly resolvedColumns = computed(() => {
        const explicitColumns = this.columns();
        if (explicitColumns !== null) {
            return explicitColumns;
        }

        return Math.max(1, Math.floor(this.availableWidth() / this.minColumnWidth()));
    });
    /**
     * CSS track list applied to the host.
     *
     * Every logical form column expands to a `max-content` label track followed
     * by an equal `1fr` value track.
     */
    readonly columnTemplate = computed(() => buildColumnTemplate(this.resolvedColumns()));

    /**
     * Starts responsive width observation after rendering and keeps the
     * measurement synchronized when sizing inputs change.
     */
    constructor() {
        afterNextRender(() => {
            this.availableWidth.set(this.hostElement.clientWidth);
            this.resizeObserver = new ResizeObserver(([entry]) => {
                this.availableWidth.set(entry.contentRect.width);
            });
            this.resizeObserver.observe(this.hostElement);
        });

        effect(() => {
            this.minColumnWidth();
            this.columns();
            this.availableWidth.set(this.hostElement.clientWidth);
        });

        this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
    }
}

/**
 * Builds equal value tracks while preserving content-sized shared label tracks.
 */
function buildColumnTemplate(columnCount: number): string {
    return Array.from(
        {length: columnCount},
        () => 'max-content minmax(0, 1fr)'
    ).join(' ');
}
