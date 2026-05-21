import {
    Directive,
    booleanAttribute,
    input,
    model
} from '@angular/core';

@Directive({
    selector: 'button[imsExpandCollapseButton]',
    standalone: true,
    host: {
        type: 'button',
        '[class.ims-expand-collapse-button]': 'true',
        '[class.ims-expand-collapse-button--expanded]': 'expanded()',
        '[class.ims-expand-collapse-button--disabled]': 'disabled()',
        '[disabled]': 'disabled()',
        '[attr.aria-expanded]': 'expanded() ? "true" : "false"',
        '[attr.aria-label]': 'expanded() ? collapseAriaLabel() : expandAriaLabel()',
        '(click)': 'toggle()'
    }
})
export class ImsExpandCollapseButtonDirective {
    readonly expanded = model(false);
    readonly disabled = input(false, {transform: booleanAttribute});
    readonly expandAriaLabel = input('Expand');
    readonly collapseAriaLabel = input('Collapse');

    toggle(): void {
        if (this.disabled()) return;
        this.expanded.update((expanded) => !expanded);
    }
}
