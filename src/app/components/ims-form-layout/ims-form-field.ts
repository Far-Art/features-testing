import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    input,
    numberAttribute,
    signal
} from '@angular/core';
import {
    STACKED_ATTRIBUTE,
    SUBGRID_ATTRIBUTE,
    layoutParent,
    observeInlineSize,
    overflowsInline
} from './ims-form-field-fit';
import {type ImsFormFieldGrid, findLayoutGrid} from './ims-form-field-grid';

/** Monotonic id source for controls that need automatic label association. */
let nextFormControlId = 0;

/** Supported complete-field span modes. */
export type ImsFormFieldSpan = number | 'row';

/** Converts a span-like input to a positive integer or its fallback value. */
function positiveInteger(value: number | string | null, fallback: number | null): number | null {
    const parsed = numberAttribute(value, Number.NaN);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Converts the public span input to a logical count or row mode. */
function formFieldSpanAttribute(value: number | string): ImsFormFieldSpan {
    if (typeof value === 'string' && value.trim().toLowerCase() === 'row') {
        return 'row';
    }

    return positiveInteger(value, 1) ?? 1;
}

@Component({
    selector: 'ims-form-field',
    standalone: true,
    template: `
        <ng-content select="label, [imsFormFieldLabel]"/>
        <ng-content/>
    `,
    host: {
        '[style.--ims-form-grid-column-start]': 'gridColumn()',
        '[style.--ims-form-grid-column-track-span]': 'gridColumnTrackSpan()',
        '[style.--ims-form-label-grid-column]': 'labelGridColumn()',
        '[style.--ims-form-value-grid-column]': 'valueGridColumn()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Two-column form-field layout containing one main label and value content.
 *
 * Projection is split into two slots:
 * - A direct native `label` or `[imsFormFieldLabel]` is projected into the
 *   label column.
 * - Every other direct child is projected into the value column.
 *
 * A native main label is automatically associated with the first labelable
 * control owned by this field. Existing explicit `for`/`id` associations are
 * preserved. Nested `ims-form-field` controls are ignored, which prevents an
 * outer field from taking ownership of a nested field's control. A grouped
 * control marked `data-ims-labelled-group`, such as `ims-radio-group`, is named
 * through its `aria-labelledby` instead of a `for` on its first option.
 *
 * The component always owns its intrinsic label/value tracks. Inside an
 * `ims-form-field-grid` or `ims-form-field-row`, the complete field is placed
 * as one unit so parent distribution never changes the label/value gap. The
 * field finds its grid through the rendered layout, so an element with
 * `display: contents` in between, such as the host of a component that groups
 * fields, still leaves it in the grid.
 *
 * When the label and value cannot sit side by side at their natural widths,
 * the label moves above the value. A field on its own measures this itself.
 * A grid or row measures for every field it lays out, so they stack together,
 * and a field inside an `ims-grid` cell never stacks.
 *
 * With a direct `ims-checkbox`, the checkbox component and main field label
 * share value column 2 and row 1. The form layout only handles placement;
 * checkbox visuals remain owned by the checkbox component.
 *
 * A direct `ims-form-field-group` with `wide` spans the whole field, and the
 * main label moves to a line of its own above it.
 *
 * Every `[imsFormFieldHint]` owned by this field describes the control the
 * main label names: its id is added to that control's `aria-describedby`.
 */
export class ImsFormField {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    /** Watches dynamically added or removed projected labels and controls. */
    private contentObserver: MutationObserver | null = null;
    /** Stops label-stacking measurement; set only for a field on its own. */
    private stopObservingInlineSize: (() => void) | null = null;
    /** Grid that lays this field out, directly or through a row. */
    private layoutGrid: ImsFormFieldGrid | null = null;
    /** Current direct child selected for the main label slot. */
    private mainLabel: HTMLElement | null = null;
    /** `for` value created by this component, used to distinguish it from consumer input. */
    private automaticLabelFor: string | null = null;
    /** Group whose `aria-labelledby` this component extended with the main label id. */
    private labelledGroup: HTMLElement | null = null;
    /** Label id this component added to `labelledGroup`, removed again on cleanup. */
    private labelledGroupReference: string | null = null;
    /** Control whose `aria-describedby` holds `describedHintIds`. */
    private describedControl: HTMLElement | null = null;
    /** Hint ids this component added to `describedControl`, removed again on cleanup. */
    private describedHintIds: string[] = [];
    /** Automatic logical column assigned by the nearest form-field grid. */
    private readonly automaticColumn = signal<number | null>(null);
    /** Logical column count supplied by the nearest form-field grid. */
    private readonly gridColumnCount = signal<number | null>(null);

    /**
     * Optional one-based logical column used inside a field group or row.
     *
     * When omitted, normal CSS grid auto-placement is used. Invalid and
     * non-positive values are treated as omitted.
     *
     * @example
     * ```html
     * <ims-form-field column="2">...</ims-form-field>
     * <ims-form-field [column]="selectedColumn">...</ims-form-field>
     * ```
     */
    readonly column = input<number | null, number | string | null>(null, {
        transform: (value) => positiveInteger(value, null)
    });
    /**
     * Logical form-grid columns occupied by this field.
     *
     * A positive number requests that many columns. `row` consumes every
     * column remaining after the field's resolved starting position. Numeric
     * spans are clamped to the available columns. Invalid values use one.
     *
     * @example
     * ```html
     * <ims-form-field span="2">...</ims-form-field>
     * <ims-form-field span="row">...</ims-form-field>
     * <ims-form-field [span]="fieldSpan">...</ims-form-field>
     * ```
     */
    readonly span = input<ImsFormFieldSpan, number | string>(1, {
        transform: formFieldSpanAttribute
    });
    /**
     * Optional logical-column span allocated to the main label area.
     *
     * This takes effect for fields spanning at least two logical columns.
     * When `valueSpan` is omitted, the value receives the remaining columns.
     *
     * @example
     * ```html
     * <ims-form-field span="3" labelSpan="1">...</ims-form-field>
     * <ims-form-field span="row" [labelSpan]="labelColumns">...</ims-form-field>
     * ```
     */
    readonly labelSpan = input<number | null, number | string | null>(null, {
        transform: (value) => positiveInteger(value, null)
    });
    /**
     * Optional logical-column span allocated to the main value area.
     *
     * This takes effect for fields spanning at least two logical columns.
     * When `labelSpan` is omitted, the label receives the remaining columns.
     *
     * @example
     * ```html
     * <ims-form-field span="3" valueSpan="2">...</ims-form-field>
     * <ims-form-field span="row" [valueSpan]="valueColumns">...</ims-form-field>
     * ```
     */
    readonly valueSpan = input<number | null, number | string | null>(null, {
        transform: (value) => positiveInteger(value, null)
    });
    /**
     * CSS grid placement for this field.
     *
     * Explicit columns take precedence over automatic placement supplied by
     * the nearest grid.
     */
    readonly gridColumn = computed(() => {
        const column = this.column() ?? this.automaticColumn();
        return column === null ? null : `${physicalColumnStart(column)}`;
    });
    /** Physical subgrid-track count occupied by the effective logical span. */
    readonly gridColumnTrackSpan = computed(() =>
        `${physicalTrackSpan(this.effectiveSpan())}`
    );
    /** CSS placement for an explicitly partitioned logical label region. */
    readonly labelGridColumn = computed(() => {
        const spans = this.resolvedPartSpans();
        return spans === null ? null : `1 / span ${physicalTrackSpan(spans.label)}`;
    });
    /** CSS placement for the main value region within a spanning field. */
    readonly valueGridColumn = computed(() => {
        const spans = this.resolvedPartSpans();
        if (spans !== null) {
            return `${physicalColumnStart(spans.label + 1)} / span ${physicalTrackSpan(spans.value)}`;
        }

        return this.gridColumnCount() !== null && this.effectiveSpan() > 1
            ? '2 / -1'
            : null;
    });
    /** Effective span after accounting for the field's start and grid width. */
    private readonly effectiveSpan = computed<number>(() => {
        const span = this.span();
        const columnCount = this.gridColumnCount();
        const startColumn = this.column() ?? this.automaticColumn();
        if (columnCount === null || startColumn === null || startColumn > columnCount) {
            return span === 'row' ? 1 : span;
        }

        const availableColumns = columnCount - startColumn + 1;
        return span === 'row'
            ? availableColumns
            : Math.min(span, availableColumns);
    });
    /** Normalized logical label/value regions for an explicitly split field. */
    private readonly resolvedPartSpans = computed(() => {
        const fieldSpan = this.effectiveSpan();
        const requestedLabelSpan = this.labelSpan();
        const requestedValueSpan = this.valueSpan();
        if (
            this.gridColumnCount() === null ||
            fieldSpan < 2 ||
            (requestedLabelSpan === null && requestedValueSpan === null)
        ) {
            return null;
        }

        if (requestedLabelSpan === null) {
            const value = Math.min(requestedValueSpan ?? 1, fieldSpan - 1);
            return {label: fieldSpan - value, value};
        }

        const label = Math.min(requestedLabelSpan, fieldSpan - 1);
        const value = Math.min(requestedValueSpan ?? fieldSpan - label, fieldSpan - label);
        return {label, value};
    });

    /**
     * Initializes projected-content synchronization and, after rendering,
     * joins the grid that lays the field out, or measures label stacking for a
     * field on its own. Removes observers and leaves the grid when the
     * component is destroyed.
     */
    constructor() {
        afterNextRender(() => {
            this.syncFieldParts();
            this.contentObserver = new MutationObserver(() => this.syncFieldParts());
            this.contentObserver.observe(this.hostElement, {
                childList: true,
                subtree: true
            });
            this.joinLayout();
        });

        this.destroyRef.onDestroy(() => {
            this.contentObserver?.disconnect();
            this.stopObservingInlineSize?.();
            this.layoutGrid?.removeField(this);
        });
    }

    /** Host element used by the owning grid to find the flow the field is in. */
    getHostElement(): HTMLElement {
        return this.hostElement;
    }

    /** Applies automatic placement context from the nearest form-field grid. */
    setGridContext(automaticColumn: number | null, columnCount: number): void {
        this.automaticColumn.set(automaticColumn);
        this.gridColumnCount.set(columnCount);
        this.syncGridPlacementStyles();
    }

    /** Applies placement immediately so same-frame overflow checks see the new layout. */
    private syncGridPlacementStyles(): void {
        this.setHostStyle('--ims-form-grid-column-start', this.gridColumn());
        this.setHostStyle('--ims-form-grid-column-track-span', this.gridColumnTrackSpan());
        this.setHostStyle('--ims-form-label-grid-column', this.labelGridColumn());
        this.setHostStyle('--ims-form-value-grid-column', this.valueGridColumn());
    }

    /** Sets or removes one internal CSS custom property on the field host. */
    private setHostStyle(property: string, value: string | null): void {
        if (value === null) {
            this.hostElement.style.removeProperty(property);
            return;
        }

        this.hostElement.style.setProperty(property, value);
    }

    /**
     * Joins the grid that lays this field out, directly or through a row, or
     * keeps a field on its own stacked while it is too narrow for its label
     * and value side by side.
     *
     * The grid is found through the rendered layout rather than the template,
     * so an element with `display: contents` in between, such as the host of
     * a component that groups fields, still leaves the field in the grid. A
     * grid or row measures for the fields it lays out, so they flip together.
     * An `ims-grid` cell sizes its own content, so a field there never stacks.
     */
    private joinLayout(): void {
        const grid = findLayoutGrid(this.hostElement);
        if (grid !== null) {
            this.hostElement.setAttribute(SUBGRID_ATTRIBUTE, '');
            this.layoutGrid = grid;
            grid.addField(this);
            return;
        }

        if (
            layoutParent(this.hostElement)?.matches('ims-form-field-row') ||
            this.hostElement.closest('ims-grid-cell')
        ) {
            return;
        }

        this.stopObservingInlineSize = observeInlineSize(
            this.hostElement,
            () => this.syncStacking()
        );
        void this.hostElement.ownerDocument.fonts?.ready.then(() => {
            this.syncStacking();
        });
        this.syncStacking();
    }

    /**
     * Stacks the label above the value when the two cannot sit side by side
     * at their natural widths.
     *
     * The field is measured with both tracks at `max-content`. The measurement
     * template is removed again before the field is painted.
     */
    private syncStacking(): void {
        const host = this.hostElement;
        host.removeAttribute(STACKED_ATTRIBUTE);
        host.style.gridTemplateColumns = 'max-content max-content';
        const stacked = overflowsInline(host);
        host.style.removeProperty('grid-template-columns');
        host.toggleAttribute(STACKED_ATTRIBUTE, stacked);
    }

    /**
     * Resolves the current main label from direct projected children.
     *
     * An explicit `[imsFormFieldLabel]` wins over an unmarked native `label`.
     * If dynamic content changes the selected label, any association generated
     * for the previous label is removed before the new label is synchronized.
     */
    private syncFieldParts(): void {
        const directChildren = Array.from(this.hostElement.children)
            .filter((element): element is HTMLElement => element instanceof HTMLElement);
        const labelElements = directChildren.filter((element) =>
            element instanceof HTMLLabelElement ||
            element.hasAttribute('imsFormFieldLabel')
        );
        const label = labelElements.find((element) =>
            element.hasAttribute('imsFormFieldLabel')
        ) ?? labelElements[0] ?? null;

        if (this.mainLabel !== label) {
            this.clearLabelAssociation();
        }

        this.mainLabel = label;
        this.syncMainLabel();
        this.syncHints();
    }

    /**
     * Associates the main native label with its target control.
     *
     * An explicit consumer-provided `for` attribute is resolved and retained.
     * Otherwise the first supported control belonging to this field receives a
     * generated id and becomes the automatic target.
     */
    private syncMainLabel(): void {
        const label = this.mainLabel;
        if (!(label instanceof HTMLLabelElement)) {
            this.clearLabelAssociation();
            return;
        }

        const explicitFor = label.getAttribute('for');
        const hasExplicitTarget = explicitFor !== null && explicitFor !== this.automaticLabelFor;
        const target = hasExplicitTarget
            ? this.findControlById(explicitFor)
            : this.findFirstLabelableControl();

        if (!target) {
            this.clearLabelAssociation();
            return;
        }

        if (!hasExplicitTarget && target.hasAttribute('data-ims-labelled-group')) {
            this.syncGroupLabel(label, target);
            return;
        }

        this.clearGroupLabel();

        if (!target.id) {
            target.id = `ims-form-control-${nextFormControlId++}`;
        }

        if (!hasExplicitTarget) {
            label.htmlFor = target.id;
            this.automaticLabelFor = target.id;
        } else {
            this.automaticLabelFor = null;
        }
    }

    /** Finds an explicitly referenced control only when it belongs to this field. */
    private findControlById(id: string): HTMLElement | null {
        const target = this.hostElement.ownerDocument.getElementById(id);
        return target instanceof HTMLElement && this.belongsToThisField(target) ? target : null;
    }

    /**
     * Names a grouped control, such as `ims-radio-group`, with the main label.
     *
     * A group is not labelable: `for` would point at its first option, so a
     * click on the field label would select that option and a screen reader
     * would read the field label as that option's name. The label id is added
     * to the group's `aria-labelledby` instead, next to any consumer ids.
     */
    private syncGroupLabel(label: HTMLLabelElement, group: HTMLElement): void {
        if (this.automaticLabelFor !== null && label.htmlFor === this.automaticLabelFor) {
            label.removeAttribute('for');
        }
        this.automaticLabelFor = null;

        if (!label.id) {
            label.id = `ims-form-label-${nextFormControlId++}`;
        }

        if (this.labelledGroup === group && this.labelledGroupReference === label.id) {
            return;
        }

        this.clearGroupLabel();

        if (addIdReference(group, 'aria-labelledby', label.id)) {
            this.labelledGroup = group;
            this.labelledGroupReference = label.id;
        }
    }

    /** Removes only the `aria-labelledby` reference added by `syncGroupLabel`. */
    private clearGroupLabel(): void {
        const group = this.labelledGroup;
        const reference = this.labelledGroupReference;
        this.labelledGroup = null;
        this.labelledGroupReference = null;
        if (group === null || reference === null) return;

        removeIdReference(group, 'aria-labelledby', reference);
    }

    /**
     * Describes the control the main label names with this field's hints.
     *
     * Each owned `[imsFormFieldHint]` gets an id when it has none, and the id
     * is added to the control's `aria-describedby`, next to any the control
     * already carries, such as an error popover's message. Only ids this
     * component added are removed again, when a hint goes or the control
     * changes.
     */
    private syncHints(): void {
        const hints = Array.from(this.hostElement.querySelectorAll<HTMLElement>('[imsFormFieldHint]'))
            .filter((hint) => this.belongsToThisField(hint));
        const control = hints.length > 0 ? this.findLabelTarget() : null;
        if (control !== this.describedControl) {
            this.clearHintDescription();
        }
        if (control === null) return;

        const hintIds = hints.map((hint) => {
            if (!hint.id) {
                hint.id = `ims-form-hint-${nextFormControlId++}`;
            }
            return hint.id;
        });
        for (const id of this.describedHintIds) {
            if (!hintIds.includes(id)) {
                removeIdReference(control, 'aria-describedby', id);
            }
        }
        this.describedHintIds = this.describedHintIds.filter((id) => hintIds.includes(id));
        for (const id of hintIds) {
            if (addIdReference(control, 'aria-describedby', id)) {
                this.describedHintIds.push(id);
            }
        }
        this.describedControl = control;
    }

    /** Removes only the `aria-describedby` references added by `syncHints`. */
    private clearHintDescription(): void {
        const control = this.describedControl;
        const ids = this.describedHintIds;
        this.describedControl = null;
        this.describedHintIds = [];
        if (control === null) return;

        for (const id of ids) {
            removeIdReference(control, 'aria-describedby', id);
        }
    }

    /**
     * Returns the control the main label names: the target of a consumer's
     * `for`, or otherwise the first labelable control, which the field labels
     * itself.
     */
    private findLabelTarget(): HTMLElement | null {
        const label = this.mainLabel;
        const explicitFor = label instanceof HTMLLabelElement ? label.getAttribute('for') : null;
        return explicitFor !== null && explicitFor !== this.automaticLabelFor
            ? this.findControlById(explicitFor)
            : this.findFirstLabelableControl();
    }

    /**
     * Returns the first supported control descendant owned by this field.
     *
     * Supported controls are buttons, non-hidden inputs, selects, and textareas.
     * A `[data-ims-labelled-group]` element also counts, and because it comes
     * before its own options in document order, it is found instead of them.
     *
     * Two kinds of element are skipped. A focus-mode trigger is an adjacent
     * action rather than a field's primary control, so a field whose control is
     * away in a dialog does not adopt its own trigger button. Anything hidden
     * from assistive technology is skipped for the same reason it is hidden: a
     * label pointing at it would name a control that, as far as a screen reader
     * is concerned, is not there.
     */
    private findFirstLabelableControl(): HTMLElement | null {
        const controls = this.hostElement.querySelectorAll<HTMLElement>(
            '[data-ims-labelled-group], button:not([data-ims-focus-mode-trigger]), input:not([type="hidden"]), select, textarea'
        );

        return Array.from(controls).find((control) =>
            this.belongsToThisField(control) &&
            control.getAttribute('aria-hidden') !== 'true'
        ) ?? null;
    }

    /** Prevents controls inside nested form fields from being claimed by this field. */
    private belongsToThisField(control: HTMLElement): boolean {
        return control.closest('ims-form-field') === this.hostElement;
    }

    /**
     * Removes only the label association generated by this component.
     *
     * Consumer-provided `for`, `id`, and `aria-labelledby` values are left intact.
     */
    private clearLabelAssociation(): void {
        if (this.automaticLabelFor !== null) {
            const label = this.mainLabel;
            if (label instanceof HTMLLabelElement && label.htmlFor === this.automaticLabelFor) {
                label.removeAttribute('for');
            }
        }

        this.automaticLabelFor = null;
        this.clearGroupLabel();
    }
}

/** Reads the ids in one of an element's space-delimited ARIA reference attributes. */
function idReferences(element: HTMLElement, attribute: string): string[] {
    return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

/**
 * Adds one id to an ARIA reference attribute, next to the ids already there.
 * Returns whether it was added, so only a reference this component added is
 * ever removed again.
 */
function addIdReference(element: HTMLElement, attribute: string, id: string): boolean {
    const references = idReferences(element, attribute);
    if (references.includes(id)) return false;

    element.setAttribute(attribute, [...references, id].join(' '));
    return true;
}

/** Removes one id from an ARIA reference attribute, keeping every other id. */
function removeIdReference(element: HTMLElement, attribute: string, id: string): void {
    const references = idReferences(element, attribute).filter((reference) => reference !== id);
    if (references.length > 0) {
        element.setAttribute(attribute, references.join(' '));
    } else {
        element.removeAttribute(attribute);
    }
}

/** Maps a one-based logical field column to its label-track grid line. */
function physicalColumnStart(logicalColumn: number): number {
    return ((logicalColumn - 1) * 3) + 1;
}

/** Returns the number of physical tracks occupied by logical field columns. */
function physicalTrackSpan(logicalSpan: number): number {
    return (logicalSpan * 3) - 1;
}
