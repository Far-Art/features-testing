import { NgComponentOutlet } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialogActions, ImsDialogContent, ImsDialogTitle } from './ims-dialog-section';
import { ImsDialogSectionRegistry } from './ims-dialog-section-registry';
import { IMS_DIALOG_CONFIG, ImsDialogRuntimeConfig } from './ims-dialog.types';

/**
 * Internal CDK dialog shell.
 *
 * Configuration and results are provided through injection tokens and
 * `ImsDialogRef`; this component exposes no Angular inputs or outputs.
 */
@Component({
  selector: 'ims-dialog',
  standalone: true,
  imports: [
    CdkDrag,
    CdkDragHandle,
    ImsDialogActions,
    ImsDialogContent,
    ImsDialogTitle,
    NgComponentOutlet,
  ],
  providers: [ImsDialogSectionRegistry],
  templateUrl: './ims-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-dialog',
    '[attr.dir]': 'config.direction',
    '[class.ims-dialog--info]': 'config.severity === "info"',
    '[class.ims-dialog--success]': 'config.severity === "success"',
    '[class.ims-dialog--warning]': 'config.severity === "warning"',
    '[class.ims-dialog--danger]': 'config.severity === "danger"',
    '[class.ims-dialog--confirmation]': 'config.mode === "confirmation"',
    '[class.ims-dialog--readonly]': 'config.mode === "readonly"',
    '[class.ims-dialog--ready]': 'ready()',
  },
})
export class ImsDialog {
  readonly config = inject(IMS_DIALOG_CONFIG) as ImsDialogRuntimeConfig;
  readonly dialogRef = inject(ImsDialogRef);
  readonly sections = inject(ImsDialogSectionRegistry);
  readonly ready = signal(false);

  constructor() {
    queueMicrotask(() => {
      queueMicrotask(() => this.ready.set(true));
    });
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  reject(): void {
    this.dialogRef.close(false);
  }

  close(): void {
    this.dialogRef.close();
  }
}
