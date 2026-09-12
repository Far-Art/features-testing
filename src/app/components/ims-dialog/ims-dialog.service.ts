import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Directionality } from '@angular/cdk/bidi';
import { Overlay } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import {
  ImsDialogBuilder,
  ImsDialogBuilderHost,
  ImsDialogErrorBuilder,
} from './ims-dialog-builder';
import { ImsDialogRef } from './ims-dialog-ref';
import { ImsDialogShell } from './ims-dialog-shell';
import {
  IBaseOutput,
  IMessage,
  IMS_DIALOG_CONFIG,
  IMS_DIALOG_DATA,
  ImsDialogContentType,
  ImsDialogOpenOptions,
  ImsDialogRuntimeConfig,
  ImsDialogSeverity,
  isImsDialogBaseOutput,
  isImsDialogMessageArray,
  isImsDialogStringArray,
  resolveConfirmationLabels,
} from './ims-dialog.types';

const DEFAULT_ERROR_TITLE = 'תקלה';

const DEFAULT_ERROR_TEXT = 'אירעה שגיאה בלתי צפויה.';

/** One reposition per frame is enough to keep an inside dialog on its boundary. */
const SCROLL_THROTTLE_MS = 16;

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

  /**
   * Opens a danger dialog for a value of unknown shape.
   *
   * Intended for `catch` blocks and error callbacks, where the caught value is
   * typed `any` or `unknown` and cannot be narrowed at the call site. A value
   * the shell already renders is used unchanged; an `Error`, an
   * `HttpErrorResponse`, or any other object carrying a string `message` is
   * reduced to that text, and anything else falls back to a generic message.
   *
   * The title defaults to `תקלה`; a later `title()` call replaces it, and an
   * empty title opens the dialog without a title row.
   *
   * @param error Thrown, rejected, or returned value describing the failure.
   * @returns A reduced builder without the data, confirmation, and readonly
   * options, which an error dialog cannot use.
   */
  error(error: unknown): ImsDialogErrorBuilder {
    return this.createBuilder<never>(resolveErrorContent(error), 'danger').title(
      DEFAULT_ERROR_TITLE,
    );
  }

  openFromBuilder(options: ImsDialogOpenOptions): ImsDialogRef<unknown> {
    const confirmationMode = isConfirmationMode(options.mode);
    const readonlyState = signal(isReadonlyMode(options.mode));
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
      icon: options.iconRequested
        ? (options.iconName ?? DEFAULT_ICONS[options.severity])
        : resolveDefaultIcon(options.severity, options.title),
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
          ? this.overlay.scrollStrategies.reposition({ scrollThrottle: SCROLL_THROTTLE_MS })
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

function resolveDefaultIcon(severity: ImsDialogSeverity, title: string): string | null {
  if (severity === 'info' || !title) {
    return null;
  }

  return DEFAULT_ICONS[severity];
}

function resolveErrorContent(error: unknown): ImsDialogContentType<never> {
  if (isRenderableContent(error)) {
    return error;
  }

  if (isHttpErrorLike(error) && isRenderableContent(error.error)) {
    return error.error;
  }

  return readErrorText(error) || DEFAULT_ERROR_TEXT;
}

function isRenderableContent(
  value: unknown,
): value is IBaseOutput | IMessage[] | string[] | string {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0 && (isImsDialogStringArray(value) || isImsDialogMessageArray(value));
  }

  return isImsDialogBaseOutput(value);
}

function isHttpErrorLike(value: unknown): value is { status: number; error: unknown } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof (value as { status?: unknown }).status === 'number' && 'error' in value;
}

function readErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim() || error.name;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown };
    return typeof candidate.message === 'string' ? candidate.message.trim() : '';
  }

  return typeof error === 'number' || typeof error === 'boolean' ? String(error) : '';
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
