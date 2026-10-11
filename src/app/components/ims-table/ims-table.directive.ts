import {
    afterNextRender,
    booleanAttribute,
    computed,
    contentChildren,
    Directive,
    effect,
    ElementRef,
    forwardRef,
    inject,
    Injector,
    input,
    isDevMode,
    NgZone
} from '@angular/core';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {IMS_TABLE_ROW_ELEMENTS} from './ims-table-row.directive';
import {IMS_TABLE_CONTEXT, ImsTableContext, ImsTableRowRef} from './ims-table.tokens';


/** Keys that move focus between rows. Enter and Space belong to the row itself. */
const NAVIGATION_KEYS: ReadonlySet<string> = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']);
/** Rows moved by PageUp/PageDown when the scrollport or the row cannot be measured. */
const FALLBACK_PAGE_SIZE = 10;
/** Renders to wait for a virtual row scrolled toward before giving up on focusing it. */
const PENDING_FOCUS_RENDER_LIMIT = 10;

/** The rows keyboard navigation moves through, addressed by logical index. */
interface ImsTableRowDomain {
    /** Number of logical rows, rendered or not. */
    readonly count: number;

    /** Logical index of a rendered row, or `-1` when the row is not part of this domain. */
    indexOf(row: ImsTableRowRef): number;

    /** The rendered row at a logical index, or `null` when it is not rendered. */
    rowAt(index: number): ImsTableRowRef | null;
}

/** A virtual viewport's rows: the rendered window of a longer list. */
interface ImsTableVirtualDomain extends ImsTableRowDomain {
    /** Rendered rows in on-screen order. */
    readonly rendered: readonly ImsTableRowRef[];
}

@Directive({
    selector: 'table[ims-table], ims-grid[ims-table]',
    standalone: true,
    exportAs: 'imsTable',
    providers: [
        {
            provide: IMS_TABLE_CONTEXT,
            useExisting: forwardRef(() => ImsTableDirective)
        }
    ],
    host: {
        'class': 'ims-table-new',
        '[class.ims-table-new--interactive]': 'interactive()',
        '[class.ims-table-new--zebra]': 'zebra()',
        '[attr.role]': 'role()'
    }
})
/**
 * Opts a native `table` or an `ims-grid` into the IMS table look, and with
 * `interactive` into row focus, keyboard navigation and row click outputs.
 *
 * The host gets `.ims-table-new`; all presentation lives in
 * `src/styles/ims-table.scss`. The class is not `.ims-table` because that name
 * already belongs to an existing table style this one must not collide with.
 *
 * Rows take part by carrying `ims-table-row`. In interactive mode the table is a
 * single tab stop: the active row has `tabindex="0"` and every other row `-1`.
 * Arrow keys, Home/End and PageUp/PageDown move between rows; Enter and Space
 * are handled by the row itself.
 *
 * Inside an `ims-grid`, a `cdk-virtual-scroll-viewport` holding the rows is
 * supported: the active row is tracked by its data index, and moving past the
 * rendered window scrolls the viewport and focuses the row once it renders.
 * Every item in that viewport must be exactly one `ims-table-row`.
 */
