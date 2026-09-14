import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input
} from '@angular/core';
import {ImsSelectionLabels} from './ims-selection.types';
import {formatSelectionLabel} from './ims-selection.utils';

/**
 * Panel listing the selected values of a disabled or readonly multi selection.
 * The trigger stays a disclosure for it, so the values remain readable in full
 * while nothing on screen offers a way to change them.
 */
@Component({
    selector: 'ims-selection-readonly-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <h3 class="ims-selection-readonly-panel__title" [attr.id]="titleId()">{{ title() }}</h3>

        @if (values().length > 0) {
            <ul
                class="ims-selection-readonly-panel__list"
                role="list"
                [style.max-height.px]="maxHeight()"
            >
                @for (label of values(); track $index) {
                    <li class="ims-selection-readonly-panel__value">{{ label }}</li>
                }
            </ul>
        } @else {
            <p class="ims-selection-readonly-panel__empty">{{ labels().noneSelected }}</p>
        }
    `,
    host: {
        class: 'ims-selection-readonly-panel',
        role: 'region',
        tabindex: '-1',
        '[attr.aria-labelledby]': 'titleId()'
    }
})
export class ImsSelectionReadonlyPanel {
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /** Labels of the selected values, in selection order. */
    readonly values = input.required<readonly string[]>();

    /** Resolved texts of the owning component. */
    readonly labels = input.required<ImsSelectionLabels>();

    /** ID given to the title, which names the panel region. */
    readonly titleId = input.required<string>();

    /** Height the value list scrolls beyond. */
    readonly maxHeight = input<number | null>(null);

    protected readonly title = computed(() => {
        const count = this.values().length;
        const labels = this.labels();

        return count === 1
            ? labels.selectedOne
            : formatSelectionLabel(labels.selectedMany, {count});
    });

    /** Moves focus to the panel so keyboard users land on the list they opened. */
    focus(): void {
        this.elementRef.nativeElement.focus({preventScroll: true});
    }
}
