import { DialogConfig } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { InjectionToken, Signal } from '@angular/core';

export type ImsDialogSeverity = 'info' | 'success' | 'warning' | 'danger';
export type ImsDialogMode = 'standard' | 'confirmation' | 'readonly' | 'confirmation-readonly';
/** Structured, component, message, or text content accepted by dialog severity methods. */
export type ImsDialogContentType<C = unknown> =
  | ComponentType<C>
  | IBaseOutput
  | IMessage[]
  | string[]
  | string;
export type ImsDialogConfirmationLabels =
  'yes_no' | 'approve_cancel' | { readonly yes: string; readonly no: string };

/** Structured result content rendered by the dialog shell. */
export interface IBaseOutput {
  resultCode: number;
  resultDesc: string;
  messages: IMessage[];
}

export interface IMessage {
  level: number;
  message: string;
}

export interface ImsDialogResolvedConfirmationLabels {
  readonly yes: string;
  readonly no: string;
}

export interface ImsDialogRuntimeConfig<D = unknown> {
  readonly severity: ImsDialogSeverity;
  readonly mode: ImsDialogMode;
  readonly readonlySignal: Signal<boolean> | null;
  readonly content: ImsDialogContentType | null;
  readonly title: string;
  readonly icon: string | null;
  readonly confirmationLabels: ImsDialogResolvedConfirmationLabels | null;
  readonly data: D;
  readonly direction: 'ltr' | 'rtl';
  readonly dragBoundary: HTMLElement | string;
  readonly maxSurfaceHeight: number | null;
}

export interface ImsDialogOpenOptions {
  readonly severity: ImsDialogSeverity;
  readonly content: ImsDialogContentType | null;
  readonly title: string;
  readonly iconRequested: boolean;
  readonly iconName: string | null;
  readonly mode: ImsDialogMode;
  readonly readonlySignal: Signal<boolean> | null;
  readonly confirmationLabels: ImsDialogConfirmationLabels | null;
  readonly data: unknown;
  readonly hasData: boolean;
  readonly insideClassName: string | null;
  readonly config: DialogConfig<unknown>;
}

export const IMS_DIALOG_DATA = new InjectionToken<unknown>('IMS_DIALOG_DATA');

export const IMS_DIALOG_CONFIG = new InjectionToken<ImsDialogRuntimeConfig>('IMS_DIALOG_CONFIG');

export function resolveConfirmationLabels(
  labels: ImsDialogConfirmationLabels,
): ImsDialogResolvedConfirmationLabels {
  if (labels === 'yes_no') {
    return { yes: 'כן', no: 'לא' };
  }

  if (labels === 'approve_cancel') {
    return { yes: 'אשר', no: 'בטל' };
  }

  return labels;
}
