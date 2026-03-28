import {WritableSignal} from '@angular/core';
import {QueryDefinition, QuerySelectionResult} from './query.models';

export interface QueryComponentContract<
  TItem,
  TFilter extends Partial<TItem> = Partial<TItem>,
  TKey extends string = string
> {
  readonly definition: QueryDefinition<TItem, TFilter, TKey>;
  readonly selectedItem: WritableSignal<TItem | null>;
  onSelected(result: QuerySelectionResult<TItem, string>): void;
}