export class ImsTableDirective implements ImsTableContext {
    /** Makes rows focusable, keyboard navigable, and emit `rowClick` and `rowDblclick`. */
    readonly interactive = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});
    /** Stripes every other body row, so the eye keeps to one line across a wide table. */
    readonly zebra = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});

    private readonly hostElement: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly isGridHost = this.hostElement.tagName === 'IMS-GRID';
    /**
     * ARIA role written on the host.
     *
     * Interactive tables are grids. A native table already is a table, so it
     * keeps its implicit role; an `ims-grid` has none and needs it said.
     */
    readonly role = computed(() => {
        if (this.interactive()) {
            return 'grid';
        }

        return this.isGridHost ? 'table' : null;
    });

    private readonly viewports = contentChildren(CdkVirtualScrollViewport, {descendants: true});
    /** The virtual viewport whose rows belong to this table, not to a table nested in one of its cells. */
    private readonly viewport = computed(() =>
        this.viewports().find((viewport) => this.ownsElement(viewport.elementRef.nativeElement)) ?? null
    );

    private readonly rows = new Map<HTMLElement, ImsTableRowRef>();
    private readonly ngZone = inject(NgZone);
    private readonly injector = inject(Injector);
    /** The tab stop outside a virtual viewport, tracked by element so it survives sorting. */
    private activeRow: ImsTableRowRef | null = null;
    /** The tab stop inside a virtual viewport, tracked by data index because row elements are recycled. */
    private activeIndex = -1;
    private pendingFocusIndex: number | null = null;
    private pendingFocusRenders = 0;
    private tabStopsDirty = false;
    private flushScheduled = false;

    constructor() {
        effect(() => {
            this.interactive();
            this.markTabStopsDirty();
        });

        // A virtual viewport reuses row elements for other items as it scrolls, so
        // which element is the tab stop has to be worked out again once the new
        // window has rendered.
        effect((onCleanup) => {
            const viewport = this.viewport();
            if (!viewport) {
                return;
            }

            const subscription = viewport.renderedRangeStream.subscribe(() => this.markTabStopsDirty());
            onCleanup(() => subscription.unsubscribe());
        });

        // A control that appears inside a row after the row was synced — an @if
        // that turns true — would otherwise land back in the tab order.
        effect((onCleanup) => {
            if (!this.interactive()) {
                return;
            }

            const observer = this.ngZone.runOutsideAngular(
                () => new MutationObserver((records) => this.onContentMutations(records))
            );
            observer.observe(this.hostElement, {childList: true, subtree: true});
            onCleanup(() => observer.disconnect());
        });
    }

    registerRow(row: ImsTableRowRef): void {
        this.rows.set(row.element, row);
        this.markTabStopsDirty();
    }

    unregisterRow(row: ImsTableRowRef): void {
        if (this.rows.get(row.element) === row) {
            this.rows.delete(row.element);
        }
        if (this.activeRow === row) {
            this.activeRow = null;
        }
        this.markTabStopsDirty();
    }

    activateRow(row: ImsTableRowRef): void {
        this.pendingFocusIndex = null;
        this.setActiveRow(row);
        this.syncTabStops();
    }

    navigate(row: ImsTableRowRef, event: KeyboardEvent): boolean {
        if (!this.interactive() || !NAVIGATION_KEYS.has(event.key)) {
            return false;
        }

        const viewport = this.viewport();
        const virtual = viewport !== null && viewport.elementRef.nativeElement.contains(row.element);
        if (viewport && !virtual) {
            // A table with a virtual body navigates that body only. A row outside
            // it, such as a totals row, is still clickable but not on the path.
            return false;
        }

        const virtualDomain = virtual ? this.virtualDomain(viewport) : null;
        const domain = virtualDomain ?? this.plainDomain();
        const current = domain.indexOf(row);
        if (current < 0 || domain.count === 0) {
            return false;
        }

        const target = clamp(this.resolveTargetIndex(event.key, current, domain.count, row), 0, domain.count - 1);
        if (target === current) {
            // Still handled: at the first or last row the key does nothing, and
            // must not fall through to scrolling the page instead.
            return true;
        }

        const targetRow = domain.rowAt(target);
        if (targetRow) {
            this.focusRow(targetRow);
        } else if (viewport && virtualDomain) {
            this.revealVirtualIndex(viewport, virtualDomain, target);
        }

        return true;
    }

    private resolveTargetIndex(key: string, current: number, count: number, row: ImsTableRowRef): number {
        switch (key) {
            case 'ArrowDown':
                return current + 1;
            case 'ArrowUp':
                return current - 1;
            case 'Home':
                return 0;
            case 'End':
                return count - 1;
            case 'PageDown':
                return current + this.pageSize(row);
            case 'PageUp':
                return current - this.pageSize(row);
            default:
                return current;
        }
    }

    /** Rows in one visible page, less one so the row moved from stays in view. */
    private pageSize(row: ImsTableRowRef): number {
        const rowHeight = row.element.getBoundingClientRect().height;
        const viewport = this.viewport();
        const visibleHeight = viewport ? viewport.getViewportSize() : resolveScrollportHeight(row.element);
        if (!(rowHeight > 0) || !(visibleHeight > 0)) {
            return FALLBACK_PAGE_SIZE;
        }

        return Math.max(1, Math.floor(visibleHeight / rowHeight) - 1);
    }

    private focusRow(row: ImsTableRowRef): void {
        this.setActiveRow(row);
        this.syncTabStops();
        row.element.focus();
    }

    private setActiveRow(row: ImsTableRowRef): void {
        const viewport = this.viewport();
        if (viewport && viewport.elementRef.nativeElement.contains(row.element)) {
            this.activeIndex = this.virtualDomain(viewport).indexOf(row);
            return;
        }

        this.activeRow = row;
    }

    /**
     * Scrolls a virtual viewport until the row at `index` is rendered, then
     * leaves focusing it to the next render.
     *
     * The viewport only re-measures on a scroll event, which arrives a frame
     * later — and never, in a hidden tab. `checkViewportSize()` makes it read the
     * new offset now, so the range is already updated when this returns.
     */
    private revealVirtualIndex(viewport: CdkVirtualScrollViewport, domain: ImsTableVirtualDomain, index: number): void {
        this.activeIndex = index;
        this.pendingFocusIndex = index;
        this.pendingFocusRenders = 0;
        this.scheduleFlush();

        const rowHeight = domain.rendered[0]?.element.getBoundingClientRect().height ?? 0;
        if (rowHeight > 0) {
            // The least scroll that brings the row into view, so moving one row
            // past the bottom edge lands it at the bottom rather than the top.
            const viewportSize = viewport.getViewportSize();
            const scrollOffset = viewport.measureScrollOffset('top');
            const rowStart = index * rowHeight;
            const rowEnd = rowStart + rowHeight;
            if (rowStart < scrollOffset) {
                viewport.scrollToOffset(rowStart);
            } else if (rowEnd > scrollOffset + viewportSize) {
                viewport.scrollToOffset(Math.max(0, rowEnd - viewportSize));
            }
        } else {
            viewport.scrollToIndex(index);
        }

        viewport.checkViewportSize();
    }

    private markTabStopsDirty(): void {
        this.tabStopsDirty = true;
        this.scheduleFlush();
    }

    /**
     * Runs the pending work once the next render has put the rows in the DOM.
     *
     * Booked per need with `afterNextRender` rather than kept with a hook on
     * every render: the table has nothing to do on most renders, and
     * `afterNextRender` is the same API from Angular 18 on, where the
     * every-render hook has changed name.
     */
    private scheduleFlush(): void {
        if (this.flushScheduled) {
            return;
        }

        this.flushScheduled = true;
        afterNextRender(
            () => {
                this.flushScheduled = false;
                this.flushAfterRender();
            },
            {injector: this.injector}
        );
    }

    private flushAfterRender(): void {
        if (this.pendingFocusIndex !== null) {
            this.flushPendingFocus(this.pendingFocusIndex);
        }

        if (this.tabStopsDirty) {
            this.tabStopsDirty = false;
            this.syncTabStops();
        }
    }

    private flushPendingFocus(index: number): void {
        const viewport = this.viewport();
        const row = viewport ? this.virtualDomain(viewport).rowAt(index) : null;
        if (row) {
            this.pendingFocusIndex = null;
            this.focusRow(row);
            return;
        }

        this.pendingFocusRenders += 1;
        if (!viewport || this.pendingFocusRenders >= PENDING_FOCUS_RENDER_LIMIT) {
            this.pendingFocusIndex = null;
            return;
        }

        // Not rendered yet: CDK renders the new window in a render of its own,
        // after this one. Wait for that.
        this.scheduleFlush();
    }

    /** Gives the tab stop `tabindex="0"`, every other row `-1`, or clears both when not interactive. */
    private syncTabStops(): void {
        const rows = this.connectedRows();
        const viewport = this.viewport();
        if (viewport) {
            this.syncVirtualRowIndexes(viewport);
        }

        if (!this.interactive()) {
            for (const row of rows) {
                row.setTabIndex(null);
                row.setContentTabbable(true);
            }
            return;
        }

        const tabStop = this.resolveTabStop(rows, viewport);
        for (const row of rows) {
            row.setTabIndex(row === tabStop ? 0 : -1);
            row.setContentTabbable(row === tabStop);
        }
    }

    private onContentMutations(records: readonly MutationRecord[]): void {
        const touched = new Set<ImsTableRowRef>();
        for (const record of records) {
            const target = record.target instanceof Element ? record.target : record.target.parentElement;
            const rowElement = target?.closest<HTMLElement>(IMS_TABLE_ROW_ELEMENTS);
            const row = rowElement ? this.rows.get(rowElement) : undefined;
            if (row) {
                touched.add(row);
            }
        }

        for (const row of touched) {
            row.refreshContentTabbable();
        }
    }

    /**
     * The row Tab lands on: the active one while it is rendered, else the first
     * selected row, else the first row.
     */
    private resolveTabStop(rows: readonly ImsTableRowRef[], viewport: CdkVirtualScrollViewport | null): ImsTableRowRef | null {
        if (viewport) {
            const domain = this.virtualDomain(viewport);
            return domain.rowAt(this.activeIndex) ?? domain.rendered.find(isSelectedRow) ?? domain.rendered[0] ?? null;
        }

        if (this.activeRow && rows.includes(this.activeRow)) {
            return this.activeRow;
        }

        const ordered = sortByDocumentOrder(rows);
        return ordered.find(isSelectedRow) ?? ordered[0] ?? null;
    }

    /**
     * Tells assistive technology where each rendered row sits in the whole list
     * and how long the list is, since only a window of it exists in the DOM.
     */
    private syncVirtualRowIndexes(viewport: CdkVirtualScrollViewport): void {
        const headerRows = this.ownedElements('ims-grid-header, thead > tr');
        const footerRows = this.ownedElements('ims-grid-footer, tfoot > tr');
        const itemCount = viewport.getDataLength();

        this.hostElement.setAttribute('aria-rowcount', String(headerRows.length + itemCount + footerRows.length));
        headerRows.forEach((header, index) => header.setAttribute('aria-rowindex', String(index + 1)));
        footerRows.forEach((footer, index) =>
            footer.setAttribute('aria-rowindex', String(headerRows.length + itemCount + index + 1))
        );

        const domain = this.virtualDomain(viewport);
        for (const row of domain.rendered) {
            row.element.setAttribute('aria-rowindex', String(headerRows.length + domain.indexOf(row) + 1));
        }
    }

    private ownedElements(selector: string): HTMLElement[] {
        return Array.from(this.hostElement.querySelectorAll<HTMLElement>(selector)).filter((element) =>
            this.ownsElement(element)
        );
    }

    private plainDomain(): ImsTableRowDomain {
        const rows = sortByDocumentOrder(this.connectedRows().filter(isVisibleRow));
        return {
            count: rows.length,
            indexOf: (row) => rows.indexOf(row),
            rowAt: (index) => rows[index] ?? null
        };
    }

    /**
     * Maps rendered rows onto item indexes.
     *
     * Each row reports the index it is showing through `[ims-table-row]="i"`.
     * That stays true while CDK is between windows — the range already moved,
     * the rows not yet re-rendered — when counting from the start of the new
     * range would name the wrong element.
     *
     * Rows that do not report one are counted from the start of the rendered
     * range instead: CDK keeps its views in item order, so this holds except in
     * that moment between windows.
     */
    private virtualDomain(viewport: CdkVirtualScrollViewport): ImsTableVirtualDomain {
        const viewportElement = viewport.elementRef.nativeElement;
        const rendered = sortByDocumentOrder(
            this.connectedRows().filter((row) => viewportElement.contains(row.element))
        );
        const count = viewport.getDataLength();

        if (rendered.every((row) => row.index() !== null)) {
            return {
                rendered,
                count,
                indexOf: (row) => (rendered.includes(row) ? row.index() ?? -1 : -1),
                rowAt: (index) => rendered.find((row) => row.index() === index) ?? null
            };
        }

        warnMissingRowIndex();
        const start = viewport.getRenderedRange().start;
        return {
            rendered,
            count,
            indexOf: (row) => {
                const position = rendered.indexOf(row);
                return position < 0 ? -1 : start + position;
            },
            rowAt: (index) => (index < start ? null : rendered[index - start] ?? null)
        };
    }

    /** Registered rows that are in the document. A virtual viewport detaches the ones it caches. */
    private connectedRows(): ImsTableRowRef[] {
        return Array.from(this.rows.values()).filter((row) => row.element.isConnected);
    }

    /** Whether the nearest table around `element` is this one rather than one nested inside it. */
    private ownsElement(element: HTMLElement): boolean {
        return element.parentElement?.closest('.ims-table-new') === this.hostElement;
    }
}

