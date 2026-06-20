import {ChangeDetectionStrategy, Component, ElementRef, inject, input, numberAttribute, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImsDockItem as ImsDockItemData} from './ims-dock.model';

/**
 * Presentational icon used inside {@link ImsDock}.
 *
 * The parent owns the magnification maths and feeds the resolved pixel `size`; this
 * component only paints the glyph, tooltip and optional badge, and reports pointer /
 * focus / activation intent back up so the dock can update its shared pointer signal.
 */
@Component({
    selector: 'ims-dock-item',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './ims-dock-item.html',
    styleUrl: './ims-dock-item.scss',
    host: {
        class: 'ims-dock-item',
        '[style.--ims-dock-item-size.px]': 'size()',
        '[class.ims-dock-item--disabled]': 'item().disabled'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsDockItem {
    /** Host element, read by the dock to snapshot resting centres. */
    readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** The data for this icon. */
    readonly item = input.required<ImsDockItemData>();

    /** Current magnified size in pixels, supplied by the parent dock. */
    readonly size = input.required({transform: numberAttribute});

    /** Emitted when the icon gains keyboard focus (dock centres the wave on it). */
    readonly focused = output<void>();

    /** Emitted when the icon loses keyboard focus. */
    readonly blurred = output<void>();

    /** Emitted when the icon is activated by click or keyboard. */
    readonly activated = output<ImsDockItemData>();

    onActivate(event: Event): void {
        const data = this.item();
        if (data.disabled) {
            event.preventDefault();
            return;
        }
        this.activated.emit(data);
    }
}
