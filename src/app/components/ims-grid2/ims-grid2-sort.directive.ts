import {computed, DestroyRef, Directive, effect, inject, input, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatSort, Sort} from '@angular/material/sort';


/** Resolves the value used to sort an item for a given field id. */
export type ImsGrid2SortAccessor<T> = (item: T, field: string) => unknown;
/** Compares two resolved sort values for a field. */
export type ImsGrid2SortCompare = (left: unknown, right: unknown, field: string) => number;

@Directive({
    selector: 'ims-grid2[imsGrid2Sort]',
    standalone: true,
    exportAs: 'imsGrid2Sort',
    hostDirectives: [
        {
            directive: MatSort,
            inputs: [
                'matSortActive',
                'matSortStart',
                'matSortDirection',
                'matSortDisableClear',
                'matSortDisabled'
            ],
            outputs: ['matSortChange']
        }
    ]
})
/**
 * Adds data sorting behavior to an `ims-grid2` while delegating header UI state
 * to Angular Material `MatSort`.
 *
 * Consumers pass the source data to `[imsGrid2Sort]` and render
 * `#sort="imsGrid2Sort"; sort.sortedData()`. The directive never mutates the
 * source data array; sorted output is stable and recomputed from current inputs.
 */
export class ImsGrid2SortDirective<T> {
    /** Source data to sort. Returned as-is when no sort direction is active. */
    readonly data = input<readonly T[]>([], {alias: 'imsGrid2Sort'});
    /** Optional custom accessor for resolving values from each data item. */
    readonly accessor = input<ImsGrid2SortAccessor<T> | null>(null, {alias: 'imsGrid2SortAccessor'});
    /** Optional custom comparator for resolved sort values. */
    readonly compare = input<ImsGrid2SortCompare | null>(null, {alias: 'imsGrid2SortCompare'});
    /** Emits whenever the computed sorted data changes. */
    readonly sortedDataChange = output<readonly T[]>({alias: 'imsGrid2SortedDataChange'});
    private readonly destroyRef = inject(DestroyRef);
    private readonly matSort = inject(MatSort, {host: true});
    private readonly sortState = signal<Sort>({
        active: '',
        direction: ''
    });
    /** Current sorted view of `data`, suitable for Angular `@for` rendering. */
    readonly sortedData = computed<readonly T[]>(() => {
        const data = this.data();
        const sort = this.sortState();
        if (!sort.active || !sort.direction) {
            return data;
        }

        const accessor = this.accessor();
        const compare = this.compare() ?? compareSortValues;
        const activeField = sort.active;
        const directionMultiplier = sort.direction === 'asc' ? 1 : -1;

        return data
            .map((item, index) => ({
                item,
                index
            }))
            .sort((left, right) => {
                const leftValue = accessor
                    ? accessor(left.item, activeField)
                    : resolvePathValue(left.item, activeField);
                const rightValue = accessor
                    ? accessor(right.item, activeField)
                    : resolvePathValue(right.item, activeField);
                const result = compare(leftValue, rightValue, activeField) * directionMultiplier;
                return result !== 0 ? result : left.index - right.index;
            })
            .map(({item}) => item);
    });

    constructor() {
        this.matSort.sortChange
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((sort) => this.sortState.set(sort));

        queueMicrotask(() => {
            this.sortState.set({
                active: this.matSort.active,
                direction: this.matSort.direction
            });
        });

        effect(() => {
            this.sortedDataChange.emit(this.sortedData());
        });
    }
}

/** Resolves dot-path fields such as `insured.name.first` from arbitrary row data. */
function resolvePathValue(item: unknown, field: string): unknown {
    if (item === null || item === undefined) {
        return '';
    }

    const path = field
        .split('.')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (path.length === 0) {
        return item;
    }

    let current: unknown = item;
    for (const segment of path) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return '';
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return current ?? '';
}

/** Default comparator that handles numbers, booleans, dates, numeric strings, and text. */
function compareSortValues(left: unknown, right: unknown): number {
    const normalizedLeft = normalizeSortValue(left);
    const normalizedRight = normalizeSortValue(right);

    if (typeof normalizedLeft === 'number' && typeof normalizedRight === 'number') {
        return normalizedLeft - normalizedRight;
    }

    return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}

/** Normalizes common value types before comparison. */
function normalizeSortValue(value: unknown): number | string {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'number') {
        return Number.isNaN(value) ? 0 : value;
    }

    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    const stringValue = String(value).trim();
    const compactNumber = stringValue.replace(/[$,%\s]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(compactNumber)) {
        return Number(compactNumber);
    }

    return stringValue.toLocaleLowerCase();
}
