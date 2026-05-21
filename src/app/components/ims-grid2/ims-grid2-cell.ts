import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal} from '@angular/core';

@Component({
    selector: 'ims-grid2-cell',
    standalone: true,
    template: '<ng-content/>',
    host: {
        '[style.grid-column-start]': 'gridColumnStart()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGrid2Cell {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly columnIndex = signal(0);

    /** Fixed column track width consumed from the header row. */
    readonly width = input<string | number | undefined>(undefined);
    /** Minimum column track width consumed from the header row. */
    readonly minWidth = input<string | number | undefined>(undefined);
    /** Maximum column track width consumed from the header row. */
    readonly maxWidth = input<string | number | undefined>(undefined);
    readonly gridColumnStart = computed(() => `${this.columnIndex() + 1}`);

    get parentElement(): HTMLElement | null {
        return this.elementRef.nativeElement.parentElement;
    }

    getHostElement(): HTMLElement {
        return this.elementRef.nativeElement;
    }

    setColumnIndex(index: number): void {
        this.columnIndex.set(index);
    }

    getColumnIndex(): number {
        return this.columnIndex();
    }

    get widthCss(): string | null {
        const width = this.width();
        if (width === undefined || width === null) {
            return null;
        }

        return toCssLength(width);
    }

    get minWidthCss(): string | null {
        const minWidth = this.minWidth();
        if (minWidth === undefined || minWidth === null) {
            return null;
        }

        return toCssLength(minWidth);
    }

    get maxWidthCss(): string | null {
        const maxWidth = this.maxWidth();
        if (maxWidth === undefined || maxWidth === null) {
            return null;
        }

        return toCssLength(maxWidth);
    }

    get columnTrackCss(): string | null {
        const width = this.widthCss;
        if (width) {
            return width;
        }

        const minWidth = this.minWidthCss;
        const maxWidth = this.maxWidthCss;
        if (minWidth && maxWidth) {
            return `minmax(${minWidth}, ${maxWidth})`;
        }

        if (minWidth) {
            return `minmax(${minWidth}, 1fr)`;
        }

        if (maxWidth) {
            return `minmax(0px, ${maxWidth})`;
        }

        return null;
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
