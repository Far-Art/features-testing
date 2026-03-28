import {Observable} from 'rxjs';

export type QueryDirection = 'ASC' | 'DESC';

export interface QuerySort {
  field?: string | null;
  direction: QueryDirection;
}

export interface QueryRequest<TFilter> {
  facadeKey: string;
  searchKey: string;
  filter: TFilter;
  pageIndex: number;
  pageSize: number;
  sort?: QuerySort | null;
}

export interface QueryResultPage<TModel> {
  items: readonly TModel[];
  total: number;
}

export interface QueryDataSource<TModel, TFilter extends Partial<TModel> = Partial<TModel>> {
  search(request: QueryRequest<TFilter>): Observable<QueryResultPage<TModel>>;
}

export interface QueryColumn<TModel> {
  key: string;
  header: string;
  value: (row: TModel) => string | number;
  sortable?: boolean;
}

export interface QueryFilterField<TFilter extends object> {
  key: keyof TFilter & string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number';
}

export interface QueryDefinition<
  TModel,
  TFilter extends Partial<TModel> = Partial<TModel>,
  TKey extends string = string
> {
  key: TKey;
  facadeKey?: string;
  searchKey?: string;
  title: string;
  defaultSearchField?: keyof TFilter & string;
  filterFields: readonly QueryFilterField<TFilter>[];
  columns: readonly QueryColumn<TModel>[];
  dataSource: QueryDataSource<TModel, TFilter>;
  describeItem: (item: TModel) => string;
}

export type AnyQueryDefinition = QueryDefinition<any, any, string>;

export interface QuerySelectionResult<TItem = unknown, TKey extends string = string> {
  key: TKey;
  item: TItem;
  display: string;
}

export interface QueryRequestKeys {
  facadeKey: string;
  searchKey: string;
}

export function resolveQueryRequestKeys(
  definition: Pick<AnyQueryDefinition, 'key' | 'facadeKey' | 'searchKey'>
): QueryRequestKeys {
  const fallbackKey = definition.key;
  const facadeKey = normalizeKey(definition.facadeKey) ?? fallbackKey;
  const searchKey = normalizeKey(definition.searchKey) ?? fallbackKey;

  return {facadeKey, searchKey};
}

function normalizeKey(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
