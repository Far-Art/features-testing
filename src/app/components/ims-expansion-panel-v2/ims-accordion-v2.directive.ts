import {CDK_ACCORDION, CdkAccordion} from '@angular/cdk/accordion';
import {Directive, forwardRef} from '@angular/core';

/**
 * Groups `ims-expansion-panel-v2`s so that opening one closes the others.
 *
 * ```html
 * <ims-accordion-v2>
 *     <ims-expansion-panel-v2>…</ims-expansion-panel-v2>
 *     <ims-expansion-panel-v2>…</ims-expansion-panel-v2>
 * </ims-accordion-v2>
 * ```
 *
 * Everything comes from `CdkAccordion`: `multi` lets several panels stay open,
 * and `openAll()` / `closeAll()` act on every panel that is not disabled
 * (`openAll()` only when `multi`). Reach them through `#accordion="imsAccordionV2"`.
 *
 * The attribute form puts the same behavior on an element that already has a
 * layout of its own, such as an `ims-grid-v2` or a `table` whose rows are panels:
 *
 * ```html
 * <ims-grid-v2 ims-table imsAccordionV2>…</ims-grid-v2>
 * ```
 */
@Directive({
    selector: 'ims-accordion-v2, [imsAccordionV2]',
    exportAs: 'imsAccordionV2',
    standalone: true,
    providers: [
        {
            provide: CDK_ACCORDION,
            useExisting: forwardRef(() => ImsAccordionDirectiveV2)
        }
    ],
    host: {
        class: 'ims-accordion-v2'
    }
})
export class ImsAccordionDirectiveV2 extends CdkAccordion {
}
