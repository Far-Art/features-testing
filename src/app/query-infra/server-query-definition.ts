import {Provider, Type} from '@angular/core';
import {Observable} from 'rxjs';
import {
  QueryColumn,
  QueryDefinition,
  QueryFilterField,
  QueryRequest,
  QueryResultPage
} from './query.models';
import {QUERY_DEFINITIONS} from './query.registry';

type QueryFilterKey<TFilter extends object> = keyof TFilter & string;

export interface ServerQueryDefinitionConfig<TModel, TFilter extends Partial<TModel>> {
  key: string;
  facadeKey?: string;
  searchKey?: string;
  title: string;
  defaultSearchField?: QueryFilterKey<TFilter>;
  filterFields: readonly QueryFilterField<TFilter>[];
  columns: readonly QueryColumn<TModel>[];
  describeItem: (item: TModel) => string;
  search: (request: QueryRequest<TFilter>) => Observable<QueryResultPage<TModel>>;
}

export function createServerQueryDefinition<TModel, TFilter extends Partial<TModel>>(
  config: ServerQueryDefinitionConfig<TModel, TFilter>
): QueryDefinition<TModel, TFilter> {
  return {
    key: config.key,
    facadeKey: config.facadeKey ?? config.key,
    searchKey: config.searchKey ?? config.key,
    title: config.title,
    defaultSearchField: config.defaultSearchField,
    filterFields: config.filterFields,
    columns: config.columns,
    describeItem: config.describeItem,
    dataSource: {
      search: config.search
    }
  };
}

export interface ServerQueryDefinitionProviderConfig<
  TFacade,
  TModel,
  TFilter extends Partial<TModel>,
  TKey extends string = string
> {
  facade: Type<TFacade>;
  createDefinition: (facade: TFacade) => QueryDefinition<TModel, TFilter, TKey>;
}

export function provideServerQueryDefinition<
  TFacade,
  TModel,
  TFilter extends Partial<TModel>,
  TKey extends string = string
>(
  config: ServerQueryDefinitionProviderConfig<TFacade, TModel, TFilter, TKey>
): Provider[] {
  return [
    config.facade,
    {
      provide: QUERY_DEFINITIONS,
      multi: true,
      deps: [config.facade],
      useFactory: config.createDefinition
    }
  ];
}
