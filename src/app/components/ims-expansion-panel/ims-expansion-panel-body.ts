import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {IMS_EXPANSION_PANEL} from './ims-expansion-panel.tokens';

/**
 * The part of an `ims-expansion-panel` that opens and closes.
 *
 * It is the box that paints the body: its padding and its background are its
 * own, so `ims-expansion-panel-body { background: … }` recolors exactly it.
 * Showing, hiding and the animation belong to the panel around it.
 *
 * In a panel on a `tbody`, put it in the cell of the detail row:
 *
 * ```html
 * <tr><td colspan="5"><ims-expansion-panel-body>…</ims-expansion-panel-body></td></tr>
 * ```
 */
@Component({
    selector: 'ims-expansion-panel-body',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-expansion-panel-body',
        '[attr.id]': 'panel.isTableBody ? panel.bodyId : null'
    }
})
export class ImsExpansionPanelBody {
    protected readonly panel = inject(IMS_EXPANSION_PANEL);
}
