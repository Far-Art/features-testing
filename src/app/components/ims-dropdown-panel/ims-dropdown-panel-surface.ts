import {NgComponentOutlet, NgTemplateOutlet} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Injector,
    TemplateRef,
    Type,
    inject,
    signal
} from '@angular/core';
import {ImsDropdownPanelTemplateContext} from './ims-dropdown-panel.types';

/**
 * The surface an {@link ImsDropdownPanelTrigger} opens, and the one attach path
 * for both kinds of content.
 *
 * The trigger attaches it through a portal whose injector provides the opening's
 * `ImsDropdownPanelRef`. Component content finds the ref by inheriting this
 * surface's injector. Template content would not, since a template resolves from
 * where it was declared, so the same injector is handed to the template outlet
 * explicitly: a component inside an `<ng-template>` can inject the ref too.
 *
 * State is plain signals set imperatively, matching `ImsPopoverPanel`: nothing
 * binds to this component, because the trigger attaches it by portal.
 */
@Component({
    selector: 'ims-dropdown-panel-surface',
    standalone: true,
    imports: [NgComponentOutlet, NgTemplateOutlet],
    template: `
        @if (template(); as templateRef) {
            <ng-container
                [ngTemplateOutlet]="templateRef"
                [ngTemplateOutletContext]="context()"
                [ngTemplateOutletInjector]="injector"
            />
        } @else if (component(); as componentType) {
            <ng-container [ngComponentOutlet]="componentType" [ngComponentOutletInputs]="inputs()" />
        }
    `,
    host: {
        class: 'ims-dropdown-panel',
        role: 'dialog',
        // Focusable by script only, so focus has somewhere to land when the
        // content holds nothing tabbable, without adding a tab stop.
        tabindex: '-1',
        '[attr.id]': 'id()',
        '[attr.dir]': 'direction()',
        '[attr.aria-label]': 'ariaLabel()',
        '[class]': 'panelClass()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsDropdownPanelSurface {
    protected readonly injector = inject(Injector);

    /** ID the trigger points at through `aria-controls`. */
    readonly id = signal('');

    /** Reading direction inherited from the trigger. */
    readonly direction = signal<'ltr' | 'rtl'>('ltr');

    /** Accessible name of the dialog. */
    readonly ariaLabel = signal<string | null>(null);

    /** Classes the call site adds, for styling one panel without touching the rest. */
    readonly panelClass = signal<string | readonly string[] | null>(null);

    /** Template content, when the call site passed one. */
    readonly template = signal<TemplateRef<ImsDropdownPanelTemplateContext> | null>(null);

    /** Context handed to template content. */
    readonly context = signal<ImsDropdownPanelTemplateContext | null>(null);

    /** Component content, when the call site passed a type instead. */
    readonly component = signal<Type<unknown> | null>(null);

    /** Inputs handed to component content. Ignored for a template. */
    readonly inputs = signal<Record<string, unknown>>({});
}
