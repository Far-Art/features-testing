import {booleanAttribute, ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {ImsButtonSeverity} from '../ims-button/ims-button';
import {ImsExpandCollapseButtonVariation} from '../ims-expand-collapse-button/ims-expand-collapse-button.directive';
import {ImsExpansionPanelToggle} from './ims-expansion-panel-toggle';
import {IMS_EXPANSION_PANEL} from './ims-expansion-panel.tokens';

/**
 * The always-visible top row of an `ims-expansion-panel`.
 *
 * Clicking the row does nothing: only the toggle at its start opens and closes
 * the panel. That is what lets the row hold real controls — a checkbox, a
 * select, a button — without every click on one of them folding the panel.
 *
 * ```html
 * <ims-expansion-panel-header>
 *     <h3>פרטי פוליסה</h3>
 *     <ims-checkbox [formControl]="includeCancelled">כלול חיובים שבוטלו</ims-checkbox>
 * </ims-expansion-panel-header>
 * ```
 *
 * Like `ims-panel-header` it carries no `role`, since it may hold focusable
 * content. Project an `h2` or `h3` when the header is a heading.
 */
@Component({
    selector: 'ims-expansion-panel-header',
    standalone: true,
    imports: [ImsExpansionPanelToggle],
    template: `
        @if (!panel.isInGridRow) {
            <ims-expansion-panel-toggle
                class="ims-expansion-panel-header__toggle"
                [class.ims-expansion-panel-header__toggle--hidden]="hideToggle()"
                [variation]="toggleVariation()"
                [severity]="toggleSeverity()"
                [expandLabel]="expandLabel()"
                [collapseLabel]="collapseLabel()"
            />
        }
        <div class="ims-expansion-panel-header__content" [id]="panel.headerId"><ng-content/></div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-expansion-panel-header'
    }
})
export class ImsExpansionPanelHeader {
    /**
     * Hides the toggle in place: it keeps its space at the start of the row,
     * so the title lines up with the titles of panels that show theirs, and it
     * cannot be seen, clicked, focused or found by assistive technology. The
     * panel's own `hideToggle` does the same, and reaches a toggle placed
     * anywhere in it. A header in an `ims-grid-row` renders no toggle at all:
     * it holds the row's cells, and the toggle goes in one of them.
     *
     * The panel still opens and closes from its `expanded` input, its `open()`,
     * `close()` and `toggle()` methods, an accordion's `openAll()` and
     * `closeAll()`, or an `ims-expansion-panel-toggle` placed elsewhere.
     *
     * @defaultValue `false`
     */
    readonly hideToggle = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});
    /**
     * The toggle's variation: `light`, a white plate, or `dark`, a solid fill.
     * Unset, it follows the panel's `variation`.
     *
     * @defaultValue `undefined`
     */
    readonly toggleVariation = input<ImsExpandCollapseButtonVariation | undefined>(undefined);
    /**
     * The toggle's own severity: `danger`, for one, when the content of the
     * panel needs attention, such as a field that does not validate. Unset, a
     * light toggle hovers in the panel's severity. A panel in a grid row has
     * its toggle in a cell; set `severity` on that toggle instead.
     *
     * @defaultValue `undefined`
     */
    readonly toggleSeverity = input<ImsButtonSeverity | undefined>(undefined);
    /**
     * Accessible name of the toggle while the panel is closed.
     *
     * @defaultValue `'הרחב'`
     */
    readonly expandLabel = input('הרחב');
    /**
     * Accessible name of the toggle while the panel is open.
     *
     * @defaultValue `'כווץ'`
     */
    readonly collapseLabel = input('כווץ');

    protected readonly panel = inject(IMS_EXPANSION_PANEL);
}
