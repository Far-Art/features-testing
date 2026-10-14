import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {ImsButton} from '../../components/ims-button';
import {ImsDockItem} from '../../components/ims-dock/ims-dock.model';
import {
    imsDuoIconEdit,
    imsDuoIconFilter,
    imsDuoIconFloppyDisk,
    imsDuoIconInfo,
    imsDuoIconList,
    imsDuoIconMultiSelect,
    imsDuoIconSearch,
    imsDuoIconUser
} from '../../components/ims-duo-icon';
import {ImsProcessToolbar, ImsProcessToolbarMessage} from '../../components/ims-process-toolbar';

const INITIAL_MESSAGES: readonly ImsProcessToolbarMessage[] = [
    {id: 1, severity: 'success', text: 'הפוליסה 41-220-8873 נשמרה בהצלחה'},
    {
        id: 2,
        severity: 'warning',
        text:
            'החיוב החודשי של דנה כהן לא נסלק. יש לעדכן את אמצעי התשלום לפני סוף החודש, ' +
            'אחרת הכיסוי יבוטל באופן אוטומטי ותישלח הודעה לסוכן המטפל ולמחלקת הגבייה'
    },
    {id: 3, severity: 'info', text: 'נטען מסמך חדש לתיק הלקוח: אישור ניכוי מס לשנת 2026'},
    {
        id: 4,
        severity: 'danger',
        text:
            'העברת הנתונים למערכת הגבייה נכשלה. הפעולה תנוסה שוב בעוד חמש דקות; ' +
            'אם התקלה נמשכת יש לפנות לתמיכה הטכנית ולציין את מספר האירוע 7731-B'
    },
    {id: 5, severity: 'success', text: 'בדיקת KYC הושלמה ללקוח 30219'},
    {id: 6, text: 'תזכורת: פגישת חידוש פוליסה מחר בשעה 10:00'},
    {id: 7, severity: 'info', text: 'עודכנו תנאי ההנחה לחבילת הרכב המורחבת'},
    {id: 8, severity: 'warning', text: 'תוקף רישיון הסוכן יפוג בעוד 14 יום'},
    {id: 9, text: 'יעל לוי התחברה מעמדה חדשה'},
    {id: 10, severity: 'success', text: 'הסנכרון הלילי הושלם: 1,284 רשומות עודכנו'}
];

const SHORT_SAMPLES: readonly Omit<ImsProcessToolbarMessage, 'id'>[] = [
    {severity: 'success', text: 'השינויים נשמרו'},
    {severity: 'info', text: 'התקבלה הודעה חדשה מהסוכן'},
    {severity: 'warning', text: 'החיבור למערכת הדיווח איטי מהרגיל'},
    {text: 'המסמך נפתח לעריכה'},
    {severity: 'danger', text: 'הפעולה נכשלה, נסו שוב'}
];

const LONG_SAMPLE: Omit<ImsProcessToolbarMessage, 'id'> = {
    severity: 'info',
    text:
        'דוח החידושים לרבעון הרביעי מוכן לצפייה: 312 פוליסות מתחדשות החודש, מתוכן 41 ממתינות לאישור חיתום, ' +
        '18 דורשות עדכון פרטי תשלום, ו־7 סומנו לבדיקה ידנית בעקבות שינוי בפרופיל הסיכון של הלקוח'
};

/** Showcases {@link ImsProcessToolbar} docked at the bottom of a mock workspace. */
@Component({
    selector: 'app-process-toolbar-demo',
    standalone: true,
    imports: [ImsButton, ImsProcessToolbar],
    templateUrl: './process-toolbar-demo.html',
    styleUrl: './process-toolbar-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessToolbarDemo {
    readonly dockItems: readonly ImsDockItem[] = [
        {id: 'search', label: 'חיפוש', icon: imsDuoIconSearch},
        {id: 'profile', label: 'פרופיל', icon: imsDuoIconUser},
        {id: 'list', label: 'רשימה', icon: imsDuoIconList},
        {id: 'selection', label: 'בחירה', icon: imsDuoIconMultiSelect},
        {id: 'save', label: 'שמירה', icon: imsDuoIconFloppyDisk},
        {id: 'edit', label: 'עריכה', icon: imsDuoIconEdit},
        {id: 'filter', label: 'סינון', icon: imsDuoIconFilter},
        {id: 'info', label: 'מידע', icon: imsDuoIconInfo}
    ];

    readonly messages = signal<readonly ImsProcessToolbarMessage[]>(INITIAL_MESSAGES);
    readonly expanded = signal(false);
    readonly lastActivated = signal<ImsDockItem | null>(null);

    private nextId = INITIAL_MESSAGES.length + 1;
    private nextSample = 0;

    addMessage(): void {
        const sample = SHORT_SAMPLES[this.nextSample % SHORT_SAMPLES.length];
        this.nextSample++;
        this.prepend(sample);
    }

    addLongMessage(): void {
        this.prepend(LONG_SAMPLE);
    }

    clearMessages(): void {
        this.messages.set([]);
    }

    resetMessages(): void {
        this.messages.set(INITIAL_MESSAGES);
    }

    private prepend(sample: Omit<ImsProcessToolbarMessage, 'id'>): void {
        this.messages.update((messages) => [{...sample, id: this.nextId++}, ...messages]);
    }
}
