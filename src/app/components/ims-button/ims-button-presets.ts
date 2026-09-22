import type {ImsButtonSeverity} from './ims-button';

/**
 * A named affordance an icon button can stand for:
 * `<button ims-button-icon preset="delete">`.
 *
 * A preset exists so that one action looks the same on every screen. The glyph
 * is pinned rather than passed, and so is the accessible name that stands in
 * for it: no call site gets to choose, so no call site can drift.
 *
 * Adding one takes four steps, and the compiler checks the first two:
 *
 * 1. Add its name to this union.
 * 2. Give it a spec in {@link IMS_BUTTON_ICON_PRESETS}. The record is typed over
 *    this union, so a name without a spec does not compile.
 * 3. Bind its `ims-button--<name>` class on `ImsButtonIcon`, next to the
 *    others. That class is the preset's styling hook.
 * 4. Give it a block in ims-buttons.scss only if it departs from a plain icon
 *    button. One that pins a tone always does — see
 *    {@link ImsButtonIconPresetSpec.severity}.
 */
export type ImsButtonIconPreset = 'edit' | 'delete';

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
     * Tone the preset pins, or `null` to take `ims-button-severity` exactly the
     * way a plain icon button does.
     *
     * A pinned preset is not painted through `.ims-button--default`. It names
     * its tones outright in its own block in ims-buttons.scss, which is what
     * keeps the input from reaching them: the input still sets its severity
     * class, but nothing the preset paints reads the ramp that class repoints.
     * The pinned tone is also what a tooltip on the button inherits.
     */
    readonly severity: ImsButtonSeverity | null;
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
 * Every preset's spec, keyed by name — the one place a preset's glyph, name and
 * tone are written down.
 *
 * - `edit` is an icon button with a pinned glyph and nothing more: it rests,
 *   hovers, presses and takes a severity the way any icon button does.
 * - `delete` rests quiet and only takes its tone under a pointer, and pins
 *   `danger`, so it reads as a delete whatever severity the call site writes.
 *
 * The names are defaults. A call site that can say more — which row, which
 * policy — writes its own `aria-label`, and that always wins.
 */
export const IMS_BUTTON_ICON_PRESETS: Readonly<Record<ImsButtonIconPreset, ImsButtonIconPresetSpec>> = {
    edit: {icon: IMS_BUTTON_EDIT_ICON, label: 'Edit', severity: null},
    delete: {icon: 'cancel', label: 'Delete', severity: 'danger'}
};
