import { Directive, inject } from '@angular/core';
import { ImsDialogRef } from './ims-dialog-ref';
import { IMS_DIALOG_DATA, ImsDialogOnDismiss } from './ims-dialog.types';

/**
 * Injection-aware base directive for components rendered inside an IMS dialog.
 *
 * Extend this class to receive typed dialog data and the dedicated dialog
 * reference without repeating injection boilerplate.
 *
 * @typeParam Data - Value injected through `IMS_DIALOG_DATA`.
 * @typeParam Result - Optional value accepted when closing the dialog.
 */
@Directive()
export abstract class ImsAbstractDialog<Data = unknown, Result = unknown>
  implements ImsDialogOnDismiss<Result>
{
  /** Data resolved from the builder and CDK dialog configuration. */
  readonly dialogData = inject(IMS_DIALOG_DATA) as Data;

  /** Reference controlling the current dialog and exposing its closed stream. */
  readonly dialogRef = inject(ImsDialogRef) as ImsDialogRef<Result>;

  /**
   * Closes the current dialog with an optional typed result.
   *
   * @param result Value forwarded to `ImsDialogRef.close()`.
   */
  closeDialog(result?: Result): void {
    this.dialogRef.close(result);
  }

  /**
   * Supplies the result of a close without a value.
   *
   * The dialog calls it when it is dismissed: through the X control, the
   * generated Close action, Escape, a backdrop click, or `closeDialog()`
   * without a result. Override it to close with a value instead of
   * `undefined`.
   *
   * @returns `undefined`, which closes the dialog without a result.
   */
  onDismiss(): Result | undefined {
    return undefined;
  }
}
