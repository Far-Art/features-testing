import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    contentChildren,
    effect,
    inject,
    input,
    numberAttribute,
    signal
} from '@angular/core';
import {ImsFormField} from './ims-form-field';

/** Delay used to collapse rapid resize callbacks into one responsive layout update. */
const RESIZE_DEBOUNCE_MS = 200;
/** Minimum inline-size change treated as meaningful, filtering subpixel observer noise. */
const RESIZE_INLINE_SIZE_TOLERANCE = 10;

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
    host: {
        '[style.grid-template-columns]': 'columnTemplate()',
        '[style.--ims-form-column-gap]': 'columnGap()',
        '[style.--ims-form-row-gap]': 'rowGap()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Responsive container that aligns multiple `ims-form-field` instances.
 *
 * Each logical form column contains one complete `ims-form-field`. Columns use
 * intrinsic widths by default. Use `columnDistribution="even"` to give logical
 * columns an equal share of the available width.
 *
 * The number of logical columns can be fixed through `columns`. Without an
 * explicit count, the host width and `minColumnWidth` define the maximum
 * candidate count, which is reduced until the intrinsic field tracks fit.
 *
 * Direct fields may flow naturally. Wrap fields in `ims-form-field-row` when
 * they must remain on the same visual row as fields are added or removed.
 */
export class ImsFormFieldGrid {
    /**
     * Controls how logical form columns consume the available inline space.
     *
     * `even` gives value tracks an equal share of the available space while
     * preserving shared label alignment. `max-content` uses intrinsic widths.
     *
     * @example
     * ```html
     * <ims-form-field-grid columnDistribution="max-content">...</ims-form-field-grid>
     * <ims-form-field-grid columnDistribution="even">...</ims-form-field-grid>
     * ```
     */
    readonly columnDistribution = input<'even' | 'max-content'>('max-content');
    /**
     * Optional fixed number of logical form columns.
     *
     * Positive integers select fixed mode. `null`, invalid values, and
     * non-positive values use automatic responsive mode.
     *
     * @example
     * ```html
     * <ims-form-field-grid columns="3">...</ims-form-field-grid>
     * <ims-form-field-grid [columns]="null">...</ims-form-field-grid>
     * <ims-form-field-grid [columns]="columnCount">...</ims-form-field-grid>
     * ```
     */
    readonly columns = input<number | null, number | string | null>(null, {
        transform: positiveIntegerOrNull
    });
    /**
     * Approximate minimum width, in CSS pixels, used to cap the initial
     * automatic column count before intrinsic field widths are fitted.
     *
     * @example
     * ```html
     * <ims-form-field-grid minColumnWidth="320">...</ims-form-field-grid>
     * <ims-form-field-grid [minColumnWidth]="360">...</ims-form-field-grid>
     * ```
     */
    readonly minColumnWidth = input<number, number | string>(320, {
        transform: positiveNumber
    });
    /**
     * Minimum gap between adjacent form-field columns.
     *
     * Accepts any valid CSS length.
     *
     * @example
     * ```html
     * <ims-form-field-grid columnGap="1rem">...</ims-form-field-grid>
     * <ims-form-field-grid columnGap="24px">...</ims-form-field-grid>
     * ```
     */
    readonly columnGap = input('1rem');
    /**
     * Vertical gap between automatically placed fields or explicit rows.
     *
     * Accepts any valid CSS length.
     *
     * @example
     * ```html
     * <ims-form-field-grid rowGap="0.75rem">...</ims-form-field-grid>
     * <ims-form-field-grid [rowGap]="configuredRowGap">...</ims-form-field-grid>
     * ```
     */
    readonly rowGap = input('0.4rem');
    /**
     * CSS track list applied to the host.
     *
     * Both modes use shared label/value pairs so projected fields and compound
     * field groups remain aligned through CSS subgrid.
     */
    readonly columnTemplate = computed(() =>
        buildColumnTemplate(this.resolvedColumns(), this.columnDistribution())
    );
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private readonly projectedFields = contentChildren(ImsFormField, {descendants: true});
    /** Last observed inline size of the group host, measured in CSS pixels. */
    private readonly availableWidth = signal(0);
    private readonly automaticColumns = signal(1);
    /** Effective logical column count after fixed or responsive resolution. */
    readonly resolvedColumns = computed(() => {
        const explicitColumns = this.columns();
        if (explicitColumns !== null) {
            return explicitColumns;
        }

        return this.automaticColumns();
    });
    private resizeObserver: ResizeObserver | null = null;
    private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private lastObservedInlineSize: number | null = null;
    private layoutFrame: number | null = null;
    private layoutReady = false;
    private resetColumnsBeforeLayout = false;
    /**
     * Maximum responsive column count supported by both the available width
     * and the projected fields that can occupy the logical columns.
     */
    private readonly maximumAutomaticColumns = computed(() => {
        const widthLimit = Math.max(
            1,
            Math.floor(this.availableWidth() / this.minColumnWidth())
        );

        return Math.min(widthLimit, this.maximumUsefulContentColumns(widthLimit));
    });

    /**
     * Starts responsive width observation after rendering and keeps the
     * measurement synchronized when sizing inputs change.
     */
    constructor() {
        afterNextRender(() => {
            this.layoutReady = true;
            this.availableWidth.set(this.hostElement.clientWidth);
            this.resizeObserver = new ResizeObserver(([entry]) => {
                const inlineSize = entry.contentRect.width;
                if (
                    this.lastObservedInlineSize !== null &&
                    Math.abs(inlineSize - this.lastObservedInlineSize) <
                    RESIZE_INLINE_SIZE_TOLERANCE
                ) {
                    return;
                }
                this.lastObservedInlineSize = inlineSize;

                if (this.resizeDebounceTimer !== null) {
                    clearTimeout(this.resizeDebounceTimer);
                }

                this.resizeDebounceTimer = setTimeout(() => {
                    this.resizeDebounceTimer = null;
                    this.availableWidth.set(inlineSize);
                    this.scheduleLayout(true);
                }, RESIZE_DEBOUNCE_MS);
            });
            this.resizeObserver.observe(this.hostElement);

            void this.hostElement.ownerDocument.fonts?.ready.then(() => {
                this.scheduleLayout(true);
            });
            this.scheduleLayout(true);
        });

        effect(() => {
            this.maximumAutomaticColumns();
            this.columns();
            this.columnDistribution();
            for (const field of this.projectedFields()) {
                field.column();
                field.span();
                field.labelSpan();
                field.valueSpan();
            }
            this.scheduleLayout(true);
        });

        this.destroyRef.onDestroy(() => {
            this.resizeObserver?.disconnect();
            if (this.resizeDebounceTimer !== null) {
                clearTimeout(this.resizeDebounceTimer);
            }

            const view = this.hostElement.ownerDocument.defaultView;
            if (view && this.layoutFrame !== null) {
                view.cancelAnimationFrame(this.layoutFrame);
            }
        });
    }

    /** Coalesces responsive fitting and projected-field placement. */
    private scheduleLayout(resetColumns = false): void {
        this.resetColumnsBeforeLayout ||= resetColumns;

        if (!this.layoutReady || this.layoutFrame !== null) {
            return;
        }

        const view = this.hostElement.ownerDocument.defaultView;
        if (!view) {
            return;
        }

        this.layoutFrame = view.requestAnimationFrame(() => {
            this.layoutFrame = null;
            this.syncLayout();
        });
    }

    /**
     * Places fields on paired label/value tracks and reduces automatic columns
     * until the intrinsic grid fits.
     */
    private syncLayout(): void {
        if (this.resetColumnsBeforeLayout && this.columns() === null) {
            this.automaticColumns.set(this.maximumAutomaticColumns());
        }
        this.resetColumnsBeforeLayout = false;
        this.syncAutomaticFieldColumns();
        this.hostElement.getBoundingClientRect();

        if (this.columns() === null && this.gridOverflows() && this.automaticColumns() > 1) {
            this.automaticColumns.update((columnCount) => columnCount - 1);
            this.scheduleLayout();
        }
    }

    /** Reports whether intrinsic field tracks extend past the grid's inline box. */
    private gridOverflows(): boolean {
        return this.hostElement.scrollWidth > this.hostElement.clientWidth + 1;
    }

    /**
     * Caps automatic columns at the widest projected flow context.
     *
     * Direct fields share one flow context. Each explicit row is independent,
     * so rows contribute their widest useful count rather than being summed.
     * A stretch field can occupy every width-supported column.
     */
    private maximumUsefulContentColumns(widthLimit: number): number {
        const projectedFields = this.projectedFields();
        const fieldGroups: ImsFormField[][] = [
            projectedFields.filter(
                (field) => field.getHostElement().parentElement === this.hostElement
            )
        ];
        const rows = Array.from(this.hostElement.children).filter(
            (element): element is HTMLElement =>
                element instanceof HTMLElement && element.matches('ims-form-field-row')
        );

        for (const row of rows) {
            fieldGroups.push(projectedFields.filter(
                (field) => field.getHostElement().parentElement === row
            ));
        }

        return Math.max(
            1,
            ...fieldGroups.map((fields) => this.usefulColumnCount(fields, widthLimit))
        );
    }

    /** Returns the logical columns that one field flow can meaningfully occupy. */
    private usefulColumnCount(
        fields: readonly ImsFormField[],
        widthLimit: number
    ): number {
        let totalSpan = 0;
        let furthestExplicitColumn = 0;

        for (const field of fields) {
            const span = field.span();
            if (span === 'stretch') {
                return widthLimit;
            }

            totalSpan += span;
            const explicitColumn = field.column();
            if (explicitColumn !== null) {
                furthestExplicitColumn = Math.max(
                    furthestExplicitColumn,
                    explicitColumn + span - 1
                );
            }
        }

        return Math.max(1, totalSpan, furthestExplicitColumn);
    }

    /** Assigns auto-flow fields to logical columns while skipping spacer tracks. */
    private syncAutomaticFieldColumns(): void {
        const columnCount = this.resolvedColumns();
        const projectedFields = this.projectedFields();
        const directFields = projectedFields.filter(
            (field) => field.getHostElement().parentElement === this.hostElement
        );
        this.assignAutomaticColumns(directFields, columnCount);

        const rows = Array.from(this.hostElement.children).filter(
            (element): element is HTMLElement =>
                element instanceof HTMLElement && element.matches('ims-form-field-row')
        );
        for (const row of rows) {
            const rowFields = projectedFields.filter(
                (field) => field.getHostElement().parentElement === row
            );
            this.assignAutomaticColumns(rowFields, columnCount);
        }
    }

    /** Places automatic fields sequentially while respecting their logical spans. */
    private assignAutomaticColumns(fields: readonly ImsFormField[], columnCount: number): void {
        let nextColumn = 1;

        for (const field of fields) {
            const explicitColumn = field.column();
            const span = field.span();
            let automaticColumn: number | null = null;
            let requestedSpan: number;

            if (explicitColumn === null) {
                if (span === 'stretch') {
                    automaticColumn = nextColumn;
                    requestedSpan = columnCount - nextColumn + 1;
                } else {
                    requestedSpan = Math.min(span, columnCount);
                    if (nextColumn + requestedSpan - 1 > columnCount) {
                        nextColumn = 1;
                    }

                    automaticColumn = nextColumn;
                }
                nextColumn += requestedSpan;
            } else {
                requestedSpan = span === 'stretch'
                    ? Math.max(1, columnCount - explicitColumn + 1)
                    : Math.min(span, columnCount);
                nextColumn = explicitColumn + requestedSpan;
            }

            if (nextColumn > columnCount) {
                nextColumn = 1;
            }

            field.setGridContext(automaticColumn, columnCount);
        }
    }
}

/**
 * Builds either equal logical columns or intrinsic label/value track pairs.
 */
function buildColumnTemplate(
    columnCount: number,
    columnDistribution: 'even' | 'max-content'
): string {
    if (columnDistribution === 'even') {
        return Array.from(
            {length: columnCount},
            (_, index) => index < columnCount - 1
                ? 'max-content minmax(0, 1fr) var(--ims-form-column-gap, 0)'
                : 'max-content minmax(0, 1fr)'
        ).join(' ');
    }

    return Array.from(
        {length: columnCount},
        (_, index) => index < columnCount - 1
            ? 'max-content max-content minmax(var(--ims-form-column-gap, 0), 1fr)'
            : 'max-content max-content'
    ).join(' ');
}
