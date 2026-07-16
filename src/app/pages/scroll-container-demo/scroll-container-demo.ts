import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ImsScrollContainer} from '../../components/ims-scroll-container/ims-scroll-container';

@Component({
    selector: 'app-scroll-container-demo',
    standalone: true,
    imports: [ImsScrollContainer],
    templateUrl: './scroll-container-demo.html',
    styleUrl: './scroll-container-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollContainerDemo {
    readonly horizontalItems = [
        'פרטי לקוח',
        'כתובת למשלוח',
        'אמצעי תשלום',
        'בדיקת מלאי',
        'מסמכים',
        'אישורים',
        'היסטוריה',
        'פעולות מתקדמות'
    ];

    readonly verticalItems = Array.from({length: 18}, (_, index) => ({
        title: `משימה ${index + 1}`,
        description: 'טקסט שורה בתוך אזור גלילה אנכי עם קצוות מטושטשים לפי מצב הגלילה.'
    }));

    readonly columns = [
        'שם',
        'סטטוס',
        'אחראי',
        'עדיפות',
        'תאריך יעד',
        'אזור',
        'תקציב',
        'הערות'
    ];

    readonly rows = Array.from({length: 16}, (_, index) => ({
        name: `פרויקט ${index + 1}`,
        status: index % 3 === 0 ? 'תקוע' : index % 2 === 0 ? 'בתהליך' : 'מוכן',
        owner: ['דנה', 'אורי', 'מיכל', 'יונתן'][index % 4],
        priority: ['גבוהה', 'בינונית', 'נמוכה'][index % 3],
        dueDate: `2026-08-${String((index % 24) + 1).padStart(2, '0')}`,
        region: ['צפון', 'מרכז', 'דרום'][index % 3],
        budget: `${(index + 2) * 1250} ₪`,
        notes: 'שורה רחבה בכוונה כדי לייצר גלילה אופקית.'
    }));
}
