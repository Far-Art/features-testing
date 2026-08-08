import {Directive} from '@angular/core';
import {provideImsDatepickerMomentValueHandler} from './ims-datepicker-moment.value-handler';

/** Selects the Moment value handler for an ims-datepicker instance. */
@Directive({
    selector: 'ims-datepicker[imsDatepickerMoment]',
    providers: [provideImsDatepickerMomentValueHandler()]
})
export class ImsDatepickerMomentValueHandlerDirective {}
