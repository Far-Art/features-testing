import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {ImsButtonSeverity} from '../ims-button/ims-button';
import {
    ImsExpandCollapseButtonDirective,
    ImsExpandCollapseButtonVariation
} from '../ims-expand-collapse-button/ims-expand-collapse-button.directive';
import {IMS_EXPANSION_PANEL} from './ims-expansion-panel.tokens';

/**
 * The button that opens and closes the nearest `ims-expansion-panel`.
 *
 * It is the only thing that does: the header row around it is not clickable,
 * so the header can hold checkboxes, selects and buttons of its own.
 *
 * `ims-expansion-panel-header` renders one at its start. Place one yourself where
 * the header is not that component — in a cell of the `ims-grid-row` or `tr`
 * that heads a panel in a table:
 *
 * ```html
 * <ims-grid-cell><ims-expansion-panel-toggle/></ims-grid-cell>
 * ```
 *
 * While the panel's `hideToggle` is set the button is hidden in place: it
 * keeps its space, so what follows it stays where it was, and it cannot be
 * seen, clicked, focused or found by assistive technology.
 */
@Component({
    selector: 'ims-expansion-panel-toggle',
    standalone: true,
    imports: [ImsExpandCollapseButtonDirective],
    template: `
        <button
            imsExpandCollapseButton
            class="ims-expansion-panel-toggle__button"
            [class.ims-expansion-panel-toggle__button--own-severity]="resolvedSeverity() !== undefined"
            [variation]="resolvedVariation()"
            [ims-button-severity]="resolvedSeverity() ?? 'info'"
            [expanded]="panel.isExpanded()"
            [disabled]="panel.isDisabled()"
            [expandAriaLabel]="expandLabel()"
            [collapseAriaLabel]="collapseLabel()"
            [attr.aria-controls]="panel.bodyId"
            (expandedChange)="panel.toggle()"
        ></button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-expansion-panel-toggle',
        '[class.ims-expansion-panel-toggle--hidden]': 'panel.hideToggle()'
    }
})
export class ImsExpansionPanelToggle {
    /**
     * `light`, a white plate like `ims-button-variation="secondary"`, or
     * `dark`, a solid fill like `primary`.
     *
     * Unset, it follows the panel: `light` in a `default` panel, `dark` in a
     * `secondary` one, so it stands out from the header it sits on.
     *
     * @defaultValue `undefined`
     */
    readonly variation = input<ImsExpandCollapseButtonVariation | undefined>(undefined);
    /**
     * The button's own severity, as `ims-button-severity` is on any button.
     * `danger` paints a light toggle's glyph, hover and press red and a dark
     * one's fill, for a panel whose content needs attention before it is
     * opened — a field inside it that does not validate, say.
     *
     * Unset, a light toggle hovers in the panel's severity and a dark one keeps
     * the house blue. A panel marked `invalid` makes it `danger` whatever this
     * says. Colour does not reach a screen reader, so say the same in
     * `expandLabel` and `collapseLabel`.
     *
     * @defaultValue `undefined`
     */
    readonly severity = input<ImsButtonSeverity | undefined>(undefined);
    /**
     * Accessible name while the panel is closed.
     *
     * @defaultValue `'הרחב'`
     */
    readonly expandLabel = input('הרחב');
    /**
     * Accessible name while the panel is open.
     *
     * @defaultValue `'כווץ'`
     */
    readonly collapseLabel = input('כווץ');

    protected readonly panel = inject(IMS_EXPANSION_PANEL);
    /** The severity the button is painted in: danger while the panel's content is invalid, else its own, if any. */
    protected readonly resolvedSeverity = computed<ImsButtonSeverity | undefined>(() =>
        this.panel.invalid() ? 'danger' : this.severity()
    );
    protected readonly resolvedVariation = computed<ImsExpandCollapseButtonVariation>(
        () => this.variation() ?? (this.panel.variation() === 'secondary' ? 'dark' : 'light')
    );
}
