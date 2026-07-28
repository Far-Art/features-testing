import { DialogConfig } from '@angular/cdk/dialog';
import { InjectionToken, Type } from '@angular/core';

export type ImsDialogSeverity = 'info' | 'success' | 'warning' | 'danger';
export type ImsDialogMode = 'standard' | 'confirmation' | 'readonly';
export type ImsDialogConfirmationLabels =
  'yes_no' | 'approve_cancel' | { readonly yes: string; readonly no: string };

export interface ImsDialogResolvedConfirmationLabels {
  readonly yes: string;
  readonly no: string;
}

export interface ImsDialogRuntimeConfig<D = unknown> {
  readonly severity: ImsDialogSeverity;
  readonly mode: ImsDialogMode;
  readonly component: Type<unknown> | null;
  readonly title: string;
  readonly icon: string | null;
  readonly confirmationLabels: ImsDialogResolvedConfirmationLabels | null;
  readonly data: D;
  readonly direction: 'ltr' | 'rtl';
}

export interface ImsDialogOpenOptions {
  readonly severity: ImsDialogSeverity;
  readonly component: Type<unknown> | null;
  readonly title: string;
  readonly iconRequested: boolean;
  readonly iconName: string | null;
  readonly mode: ImsDialogMode;
  readonly confirmationLabels: ImsDialogConfirmationLabels | null;
  readonly data: unknown;
  readonly hasData: boolean;
  readonly config: DialogConfig<unknown>;
}

export const IMS_DIALOG_DATA = new InjectionToken<unknown>('IMS_DIALOG_DATA');

export const IMS_DIALOG_CONFIG = new InjectionToken<ImsDialogRuntimeConfig>('IMS_DIALOG_CONFIG');

export function resolveConfirmationLabels(
  labels: ImsDialogConfirmationLabels,
): ImsDialogResolvedConfirmationLabels {
  if (labels === 'yes_no') {
    return { yes: 'Yes', no: 'No' };
  }

  if (labels === 'approve_cancel') {
    return { yes: 'Approve', no: 'Cancel' };
  }

  return labels;
}
