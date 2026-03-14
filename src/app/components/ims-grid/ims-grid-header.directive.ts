import {Directive} from '@angular/core';

@Directive({
    selector: '[imsGridHeader]',
    standalone: true,
    host: {
        'class': 'ims-grid-header'
    }
})
export class ImsGridHeaderDirective {
}

