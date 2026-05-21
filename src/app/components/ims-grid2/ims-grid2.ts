import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Signal,
    computed,
    forwardRef,
    inject,
    input,
    signal
} from '@angular/core';
import {IMS_GRID2_CONTEXT, ImsGrid2Context, ImsGrid2RowContext} from './ims-grid2.tokens';

@Component({
    selector: 'ims-grid2',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[style.--ims-grid2-column-gap]': 'columnGap()',
        '[style.--ims-grid2-offset-start]': 'offsetStartCss()',
        '[style.--ims-grid2-offset-end]': 'offsetEndCss()',
        '[style.--ims-grid2-template]': 'resolvedColumnTemplate()',
        '[style.row-gap]': 'rowGap()'
    },
    providers: [
        {
            provide: IMS_GRID2_CONTEXT,
            useExisting: forwardRef(() => ImsGrid2)
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Root grid container that owns the shared column template for `ims-grid2-row`,
 * `ims-grid2-header`, and nested subgrid wrappers.
 *
 * The component intentionally keeps layout state at the root and exposes it
 * through CSS custom properties so projected rows can align with the header
 * using CSS `subgrid`.
 */
export class ImsGrid2 implements ImsGrid2Context {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly rows = signal<readonly ImsGrid2RowContext[]>([]);

    /** Horizontal gap between logical columns. */
    readonly gap = input<string | number>(3, {alias: 'columnGap'});
    /** Vertical gap between top-level grid rows. */
    readonly rowGapInput = input<string | number>(0, {alias: 'rowGap'});
    /** Start rail applied once on the root grid. */
    readonly offsetStart = input<string | number>(0);
    /** End rail applied once on the root grid. */
    readonly offsetEnd = input<string | number>(0);
    /** Track used for header columns that do not declare width/minWidth/maxWidth. */
    readonly defaultColumnTrack = input<string>('minmax(0, 1fr)');
    /** Optional complete CSS grid-template-columns override. */
    readonly columnTemplate = input<string | undefined>(undefined);

    /** Normalized CSS length for the column gap custom property. */
    readonly columnGap: Signal<string> = computed(() => toCssLength(this.gap()));
    /** Normalized CSS length for the host row gap style. */
    readonly rowGap: Signal<string> = computed(() => toCssLength(this.rowGapInput()));
    /** Normalized CSS length for the root start rail. */
    readonly offsetStartCss: Signal<string> = computed(() => toCssLength(this.offsetStart()));
    /** Normalized CSS length for the root end rail. */
    readonly offsetEndCss: Signal<string> = computed(() => toCssLength(this.offsetEnd()));
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
    /**
     * CSS `grid-template-columns` value applied to the root grid.
     *
     * Header cell `width`, `minWidth`, and `maxWidth` inputs win per column.
     * Columns without explicit header sizing use `defaultColumnTrack`.
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
        const defaultTrack = this.defaultColumnTrack().trim() || 'minmax(0, 1fr)';
        const tracks: string[] = [];
        for (let index = 0; index < columnCount; index += 1) {
            tracks.push(headerRow?.resolveColumnTrack(index) ?? defaultTrack);
        }

        return tracks.join(' ');
    });

    constructor() {
        const document = this.hostElement.ownerDocument;
        const onCopy = (event: ClipboardEvent) => this.onCopy(event);
        document.addEventListener('copy', onCopy);
        this.destroyRef.onDestroy(() => document.removeEventListener('copy', onCopy));
    }

    /** Adds a row/header to the root grid's column calculations. */
    registerRow(row: ImsGrid2RowContext): void {
        this.rows.update((rows) => rows.includes(row) ? rows : [...rows, row]);
    }

    /** Removes a row/header from the root grid's column calculations. */
    unregisterRow(row: ImsGrid2RowContext): void {
        this.rows.update((rows) => rows.filter((current) => current !== row));
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
        hostElement.querySelectorAll<HTMLElement>('ims-grid2-header, ims-grid2-row')
    ).filter((row) => row.closest('ims-grid2') === hostElement);

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
    return Array.from(row.querySelectorAll<HTMLElement>('ims-grid2-cell'))
        .filter((cell) => cell.closest('ims-grid2-row, ims-grid2-header') === row);
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
