import {ChangeDetectionStrategy, Component, HostListener, signal} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
    selector: 'app-dropdown',
    standalone: true,
    template: `
        <div class="dropdown">
            <button
                type="button"
                class="trigger"
                [attr.aria-expanded]="open()"
                aria-haspopup="menu"
                (click)="toggle()"
            >
                בחר אפשרות
            </button>

            <div class="panel" *ngIf="open()" role="menu">
                <button class="item" role="menuitem" type="button">אפשרות ראשונה</button>
                <button class="item" role="menuitem" type="button">אפשרות שנייה</button>
                <button class="item" role="menuitem" type="button">אפשרות שלישית</button>
            </div>
        </div>
    `,
    styleUrls: ['./dropdown.component.scss'],
    imports: [
        NgIf
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownComponent {
    open = signal(false);

    toggle(): void {
        this.open.update((value) => !value);
    }

    @HostListener('document:click', ['$event'])
    handleDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (!target) {
            return;
        }

        const isInside = target.closest('.dropdown');
        if (!isInside) {
            this.open.set(false);
        }
    }
}
