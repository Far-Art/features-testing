import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
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
        {id: 'finder', label: 'מאתר', icon: '🧭'},
        {id: 'mail', label: 'דואר', icon: '✉️'},
        {id: 'calendar', label: 'יומן', icon: '📅'},
        {id: 'photos', label: 'תמונות', icon: '🌄'},
        {id: 'music', label: 'מוזיקה', icon: '🎵'},
        {id: 'maps', label: 'מפות', icon: '🗺️'},
        {id: 'notes', label: 'פתקים', icon: '📝'},
        {id: 'settings', label: 'הגדרות', icon: '⚙️'},
        {id: 'trash', label: 'אשפה', icon: '🗑️', disabled: true}
    ];

    /** Resting icon size in pixels. */
    readonly baseSize = signal(48);

    /** Peak magnification multiplier (drives {@link maxSize}). */
    readonly maxScale = signal(1.9);

    /** Pixel radius over which neighbours are magnified. */
    readonly influenceRange = signal(140);

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
