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
 * gets to choose. The inherited `icon` input therefore has no effect here.
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
 * Edit affordance, and delete's counterpart: same shape and size, same quiet
 * rest, on the interactive ramp instead of the danger one so a row carrying
 * both reads as one pair.
 *
 * Same contract as {@link ImsButtonDelete} — visual only, glyph pinned,
 * `aria-label` overridable at the call site.
 */
@Directive({
    selector: 'button[ims-button-edit]',
    standalone: true,
    host: {
        class: 'ims-button-icon ims-button--edit',
        'aria-label': 'Edit',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonEdit extends ImsButtonBase {
    protected override resolveIcon(): string {
        return 'ink_pen';
    }
}
