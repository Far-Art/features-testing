import { Observable, map } from 'rxjs';

interface DialogRefAdapter {
  readonly closed: Observable<unknown>;
  close(result?: unknown): void;
}

export class ImsDialogRef<R = unknown> {
  readonly closed: Observable<R>;

  constructor(
    private readonly dialogRef: DialogRefAdapter,
    confirmation: boolean,
  ) {
    this.closed = (
      confirmation ? dialogRef.closed.pipe(map((result) => Boolean(result))) : dialogRef.closed
    ) as Observable<R>;
  }

  close(result?: R): void {
    this.dialogRef.close(result);
  }
}
