import { NgComponentOutlet } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Type, inject, signal } from '@angular/core';
import {ImsButton, ImsButtonDark, ImsButtonIcon} from '../ims-button';
import { ReadonlyDirective } from '../../shared/readonly.directive';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialogActions, ImsDialogTitle } from './ims-dialog-section';
import { ImsDialogSectionRegistry } from './ims-dialog-section-registry';
import {
  IBaseOutput,
  IMessage,
  IMS_DIALOG_CONFIG,
  IMS_DIALOG_READONLY,
  ImsDialogRuntimeConfig,
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
    ImsButtonDark,
    ImsButtonIcon,
    ImsDialogActions,
    ImsDialogTitle,
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
    return isBaseOutput(content) ? content : null;
  })();
  readonly effectiveSeverity =
    (this.baseOutput?.resultCode ?? 0) < 0 ? 'danger' : this.config.severity;
  readonly isMessageListContent = isMessageArray(this.config.content);
  readonly messages: readonly IMessage[] = (() => {
    const content = this.config.content;
    const messages = isBaseOutput(content)
      ? content.messages
      : isMessageArray(content)
        ? content
        : [];

    return [...messages].sort((first, second) => second.level - first.level);
  })();
  readonly textContent: readonly string[] = (() => {
    const content = this.config.content;

    if (typeof content === 'string') {
      return [content];
    }

    return isStringArray(content) ? content : [];
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

function isBaseOutput(content: unknown): content is IBaseOutput {
  if (typeof content !== 'object' || content === null || Array.isArray(content)) return false;

  const candidate = content as Partial<IBaseOutput>;
  return (
    typeof candidate.resultCode === 'number' &&
    typeof candidate.resultDesc === 'string' &&
    isMessageArray(candidate.messages)
  );
}

function isMessageArray(content: unknown): content is IMessage[] {
  return Array.isArray(content) && content.every(isMessage);
}

function isMessage(content: unknown): content is IMessage {
  if (typeof content !== 'object' || content === null) return false;

  const candidate = content as Partial<IMessage>;
  return typeof candidate.level === 'number' && typeof candidate.message === 'string';
}

function isStringArray(content: unknown): content is string[] {
  return Array.isArray(content) && content.every((item) => typeof item === 'string');
}
