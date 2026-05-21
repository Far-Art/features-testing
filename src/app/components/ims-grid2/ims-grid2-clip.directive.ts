import {Directive} from '@angular/core';

@Directive({
    selector: '[imsGrid2Clip]',
    standalone: true,
    host: {
        'class': 'ims-grid2-clip'
    }
})
/**
 * Marks a wrapper as a clipping boundary for grid content during collapse/height animations.
 *
 * Use this on components such as expansion panels when nested `ims-grid2-row`
 * content should not paint outside the animated container.
 */
export class ImsGrid2ClipDirective {}
