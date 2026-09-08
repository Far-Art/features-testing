import {ChangeDetectionStrategy, Component, signal} from '@angular/core';

/** Presentational overlay panel that renders already-mapped error messages. */
@Component({
    selector: 'ims-error-popover-panel',
    standalone: true,
    template: `
        <ul class="ims-error-popover__list">
            @for (error of errors(); track $index) {
                <!--
                    A message follows its own script, not the field's: a Hebrew sentence in a
                    numeric, left-to-right field still needs its bullet and its full stop on
                    the right side.
                -->
                <li class="ims-error-popover__error" dir="auto">{{ error }}</li>
            }
        </ul>
    `,
    host: {
        class: 'ims-error-popover',
        role: 'status',
        'aria-live': 'polite',
        '[attr.id]': 'id()',
        '[attr.dir]': 'direction()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsErrorPopoverPanel {
    /** ID referenced by the attached control's ARIA attributes. */
    readonly id = signal('');
    /** Direction inherited from the attached host. */
    readonly direction = signal<'ltr' | 'rtl'>('ltr');
    /** Current display rows; updates do not recreate the panel component. */
    readonly errors = signal<readonly string[]>([]);
}
