import {NgComponentOutlet} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Injector,
    Type,
    inject
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {FetchIndicator} from '../fetch-indicator/fetch-indicator.component';
import {ImsSnackbarRef} from './ims-snackbar-ref';
import {IMS_SNACKBAR_CONFIG, ImsSnackbarConfig, ImsSnackbarSeverity} from './ims-snackbar.types';

const SNACKBAR_ICONS: Record<ImsSnackbarSeverity, string> = {
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`
};

const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

@Component({
    selector: 'ims-snackbar',
    standalone: true,
    imports: [NgComponentOutlet, FetchIndicator],
    templateUrl: './ims-snackbar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-snackbar',
        role: 'status',
        '[attr.aria-live]': 'snackbarRef.politeness()',
        '[attr.dir]': 'config.direction',
        '[class.ims-snackbar--soft]': 'config.visualStyle === "soft"',
        '[class.ims-snackbar--accent]': 'config.visualStyle === "accent"',
        '[class.ims-snackbar--dark]': 'config.visualStyle === "dark"',
        '[class.ims-snackbar--info]': 'snackbarRef.severity() === "info"',
        '[class.ims-snackbar--success]': 'snackbarRef.severity() === "success"',
        '[class.ims-snackbar--warning]': 'snackbarRef.severity() === "warning"',
        '[class.ims-snackbar--danger]': 'snackbarRef.severity() === "danger"',
        '[class.ims-snackbar--progress]': 'snackbarRef.isProgress()'
    }
})
export class ImsSnackbar {
    readonly snackbarRef = inject(ImsSnackbarRef);
    readonly config = inject(IMS_SNACKBAR_CONFIG) as ImsSnackbarConfig;
    readonly contentInjector = inject(Injector);

    contentComponent: Type<unknown> | null = null;

    private readonly sanitizer = inject(DomSanitizer);
    private readonly safeIcons = Object.fromEntries(
        Object.entries(SNACKBAR_ICONS).map(([k, v]) => [k, this.sanitizer.bypassSecurityTrustHtml(v)])
    ) as Record<ImsSnackbarSeverity, SafeHtml>;
    readonly closeIcon: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(CLOSE_ICON);

    get icon(): SafeHtml {
        return this.safeIcons[this.snackbarRef.severity()];
    }
}
