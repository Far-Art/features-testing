import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {IMS_EXPANSION_PANEL_V2} from './ims-expansion-panel-v2.tokens';

/**
 * The part of an `ims-expansion-panel-v2` that opens and closes.
 *
 * It is the box that paints the body: its padding and its background are its
 * own, so `ims-expansion-panel-body-v2 { background: … }` recolors exactly it.
 * Showing, hiding and the animation belong to the panel around it.
 *
 * In a panel on a `tbody`, put it in the cell of the detail row:
 *
 * ```html
 * <tr><td colspan="5"><ims-expansion-panel-body-v2>…</ims-expansion-panel-body-v2></td></tr>
 * ```
 */
@Component({
    selector: 'ims-expansion-panel-body-v2',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-expansion-panel-body-v2',
        '[attr.id]': 'panel.isTableBody ? panel.bodyId : null'
    }
})
export class ImsExpansionPanelBodyV2 {
    protected readonly panel = inject(IMS_EXPANSION_PANEL_V2);
}
