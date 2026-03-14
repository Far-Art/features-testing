import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal} from '@angular/core';

@Component({
    selector: 'ims-grid-cell',
    standalone: true,
    template: '<ng-content/>',
    styles: [
        `
            :host {
                display: block;
                min-width: 0;
                grid-column-end: span 1;
            }

            :host-context(ims-grid-header) {
                font-weight: 600;
            }
        `
    ],
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
}
