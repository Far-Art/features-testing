import {InjectionToken} from '@angular/core';

export type ImsSnackbarHorizontalPosition = 'start' | 'center' | 'end';
export type ImsSnackbarVerticalPosition = 'top' | 'bottom';
export type ImsSnackbarDirection = 'ltr' | 'rtl';
export type ImsSnackbarPoliteness = 'off' | 'polite' | 'assertive';

export interface ImsSnackbarConfig<D = unknown> {
    readonly duration?: number;
    readonly horizontalPosition?: ImsSnackbarHorizontalPosition;
    readonly verticalPosition?: ImsSnackbarVerticalPosition;
    readonly direction?: ImsSnackbarDirection;
    readonly panelClass?: string | readonly string[];
    readonly politeness?: ImsSnackbarPoliteness;
    readonly data?: D;
}

export interface ImsSnackbarDismiss {
    readonly dismissedByAction: boolean;
}

export const IMS_SNACKBAR_DATA = new InjectionToken<unknown>('IMS_SNACKBAR_DATA');

export const IMS_SNACKBAR_CONFIG = new InjectionToken<Required<
    Omit<ImsSnackbarConfig, 'panelClass' | 'data'>
> & Pick<ImsSnackbarConfig, 'panelClass' | 'data'>>('IMS_SNACKBAR_CONFIG');
