import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ImsFormField, ImsFormFieldRow} from '../../components/ims-form-layout';
import {ImsInputDirective} from '../../ims-input.directive';

@Component({
    selector: 'app-demo-contact-row',
    imports: [ImsFormField, ImsFormFieldRow, ImsInputDirective],
    template: `
        <ims-form-field-row>
            <ims-form-field column="1">
                <label>טלפון נייד</label>
                <input imsInput value="050-1234567" dir="ltr">
            </ims-form-field>

            <ims-form-field column="2">
                <label>כתובת דואר אלקטרוני</label>
                <input imsInput value="noa@example.co.il" dir="ltr">
            </ims-form-field>
        </ims-form-field-row>
    `,
    styles: `
        :host {
            display: contents;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Demo-only component that holds one `ims-form-field-row`.
 *
 * Its host has `display: contents`, so inside an `ims-form-field-grid` the
 * row takes part in the grid's layout as if the grid held it directly.
 */
export class DemoContactRow {
}
