import {computed, DestroyRef, Directive, effect, inject, input, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractControl, FormArray} from '@angular/forms';
import {MatSort, Sort} from '@angular/material/sort';


/** Resolves the value used to sort an item for a given field id. */
export type ImsGridSortAccessorV2<T> = (item: T, field: string) => unknown;
/** Compares two resolved sort values for a field. */
export type ImsGridSortCompareV2 = (left: unknown, right: unknown, field: string) => number;
/** A `FormArray` whose controls are the rows: `T` is the control type, a `FormGroup` per row as a rule. */
export type ImsGridSortFormArrayV2<T> = FormArray & {controls: T[]};
/** What `[imsGridSortV2]` sorts: an array of rows, or a `FormArray` whose controls are the rows. */
export type ImsGridSortSourceV2<T> = T[] | ImsGridSortFormArrayV2<T>;

@Directive({
    selector: 'ims-grid-v2[imsGridSortV2]',
    standalone: true,
    exportAs: 'imsGridSortV2',
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
 * Adds data sorting behavior to an `ims-grid-v2` while delegating header UI state
 * to Angular Material `MatSort`.
 *
 * Consumers pass the source data to `[imsGridSortV2]` and render
 * `#sort="imsGridSortV2"; sort.sortedData()`. The directive never mutates the
 * source data array; sorted output is stable and recomputed from current inputs.
 *
 * The source may also be a `FormArray`, one control per row. `sortedData()` is
 * then its controls in sorted order, to bind each row with `[formGroup]`, and a
 * field is read from the control's raw value, so a disabled field still sorts:
 *
 * ```html
 * <ims-grid-v2 [imsGridSortV2]="rows" #sort="imsGridSortV2">
 *     …
 *     @for (row of sort.sortedData(); track row) {
 *         <ims-grid-row-v2 [formGroup]="row">…</ims-grid-row-v2>
 *     }
 * </ims-grid-v2>
 * ```
 *
 * The order follows the FormArray's rows — a control added, removed or moved
 * re-sorts it — but not edits to their values: a row being typed into keeps its
 * place rather than jumping away from the field under the cursor. The next sort
 * change, or the next change to the rows, sorts by the values as they are then.
 * A change made with `emitEvent: false` is not seen until one of those.
 */
export class ImsGridSortDirectiveV2<T> {
    /** Source data to sort: an array, or a `FormArray` of row controls. Returned as-is when no sort direction is active. */
    readonly data = input<ImsGridSortSourceV2<T>>([], {alias: 'imsGridSortV2'});
    /** Optional custom accessor for resolving values from each data item. A FormArray's items are its controls. */
    readonly accessor = input<ImsGridSortAccessorV2<T> | null>(null, {alias: 'imsGridSortAccessorV2'});
    /** Optional custom comparator for resolved sort values. */
    readonly compare = input<ImsGridSortCompareV2 | null>(null, {alias: 'imsGridSortCompareV2'});
    /** Emits whenever the computed sorted data changes. */
    readonly sortedDataChange = output<T[]>({alias: 'imsGridSortedDataChangeV2'});
    private readonly destroyRef = inject(DestroyRef);
    private readonly matSort = inject(MatSort, {host: true});
    private readonly sortState = signal<Sort>({
        active: '',
        direction: ''
    });
    /** Bumped when a FormArray source gains, loses or reorders controls, which no signal reports. */
    private readonly rowsVersion = signal(0);
    /** Current sorted view of `data`, suitable for Angular `@for` rendering. */
    readonly sortedData = computed<T[]>(() => {
        this.rowsVersion();
        const source = this.data();
        // A copy of a FormArray's controls: the array itself is mutated in
        // place, and handing out the same instance would read as unchanged.
        const data: T[] = source instanceof FormArray ? [...source.controls] : source;
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
                    : resolvePathValue(rowValue(left.item), activeField);
                const rightValue = accessor
                    ? accessor(right.item, activeField)
                    : resolvePathValue(rowValue(right.item), activeField);
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

        // A FormArray's rows change without a signal. Its valueChanges fires on
        // every push, insert, removal and edit; only a change to which controls
        // it holds, or their order, re-sorts.
        effect((onCleanup) => {
            const source = this.data();
            if (!(source instanceof FormArray)) {
                return;
            }

            let controls = [...source.controls];
            const subscription = source.valueChanges.subscribe(() => {
                if (!sameControls(controls, source.controls)) {
                    controls = [...source.controls];
                    this.rowsVersion.update((version) => version + 1);
                }
            });
            onCleanup(() => subscription.unsubscribe());
        });
    }
}

/** A row's value to read sort fields from: a control's raw value, disabled fields included, or the row itself. */
function rowValue(item: unknown): unknown {
    return item instanceof AbstractControl ? item.getRawValue() : item;
}

/** Whether a FormArray still holds the same controls in the same order. */
function sameControls(previous: readonly AbstractControl[], current: readonly AbstractControl[]): boolean {
    return previous.length === current.length && previous.every((control, index) => control === current[index]);
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
