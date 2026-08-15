import {Injectable, inject} from '@angular/core';
import {ImsDialogRef, ImsDialogService} from '../ims-dialog';
import {ImsTransferDialog} from './ims-transfer-dialog';
import {ImsTransferDialogData, ImsTransferDialogResult} from './ims-transfer-dialog.types';

@Injectable({providedIn: 'root'})
export class ImsTransferDialogService {
    private readonly dialog = inject(ImsDialogService);

    open<T, ListId extends string = string>(
        data: ImsTransferDialogData<T, ListId>
    ): ImsDialogRef<ImsTransferDialogResult<T, ListId> | undefined> {
        this.validateData(data);

        return this.dialog
            .info(ImsTransferDialog)
            .title(data.dialogTitle ?? '')
            .data(data)
            .config({
                minWidth: 'min(560px, 92vw)',
                maxWidth: '92vw'
            })
            .open<ImsTransferDialogResult<T, ListId>>();
    }

    private validateData<T, ListId extends string>(data: ImsTransferDialogData<T, ListId>): void {
        if (data.lists.length === 0) {
            throw new Error('ImsTransferDialog requires at least one list.');
        }

        const listIds = new Set<string>();
        const rowIds = new Set<string>();

        for (const list of data.lists) {
            if (!list.id.trim()) {
                throw new Error('ImsTransferDialog list ids must not be empty.');
            }
            if (listIds.has(list.id)) {
                throw new Error(`ImsTransferDialog list id "${list.id}" must be unique.`);
            }
            listIds.add(list.id);

            for (const row of list.rows) {
                if (rowIds.has(row.id)) {
                    throw new Error(`ImsTransferDialog row id "${row.id}" must be unique.`);
                }
                rowIds.add(row.id);
            }
        }
    }
}
