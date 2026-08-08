import {Directive} from '@angular/core';
import {provideImsDatepickerDateValueHandler} from './ims-datepicker.value-handler';

/** Selects the native Date value handler for an ims-datepicker instance. */
@Directive({
    selector: 'ims-datepicker[imsDatepickerDate]',
    providers: [provideImsDatepickerDateValueHandler()]
})
export class ImsDatepickerDateValueHandlerDirective {}
