import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal} from '@angular/core';
import {ImsGridHeaderDirective} from './ims-grid-header.directive';

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

            :host(.ims-grid-header-cell) {
                font-weight: 600;
            }
        `
    ],
    host: {
        '[style.grid-column-start]': 'gridColumnStart()',
        '[class.ims-grid-header-cell]': 'isHeader'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsGridCell {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly columnIndex = signal(0);
    private readonly headerDirective = inject(ImsGridHeaderDirective, {self: true, optional: true});

    readonly isHeader = this.headerDirective !== null;
    readonly gridColumnStart = computed(() => `${this.columnIndex() + 2}`);

    get parentElement(): HTMLElement | null {
        return this.elementRef.nativeElement.parentElement;
    }

    setColumnIndex(index: number): void {
        this.columnIndex.set(index);
    }
}

