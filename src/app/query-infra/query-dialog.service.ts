import {Injectable, Injector, Type, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {QuerySelectionResult} from './query.models';
import {QueryRegistryService} from './query.registry';
import {QUERY_DIALOG_OPENER} from './query-dialog/query-dialog-opener';
import {QueryDialogContract} from './query-dialog/query-dialog.contract';

@Injectable({providedIn: 'root'})
export class QueryDialogService {
  private readonly registry = inject(QueryRegistryService);
  private readonly dialogOpener = inject(QUERY_DIALOG_OPENER);

  open(
    queryKey: string,
    scopeInjector?: Injector,
    initialFilter?: Record<string, unknown>,
    dialogType?: Type<QueryDialogContract>
  ): Observable<QuerySelectionResult<any, string> | null> {
    const definition = this.registry.getDefinition(queryKey, scopeInjector);
    return this.dialogOpener.open({
      definition,
      pageSize: 8,
      initialFilter: initialFilter ?? null,
      dialogType
    });
  }
}
