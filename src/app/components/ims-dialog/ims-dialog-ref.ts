import { Observable, map } from 'rxjs';

interface DialogRefAdapter {
  readonly closed: Observable<unknown>;
  readonly overlayRef: {
    readonly overlayElement: HTMLElement;
  };
  close(result?: unknown): void;
}

export class ImsDialogRef<R = unknown> {
  /** CDK overlay pane element containing the dialog shell. */
  readonly panelElement: HTMLElement;

  readonly closed: Observable<R>;

  constructor(
    private readonly dialogRef: DialogRefAdapter,
    confirmation: boolean,
  ) {
    this.panelElement = dialogRef.overlayRef.overlayElement;
    this.closed = (
      confirmation ? dialogRef.closed.pipe(map((result) => Boolean(result))) : dialogRef.closed
    ) as Observable<R>;
  }

  close(result?: R): void {
    this.dialogRef.close(result);
  }
}
