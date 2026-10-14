import {Directive} from '@angular/core';


@Directive({
    selector: '[imsGridClipV2]',
    standalone: true,
    host: {
        'class': 'ims-grid-clip-v2'
    }
})
/**
 * Marks a wrapper as a clipping boundary for grid content during collapse/height animations.
 *
 * Use this on components such as expansion panels when nested `ims-grid-row-v2`
 * content should not paint outside the animated container.
 */
export class ImsGridClipDirectiveV2 {}
