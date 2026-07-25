export interface ImsTransferRow<T> {
    readonly id: string;
    readonly label: string;
    readonly value: T;
    readonly disabled?: boolean;
}

export interface ImsTransferColumn<T> {
    readonly title: string;
    readonly rows: readonly ImsTransferRow<T>[];
}

export interface ImsTransferDialogData<T> {
    readonly start: ImsTransferColumn<T>;
    readonly end: ImsTransferColumn<T>;
    readonly dialogTitle?: string;
}

/** Final contents of both columns when the dialog is confirmed. */
export interface ImsTransferDialogResult<T> {
    readonly start: readonly T[];
    readonly end: readonly T[];
}
