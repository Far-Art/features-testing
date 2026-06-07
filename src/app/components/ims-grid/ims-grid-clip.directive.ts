import {Directive} from '@angular/core';


@Directive({
    selector: '[imsGridClip]',
    standalone: true,
    host: {
        'class': 'ims-grid-clip'
    }
})
/**
 * Marks a wrapper as a clipping boundary for grid content during collapse/height animations.
 *
 * Use this on components such as expansion panels when nested `ims-grid-row`
 * content should not paint outside the animated container.
 */
export class ImsGridClipDirective {}
