import {Component, ChangeDetectionStrategy, computed, inject} from '@angular/core';
import {CdkMenu, CdkMenuBar, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {Router, RouterLink, RouterLinkActive, RouterOutlet, isActive} from '@angular/router';
import {ImsIcon} from './components/ims-icon';

interface DemoLink {
    readonly path: string;
    readonly label: string;
}

interface DemoCategory {
    readonly label: string;
    readonly links: readonly DemoLink[];
}

const DEMO_CATEGORIES: readonly DemoCategory[] = [
    {
        label: 'טפסים וקלט',
        links: [
            {path: '/forms', label: 'טפסים וטבלה'},
            {path: '/selection', label: 'בחירה והשלמה'},
            {path: '/datepicker', label: 'תאריכים'},
            {path: '/pattern', label: 'תבניות קלט'},
            {path: '/format', label: 'פורמט מספרים'}
        ]
    },
    {
        label: 'פקדים',
        links: [
            {path: '/buttons', label: 'כפתורים'},
            {path: '/checkbox', label: 'תיבות סימון'},
            {path: '/radio', label: 'כפתורי בחירה'},
            {path: '/toggle-switch', label: 'מתגי בחירה'}
        ]
    },
    {
        label: 'חלונות והודעות',
        links: [
            {path: '/dialog', label: 'דיאלוגים'},
            {path: '/dropdown-panel', label: 'חלוניות נפתחות'},
            {path: '/tooltip', label: 'הסברים וחלוניות'},
            {path: '/snackbar', label: 'הודעות'},
            {path: '/error-popover', label: 'שגיאות'}
        ]
    },
    {
        label: 'פריסה וסרגלים',
        links: [
            {path: '/panel', label: 'פאנלים'},
            {path: '/scroll-container', label: 'גלילה'},
            {path: '/dock', label: 'סרגל הפעלה'},
            {path: '/process-toolbar', label: 'סרגל תהליך'}
        ]
    },
    {
        label: 'תצוגה',
        links: [
            {path: '/table', label: 'טבלאות'},
            {path: '/text-truncate', label: 'קיצור טקסט'},
            {path: '/icons', label: 'אייקונים'}
        ]
    },
    {
        label: 'מצבים',
        links: [
            {path: '/component-states', label: 'מצבי רכיבים'},
            {path: '/readonly', label: 'Readonly'},
            {path: '/focus-mode', label: 'מצב מיקוד'}
        ]
    }
];

@Component({
    selector: 'app-root',
    imports: [CdkMenu, CdkMenuBar, CdkMenuItem, CdkMenuTrigger, ImsIcon, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './app.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './app.scss'
})
export class App {
    private readonly router = inject(Router);

    // A category's trigger stays highlighted while any of its demos is the current route.
    protected readonly categories = DEMO_CATEGORIES.map((category) => {
        const linkActive = category.links.map((link) => isActive(link.path, this.router));

        return {...category, active: computed(() => linkActive.some((active) => active()))};
    });
}
