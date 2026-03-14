import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal} from '@angular/core';

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
        '[style.grid-column-start]': 'gridColumnStart()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGridCell {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly columnIndex = signal(0);
    readonly gridColumnStart = computed(() => `${this.columnIndex() + 2}`);

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
}
