import {Directive, forwardRef} from '@angular/core';
import {IMS_TOOLTIP_DEFAULTS} from '../ims-tooltip/ims-tooltip.types';
import {ImsButtonIcon} from './ims-button';
import {ImsButtonIconPreset} from './ims-button-presets';

// The row actions' old spellings, kept only while call sites move to
// `<button ims-button-icon ims-button-icon-preset="…">`. Each is that preset
// under another name: it pins the preset and inherits everything else from
// ImsButtonIcon — glyph, name, tone, classes — so the two spellings cannot
// drift apart while both exist. Deleting this file, and its line in the
// barrel, finishes the migration.
//
// Each still provides IMS_TOOLTIP_DEFAULTS itself: `providers` is the one
// piece of directive metadata a subclass with a decorator of its own does not
// inherit.

/**
 * Delete affordance.
 *
 * @deprecated Use `<button ims-button-icon ims-button-icon-preset="delete">`,
 * which this now is. The `ims-button-icon-preset` input it inherits is accepted
 * and ignored.
 */
@Directive({
    selector: 'button[ims-button-delete]',
    standalone: true,
    providers: [{provide: IMS_TOOLTIP_DEFAULTS, useExisting: forwardRef(() => ImsButtonDelete)}]
})
export class ImsButtonDelete extends ImsButtonIcon {
    protected override resolvePreset(): ImsButtonIconPreset {
        return 'delete';
    }
}

/**
 * Edit affordance.
 *
 * @deprecated Use `<button ims-button-icon ims-button-icon-preset="edit">`,
 * which this now is. The `ims-button-icon-preset` input it inherits is accepted
 * and ignored.
 */
@Directive({
    selector: 'button[ims-button-edit]',
    standalone: true,
    providers: [{provide: IMS_TOOLTIP_DEFAULTS, useExisting: forwardRef(() => ImsButtonEdit)}]
})
export class ImsButtonEdit extends ImsButtonIcon {
    protected override resolvePreset(): ImsButtonIconPreset {
        return 'edit';
    }
}
