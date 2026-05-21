import {Directive} from '@angular/core';

@Directive({
    selector: '[imsGrid2Clip]',
    standalone: true,
    host: {
        'class': 'ims-grid2-clip'
    }
})
export class ImsGrid2ClipDirective {}
