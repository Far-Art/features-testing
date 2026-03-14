import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal} from '@angular/core';
import {IMS_GRID_CONTEXT} from './ims-grid.tokens';

@Component({
    selector: 'ims-grid-cell',
    standalone: true,
    template: `
        <div class="ims-sort-header-container">
            <div class="ims-sort-header-content">
                <ng-content/>
            </div>

            <div class="ims-sort-header-arrow" aria-hidden="true">
                <svg viewBox="0 -960 960 960" focusable="false" aria-hidden="true">
                    <path d="M440-240v-368L296-464l-56-56 240-240 240 240-56 56-144-144v368h-80Z"/>
                </svg>
            </div>
        </div>
    `,
    styleUrl: './ims-grid-cell.scss',
    host: {
        '[style.grid-column-start]': 'gridColumnStart()',
        '[class.ims-grid-header-highlighted]': 'isHeaderHighlighted()',
        '(pointerenter)': 'onPointerEnter()',
        '(pointerleave)': 'onPointerLeave($event)',
        '(focusin)': 'onFocusIn()',
        '(focusout)': 'onFocusOut($event)'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGridCell {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly grid = inject(IMS_GRID_CONTEXT, {optional: true});
    private readonly columnIndex = signal(0);
    readonly width = input<string | number | undefined>(undefined);
    readonly gridColumnStart = computed(() => `${this.columnIndex() + 2}`);
    readonly isHeaderHighlighted = computed(() =>
        (this.grid?.activeColumnIndex() ?? -1) === this.getColumnIndex()
    );

    get parentElement(): HTMLElement | null {
        return this.elementRef.nativeElement.parentElement;
    }

    setColumnIndex(index: number): void {
        this.columnIndex.set(index);
    }

    getColumnIndex(): number {
        return this.columnIndex();
    }

    get textValue(): string {
        return this.elementRef.nativeElement.textContent?.trim() ?? '';
    }

    get widthCss(): string | null {
        const width = this.width();
        if (width === undefined || width === null) {
            return null;
        }

        return toCssLength(width);
    }

    onPointerEnter(): void {
        this.grid?.setHoveredColumn(this.getColumnIndex());
    }

    onPointerLeave(event: PointerEvent): void {
        const next = event.relatedTarget as Element | null;
        if (next?.closest('ims-grid-cell')) {
            return;
        }

        this.grid?.setHoveredColumn(null);
    }

    onFocusIn(): void {
        this.grid?.setFocusedColumn(this.getColumnIndex());
    }

    onFocusOut(event: FocusEvent): void {
        const next = event.relatedTarget as Element | null;
        if (next?.closest('ims-grid-cell')) {
            return;
        }

        this.grid?.setFocusedColumn(null);
    }
}

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
