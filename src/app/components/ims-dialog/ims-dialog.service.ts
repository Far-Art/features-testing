import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Directionality } from '@angular/cdk/bidi';
import { Overlay } from '@angular/cdk/overlay';
import { Injectable, Type, inject } from '@angular/core';
import { ImsDialogBuilder, ImsDialogBuilderHost } from './ims-dialog-builder';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialog } from './ims-dialog';
import {
  IMS_DIALOG_CONFIG,
  IMS_DIALOG_DATA,
  ImsDialogOpenOptions,
  ImsDialogRuntimeConfig,
  ImsDialogSeverity,
  resolveConfirmationLabels,
} from './ims-dialog.types';

const DEFAULT_ICONS: Record<ImsDialogSeverity, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  danger: 'error',
};

@Injectable({ providedIn: 'root' })
export class ImsDialogService implements ImsDialogBuilderHost {
  private readonly dialog = inject(Dialog);
  private readonly directionality = inject(Directionality);
  private readonly overlay = inject(Overlay);

  info<C = unknown>(component: Type<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(component, 'info');
  }

  success<C = unknown>(component: Type<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(component, 'success');
  }

  warning<C = unknown>(component: Type<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(component, 'warning');
  }

  danger<C = unknown>(component: Type<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(component, 'danger');
  }

  openFromBuilder(options: ImsDialogOpenOptions): ImsDialogRef<unknown> {
    const mergedData = mergeDialogData(options.config.data, options.data, options.hasData);
    const direction = options.config.direction ?? this.directionality.value;
    const runtimeConfig: ImsDialogRuntimeConfig = {
      severity: options.severity,
      mode: options.mode,
      component: options.component,
      title: options.title,
      icon: options.iconRequested ? (options.iconName ?? DEFAULT_ICONS[options.severity]) : null,
      confirmationLabels: options.confirmationLabels
        ? resolveConfirmationLabels(options.confirmationLabels)
        : null,
      data: mergedData,
      direction,
    };
    const callerConfig = options.config as unknown as DialogConfig<
      unknown,
      DialogRef<unknown, ImsDialog>
    >;
    const callerProviders = callerConfig.providers;
    let imsDialogRef: ImsDialogRef<unknown> | null = null;

    const config: DialogConfig<unknown, DialogRef<unknown, ImsDialog>> = {
      ...callerConfig,
      width: callerConfig.width ?? 'min(42rem, calc(100vw - 2rem))',
      maxWidth: callerConfig.maxWidth ?? 'calc(100vw - 2rem)',
      maxHeight: callerConfig.maxHeight ?? 'calc(100vh - 2rem)',
      scrollStrategy: callerConfig.scrollStrategy ?? this.overlay.scrollStrategies.noop(),
      direction,
      role: callerConfig.role ?? (options.mode === 'confirmation' ? 'alertdialog' : 'dialog'),
      ariaLabel: callerConfig.ariaLabel ?? (options.title || null),
      panelClass: [
        'ims-dialog-overlay',
        `ims-dialog-overlay--${options.severity}`,
        ...normalizePanelClass(callerConfig.panelClass),
      ],
      data: mergedData,
      providers: (dialogRef, dialogConfig, container) => {
        const resolvedCallerProviders =
          typeof callerProviders === 'function'
            ? callerProviders(dialogRef, dialogConfig, container)
            : (callerProviders ?? []);
        imsDialogRef = new ImsDialogRef(dialogRef, options.mode === 'confirmation');

        return [
          ...resolvedCallerProviders,
          { provide: ImsDialogRef, useValue: imsDialogRef },
          { provide: IMS_DIALOG_DATA, useValue: mergedData },
          { provide: IMS_DIALOG_CONFIG, useValue: runtimeConfig },
        ];
      },
    };

    const cdkDialogRef = this.dialog.open<unknown, unknown, ImsDialog>(ImsDialog, config);

    return imsDialogRef ?? new ImsDialogRef(cdkDialogRef, options.mode === 'confirmation');
  }

  private createBuilder<C>(
    component: Type<C> | null,
    severity: ImsDialogSeverity,
  ): ImsDialogBuilder<C> {
    return new ImsDialogBuilder(this, component, severity);
  }
}

function mergeDialogData(
  configData: unknown,
  builderData: unknown,
  hasBuilderData: boolean,
): unknown {
  if (!hasBuilderData) {
    return configData;
  }

  if (configData === undefined || configData === null) {
    return builderData;
  }

  if (!isMergeableData(configData) || !isMergeableData(builderData)) {
    throw new TypeError('Dialog data supplied through config() and data() must both be objects.');
  }

  return {
    ...configData,
    ...builderData,
  };
}

function isMergeableData(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePanelClass(panelClass: DialogConfig['panelClass']): string[] {
  if (!panelClass) {
    return [];
  }

  return Array.isArray(panelClass) ? panelClass : [panelClass];
}
