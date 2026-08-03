import { WritableSignal, signal } from '@angular/core';
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
    private readonly readonlyState: WritableSignal<boolean> = signal(false),
  ) {
    this.panelElement = dialogRef.overlayRef.overlayElement;
    this.closed = (
      confirmation ? dialogRef.closed.pipe(map((result) => Boolean(result))) : dialogRef.closed
    ) as Observable<R>;
  }

  close(result?: R): void {
    this.dialogRef.close(result);
  }

  /**
   * Updates the dialog's live readonly state.
   *
   * Readonly affects the dialog content and generated actions while leaving
   * the title, toolbar, and close control interactive.
   */
  setReadonly(state = true): void {
    this.readonlyState.set(state);
  }
}
