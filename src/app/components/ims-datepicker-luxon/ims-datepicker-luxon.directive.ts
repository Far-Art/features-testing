import {Directive} from '@angular/core';
import {provideImsDatepickerLuxonValueHandler} from './ims-datepicker-luxon.value-handler';

/** Selects the Luxon value handler for an ims-datepicker instance. */
@Directive({
    selector: 'ims-datepicker[imsDatepickerLuxon]',
    providers: [provideImsDatepickerLuxonValueHandler()]
})
export class ImsDatepickerLuxonValueHandlerDirective {}
