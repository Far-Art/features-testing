import { NgComponentOutlet } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Type, inject, signal } from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../ims-button';
import {ImsIcon} from '../ims-icon';
import { ReadonlyDirective } from '../../shared/readonly.directive';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialogActions, ImsDialogTitle } from './ims-dialog-section';
import { ImsDialogSectionRegistry } from './ims-dialog-section-registry';
import {
  IMessage,
  IMS_DIALOG_CONFIG,
  IMS_DIALOG_READONLY,
  ImsDialogRuntimeConfig,
  isImsDialogBaseOutput,
  isImsDialogMessageArray,
  isImsDialogStringArray,
} from './ims-dialog.types';

type ImsDialogMessageStyle = 'danger' | 'info' | 'warning';

/**
 * Internal CDK dialog shell.
 *
 * Configuration and results are provided through injection tokens and
 * `ImsDialogRef`; this component exposes no Angular inputs or outputs.
 */
@Component({
  selector: 'ims-dialog-shell',
  standalone: true,
  imports: [
    CdkDrag,
    CdkDragHandle,
    ImsButtonIcon,
    ImsDialogActions,
    ImsDialogTitle,
    ImsIcon,
    NgComponentOutlet,
    ReadonlyDirective,
    ImsButton,
  ],
  providers: [
    ImsDialogSectionRegistry,
    {
      provide: IMS_DIALOG_READONLY,
      useFactory: () => inject(IMS_DIALOG_CONFIG).readonlySignal,
    },
  ],
  templateUrl: './ims-dialog-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-dialog',
    '[attr.dir]': 'config.direction',
    '[class.ims-dialog--info]': 'effectiveSeverity === "info"',
    '[class.ims-dialog--success]': 'effectiveSeverity === "success"',
    '[class.ims-dialog--warning]': 'effectiveSeverity === "warning"',
    '[class.ims-dialog--danger]': 'effectiveSeverity === "danger"',
    '[class.ims-dialog--confirmation]': 'confirmationMode && !readonlyMode()',
    '[class.ims-dialog--readonly]': 'readonlyMode()',
    '[class.ims-dialog--ready]': 'ready()',
  },
})
export class ImsDialogShell {
  readonly config = inject(IMS_DIALOG_CONFIG) as ImsDialogRuntimeConfig;
  readonly dialogRef = inject(ImsDialogRef);
  readonly sections = inject(ImsDialogSectionRegistry);
  readonly ready = signal(false);
  readonly confirmationMode =
    this.config.mode === 'confirmation' || this.config.mode === 'confirmation-readonly';
  readonly readonlyMode = this.config.readonlySignal;
  readonly contentComponentType = (() => {
    const content = this.config.content;
    return typeof content === 'function' ? (content as Type<unknown>) : null;
  })();
  readonly baseOutput = (() => {
    const content = this.config.content;
    return isImsDialogBaseOutput(content) ? content : null;
  })();
  readonly effectiveSeverity =
    (this.baseOutput?.resultCode ?? 0) < 0 ? 'danger' : this.config.severity;
  readonly isMessageListContent = isImsDialogMessageArray(this.config.content);
  readonly messages: readonly IMessage[] = (() => {
    const content = this.config.content;
    const messages = isImsDialogBaseOutput(content)
      ? content.messages
      : isImsDialogMessageArray(content)
        ? content
        : [];

    return [...messages].sort((first, second) => second.level - first.level);
  })();
  readonly textContent: readonly string[] = (() => {
    const content = this.config.content;

    if (typeof content === 'string') {
      return [content];
    }

    return isImsDialogStringArray(content) ? content : [];
  })();

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

  messageStyle(level: number): ImsDialogMessageStyle {
    if (level >= 3) return 'danger';
    if (level === 2) return 'warning';
    return 'info';
  }

  messageIcon(level: number): string {
    const style = this.messageStyle(level);
    if (style === 'danger') return 'error';
    if (style === 'warning') return 'warning';
    return 'info';
  }
}
