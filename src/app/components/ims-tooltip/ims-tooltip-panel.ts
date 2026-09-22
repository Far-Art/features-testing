import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {ImsTooltipSeverity} from './ims-tooltip.types';

/**
 * The painted text bubble.
 *
 * Attached once by {@link ImsTooltipService} and reused for every tooltip in the
 * application, so its state is plain signals set imperatively rather than
 * inputs — there is no template binding it, and no second instance to bind.
 *
 * `dir="auto"` because a tooltip's text follows its own script, not the host's:
 * a Hebrew sentence explaining a left-to-right numeric field still reads from
 * the right.
 */
@Component({
    selector: 'ims-tooltip-panel',
    standalone: true,
    template: '{{ message() }}',
    host: {
        class: 'ims-tooltip',
        role: 'tooltip',
        dir: 'auto',
        '[attr.id]': 'id()',
        '[class.ims-tooltip--info]': 'severity() === "info"',
        '[class.ims-tooltip--success]': 'severity() === "success"',
        '[class.ims-tooltip--warning]': 'severity() === "warning"',
        '[class.ims-tooltip--danger]': 'severity() === "danger"'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsTooltipPanel {
    /** ID the describing host points at. Changes as the shared panel is re-aimed. */
    readonly id = signal('');

    /** Text currently displayed. */
    readonly message = signal('');

    /** Tone the bubble is painted in. */
    readonly severity = signal<ImsTooltipSeverity>('info');
}
