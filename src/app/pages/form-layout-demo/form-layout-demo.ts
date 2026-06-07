import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
    ImsFormControlGroup,
    ImsFormField,
    ImsFormFieldControl,
    ImsFormFieldGroup,
    ImsFormFieldLabel,
    ImsFormFieldRow
} from '../../components/ims-form-layout';
import {
    ImsGrid,
    ImsGridCell,
    ImsGridRow,
    ImsGridSortDirective,
    ImsGridSortHeader
} from '../../components/ims-grid';

interface FormGridDemoRow {
    readonly id: number;
    customerName: string;
    policyNumber: string;
    validUntil: string;
    premium: number;
}

@Component({
    selector: 'app-form-layout-demo',
    imports: [
        FormsModule,
        ImsFormField,
        ImsFormFieldRow,
        ImsFormFieldGroup,
        ImsFormControlGroup,
        ImsFormFieldLabel,
        ImsFormFieldControl,
        ImsGrid,
        ImsGridRow,
        ImsGridCell,
        ImsGridSortDirective,
        ImsGridSortHeader
    ],
    templateUrl: './form-layout-demo.html',
    styleUrl: './form-layout-demo.scss'
})
export class FormLayoutDemo {
    readonly formGridSource: FormGridDemoRow[] = [
        {
            id: 1,
            customerName: 'אביגיל לוי',
            policyNumber: 'PL-1048',
            validUntil: '2026-11-30',
            premium: 420
        },
        {
            id: 2,
            customerName: 'יונתן כהן',
            policyNumber: 'PL-0982',
            validUntil: '2026-08-15',
            premium: 315
        },
        {
            id: 3,
            customerName: 'מיכל אברהם',
            policyNumber: 'PL-1274',
            validUntil: '2027-02-01',
            premium: 560
        },
        {
            id: 4,
            customerName: 'רועי ברק',
            policyNumber: 'PL-1011',
            validUntil: '2026-06-30',
            premium: 275
        }
    ];
}
