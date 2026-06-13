import {Component, computed, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {finalize} from 'rxjs';
import {
  AnyQueryDefinition,
  QueryColumn,
  QueryFilterField,
  QueryRequest,
  QuerySort,
  QuerySelectionResult,
  resolveQueryRequestKeys
} from '../query.models';
import {QueryDialogContract} from './query-dialog.contract';

export interface QueryDialogData {
  definition: AnyQueryDefinition;
  pageSize: number;
  initialFilter?: Record<string, unknown> | null;
}

type QueryFormGroup = FormGroup<Record<string, FormControl<string>>>;

const ROW_HEIGHT_PX = 38;
const HEADER_HEIGHT_PX = 38;
const WRAPPER_BORDERS_PX = 2;
const WRAPPER_MAX_HEIGHT_PX = 360;

@Component({
  selector: 'ims-query-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './query-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './query-dialog.scss'
})
export class QueryDialog implements QueryDialogContract {
  private readonly dialogRef = inject(DialogRef<QuerySelectionResult<any, string> | null, QueryDialog>);
  private readonly dialogData = inject<QueryDialogData>(DIALOG_DATA);

  readonly definition = this.dialogData.definition;
  readonly loading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(this.dialogData.pageSize);
  readonly items = signal<readonly any[]>([]);
  readonly total = signal(0);
  readonly selectedItem = signal<any | null>(null);
  readonly sort = signal<QuerySort | null>(null);

  readonly pageCount = computed(() => {
    const total = this.total();
    const pageSize = this.pageSize();
    return total === 0 ? 0 : Math.ceil(total / pageSize);
  });

  readonly canGoPrev = computed(() => this.pageIndex() > 0 && !this.loading());
  readonly canGoNext = computed(() => (this.pageIndex() + 1) < this.pageCount() && !this.loading());

  readonly wrapperHeight = computed(() => {
    const h = HEADER_HEIGHT_PX + this.items().length * ROW_HEIGHT_PX + WRAPPER_BORDERS_PX;
    return Math.min(h, WRAPPER_MAX_HEIGHT_PX) + 'px';
  });

  readonly form: QueryFormGroup = this.buildForm(this.definition.filterFields);

  constructor() {
    this.applyInitialFilter(this.dialogData.initialFilter);
    this.executeSearch();
  }

  executeSearch(resetToFirstPage = false): void {
    if (resetToFirstPage) {
      this.pageIndex.set(0);
    }

    const request = this.createRequest();
    this.loading.set(true);

    this.definition.dataSource.search(request).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe((resultPage) => {
      this.items.set(resultPage.items);
      this.total.set(resultPage.total);
      this.selectedItem.set(null);
    });
  }

  goBack(): void {
    if (!this.canGoPrev()) {
      return;
    }
    this.pageIndex.update((value) => value - 1);
    this.executeSearch();
  }

  goNext(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.pageIndex.update((value) => value + 1);
    this.executeSearch();
  }

  goFirst(): void {
    this.goPage(1);
  }

  goLast(): void {
    const pageCount = this.pageCount();
    if (pageCount === 0) {
      return;
    }
    this.goPage(pageCount);
  }

  goPage(pageNumber: number): void {
    if (this.loading() || !Number.isFinite(pageNumber)) {
      return;
    }

    const pageCount = this.pageCount();
    if (pageCount === 0) {
      return;
    }

    const normalizedPage = Math.trunc(pageNumber);
    if (normalizedPage < 1) {
      return;
    }

    const targetPage = Math.min(normalizedPage, pageCount) - 1;
    if (targetPage === this.pageIndex()) {
      return;
    }

    this.pageIndex.set(targetPage);
    this.executeSearch();
  }

  selectItem(item: any): void {
    this.selectedItem.set(item);
  }

  toggleSort(column: QueryColumn<any>): void {
    if (!this.isSortable(column) || this.loading()) {
      return;
    }

    const field = column.key;
    const currentSort = this.sort();
    const nextDirection = currentSort?.field === field && currentSort.direction === 'ASC' ? 'DESC' : 'ASC';

    this.sort.set({field, direction: nextDirection});
    this.executeSearch(true);
  }

  isSortable(column: QueryColumn<any>): boolean {
    return column.sortable !== false;
  }

  sortDirection(column: QueryColumn<any>): QuerySort['direction'] | null {
    const currentSort = this.sort();
    if (!currentSort || currentSort.field !== column.key) {
      return null;
    }

    return currentSort.direction;
  }

  isSelected(item: any): boolean {
    return this.selectedItem() === item;
  }

  confirmSelection(): void {
    const selectedItem = this.selectedItem();
    if (!selectedItem) {
      return;
    }

    this.dialogRef.close({
      key: this.definition.key,
      item: selectedItem,
      display: this.definition.describeItem(selectedItem)
    });
  }

  clear(): void {
    for (const field of this.definition.filterFields) {
      this.form.controls[field.key]?.setValue('');
    }

    this.sort.set(null);
    this.selectedItem.set(null);
    this.executeSearch(true);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private buildForm(fields: readonly QueryFilterField<any>[]): QueryFormGroup {
    const controls: Record<string, FormControl<string>> = {};
    for (const field of fields) {
      controls[field.key] = new FormControl<string>('', {nonNullable: true});
    }

    return new FormGroup<Record<string, FormControl<string>>>(controls);
  }

  private createRequest(): QueryRequest<any> {
    const rawValue = this.form.getRawValue();
    const filter: Record<string, unknown> = {};
    const requestKeys = resolveQueryRequestKeys(this.definition);

    for (const field of this.definition.filterFields) {
      const formValue = rawValue[field.key];
      filter[field.key] = this.parseFieldValue(field, formValue);
    }

    return {
      facadeKey: requestKeys.facadeKey,
      searchKey: requestKeys.searchKey,
      filter,
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      sort: this.sort()
    };
  }

  private applyInitialFilter(initialFilter: Record<string, unknown> | null | undefined): void {
    if (!initialFilter) {
      return;
    }

    for (const field of this.definition.filterFields) {
      const candidateValue = initialFilter[field.key];
      if (candidateValue === null || candidateValue === undefined) {
        continue;
      }
      const valueAsString = String(candidateValue);
      this.form.controls[field.key]?.setValue(valueAsString);
    }
  }

  private parseFieldValue(
    field: QueryFilterField<any>,
    rawValue: string | undefined
  ): unknown {
    if (!rawValue) {
      return undefined;
    }

    if (field.type === 'number') {
      const parsedNumber = Number(rawValue);
      return Number.isNaN(parsedNumber) ? undefined : parsedNumber;
    }

    return rawValue.trim();
  }
}
