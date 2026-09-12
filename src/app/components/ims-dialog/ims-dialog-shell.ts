import { NgComponentOutlet } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, ElementRef, Type, inject } from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../ims-button';
import {ImsIcon} from '../ims-icon';
import { ReadonlyDirective } from '../../shared/readonly.directive';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialogActions, ImsDialogTitle } from './ims-dialog-section';
import { ImsDialogSectionRegistry } from './ims-dialog-section-registry';
import {
  IMS_DIALOG_CONFIG,
  IMS_DIALOG_READONLY,
  ImsDialogRuntimeConfig,
  isImsDialogBaseOutput,
  isImsDialogMessageArray,
  isImsDialogStringArray,
} from './ims-dialog.types';

type ImsDialogMessageStyle = 'danger' | 'info' | 'warning';

/** A message with its style and icon already resolved from its level. */
interface ImsDialogMessageRow {
  readonly message: string;
  readonly style: ImsDialogMessageStyle;
  readonly icon: string;
}

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
    '[class.ims-dialog--confirmation]': 'confirmationMode && !readonlyMode()',
    '[class.ims-dialog--readonly]': 'readonlyMode()',
  },
})
export class ImsDialogShell {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly config = inject(IMS_DIALOG_CONFIG) as ImsDialogRuntimeConfig;
  readonly dialogRef = inject(ImsDialogRef);
  readonly sections = inject(ImsDialogSectionRegistry);
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
  // A row's level never changes, so its style and icon are resolved here once.
  // Resolving them per binding cost five calls per row on every check of this
  // view, and this view is checked whenever anything inside the dialog emits.
  readonly messageRows: readonly ImsDialogMessageRow[] = (() => {
    const content = this.config.content;
    const messages = isImsDialogBaseOutput(content)
      ? content.messages
      : isImsDialogMessageArray(content)
        ? content
        : [];

    return [...messages]
      .sort((first, second) => second.level - first.level)
      .map((message) => {
        const style = resolveMessageStyle(message.level);
        return { message: message.message, style, icon: resolveMessageIcon(style) };
      });
  })();
  readonly textContent: readonly string[] = (() => {
    const content = this.config.content;

    if (typeof content === 'string') {
      return [content];
    }

    return isImsDialogStringArray(content) ? content : [];
  })();

  constructor() {
    const host = this.hostElement.nativeElement;
    host.classList.add(`ims-dialog--${this.effectiveSeverity}`);

    const maxSurfaceHeight = this.config.maxSurfaceHeight;
    if (maxSurfaceHeight !== null) {
      host.style.setProperty('--ims-dialog-max-surface-height', `${maxSurfaceHeight}px`);
    }
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

function resolveMessageStyle(level: number): ImsDialogMessageStyle {
  if (level >= 3) return 'danger';
  if (level === 2) return 'warning';
  return 'info';
}

function resolveMessageIcon(style: ImsDialogMessageStyle): string {
  if (style === 'danger') return 'error';
  if (style === 'warning') return 'warning';
  return 'info';
}
