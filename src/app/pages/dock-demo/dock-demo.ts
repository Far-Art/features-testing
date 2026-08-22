import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
import {
    imsDuoIconEdit,
    imsDuoIconFilter,
    imsDuoIconFloppyDisk,
    imsDuoIconInfo,
    imsDuoIconList,
    imsDuoIconMultiSelect,
    imsDuoIconRemove,
    imsDuoIconSearch,
    imsDuoIconUser
} from '../../components/ims-duo-icon';
import {ImsDock} from '../../components/ims-dock/ims-dock';
import {ImsDockItem} from '../../components/ims-dock/ims-dock.model';

/** Showcases the {@link ImsDock} with live, user-tunable magnification controls. */
@Component({
    selector: 'app-dock-demo',
    standalone: true,
    imports: [ImsDock],
    templateUrl: './dock-demo.html',
    styleUrl: './dock-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockDemo {
    /** Demo icons rendered in the dock. */
    readonly items: readonly ImsDockItem[] = [
        {id: 'search', label: 'חיפוש', icon: imsDuoIconSearch},
        {id: 'profile', label: 'פרופיל', icon: imsDuoIconUser},
        {id: 'list', label: 'רשימה', icon: imsDuoIconList},
        {id: 'selection', label: 'בחירה', icon: imsDuoIconMultiSelect},
        {id: 'save', label: 'שמירה', icon: imsDuoIconFloppyDisk},
        {id: 'edit', label: 'עריכה', icon: imsDuoIconEdit},
        {id: 'filter', label: 'סינון', icon: imsDuoIconFilter},
        {id: 'info', label: 'מידע', icon: imsDuoIconInfo},
        {id: 'remove', label: 'הסרה', icon: imsDuoIconRemove, disabled: true}
    ];

    /** Resting icon size in pixels. */
    readonly baseSize = signal(36);

    /** Peak magnification multiplier (drives {@link maxSize}). */
    readonly maxScale = signal(1.3);

    /** Pixel radius over which neighbours are magnified. */
    readonly influenceRange = signal(80);

    /** Fully magnified size derived from base size and scale. */
    readonly maxSize = computed(() => Math.round(this.baseSize() * this.maxScale()));

    /** Last activated item, echoed back to the user. */
    readonly lastActivated = signal<ImsDockItem | null>(null);

    onActivated(item: ImsDockItem): void {
        this.lastActivated.set(item);
    }

    onNumberInput(target: EventTarget | null, setter: (value: number) => void): void {
        const value = Number((target as HTMLInputElement).value);
        if (!Number.isNaN(value)) {
            setter(value);
        }
    }
}
