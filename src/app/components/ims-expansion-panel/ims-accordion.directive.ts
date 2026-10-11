import {CDK_ACCORDION, CdkAccordion} from '@angular/cdk/accordion';
import {Directive, forwardRef} from '@angular/core';

/**
 * Groups `ims-expansion-panel`s so that opening one closes the others.
 *
 * ```html
 * <ims-accordion>
 *     <ims-expansion-panel>…</ims-expansion-panel>
 *     <ims-expansion-panel>…</ims-expansion-panel>
 * </ims-accordion>
 * ```
 *
 * Everything comes from `CdkAccordion`: `multi` lets several panels stay open,
 * and `openAll()` / `closeAll()` act on every panel that is not disabled
 * (`openAll()` only when `multi`). Reach them through `#accordion="imsAccordion"`.
 *
 * The attribute form puts the same behavior on an element that already has a
 * layout of its own, such as an `ims-grid` or a `table` whose rows are panels:
 *
 * ```html
 * <ims-grid ims-table imsAccordion>…</ims-grid>
 * ```
 */
@Directive({
    selector: 'ims-accordion, [imsAccordion]',
    exportAs: 'imsAccordion',
    standalone: true,
    providers: [
        {
            provide: CDK_ACCORDION,
            useExisting: forwardRef(() => ImsAccordionDirective)
        }
    ],
    host: {
        class: 'ims-accordion'
    }
})
export class ImsAccordionDirective extends CdkAccordion {
}
