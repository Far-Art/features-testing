import {Directive, DoCheck, inject, TemplateRef, ViewContainerRef} from '@angular/core';
import {IMS_EXPANSION_PANEL} from './ims-expansion-panel.tokens';

/**
 * Content of an `ims-expansion-panel` that is rendered the first time the
 * panel opens, rather than with the panel, as `matExpansionPanelContent` is:
 *
 * ```html
 * <ims-expansion-panel-body>
 *     <ng-template imsExpansionPanelContent>
 *         @for (claim of policy.claims; track claim.id) { … }
 *     </ng-template>
 * </ims-expansion-panel-body>
 * ```
 *
 * A closed panel's body is laid out and clipped to nothing, so whatever it
 * holds is built, checked and styled with every panel. That is cheap for one
 * panel and costly for many: in a virtual viewport every row that scrolls in
 * builds its body, and a body of nested rows is most of a row's cost. Put the
 * body's content in this template and a closed panel builds none of it.
 *
 * Once rendered the content stays, as `matExpansionPanelContent`'s does: it is
 * there while the panel folds closed, and opening the panel again does not
 * build it twice. It goes with the panel.
 *
 * The check runs with the view the template is written in, which is the view
 * that shows the panel's open state, so the content appears in the same change
 * detection pass that opens the panel.
 */
@Directive({
    selector: 'ng-template[imsExpansionPanelContent]',
    standalone: true
})
export class ImsExpansionPanelContent implements DoCheck {
    private readonly panel = inject(IMS_EXPANSION_PANEL);
    private readonly template = inject(TemplateRef);
    private readonly viewContainer = inject(ViewContainerRef);
    private rendered = false;

    ngDoCheck(): void {
        if (!this.rendered && this.panel.isExpanded()) {
            this.rendered = true;
            this.viewContainer.createEmbeddedView(this.template);
        }
    }
}
