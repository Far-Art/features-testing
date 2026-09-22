import {NgComponentOutlet, NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, TemplateRef, Type, signal} from '@angular/core';
import {ImsTooltipSeverity} from './ims-tooltip.types';

/**
 * Surface an {@link ImsPopover} paints, and the one attach path for both kinds
 * of content it accepts.
 *
 * A template and a component reach the overlay through the same portal this
 * way, so the directive has one lifecycle to manage rather than two, and the
 * surface keeps its own chrome — padding, tone, elevation — regardless of what
 * is inside it.
 *
 * State is plain signals set imperatively, matching `ImsErrorPopoverPanel`:
 * nothing binds to this component, because the directive attaches it by portal.
 */
@Component({
    selector: 'ims-popover-panel',
    standalone: true,
    imports: [NgComponentOutlet, NgTemplateOutlet],
    template: `
        @if (template(); as templateRef) {
            <ng-container [ngTemplateOutlet]="templateRef" />
        } @else if (component(); as componentType) {
            <ng-container [ngComponentOutlet]="componentType" [ngComponentOutletInputs]="inputs()" />
        }
    `,
    host: {
        class: 'ims-popover',
        role: 'dialog',
        '[attr.id]': 'id()',
        '[attr.dir]': 'direction()',
        '[class.ims-popover--info]': 'severity() === "info"',
        '[class.ims-popover--success]': 'severity() === "success"',
        '[class.ims-popover--warning]': 'severity() === "warning"',
        '[class.ims-popover--danger]': 'severity() === "danger"',
        '[class.ims-popover--interactive]': 'interactive()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsPopoverPanel {
    /** ID the host points at through `aria-controls`. */
    readonly id = signal('');

    /** Reading direction inherited from the host. */
    readonly direction = signal<'ltr' | 'rtl'>('ltr');

    /** Tone the surface is painted in. */
    readonly severity = signal<ImsTooltipSeverity>('info');

    /** Whether the surface takes the pointer. */
    readonly interactive = signal(true);

    /** Template content, when the call site passed one. */
    readonly template = signal<TemplateRef<unknown> | null>(null);

    /** Component content, when the call site passed a type instead. */
    readonly component = signal<Type<unknown> | null>(null);

    /** Inputs handed to component content. Ignored for a template. */
    readonly inputs = signal<Record<string, unknown>>({});
}
