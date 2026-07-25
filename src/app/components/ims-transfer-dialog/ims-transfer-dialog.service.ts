import {Injectable, inject} from '@angular/core';
import {Dialog, DialogRef} from '@angular/cdk/dialog';
import {Directionality} from '@angular/cdk/bidi';
import {ImsTransferDialog} from './ims-transfer-dialog';
import {ImsTransferDialogData, ImsTransferDialogResult} from './ims-transfer-dialog.types';

@Injectable({providedIn: 'root'})
export class ImsTransferDialogService {
    private readonly dialog = inject(Dialog);
    private readonly directionality = inject(Directionality);

    open<T>(data: ImsTransferDialogData<T>): DialogRef<ImsTransferDialogResult<T>, ImsTransferDialog<T>> {
        return this.dialog.open<ImsTransferDialogResult<T>, ImsTransferDialogData<T>, ImsTransferDialog<T>>(
            ImsTransferDialog,
            {
                direction: this.directionality.value,
                minWidth: 'min(560px, 92vw)',
                maxWidth: '92vw',
                data
            }
        );
    }
}
