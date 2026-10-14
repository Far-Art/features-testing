import {ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, forwardRef, inject, input, Signal, signal} from '@angular/core';
import {IMS_TABLE_CONTEXT} from '../ims-table/ims-table.tokens';
import {IMS_GRID_CONTEXT_V2, ImsGridAppearanceV2, ImsGridContextV2, ImsGridRowContextV2, ImsGridSemanticsV2} from './ims-grid-v2.tokens';


@Component({
    selector: 'ims-grid-v2',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[style.--ims-grid-v2-column-gap]': 'columnGap()',
        '[style.--ims-grid-v2-offset-start]': 'offsetStartCss()',
        '[style.--ims-grid-v2-offset-end]': 'offsetEndCss()',
        '[style.--ims-grid-v2-template]': 'resolvedColumnTemplate()',
        '[style.row-gap]': 'rowGap()',
        '[attr.appearance]': 'appearance()'
    },
    providers: [
        {
            provide: IMS_GRID_CONTEXT_V2,
            useExisting: forwardRef(() => ImsGridV2)
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Root grid container that owns the shared column template for `ims-grid-row-v2`,
 * `ims-grid-header-v2`, `ims-grid-footer-v2`, and nested subgrid wrappers.
 *
 * The component intentionally keeps layout state at the root and exposes it
 * through CSS custom properties so projected rows can align with the header
 * using CSS `subgrid`.
 */
export class ImsGridV2 implements ImsGridContextV2 {
    /**
     * Horizontal gutter track between logical columns.
     *
     * Unset leaves the gutter to the stylesheet: 3px on a bare grid, none on an
     * `ims-table`, whose cells pad themselves instead. A value given here is
     * written inline and wins over both.
     */
    readonly gap = input<string | number | undefined>(undefined, {alias: 'columnGap'});
    /** Vertical gap between top-level grid rows. */
    readonly rowGapInput = input<string | number>(0, {alias: 'rowGap'});
    /** Start rail track applied once on the root grid without shrinking full-width children. */
    readonly offsetStart = input<string | number>(0);
    /** End rail track applied once on the root grid without shrinking full-width children. */
    readonly offsetEnd = input<string | number>(0);
    /**
     * Track used for columns without header sizing.
     *
     * `auto` mirrors table auto-layout: intrinsic contributions from header and
     * body subgrid cells establish the column width, then remaining space may
     * be distributed across auto tracks.
     */
    readonly defaultColumnTrack = input<string>('auto');
    /**
     * Optional complete CSS grid-template-columns override.
     *
     * This is an advanced escape hatch. The default template includes offset
     * rails and explicit gutter tracks, which is what `ims-grid-cell-v2` indexes
     * against. Custom templates should preserve that track structure.
     */
    readonly columnTemplate = input<string | undefined>(undefined);
    /** Appearance marker mirrored to `appearance` attribute on host. */
    readonly appearance = input<ImsGridAppearanceV2>('default');
    /** Normalized CSS length for the column gutter track custom property, or `null` to leave it to CSS. */
    readonly columnGap: Signal<string | null> = computed(() => {
        const gap = this.gap();
        return gap === undefined ? null : toCssLength(gap);
    });
    /** Normalized CSS length for the host row gap style. */
    readonly rowGap: Signal<string> = computed(() => toCssLength(this.rowGapInput()));
    /** Normalized CSS length for the root start rail. */
    readonly offsetStartCss: Signal<string> = computed(() => toCssLength(this.offsetStart()));
    /** Normalized CSS length for the root end rail. */
    readonly offsetEndCss: Signal<string> = computed(() => toCssLength(this.offsetEnd()));
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly rows = signal<readonly ImsGridRowContextV2[]>([]);
    /** An `ims-table` directive on this same host, which turns the grid from a layout into a table. */
    private readonly table = inject(IMS_TABLE_CONTEXT, {self: true, optional: true});
    /** ARIA semantics passed down to rows and cells: none for a layout grid. */
    readonly semantics: Signal<ImsGridSemanticsV2> = computed(() => {
        if (!this.table) {
            return null;
        }

        return this.table.interactive() ? 'grid' : 'table';
    });
    /** Maximum logical column count across header rows, falling back to body rows. */
    readonly columnCount: Signal<number> = computed(() => {
        const rows = this.rows();
        if (rows.length === 0) {
            return 0;
        }

        const headerCounts = rows.map((row) => row.headerCellCount()).filter((count) => count > 0);
        if (headerCounts.length > 0) {
            return Math.max(...headerCounts);
        }

        return Math.max(...rows.map((row) => row.cellCount()));
    });

    /** Adds a row/header to the root grid's column calculations. */
    registerRow(row: ImsGridRowContextV2): void {
        this.rows.update((rows) => rows.includes(row) ? rows : [...rows, row]);
    }

    /** Removes a row/header from the root grid's column calculations. */
    unregisterRow(row: ImsGridRowContextV2): void {
        this.rows.update((rows) => rows.filter((current) => current !== row));
    }

    /**
     * CSS `grid-template-columns` value applied to the root grid.
     *
     * A header cell `width` is authoritative. Otherwise header and body cell
     * intrinsic sizes both contribute, with optional minWidth/maxWidth
     * constraints. Offset inputs are modeled as real grid tracks so components
     * spanning the whole grid keep their natural width while cells align inside
     * the offset rails.
     */
    readonly resolvedColumnTemplate: Signal<string> = computed(() => {
        const explicitTemplate = this.columnTemplate()?.trim();
        if (explicitTemplate) {
            return explicitTemplate;
        }

        const columnCount = this.columnCount();
        if (columnCount <= 0) {
            return 'none';
        }

        const headerRow = this.rows().find((row) => row.headerCellCount() > 0);
        const defaultTrack = this.defaultColumnTrack().trim() || 'auto';
        const columnTracks: string[] = [];
        for (let index = 0; index < columnCount; index += 1) {
            columnTracks.push(headerRow?.resolveColumnTrack(index) ?? defaultTrack);
        }

        // A table paints its rows edge to edge inside its frame. When no column
        // can take the grid's leftover width, the end rail takes it, so the
        // rows, the header band and the separators still reach the frame.
        const fillEndRail = this.semantics() !== null && !columnTracks.some(isGrowingTrack);
        return buildTemplateWithOffsetRails(columnTracks, fillEndRail);
    });

    constructor() {
        const document = this.hostElement.ownerDocument;
        const onCopy = (event: ClipboardEvent) => this.onCopy(event);
        document.addEventListener('copy', onCopy);
        this.destroyRef.onDestroy(() => document.removeEventListener('copy', onCopy));
    }

    /** Copies a selected grid range as tab/newline-delimited cell text. */
    onCopy(event: ClipboardEvent): void {
        const selectedText = resolveSelectedGridText(
            this.hostElement,
            this.hostElement.ownerDocument.getSelection()
        );
        if (selectedText === null || !event.clipboardData) {
            return;
        }

        event.clipboardData.setData('text/plain', selectedText);
        event.preventDefault();
    }
}

function buildTemplateWithOffsetRails(columnTracks: readonly string[], fillEndRail: boolean): string {
    const tracks = ['var(--ims-grid-v2-offset-start)'];

    columnTracks.forEach((track, index) => {
        if (index > 0) {
            tracks.push('var(--ims-grid-v2-column-gap)');
        }

        tracks.push(track);
    });

    tracks.push(fillEndRail ? 'minmax(var(--ims-grid-v2-offset-end), 1fr)' : 'var(--ims-grid-v2-offset-end)');

    return tracks.join(' ');
}

/** Whether a track takes a share of leftover width: `auto` stretches, `fr` flexes. */
function isGrowingTrack(track: string): boolean {
    const normalized = track.trim().toLowerCase();
    return normalized === 'auto' || /\dfr\b/.test(normalized) || /,\s*auto\s*\)$/.test(normalized);
}

/** Converts numeric or unitless length inputs into valid CSS length strings. */
function toCssLength(value: string | number): string {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    const normalized = value.trim();
    if (!normalized) {
        return '0px';
    }

    if (/^-?\d+(\.\d+)?$/.test(normalized)) {
        return `${normalized}px`;
    }

    return normalized;
}

function resolveSelectedGridText(hostElement: HTMLElement, selection: Selection | null): string | null {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return null;
    }

    const rows = Array.from(
        hostElement.querySelectorAll<HTMLElement>('ims-grid-header-v2, ims-grid-row-v2, ims-grid-footer-v2')
    ).filter((row) => row.closest('ims-grid-v2') === hostElement);

    const lines: string[] = [];
    for (const row of rows) {
        const selectedCells = resolveOwnGridCells(row)
            .map((cell) => resolveSelectedNodeText(selection, cell))
            .filter((text): text is string => text !== null);

        if (selectedCells.length > 0) {
            lines.push(selectedCells.map(normalizeCopiedCellText).join('\t'));
        }
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

function resolveOwnGridCells(row: HTMLElement): readonly HTMLElement[] {
    return Array.from(row.querySelectorAll<HTMLElement>('ims-grid-cell-v2'))
                .filter((cell) => cell.closest('ims-grid-row-v2, ims-grid-header-v2, ims-grid-footer-v2') === row);
}

function resolveSelectedNodeText(selection: Selection, node: HTMLElement): string | null {
    const selectedParts: string[] = [];
    for (let index = 0; index < selection.rangeCount; index += 1) {
        const range = selection.getRangeAt(index);
        if (!rangeIntersectsNode(range, node)) {
            continue;
        }

        const clippedRange = range.cloneRange();
        if (!node.contains(range.startContainer)) {
            clippedRange.setStart(node, 0);
        }
        if (!node.contains(range.endContainer)) {
            clippedRange.setEnd(node, node.childNodes.length);
        }

        selectedParts.push(clippedRange.toString());
    }

    return selectedParts.length > 0 ? selectedParts.join('') : null;
}

function rangeIntersectsNode(range: Range, node: Node): boolean {
    try {
        return range.intersectsNode(node);
    } catch {
        return false;
    }
}

function normalizeCopiedCellText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}
