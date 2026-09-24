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
    signal
} from '@angular/core';
import type {ImsFormField} from './ims-form-field';
import {STACKED_ATTRIBUTE, layoutParent, observeInlineSize, overflowsInline} from './ims-form-field-fit';

/**
 * Grids by host element, so a field finds the grid that lays it out from the
 * rendered layout, wherever the field is declared.
 */
const gridsByHost = new WeakMap<HTMLElement, ImsFormFieldGrid>();

/**
 * Returns the grid that lays out a field, directly or through a row.
 *
 * An element with `display: contents` on the way, such as the host of a
 * component that only groups fields, is passed over, as the layout itself
 * passes over it.
 */
export function findLayoutGrid(field: HTMLElement): ImsFormFieldGrid | null {
    let parent = layoutParent(field);
    if (parent?.matches('ims-form-field-row')) {
        parent = layoutParent(parent);
    }

    return parent === null ? null : gridsByHost.get(parent) ?? null;
}

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
 * Each logical form column contains one complete `ims-form-field`. By default
 * value tracks share the available width evenly, never narrower than their
 * widest value. Use `columnDistribution="max-content"` to keep intrinsic widths
 * and put the spare width between fields instead.
 *
 * The number of logical columns can be fixed through `columns`. Without an
 * explicit count, the occupancy of the grid's fields defines the maximum
 * candidate count, which is reduced until every label and value fits at
 * natural width.
 *
 * Stacking is the last resort. When one responsive column, or the fixed
 * count, cannot hold every label beside its value at natural width, every
 * field the grid lays out moves its label above its value.
 *
 * Direct fields may flow naturally. Wrap fields in `ims-form-field-row` when
 * they must remain on the same visual row as fields are added or removed.
 *
 * The grid lays out the fields and rows the rendered layout gives it, not
 * only the ones in its own template. A row or field inside an element with
 * `display: contents`, such as the host of a component that groups fields, is
 * laid out as if it were a direct child. Each field joins the grid itself.
 */
