import {ChangeDetectionStrategy, Component} from '@angular/core';

/** Presentational overlay panel that renders already-mapped error messages. */
@Component({
    selector: 'ims-error-popover-panel',
    standalone: true,
    template: `
        <ul class="ims-error-popover__list">
            @for (error of errors; track $index) {
                <li class="ims-error-popover__error">{{ error }}</li>
            }
        </ul>
    `,
    host: {
        class: 'ims-error-popover',
        role: 'status',
        'aria-live': 'polite',
        '[attr.id]': 'id',
        '[attr.dir]': 'direction'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsErrorPopoverPanel {
    /** ID referenced by the attached control's ARIA attributes. */
    id = '';
    /** Direction inherited from the attached host. */
    direction: 'ltr' | 'rtl' = 'ltr';
    /** Current display rows; updates do not recreate the panel component. */
    errors: readonly string[] = [];
}
