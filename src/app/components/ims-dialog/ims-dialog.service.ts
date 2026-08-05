import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Directionality } from '@angular/cdk/bidi';
import { Overlay } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, effect, inject, signal } from '@angular/core';
import { ImsDialogBuilder, ImsDialogBuilderHost } from './ims-dialog-builder';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialogShell } from './ims-dialog-shell';
import {
  IMS_DIALOG_CONFIG,
  IMS_DIALOG_DATA,
  ImsDialogContentType,
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
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  info<C = unknown>(content: ImsDialogContentType<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(content, 'info');
  }

  success<C = unknown>(content: ImsDialogContentType<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(content, 'success');
  }

  warning<C = unknown>(content: ImsDialogContentType<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(content, 'warning');
  }

  danger<C = unknown>(content: ImsDialogContentType<C> | null = null): ImsDialogBuilder<C> {
    return this.createBuilder(content, 'danger');
  }

  openFromBuilder(options: ImsDialogOpenOptions): ImsDialogRef<unknown> {
    const confirmationMode = isConfirmationMode(options.mode);
    const initialReadonlyState = resolveReadonlyState(options);
    const readonlyState = signal(initialReadonlyState);
    const mergedData = mergeDialogData(options.config.data, options.data, options.hasData);
    const direction = options.config.direction ?? this.directionality.value;
    const requestedInsideBoundary =
      options.insideClassName !== null ? this.resolveInsideBoundary(options.insideClassName) : null;
    const insideSize = requestedInsideBoundary
      ? this.measureInsideBoundary(requestedInsideBoundary)
      : null;
    const insideBoundary = insideSize ? requestedInsideBoundary : null;
    const runtimeConfig: ImsDialogRuntimeConfig = {
      severity: options.severity,
      mode: options.mode,
      readonlySignal: readonlyState,
      content: options.content,
      title: options.title,
      icon: options.iconRequested ? (options.iconName ?? DEFAULT_ICONS[options.severity]) : null,
      confirmationLabels: options.confirmationLabels
        ? resolveConfirmationLabels(options.confirmationLabels)
        : null,
      data: mergedData,
      direction,
      dragBoundary: insideBoundary ?? '.cdk-overlay-container',
      maxSurfaceHeight: insideSize?.height ?? null,
    };
    const callerConfig = options.config as unknown as DialogConfig<
      unknown,
      DialogRef<unknown, ImsDialogShell>
    >;
    const callerProviders = callerConfig.providers;
    let imsDialogRef: ImsDialogRef<unknown> | null = null;

    const config: DialogConfig<unknown, DialogRef<unknown, ImsDialogShell>> = {
      ...callerConfig,
      width: callerConfig.width ?? 'min(30rem, calc(100vw - 2rem))',
      maxWidth: insideSize
        ? `${insideSize.width}px`
        : (callerConfig.maxWidth ?? 'calc(100vw - 2rem)'),
      maxHeight: insideSize
        ? `${insideSize.height}px`
        : (callerConfig.maxHeight ?? 'calc(100vh - 2rem)'),
      positionStrategy: insideBoundary
        ? this.overlay
            .position()
            .flexibleConnectedTo(insideBoundary)
            .withPositions([
              {
                originX: 'center',
                originY: 'center',
                overlayX: 'center',
                overlayY: 'center',
              },
            ])
            .withFlexibleDimensions(false)
            .withPush(false)
            .withLockedPosition()
        : callerConfig.positionStrategy,
      scrollStrategy:
        callerConfig.scrollStrategy ??
        (insideBoundary
          ? this.overlay.scrollStrategies.reposition()
          : this.overlay.scrollStrategies.noop()),
      hasBackdrop: insideBoundary ? false : (callerConfig.hasBackdrop ?? true),
      direction,
      role: callerConfig.role ?? (confirmationMode ? 'alertdialog' : 'dialog'),
      ariaLabel: callerConfig.ariaLabel ?? (options.title || null),
      panelClass: [
        'ims-dialog-overlay',
        `ims-dialog-overlay--${options.severity}`,
        ...(insideBoundary ? ['ims-dialog-overlay--inside'] : []),
        ...normalizePanelClass(callerConfig.panelClass),
      ],
      data: mergedData,
      providers: (dialogRef, dialogConfig, container) => {
        const resolvedCallerProviders =
          typeof callerProviders === 'function'
            ? callerProviders(dialogRef, dialogConfig, container)
            : (callerProviders ?? []);
        imsDialogRef = new ImsDialogRef(dialogRef, confirmationMode, readonlyState);

        return [
          ...resolvedCallerProviders,
          { provide: ImsDialogRef, useValue: imsDialogRef },
          { provide: IMS_DIALOG_DATA, useValue: mergedData },
          { provide: IMS_DIALOG_CONFIG, useValue: runtimeConfig },
        ];
      },
    };

    const cdkDialogRef = this.dialog.open<unknown, unknown, ImsDialogShell>(ImsDialogShell, config);

    if (options.readonlySignal) {
      let previousSourceState = initialReadonlyState;
      const readonlyStateEffect = effect(
        () => {
          const sourceState = resolveReadonlyState(options);

          if (sourceState !== previousSourceState) {
            previousSourceState = sourceState;
            readonlyState.set(sourceState);
          }
        },
        {
          injector: this.injector,
          manualCleanup: true,
          allowSignalWrites: true,
        },
      );

      cdkDialogRef.closed.subscribe({
        complete: () => readonlyStateEffect.destroy(),
      });
    }

    return imsDialogRef ?? new ImsDialogRef(cdkDialogRef, confirmationMode, readonlyState);
  }

  private resolveInsideBoundary(className: string): HTMLElement | null {
    if (!className || /\s/.test(className)) {
      console.error(
        'Dialog inside boundary must be a single class name. Falling back to the viewport boundary.',
      );
      return null;
    }

    const element = this.document.body.getElementsByClassName(className).item(0);
    const htmlElementType = this.document.defaultView?.HTMLElement;

    if (!element || !htmlElementType || !(element instanceof htmlElementType)) {
      console.error(
        `Dialog inside boundary ".${className}" was not found inside body. Falling back to the viewport boundary.`,
      );
      return null;
    }

    return element;
  }

  private measureInsideBoundary(boundary: HTMLElement): { width: number; height: number } | null {
    const { width, height } = boundary.getBoundingClientRect();
    const inset = 16;
    const availableWidth = Math.floor(width - inset * 2);
    const availableHeight = Math.floor(height - inset * 2);

    if (availableWidth <= 0 || availableHeight <= 0) {
      console.error(
        'Dialog inside boundary must have a visible width and height. Falling back to the viewport boundary.',
      );
      return null;
    }

    return {
      width: availableWidth,
      height: availableHeight,
    };
  }

  private createBuilder<C>(
    content: ImsDialogContentType<C> | null,
    severity: ImsDialogSeverity,
  ): ImsDialogBuilder<C> {
    return new ImsDialogBuilder(this, content, severity);
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

function isConfirmationMode(mode: ImsDialogOpenOptions['mode']): boolean {
  return mode === 'confirmation' || mode === 'confirmation-readonly';
}

function isReadonlyMode(mode: ImsDialogOpenOptions['mode']): boolean {
  return mode === 'readonly' || mode === 'confirmation-readonly';
}

function resolveReadonlyState(options: ImsDialogOpenOptions): boolean {
  return isReadonlyMode(options.mode) && (options.readonlySignal?.() ?? true);
}
