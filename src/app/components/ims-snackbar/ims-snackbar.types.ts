import {InjectionToken, Provider, Type} from '@angular/core';
import {Observable} from 'rxjs';

export type ImsSnackbarHorizontalPosition = 'start' | 'center' | 'end';
export type ImsSnackbarVerticalPosition = 'top' | 'bottom';
export type ImsSnackbarDirection = 'ltr' | 'rtl';
export type ImsSnackbarPoliteness = 'off' | 'polite' | 'assertive';
export type ImsSnackbarSeverity = 'info' | 'success' | 'warning' | 'danger';
export type ImsSnackbarContent = string | Type<unknown>;
export type ImsSnackbarReplaceStrategy = 'replace' | 'stack';
export type ImsSnackbarProgressState = 'loading' | 'success' | 'error';
export type ImsSnackbarProgressSource = Observable<unknown> | PromiseLike<unknown>;

export interface ImsSnackbarProgressConfig {
    readonly closeDelay?: number;
    readonly settleDuration?: number;
    readonly cancelOnDismiss?: boolean;
}

export interface ImsSnackbarResolvedProgressConfig {
    readonly source: ImsSnackbarProgressSource | null;
    readonly closeDelay: number;
    readonly settleDuration: number;
    readonly cancelOnDismiss: boolean;
}

export interface ImsSnackbarProgressResult {
    readonly state: Exclude<ImsSnackbarProgressState, 'loading'>;
    readonly value?: unknown;
    readonly error?: unknown;
}

export interface ImsSnackbarGlobalConfig {
    readonly timeout: number;
    readonly replaceStrategy: ImsSnackbarReplaceStrategy;
    readonly verticalPosition: ImsSnackbarVerticalPosition;
    readonly horizontalPosition: ImsSnackbarHorizontalPosition;
}

export interface ImsSnackbarConfig<D = unknown> {
    readonly timeout: number;
    readonly horizontalPosition: ImsSnackbarHorizontalPosition;
    readonly verticalPosition: ImsSnackbarVerticalPosition;
    readonly severity: ImsSnackbarSeverity;
    readonly dismissible: boolean;
    readonly replaceStrategy: ImsSnackbarReplaceStrategy;
    readonly direction?: ImsSnackbarDirection;
    readonly panelClass?: string | readonly string[];
    readonly politeness: ImsSnackbarPoliteness;
    readonly data?: D;
    readonly progress?: ImsSnackbarResolvedProgressConfig;
}

export interface ImsSnackbarDismiss {
    readonly dismissedByAction: boolean;
}

export const IMS_SNACKBAR_DEFAULT_GLOBAL_CONFIG: ImsSnackbarGlobalConfig = {
    timeout: 4000,
    replaceStrategy: 'stack',
    verticalPosition: 'bottom',
    horizontalPosition: 'center'
};

export const IMS_SNACKBAR_GLOBAL_CONFIG = new InjectionToken<ImsSnackbarGlobalConfig>(
    'IMS_SNACKBAR_GLOBAL_CONFIG',
    {factory: () => IMS_SNACKBAR_DEFAULT_GLOBAL_CONFIG}
);

export const IMS_SNACKBAR_DATA = new InjectionToken<unknown>('IMS_SNACKBAR_DATA');

export const IMS_SNACKBAR_CONFIG = new InjectionToken<ImsSnackbarConfig>(
    'IMS_SNACKBAR_CONFIG'
);

export function provideImsSnackbarConfig(
    config: Partial<ImsSnackbarGlobalConfig>
): Provider {
    return {
        provide: IMS_SNACKBAR_GLOBAL_CONFIG,
        useValue: {
            ...IMS_SNACKBAR_DEFAULT_GLOBAL_CONFIG,
            ...config
        }
    };
}
