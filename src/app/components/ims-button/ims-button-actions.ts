import {Directive} from '@angular/core';
import {ImsButtonBase} from './ims-button';

/**
 * Delete affordance: the `cancel` glyph on a quiet surface that takes the
 * danger tone under a pointer.
 *
 * Purely visual. The action stays the consumer's — bind `(click)`, and where
 * the delete is irreversible, confirm it there.
 *
 * The glyph is pinned rather than passed, which is the whole reason this
 * exists: a delete button looks the same on every screen because no call site
 * gets to choose. The tone is pinned with it, so `ims-button-severity` is
 * accepted here and ignored.
 *
 * The accessible name is a plain host attribute, so a call site overrides it
 * with either spelling — `aria-label="…"` or `[attr.aria-label]="…"` — since
 * template attributes are merged over host ones.
 */
@Directive({
    selector: 'button[ims-button-delete]',
    standalone: true,
    host: {
        class: 'ims-button-icon ims-button--delete',
        'aria-label': 'Delete',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonDelete extends ImsButtonBase {
    protected override resolveIcon(): string {
        return 'cancel';
    }
}

/**
 * The glyph pinned by {@link ImsButtonEdit}.
 *
 * Exported so chrome that sits alongside an edit affordance — a dialog title
 * over the same action, say — shows the same glyph without re-typing it, and
 * cannot drift if the preset ever picks a different one.
 */
export const IMS_BUTTON_EDIT_ICON = 'ink_pen';

/**
 * Edit affordance, and delete's counterpart: same shape and size, so a row
 * carrying both reads as one pair.
 *
 * Painted as an icon button, not as a preset of its own: the host carries the
 * same two classes `ims-button-icon` applies, so this rests, hovers, presses
 * and takes `ims-button-severity` exactly the way one does. That is where it
 * parts from delete, which rests quiet and pins its tone.
 * `ims-button--edit` stays on the host as a hook and styles nothing.
 *
 * Otherwise the same contract as {@link ImsButtonDelete} — visual only, glyph
 * pinned, `aria-label` overridable at the call site.
 */
@Directive({
    selector: 'button[ims-button-edit]',
    standalone: true,
    host: {
        class: 'ims-button--default ims-button-icon ims-button--edit',
        'aria-label': 'Edit',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonEdit extends ImsButtonBase {
    protected override resolveIcon(): string {
        return IMS_BUTTON_EDIT_ICON;
    }
}
