export interface ImsTransferRow<T> {
    readonly id: string;
    readonly label: string;
    readonly value: T;
    readonly checked?: boolean;
    readonly disabled?: boolean;
}

export interface ImsTransferList<T, ListId extends string = string> {
    readonly id: ListId;
    readonly title: string;
    readonly rows: readonly ImsTransferRow<T>[];
}

export interface ImsTransferDialogData<T, ListId extends string = string> {
    readonly lists: readonly ImsTransferList<T, ListId>[];
    readonly dialogTitle?: string;
}

export interface ImsTransferResultRow<T> {
    readonly id: string;
    readonly label: string;
    readonly value: T;
    readonly checked: boolean;
    readonly disabled?: boolean;
}

/** Final list membership, row state, and checked values when the dialog is confirmed. */
export interface ImsTransferDialogResult<T, ListId extends string = string> {
    readonly lists: Readonly<Record<ListId, readonly ImsTransferResultRow<T>[]>>;
    readonly checked: readonly T[];
}
