import {TemplateRef, Type} from '@angular/core';
import type {ImsDropdownPanelRef} from './ims-dropdown-panel-ref';

/**
 * Side of the trigger the panel opens on.
 *
 * `before` and `after` are logical and follow the reading direction, so under
 * RTL `before` is the trigger's right side.
 */
export type ImsDropdownPanelPosition = 'below' | 'above' | 'before' | 'after';

/**
 * Which edge of the trigger the panel lines up with, along the side it opens on.
 *
 * Below or above, `start` and `end` are the trigger's inline edges and follow
 * the reading direction. Before or after, they are its top and bottom.
 */
export type ImsDropdownPanelAlign = 'start' | 'center' | 'end';

/**
 * Where focus goes when the panel opens.
 *
 * `first-tabbable` honours a `cdkFocusInitial` element inside the content
 * first, and falls back to the panel itself when there is nothing to tab to.
 */
export type ImsDropdownPanelAutoFocus = 'first-tabbable' | 'panel';

/** What the trigger can open: an `<ng-template>` or a component type. */
export type ImsDropdownPanelContent = TemplateRef<ImsDropdownPanelTemplateContext> | Type<unknown>;

/**
 * Context a template rendered in the panel receives.
 *
 * ```html
 * <ng-template #actions let-panel>
 *     <button ims-button (click)="panel.close('archive')">Archive</button>
 * </ng-template>
 * ```
 */
export interface ImsDropdownPanelTemplateContext<R = unknown> {
    /** The open panel, for closing it with a result. */
    readonly $implicit: ImsDropdownPanelRef<R>;
}
