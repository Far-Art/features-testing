import {Signal} from '@angular/core';
import {AnyQueryDefinition} from '../query.models';

export interface QueryDialogPaginationContract {
  readonly pageIndex: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly pageCount: Signal<number>;
  readonly canGoPrev: Signal<boolean>;
  readonly canGoNext: Signal<boolean>;

  goBack(): void;
  goNext(): void;
  goFirst(): void;
  goLast(): void;
  goPage(pageNumber: number): void;
}

export interface QueryDialogContract extends QueryDialogPaginationContract {
  readonly definition: AnyQueryDefinition;
  executeSearch(resetToFirstPage?: boolean): void;
  clear(): void;
  confirmSelection(): void;
  cancel(): void;
}
