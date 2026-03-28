import {delay, of} from 'rxjs';
import {
  QueryColumn,
  QueryDataSource,
  QueryDefinition,
  QueryFilterField,
  QueryRequest,
  QueryResultPage
} from './query.models';

type QueryFilterKey<TFilter extends object> = keyof TFilter & string;

export interface SimpleQueryDefinitionConfig<
  TModel extends object,
  TFilter extends Partial<TModel>,
  TKey extends string = string
> {
  key: TKey;
  facadeKey?: string;
  searchKey?: string;
  title: string;
  defaultSearchField?: QueryFilterKey<TFilter>;
  sourceData: readonly TModel[];
  searchableFields?: readonly QueryFilterKey<TFilter>[];
  filterFields: readonly QueryFilterField<TFilter>[];
  columns: readonly QueryColumn<TModel>[];
  describeItem: (item: TModel) => string;
  delayMs?: number;
}

export function createSimpleQueryDefinition<
  TModel extends object,
  TFilter extends Partial<TModel>,
  TKey extends string = string
>(
  config: SimpleQueryDefinitionConfig<TModel, TFilter, TKey>
): QueryDefinition<TModel, TFilter, TKey> {
  const searchableFields = config.searchableFields ?? config.filterFields.map((field) => field.key);
  const sortableFields = config.columns
    .filter((column) => column.sortable !== false)
    .map((column) => column.key);

  return {
    key: config.key,
    facadeKey: config.facadeKey ?? config.key,
    searchKey: config.searchKey ?? config.key,
    title: config.title,
    defaultSearchField: config.defaultSearchField,
    filterFields: config.filterFields,
    columns: config.columns,
    describeItem: config.describeItem,
    dataSource: createContainsDataSource(
      config.sourceData,
      searchableFields,
      sortableFields,
      config.delayMs ?? 0
    )
  };
}

function createContainsDataSource<
  TModel extends object,
  TFilter extends Partial<TModel>
>(
  sourceData: readonly TModel[],
  searchableFields: readonly QueryFilterKey<TFilter>[],
  sortableFields: readonly string[],
  delayMs: number
): QueryDataSource<TModel, TFilter> {
  return {
    search: (request: QueryRequest<TFilter>) => {
      const filtered = sourceData.filter((item) =>
        searchableFields.every((fieldKey) => matchesFilter(item, request.filter, fieldKey))
      );
      const sorted = sortData(filtered, request.sort, sortableFields);

      const pagedResult = createPagedResult(sorted, request);
      const response$ = of(pagedResult);
      return delayMs > 0 ? response$.pipe(delay(delayMs)) : response$;
    }
  };
}

function matchesFilter<
  TModel extends object,
  TFilter extends Partial<TModel>
>(
  item: TModel,
  filter: TFilter,
  fieldKey: keyof TFilter & string
): boolean {
  const filterRecord = filter as Record<string, unknown>;
  const itemRecord = item as Record<string, unknown>;

  const filterValue = normalizeValue(filterRecord[fieldKey]);
  if (!filterValue) {
    return true;
  }

  const itemValue = normalizeValue(itemRecord[fieldKey]);
  return itemValue.includes(filterValue);
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

function createPagedResult<TModel, TFilter extends object>(
  source: readonly TModel[],
  request: QueryRequest<TFilter>
): QueryResultPage<TModel> {
  const startIndex = request.pageIndex * request.pageSize;
  const endIndex = startIndex + request.pageSize;
  return {
    items: source.slice(startIndex, endIndex),
    total: source.length
  };
}

function sortData<TModel extends object>(
  source: readonly TModel[],
  sort: QueryRequest<any>['sort'],
  sortableFields: readonly string[]
): readonly TModel[] {
  const sortField = sort?.field ?? null;
  if (!sortField || !sortableFields.includes(sortField)) {
    return source;
  }

  const direction = sort?.direction === 'DESC' ? -1 : 1;

  return [...source].sort((left, right) => {
    const leftValue = normalizeSortValue((left as Record<string, unknown>)[sortField]);
    const rightValue = normalizeSortValue((right as Record<string, unknown>)[sortField]);

    if (leftValue < rightValue) {
      return -1 * direction;
    }
    if (leftValue > rightValue) {
      return 1 * direction;
    }
    return 0;
  });
}

function normalizeSortValue(value: unknown): string | number {
  if (typeof value === 'number') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().toLowerCase();
}
