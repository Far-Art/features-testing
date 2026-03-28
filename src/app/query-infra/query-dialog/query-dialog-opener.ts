import {Injectable, InjectionToken, Provider, Type, inject} from '@angular/core';
import {Dialog} from '@angular/cdk/dialog';
import {map, Observable} from 'rxjs';
import {AnyQueryDefinition, QuerySelectionResult} from '../query.models';
import {QueryDialog, QueryDialogData} from './query-dialog';
import {QueryDialogContract} from './query-dialog.contract';

export interface QueryDialogOpenRequest<TDialog extends QueryDialogContract = QueryDialogContract> {
  definition: AnyQueryDefinition;
  initialFilter?: Record<string, unknown> | null;
  pageSize: number;
  dialogType?: Type<TDialog>;
}

export interface QueryDialogOpener {
  open<TDialog extends QueryDialogContract = QueryDialogContract>(
    request: QueryDialogOpenRequest<TDialog>
  ): Observable<QuerySelectionResult<any, string> | null>;
}

@Injectable({providedIn: 'root'})
export class DefaultQueryDialogOpener implements QueryDialogOpener {
  private readonly dialog = inject(Dialog);

  open<TDialog extends QueryDialogContract = QueryDialogContract>(
    request: QueryDialogOpenRequest<TDialog>
  ): Observable<QuerySelectionResult<any, string> | null> {
    const dialogType = (request.dialogType ?? QueryDialog) as Type<TDialog>;

    const dialogRef = this.dialog.open<QuerySelectionResult<any, string> | null, QueryDialogData, TDialog>(
      dialogType,
      {
        minWidth: '920px',
        maxWidth: '96vw',
        data: {
          definition: request.definition,
          pageSize: request.pageSize,
          initialFilter: request.initialFilter ?? null
        }
      }
    );

    return dialogRef.closed.pipe(
      map((result) => result ?? null)
    );
  }
}

export const QUERY_DIALOG_OPENER = new InjectionToken<QueryDialogOpener>(
  'QUERY_DIALOG_OPENER',
  {
    providedIn: 'root',
    factory: () => inject(DefaultQueryDialogOpener)
  }
);

export function provideQueryDialogOpener(useClass: Type<QueryDialogOpener>): Provider {
  return {
    provide: QUERY_DIALOG_OPENER,
    useClass
  };
}
