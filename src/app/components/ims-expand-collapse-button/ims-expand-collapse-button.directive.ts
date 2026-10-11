import {Directive, forwardRef, input, model, Signal, signal} from '@angular/core';
import {ImsButtonBase} from '../ims-button/ims-button';
import {IMS_TOOLTIP_DEFAULTS} from '../ims-tooltip/ims-tooltip.types';

/**
 * How loudly an expand/collapse button speaks. `light` is a white plate in
 * the ramp's ink, as `ims-button-variation="secondary"` is; `dark` is a solid
 * fill in white, as `primary` is.
 */
export type ImsExpandCollapseButtonVariation = 'light' | 'dark';

/** Never readonly: see {@link ImsExpandCollapseButtonDirective.readonlyMode}. */
const NEVER_READONLY: Signal<boolean> = signal(false).asReadonly();

/**
 * A square button that shows and hides something: a plus that turns into a
 * minus as it opens.
 *
 * ```html
 * <button imsExpandCollapseButton [(expanded)]="open" aria-controls="details"></button>
 * <button imsExpandCollapseButton variation="dark" [(expanded)]="open"></button>
 * ```
 *
 * It is an `ims-button`: the same base class, so the same focus halo, press
 * ring, hover plate, disabled look and `ims-button-severity`. The two
 * variations reuse that button's own `secondary` and `primary` colour sets
 * rather than restating them, so they cannot drift from it, and every severity
 * works at both.
 *
 * It names itself from `expandAriaLabel` / `collapseAriaLabel` and reports
 * `aria-expanded`. An `aria-label` written at the call site, in either
 * spelling, wins over both.
 *
 * Presentation is in the global src/styles/ims-expand-collapse-button.scss,
 * on top of src/styles/ims-buttons.scss.
 */
@Directive({
    selector: 'button[imsExpandCollapseButton]',
    standalone: true,
    providers: [{provide: IMS_TOOLTIP_DEFAULTS, useExisting: forwardRef(() => ImsExpandCollapseButtonDirective)}],
    host: {
        // `ims-button-icon` for the icon button's square shape and its hover
        // plate. The glyph is drawn on ::after, which that class leaves free.
        class: 'ims-button-icon ims-expand-collapse-button',
        '[class.ims-button--secondary]': 'variation() === "light"',
        '[class.ims-button--primary]': 'variation() === "dark"',
        '[class.ims-expand-collapse-button--expanded]': 'expanded()',
        '[attr.aria-expanded]': 'expanded() ? "true" : "false"',
        '[disabled]': 'interactionDisabled()',
        '(click)': 'toggle()'
    }
})
export class ImsExpandCollapseButtonDirective extends ImsButtonBase {
    /** Whether the thing this button controls is showing. Two-way bindable. */
    readonly expanded = model(false);
    /**
     * `light` (the default) or `dark`.
     *
     * @defaultValue `'light'`
     */
    readonly variation = input<ImsExpandCollapseButtonVariation>('light');
    /**
     * Accessible name while collapsed.
     *
     * @defaultValue `'הרחב'`
     */
    readonly expandAriaLabel = input('הרחב');
    /**
     * Accessible name while expanded.
     *
     * @defaultValue `'כווץ'`
     */
    readonly collapseAriaLabel = input('כווץ');

    /**
     * Ignores an `ims-readonly` scope, which disables every other button in it.
     * Readonly protects data, and this button changes none: showing or hiding a
     * section is how a readonly view gets read. It still honours `disabled`.
     */
    override readonly readonlyMode = NEVER_READONLY;

    /** Flips `expanded`, unless the button is disabled. */
    toggle(): void {
        if (this.interactionDisabled()) return;
        this.expanded.update((expanded) => !expanded);
    }

    /** The name for the current state, which the base writes as `aria-label`. */
    protected override resolveLabel(): string {
        return this.expanded() ? this.collapseAriaLabel() : this.expandAriaLabel();
    }
}
