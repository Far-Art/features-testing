import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {ImsPanelSeverity} from './ims-panel.types';

/**
 * A container that wraps content in a toned box.
 *
 * Project an `ims-panel-header` for the banded top row and everything else for
 * the body; the two slots below place them, so the header sits at the top
 * whichever order the call site writes them in:
 *
 * ```html
 * <ims-panel severity="info">
 *     <ims-panel-header icon="info">פרטי תשלום</ims-panel-header>
 *     <p>תוכן הפאנל.</p>
 *     <hr>
 *     <p>מקטע נוסף.</p>
 * </ims-panel>
 * ```
 *
 * A plain `hr` in the body is the section divider, and it reaches both inner
 * edges of the panel rather than stopping at the content padding. Nothing marks
 * it — the element is the API.
 *
 * Presentation comes from the global `.ims-panel` class in
 * src/styles/ims-panel.scss. A severity repoints four custom properties there
 * and nothing else; see that file's header for what each one paints.
 */
@Component({
    selector: 'ims-panel',
    standalone: true,
    template: `
        <ng-content select="ims-panel-header"/>
        <div class="ims-panel__content"><ng-content/></div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-panel',
        '[class.ims-panel--info]': 'severity() === "info"',
        '[class.ims-panel--success]': 'severity() === "success"',
        '[class.ims-panel--warning]': 'severity() === "warning"',
        '[class.ims-panel--danger]': 'severity() === "danger"'
    }
})
export class ImsPanel {
    /**
     * The tone the panel and its header are painted in.
     *
     * `neutral` is the default and binds no class of its own: it is the ramp the
     * stylesheet already declares, so an untoned panel costs nothing and cannot
     * drift from the grey one.
     *
     * @defaultValue `'neutral'`
     */
    readonly severity = input<ImsPanelSeverity>('neutral');
}