let missingRowIndexWarned = false;

function warnMissingRowIndex(): void {
    if (missingRowIndexWarned || !isDevMode()) {
        return;
    }

    missingRowIndexWarned = true;
    console.warn(
        'ims-table: rows in a virtual viewport should bind their item index, as in ' +
        '<ims-grid-row [ims-table-row]="i" *cdkVirtualFor="let item of items; let i = index">. ' +
        'Without it, keyboard focus can land on the wrong row while the viewport re-renders.'
    );
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function isSelectedRow(row: ImsTableRowRef): boolean {
    return row.element.getAttribute('aria-selected') === 'true';
}

/** A row inside a collapsed panel cannot take focus, so arrow keys pass over it. */
function isVisibleRow(row: ImsTableRowRef): boolean {
    const element = row.element;
    return typeof element.checkVisibility === 'function' ? element.checkVisibility() : true;
}

function sortByDocumentOrder(rows: readonly ImsTableRowRef[]): ImsTableRowRef[] {
    return [...rows].sort((left, right) =>
        left.element.compareDocumentPosition(right.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
}

/** Height of the nearest ancestor that scrolls vertically, or of the window when none does. */
function resolveScrollportHeight(element: HTMLElement): number {
    const view = element.ownerDocument.defaultView;
    let ancestor = element.parentElement;
    while (ancestor) {
        const overflowY = view?.getComputedStyle(ancestor).overflowY;
        const scrolls = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
        if (scrolls && ancestor.scrollHeight > ancestor.clientHeight) {
            return ancestor.clientHeight;
        }

        ancestor = ancestor.parentElement;
    }

    return view?.innerHeight ?? 0;
}
