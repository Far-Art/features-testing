import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ImsCheckbox} from '../../components/ims-checkbox';
import {
    ImsDatepicker
} from '../../components/ims-datepicker';
import {ImsErrorPopoverDirective} from '../../components/ims-error-popover';
import {
    ImsFormFieldGroup,
    ImsFormField, ImsFormFieldGrid,
    ImsFormFieldHint,
    ImsFormFieldInline,
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
import {ImsOption, ImsSelect} from '../../components/ims-select';
import {ImsInputDirective} from '../../ims-input.directive';
import {ReadonlyDirective} from '../../shared/readonly.directive';
import {DemoContactRow} from './demo-contact-row';
import {DemoResizeFrame} from './demo-resize-frame';

interface FormGridDemoRow {
    readonly id: number;
    customerName: string;
    policyNumber: string;
    validUntil: Date;
    premium: number;
}

function utcDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
}

@Component({
    selector: 'app-form-layout-demo',
    imports: [
        DatePipe,
        DemoContactRow,
        DemoResizeFrame,
        FormsModule,
        ImsCheckbox,
        ImsDatepicker,
        ImsErrorPopoverDirective,
        ImsFormField,
        ImsFormFieldRow,
        ImsFormFieldGroup,
        ImsFormFieldHint,
        ImsFormFieldInline,
        ImsFormFieldLabel,
        ImsGrid,
        ImsGridRow,
        ImsGridCell,
        ImsGridSortDirective,
        ImsGridSortHeader,
        ImsFormFieldGrid,
        ImsInputDirective,
        ImsOption,
        ImsSelect,
        ReadonlyDirective
    ],
    templateUrl: './form-layout-demo.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './form-layout-demo.scss'
})
export class FormLayoutDemo {
    status = 'active';
    branch = 'jerusalem';
    playgroundBranch = 'haifa';
    birthDate = utcDate('1990-05-12');
    billingAccount = 'ABC';
    lockedReference = 'REF-2026-1042';
    policyStart = utcDate('2026-01-01');
    policyEnd = utcDate('2026-12-31');
    eligibilityStart = utcDate('2026-03-01');
    eligibilityEnd = utcDate('2026-09-30');
    unlabelledRangeStart = utcDate('2026-04-01');
    unlabelledRangeEnd = utcDate('2026-10-31');
    billingDate = utcDate('2026-05-01');
    coverageStart = utcDate('2026-02-01');
    coverageEnd = utcDate('2027-01-31');
    vipCustomer = true;
    smsUpdates = false;
    accountSuspended = true;
    handlingBranch = 'tel-aviv';
    joinDate = utcDate('2024-05-12');
    readonly channels = {email: true, sms: false, phone: false};
    subscriptionStatus = 'active';
    termsAccepted = false;
    policyConfirmed = false;
    agentConsent = 'no';

    get allChannelsSelected(): boolean {
        return Object.values(this.channels).every(Boolean);
    }

    get someChannelsSelected(): boolean {
        return Object.values(this.channels).some(Boolean) && !this.allChannelsSelected;
    }

    setAllChannels(checked: boolean): void {
        this.channels.email = checked;
        this.channels.sms = checked;
        this.channels.phone = checked;
    }

    readonly autoWidthGridSource: FormGridDemoRow[] = [
        {
            id: 1,
            customerName: 'נועה',
            policyNumber: 'P-8',
            validUntil: utcDate('2026-11-30'),
            premium: 85
        },
        {
            id: 2,
            customerName: 'יונתן בן דוד',
            policyNumber: 'POLICY-2026-000982',
            validUntil: utcDate('2026-08-15'),
            premium: 1315
        },
        {
            id: 3,
            customerName: 'מיכל אברהם ומשפחתה',
            policyNumber: 'PL-1274',
            validUntil: utcDate('2027-02-01'),
            premium: 560
        },
        {
            id: 4,
            customerName: 'רועי ברק',
            policyNumber: '1011',
            validUntil: utcDate('2026-06-30'),
            premium: 275
        }
    ];

    readonly explicitWidthGridSource: FormGridDemoRow[] = [
        {
            id: 11,
            customerName: 'אביגיל לוי',
            policyNumber: 'PL-1048',
            validUntil: utcDate('2026-11-30'),
            premium: 420
        },
        {
            id: 12,
            customerName: 'יונתן כהן',
            policyNumber: 'PL-0982',
            validUntil: utcDate('2026-08-15'),
            premium: 315
        },
        {
            id: 13,
            customerName: 'מיכל אברהם',
            policyNumber: 'PL-1274',
            validUntil: utcDate('2027-02-01'),
            premium: 560
        },
        {
            id: 14,
            customerName: 'רועי ברק',
            policyNumber: 'PL-1011',
            validUntil: utcDate('2026-06-30'),
            premium: 275
        }
    ];
}