export class ImsFormFieldGrid {
    /**
     * Controls how logical form columns consume the available inline space.
     *
     * `even`, the default, shares the available space evenly between value
     * tracks while preserving shared label alignment. A value track is never
     * narrower than its widest value, so a column whose value needs more than
     * an even share keeps its natural width and the others share the rest.
     * `max-content` keeps intrinsic widths and distributes the spare space
     * between complete fields.
     *
     * @example
     * ```html
     * <ims-form-field-grid columnDistribution="even">...</ims-form-field-grid>
     * <ims-form-field-grid columnDistribution="max-content">...</ims-form-field-grid>
     * ```
     */
    readonly columnDistribution = input<'even' | 'max-content'>('even');
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
     * Both modes use shared label/value pairs so the grid's fields and compound
     * field groups remain aligned through CSS subgrid.
     */
    readonly columnTemplate = computed(() =>
        buildColumnTemplate(this.resolvedColumns(), this.columnDistribution())
    );
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    /** Fields this grid lays out, directly or through a row, as they joined. */
    private readonly fields = signal<readonly ImsFormField[]>([]);
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
    /** Maximum responsive column count that the grid's fields can occupy. */
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
        gridsByHost.set(this.hostElement, this);

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
            for (const field of this.fields()) {
                field.column();
                field.span();
                field.labelSpan();
                field.valueSpan();
            }
            this.scheduleLayout(true);
        }, {allowSignalWrites: true});

        this.destroyRef.onDestroy(() => {
            gridsByHost.delete(this.hostElement);
            this.stopObservingInlineSize?.();

            const view = this.hostElement.ownerDocument.defaultView;
            if (view && this.layoutFrame !== null) {
                view.cancelAnimationFrame(this.layoutFrame);
            }
        });
    }

    /** Adds a field the rendered layout gives this grid, directly or through a row. */
    addField(field: ImsFormField): void {
        this.fields.update((fields) => fields.includes(field) ? fields : [...fields, field]);
    }

    /** Removes a field that no longer takes part in this grid's layout. */
    removeField(field: ImsFormField): void {
        this.fields.update((fields) => fields.filter((current) => current !== field));
    }

    /** Coalesces responsive fitting and field placement. */
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
        const flows = this.fieldFlows();
        this.markStacked(flows, false);

        const explicitColumns = this.columns();
        if (explicitColumns !== null) {
            this.resetColumnsBeforeLayout = false;
            this.commitLayout(
                explicitColumns,
                !this.fitsAtNaturalWidth(explicitColumns, flows),
                flows
            );
            return;
        }

        let columnCount = this.resetColumnsBeforeLayout
            ? this.maximumAutomaticColumns()
            : this.automaticColumns();
        this.resetColumnsBeforeLayout = false;
        while (columnCount > 1 && !this.fitsAtNaturalWidth(columnCount, flows)) {
            columnCount--;
        }

        // Dropping a column comes before stacking, so only a single column
        // that still does not fit stacks its labels.
        const stacked = columnCount === 1 && !this.fitsAtNaturalWidth(1, flows);
        this.automaticColumns.set(columnCount);
        this.commitLayout(columnCount, stacked, flows);
    }

    /**
     * Places fields for a candidate count and reports whether every label and
     * value fits beside each other at natural width.
     *
     * The measured template holds every label and value track at
     * `max-content`, including the final pair that the real template lets
     * shrink.
     */
    private fitsAtNaturalWidth(columnCount: number, flows: readonly ImsFormField[][]): boolean {
        for (const flow of flows) {
            this.assignAutomaticColumns(flow, columnCount);
        }
        this.hostElement.style.gridTemplateColumns = buildNaturalColumnTemplate(columnCount);
        return !overflowsInline(this.hostElement);
    }

    /**
     * Applies the real template for the final count, which the last
     * measurement left placed, together with the stacking decision.
     */
    private commitLayout(
        columnCount: number,
        stacked: boolean,
        flows: readonly ImsFormField[][]
    ): void {
        this.hostElement.style.gridTemplateColumns = buildColumnTemplate(
            columnCount,
            this.columnDistribution()
        );
        this.markStacked(flows, stacked);
    }

    /**
     * Moves every label this grid lays out above its value, or back beside it.
     *
     * The attribute goes on each field as well as on the host, since a field
     * inside an element with `display: contents` is out of reach of a child
     * combinator from the host.
     */
    private markStacked(flows: readonly ImsFormField[][], stacked: boolean): void {
        this.hostElement.toggleAttribute(STACKED_ATTRIBUTE, stacked);
        for (const flow of flows) {
            for (const field of flow) {
                field.getHostElement().toggleAttribute(STACKED_ATTRIBUTE, stacked);
            }
        }
    }

    /**
     * Groups the fields this grid lays out into flows, in document order.
     *
     * Direct fields share one flow, and each row is a flow of its own. A field
     * belongs to the element whose layout it takes part in, so an element with
     * `display: contents` in between leaves it in the same flow.
     */
    private fieldFlows(): ImsFormField[][] {
        const directFields: ImsFormField[] = [];
        const rowFields = new Map<HTMLElement, ImsFormField[]>();
        const fields = [...this.fields()].sort((first, second) =>
            documentOrder(first.getHostElement(), second.getHostElement())
        );

        for (const field of fields) {
            const parent = layoutParent(field.getHostElement());
            if (parent === this.hostElement) {
                directFields.push(field);
            } else if (parent !== null) {
                const flow = rowFields.get(parent);
                if (flow) {
                    flow.push(field);
                } else {
                    rowFields.set(parent, [field]);
                }
            }
        }

        return [directFields, ...rowFields.values()];
    }

    /**
     * Caps automatic columns at the widest flow.
     *
     * Direct fields share one flow context. Each explicit row is independent,
     * so rows contribute their widest useful count rather than being summed.
     * A `span="row"` field can occupy every estimated width-supported column.
     */
    private maximumUsefulContentColumns(rowColumnEstimate: number): number {
        return Math.max(
            1,
            ...this.fieldFlows().map((fields) =>
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

/** Orders two nodes as they appear in the document. */
function documentOrder(first: Node, second: Node): number {
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * Builds either evenly shared value tracks or intrinsic label/value pairs.
 *
 * Even value tracks never shrink below their widest value while there are
 * several columns: the count was chosen so that every value fits at natural
 * width, and an even share smaller than that would squeeze it, or let a value
 * with a width of its own run into the next column. A single column may still
 * shrink, as the last resort for a host narrower than its content.
 */
function buildColumnTemplate(
    columnCount: number,
    columnDistribution: 'even' | 'max-content'
): string {
    if (columnDistribution === 'even') {
        const valueTrack = columnCount > 1 ? 'minmax(max-content, 1fr)' : 'minmax(0, 1fr)';
        return Array.from(
            {length: columnCount},
            (_, index) => index < columnCount - 1
                ? `max-content ${valueTrack} var(--ims-form-column-gap, 0)`
                : `max-content ${valueTrack}`
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
