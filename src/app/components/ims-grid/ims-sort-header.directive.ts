import {FocusMonitor} from '@angular/cdk/a11y';
import {computed, DestroyRef, Directive, ElementRef, inject, input, signal} from '@angular/core';
import {ImsGridCell} from './ims-grid-cell';
import {IMS_GRID_CONTEXT, ImsSortDirection, ImsSortHeaderContext} from './ims-grid.tokens';

type RecentlyClearedDirection = 'asc' | 'desc' | null;

@Directive({
    selector: '[imsSortHeader]',
    standalone: true,
    host: {
        'class': 'ims-sort-header',
        '[attr.tabindex]': 'isInteractive ? 0 : null',
        '[attr.role]': 'isInteractive ? "button" : null',
        '[attr.aria-sort]': 'ariaSort()',
        '[class.ims-sort-header-sorted]': 'direction() !== ""',
        '[class.ims-sort-header-ascending]': 'direction() === "asc"',
        '[class.ims-sort-header-descending]': 'direction() === "desc"',
        '[class.ims-sort-header-recently-cleared-ascending]': 'recentlyCleared() === "asc"',
        '[class.ims-sort-header-recently-cleared-descending]': 'recentlyCleared() === "desc"',
        '[class.ims-sort-header-hint-suppressed]': 'hintSuppressed()',
        '(click)': 'toggleSort()',
        '(keydown)': 'onKeydown($event)',
        '(mouseleave)': 'clearRecentlyCleared()',
        '(focusout)': 'clearRecentlyCleared()'
    }
})
export class ImsSortHeaderDirective implements ImsSortHeaderContext {
    private readonly destroyRef = inject(DestroyRef);
    private readonly focusMonitor = inject(FocusMonitor);
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly cell = inject(ImsGridCell, {optional: true, host: true});
    private readonly grid = inject(IMS_GRID_CONTEXT, {optional: true});

    readonly field = input.required<string>({alias: 'imsSortHeader'});
    readonly isInteractive = this.grid !== null;
    readonly recentlyCleared = signal<RecentlyClearedDirection>(null);
    readonly hintSuppressed = signal(false);
    readonly direction = computed<ImsSortDirection>(() =>
        this.grid?.getSortDirection(this.field()) ?? ''
    );
    readonly ariaSort = computed(() => {
        const direction = this.direction();
        if (direction === 'asc') {
            return 'ascending';
        }
        if (direction === 'desc') {
            return 'descending';
        }
        return 'none';
    });

    constructor() {
        this.grid?.registerSortHeader(this);
        if (this.isInteractive) {
            this.focusMonitor.monitor(this.elementRef, true).subscribe();
        }

        this.destroyRef.onDestroy(() => {
            this.focusMonitor.stopMonitoring(this.elementRef);
            this.grid?.unregisterSortHeader(this);
        });
    }

    toggleSort(): void {
        if (!this.grid) {
            return;
        }

        const previousDirection = this.direction();
        const wasSorted = previousDirection !== '';

        this.grid.toggleSort(this.field());

        const nextDirection = this.direction();
        const cleared = wasSorted && nextDirection === '';
        this.recentlyCleared.set(
            cleared ? (previousDirection as RecentlyClearedDirection) : null
        );
        this.hintSuppressed.set(cleared);
    }

    onKeydown(event: KeyboardEvent): void {
        if (!this.isInteractive) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.toggleSort();
        }
    }

    clearRecentlyCleared(): void {
        this.recentlyCleared.set(null);
        this.hintSuppressed.set(false);
    }

    getField(): string {
        return this.field();
    }

    getColumnIndex(): number {
        return this.cell?.getColumnIndex() ?? 0;
    }
}
