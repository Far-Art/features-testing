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
import {STACKED_ATTRIBUTE, observeInlineSize, overflowsInline} from './ims-form-field-fit';

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
 * explicit count, projected field occupancy defines the maximum candidate
 * count, which is reduced until every label and value fits at natural width.
 *
 * Stacking is the last resort. When one responsive column, or the fixed
 * count, cannot hold every label beside its value at natural width, every
 * field the grid lays out moves its label above its value.
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
     * Approximate width, in CSS pixels, used to estimate how many logical
     * columns an open-ended `span="row"` field can consume.
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
    private stopObservingInlineSize: (() => void) | null = null;
    private layoutFrame: number | null = null;
    private layoutReady = false;
    private resetColumnsBeforeLayout = false;
    /** Maximum responsive column count that projected fields can occupy. */
    private readonly maximumAutomaticColumns = computed(() => {
        const rowColumnEstimate = Math.max(
            1,
            Math.floor(this.availableWidth() / this.minColumnWidth())
        );

        return this.maximumUsefulContentColumns(rowColumnEstimate);
    });

    /**
     * Starts responsive width observation after rendering and keeps the
     * measurement synchronized when sizing inputs change.
     */
    constructor() {
        afterNextRender(() => {
            this.layoutReady = true;
            this.availableWidth.set(this.hostElement.clientWidth);
            this.stopObservingInlineSize = observeInlineSize(this.hostElement, (inlineSize) => {
                this.availableWidth.set(inlineSize);
                this.scheduleLayout(true);
            });

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
        }, {allowSignalWrites: true});

        this.destroyRef.onDestroy(() => {
            this.stopObservingInlineSize?.();

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
     * Resolves and applies field placement and label stacking.
     *
     * A column count is accepted only when every label and value fits beside
     * each other at natural width, so fitting never squeezes one control to
     * make room for another column. Candidates are measured synchronously in
     * one animation frame, and only the final count is committed to the
     * signal, so intermediate templates are never painted during resize.
     * When the final count still does not fit, which is one column in
     * responsive mode or the fixed count, labels stack above their values.
     */
    private syncLayout(): void {
        this.hostElement.removeAttribute(STACKED_ATTRIBUTE);

        const explicitColumns = this.columns();
        if (explicitColumns !== null) {
            this.resetColumnsBeforeLayout = false;
            this.commitLayout(explicitColumns, !this.fitsAtNaturalWidth(explicitColumns));
            return;
        }

        let columnCount = this.resetColumnsBeforeLayout
            ? this.maximumAutomaticColumns()
            : this.automaticColumns();
        this.resetColumnsBeforeLayout = false;
        while (columnCount > 1 && !this.fitsAtNaturalWidth(columnCount)) {
            columnCount--;
        }

        // Dropping a column comes before stacking, so only a single column
        // that still does not fit stacks its labels.
        const stacked = columnCount === 1 && !this.fitsAtNaturalWidth(1);
        this.automaticColumns.set(columnCount);
        this.commitLayout(columnCount, stacked);
    }

    /**
     * Places fields for a candidate count and reports whether every label and
     * value fits beside each other at natural width.
     *
     * The measured template holds every label and value track at
     * `max-content`, including the final pair that the real template lets
     * shrink.
     */
    private fitsAtNaturalWidth(columnCount: number): boolean {
        this.syncAutomaticFieldColumns(columnCount);
        this.hostElement.style.gridTemplateColumns = buildNaturalColumnTemplate(columnCount);
        return !overflowsInline(this.hostElement);
    }

    /**
     * Applies the real template for the final count, which the last
     * measurement left placed, together with the stacking decision.
     */
    private commitLayout(columnCount: number, stacked: boolean): void {
        this.hostElement.style.gridTemplateColumns = buildColumnTemplate(
            columnCount,
            this.columnDistribution()
        );
        this.hostElement.toggleAttribute(STACKED_ATTRIBUTE, stacked);
    }

    /**
     * Caps automatic columns at the widest projected flow context.
     *
     * Direct fields share one flow context. Each explicit row is independent,
     * so rows contribute their widest useful count rather than being summed.
     * A `span="row"` field can occupy every estimated width-supported column.
     */
    private maximumUsefulContentColumns(rowColumnEstimate: number): number {
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
            ...fieldGroups.map((fields) =>
                this.usefulColumnCount(fields, rowColumnEstimate)
            )
        );
    }

    /** Returns the logical columns that one field flow can meaningfully occupy. */
    private usefulColumnCount(
        fields: readonly ImsFormField[],
        rowColumnEstimate: number
    ): number {
        let totalSpan = 0;
        let furthestExplicitColumn = 0;

        for (const field of fields) {
            const span = field.span();
            if (span === 'row') {
                return rowColumnEstimate;
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
    private syncAutomaticFieldColumns(columnCount: number): void {
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
                if (span === 'row') {
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
                requestedSpan = span === 'row'
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
            : 'auto auto'
    ).join(' ');
}

/**
 * Builds a measurement-only template that holds every label and value at its
 * natural width, spacers at their minimum.
 */
function buildNaturalColumnTemplate(columnCount: number): string {
    return Array.from(
        {length: columnCount},
        (_, index) => index < columnCount - 1
            ? 'max-content max-content minmax(var(--ims-form-column-gap, 0), 1fr)'
            : 'max-content max-content'
    ).join(' ');
}
