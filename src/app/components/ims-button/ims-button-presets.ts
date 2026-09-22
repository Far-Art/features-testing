import type {ImsButtonSeverity} from './ims-button';

/**
 * A named affordance an icon button can stand for:
 * `<button ims-button-icon ims-button-icon-preset="delete">`.
 *
 * A preset exists so that one action looks the same on every screen. The glyph
 * is pinned rather than passed, and so is the accessible name that stands in
 * for it: no call site gets to choose, so no call site can drift.
 *
 * Adding one takes at most three steps, and the compiler checks the first two:
 *
 * 1. Add its name to this union.
 * 2. Give it a spec in {@link IMS_BUTTON_ICON_PRESETS}. The record is typed over
 *    this union, so a name without a spec does not compile.
 * 3. Give it a block in ims-buttons.scss, keyed to the spec's `class`, only if
 *    it departs from a plain icon button painted in its severity — a glyph
 *    size of its own, a different rest colour. A pinned severity is not a
 *    departure — the spec says it — so most presets need no block, and no
 *    class, at all.
 */
export type ImsButtonIconPreset = 'edit' | 'delete';

/**
 * A severity a preset can pin: the four a call site picks from, and `neutral`.
 *
 * `neutral` is the grey `ims-panel` defaults to, for an action that should not
 * draw the eye. Only a preset can paint a button in it — `ims-button-severity`
 * keeps to the four status words — so a neutral icon button always stands for
 * a named affordance.
 */
export type ImsButtonIconPresetSeverity = ImsButtonSeverity | 'neutral';

/** What a preset pins on the button that carries it. */
export interface ImsButtonIconPresetSpec {
    /** Glyph the button draws for itself. */
    readonly icon: string;

    /**
     * Accessible name until the call site writes its own, in either spelling.
     * The drawn glyph is `aria-hidden`, so without this a preset button would
     * have no name at all.
     */
    readonly label: string;

    /**
     * Severity the preset pins. Leave it out and the button takes
     * `ims-button-severity` exactly the way a plain icon button does.
     *
     * A pinned severity outranks that input everywhere the input reaches: it is
     * the ramp the button is painted from, and the tone a tooltip on it
     * inherits. A `neutral` one hands the tooltip nothing, since a tooltip has
     * no neutral, and the application default applies there.
     */
    readonly severity?: ImsButtonIconPresetSeverity;

    /**
     * Class the button carries while the preset is in force: the hook a block
     * in ims-buttons.scss keys to, `ims-button--<name>` by convention. Several
     * are space-separated. Leave it out for a preset that departs from a plain
     * icon button in nothing its spec does not already say.
     *
     * Whatever that block sets comes and goes with the preset, so everything a
     * spec does not name is said there — a glyph size of its own, through
     * `--ims-button-symbol-size`, as delete's block does. A call site's
     * `icon-size` still outranks it, being written inline.
     *
     * Not a way to pick a severity or a variation. Those classes are the
     * button's own and it binds them itself; a severity is `severity`'s to say.
     */
    readonly class?: string;
}

/**
 * The glyph the `edit` preset pins.
 *
 * Exported so chrome that sits alongside an edit affordance — a dialog title
 * over the same action, say — shows the same glyph without re-typing it, and
 * cannot drift if the preset ever picks a different one.
 */
export const IMS_BUTTON_EDIT_ICON = 'ink_pen';

/**
 * Every preset's spec, keyed by name — the one place a preset's glyph, name,
 * severity and class are written down.
 *
 * - `edit` is an icon button with a pinned glyph and nothing more: it rests,
 *   hovers, presses and takes a severity the way any icon button does.
 * - `delete` pins `danger`, so it reads as a delete whatever severity the call
 *   site writes. It rests quiet and only takes that tone under a pointer, and
 *   draws its glyph filled and smaller — what its block in ims-buttons.scss
 *   still has to say.
 *
 * The names are defaults. A call site that can say more — which row, which
 * policy — writes its own `aria-label`, and that always wins.
 */
export const IMS_BUTTON_ICON_PRESETS: Readonly<Record<ImsButtonIconPreset, ImsButtonIconPresetSpec>> = {
    edit: {
        icon: IMS_BUTTON_EDIT_ICON,
        label: 'Edit',
        // Styles nothing — edit is a plain icon button with a pinned glyph —
        // but marks the affordance for anything that has to find it.
        class: 'ims-button--edit'
    },
    delete: {
        icon: 'cancel',
        label: 'Delete',
        severity: 'danger',
        class: 'ims-button--delete'
    }
};
