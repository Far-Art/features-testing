import {Injectable, inject} from '@angular/core';
import {ImsDialogRef, ImsDialogService} from '../ims-dialog';
import {ImsTransferDialog} from './ims-transfer-dialog';
import {ImsTransferDialogData, ImsTransferDialogResult} from './ims-transfer-dialog.types';

@Injectable({providedIn: 'root'})
export class ImsTransferDialogService {
    private readonly dialog = inject(ImsDialogService);

    open<T>(data: ImsTransferDialogData<T>): ImsDialogRef<ImsTransferDialogResult<T> | undefined> {
        return this.dialog
            .info(ImsTransferDialog)
            .title(data.dialogTitle ?? '')
            .data(data)
            .config({
                minWidth: 'min(560px, 92vw)',
                maxWidth: '92vw'
            })
            .open<ImsTransferDialogResult<T>>();
    }
}
