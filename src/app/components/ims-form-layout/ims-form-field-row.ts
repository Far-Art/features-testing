import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

@Component({
    selector: 'ims-form-field-row',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-form-field-row.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsFormFieldRow {
}
