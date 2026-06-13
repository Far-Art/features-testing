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
 * intrinsic widths and distribute remaining container space between fields,
 * without changing the gap between a field's label and value.
 *
 * The number of logical columns can be fixed through `columns`. Without an
 * explicit count, the host width and `minColumnWidth` define the maximum
 * candidate count, which is reduced until the intrinsic field tracks fit.
 *
 * Direct fields may flow naturally. Wrap fields in `ims-form-field-row` when
 * they must remain on the same visual row as fields are added or removed.
 */
export class ImsFormFieldGrid {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    /** Last observed inline size of the group host, measured in CSS pixels. */
    private readonly availableWidth = signal(0);
    private readonly automaticColumns = signal(1);
    private resizeObserver: ResizeObserver | null = null;
    private contentObserver: MutationObserver | null = null;
    private labelSyncFrame: number | null = null;
    private labelSyncReady = false;

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
     * Approximate minimum width, in CSS pixels, used to cap the initial
     * automatic column count before intrinsic field widths are fitted.
     */
    readonly minColumnWidth = input<number, number | string>(320, {
        transform: positiveNumber
    });
    /** Minimum gap between adjacent form-field columns. */
    readonly columnGap = input('0');
    /** Vertical gap between automatically placed fields or explicit rows. */
    readonly rowGap = input('1rem');
    /** Maximum responsive column count allowed by the configured minimum width. */
    private readonly maximumAutomaticColumns = computed(() =>
        Math.max(1, Math.floor(this.availableWidth() / this.minColumnWidth()))
    );
    /** Effective logical column count after fixed or responsive resolution. */
    readonly resolvedColumns = computed(() => {
        const explicitColumns = this.columns();
        if (explicitColumns !== null) {
            return explicitColumns;
        }

        return this.automaticColumns();
    });
    /**
     * CSS track list applied to the host.
     *
     * Every logical form column is sized to the widest complete field occupying
     * that column.
     */
    readonly columnTemplate = computed(() => buildColumnTemplate(this.resolvedColumns()));

    /**
     * Starts responsive width observation after rendering and keeps the
     * measurement synchronized when sizing inputs change.
     */
    constructor() {
        afterNextRender(() => {
            this.labelSyncReady = true;
            this.availableWidth.set(this.hostElement.clientWidth);
            this.resizeObserver = new ResizeObserver(([entry]) => {
                this.availableWidth.set(entry.contentRect.width);
            });
            this.resizeObserver.observe(this.hostElement);

            this.contentObserver = new MutationObserver(() => {
                this.resetAutomaticColumns();
                this.scheduleLabelWidthSync();
            });
            this.contentObserver.observe(this.hostElement, {
                attributes: true,
                attributeFilter: ['imsFormFieldLabel'],
                characterData: true,
                childList: true,
                subtree: true
            });

            void this.hostElement.ownerDocument.fonts?.ready.then(() => {
                this.resetAutomaticColumns();
                this.scheduleLabelWidthSync();
            });
            this.resetAutomaticColumns();
            this.scheduleLabelWidthSync();
        });

        effect(() => {
            this.maximumAutomaticColumns();
            const explicitColumns = this.columns();
            if (explicitColumns === null) {
                this.resetAutomaticColumns();
            }
            this.scheduleLabelWidthSync();
        });

        this.destroyRef.onDestroy(() => {
            this.resizeObserver?.disconnect();
            this.contentObserver?.disconnect();

            const view = this.hostElement.ownerDocument.defaultView;
            if (view && this.labelSyncFrame !== null) {
                view.cancelAnimationFrame(this.labelSyncFrame);
            }
        });
    }

    /**
     * Coalesces content and layout changes before measuring projected labels.
     */
    private scheduleLabelWidthSync(): void {
        if (!this.labelSyncReady || this.labelSyncFrame !== null) {
            return;
        }

        const view = this.hostElement.ownerDocument.defaultView;
        if (!view) {
            return;
        }

        this.labelSyncFrame = view.requestAnimationFrame(() => {
            this.labelSyncFrame = null;
            this.syncLabelWidths();
        });
    }

    /** Restarts automatic fitting from the width-based maximum column count. */
    private resetAutomaticColumns(): void {
        if (this.columns() === null) {
            this.automaticColumns.set(this.maximumAutomaticColumns());
        }
    }

    /**
     * Gives fields in the same rendered grid column one shared label width.
     *
     * The parent grid still treats each complete field as one intrinsic-width
     * item. Only the field's private label track is synchronized, so free space
     * remains distributed between fields rather than inside label/value pairs.
     */
    private syncLabelWidths(): void {
        const fields = this.getOwnedFields();
        for (const field of fields) {
            field.style.removeProperty('--ims-form-shared-label-width');
        }

        // Resolve natural field positions and label widths after clearing the
        // previous synchronization values.
        this.hostElement.getBoundingClientRect();

        const isRtl = getComputedStyle(this.hostElement).direction === 'rtl';
        const columnGroups: Array<{
            inlineStart: number;
            fields: HTMLElement[];
            labelWidth: number;
        }> = [];

        for (const field of fields) {
            const fieldRect = field.getBoundingClientRect();
            if (fieldRect.width === 0 && fieldRect.height === 0) {
                continue;
            }

            const inlineStart = isRtl ? fieldRect.right : fieldRect.left;
            let group = columnGroups.find(
                (candidate) => Math.abs(candidate.inlineStart - inlineStart) < 1
            );

            if (!group) {
                group = {inlineStart, fields: [], labelWidth: 0};
                columnGroups.push(group);
            }

            group.fields.push(field);
            group.labelWidth = Math.max(group.labelWidth, this.measureFieldLabel(field));
        }

        for (const group of columnGroups) {
            if (group.labelWidth === 0) {
                continue;
            }

            const width = `${group.labelWidth}px`;
            for (const field of group.fields) {
                field.style.setProperty('--ims-form-shared-label-width', width);
            }
        }

        if (this.columns() === null && this.gridOverflows() && this.automaticColumns() > 1) {
            this.automaticColumns.update((columnCount) => columnCount - 1);
            this.scheduleLabelWidthSync();
        }
    }

    /** Reports whether intrinsic field tracks extend past the grid's inline box. */
    private gridOverflows(): boolean {
        return this.hostElement.scrollWidth > this.hostElement.clientWidth + 1;
    }

    /** Returns direct fields and fields contained by direct row wrappers. */
    private getOwnedFields(): HTMLElement[] {
        return Array.from(
            this.hostElement.querySelectorAll<HTMLElement>('ims-form-field')
        ).filter((field) => {
            if (field.closest('ims-form-field-grid') !== this.hostElement) {
                return false;
            }

            const parent = field.parentElement;
            return parent === this.hostElement ||
                parent?.matches('ims-form-field-row') === true &&
                parent.parentElement === this.hostElement;
        });
    }

    /** Measures the widest direct element that can occupy the main label slot. */
    private measureFieldLabel(field: HTMLElement): number {
        return Array.from(field.children)
            .filter((element): element is HTMLElement =>
                element instanceof HTMLElement &&
                (element instanceof HTMLLabelElement ||
                    element.hasAttribute('imsFormFieldLabel'))
            )
            .reduce(
                (width, label) => Math.max(width, label.getBoundingClientRect().width),
                0
            );
    }
}

/**
 * Builds one intrinsic track per logical form-field column.
 */
function buildColumnTemplate(columnCount: number): string {
    return Array.from(
        {length: columnCount},
        () => 'max-content'
    ).join(' ');
}
