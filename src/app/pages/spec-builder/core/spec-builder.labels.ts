import {SpecBlockCategory, SpecBuilderMode} from './spec-builder.types';

/**
 * Every string the builder's own interface shows.
 *
 * The captions of a block or a view belong to its definition instead, so that
 * a block stays one file: see `blocks/` and `views/index.ts`.
 */
export const SPEC_LABELS = {
    untitled: 'אפיון ללא שם',
    pageName: (number: number) => `עמוד ${number}`,
    pageCopyName: (name: string) => `${name} (עותק)`,
    exit: 'יציאה מבונה האפיונים',

    toolbar: {
        label: 'סרגל הכלים של בונה האפיונים',
        documentName: 'שם האפיון',
        newDocument: 'אפיון חדש',
        open: 'פתיחת קובץ אפיון',
        save: 'שמירה לקובץ',
        undo: 'ביטול פעולה (Ctrl+Z)',
        redo: 'ביצוע מחדש (Ctrl+Shift+Z)',
        modes: 'מצב עבודה',
        showGrid: 'הצגת רשת',
        snapToGrid: 'הצמדה לרשת',
        gridSize: 'גודל משבצת ברשת',
        gridSizeOption: (size: number) => `${size}px`,
        showNumbers: 'מספור הרכיבים',
        zoomOut: 'הקטנה (Ctrl+-)',
        zoomIn: 'הגדלה (Ctrl++)',
        zoomFit: 'התאמה למסך',
        zoomReset: 'גודל אמיתי (Ctrl+0)',
        zoomLevel: 'רמת הזום',
        capture: 'צילום העמוד',
        captureTimer: 'צילום בעוד 3 שניות, כדי להספיק לפתוח רשימה או חלונית',
        captureCountdown: (seconds: number) => `צילום בעוד ${seconds}`,
        stopSharing: 'הפסקת שיתוף הכרטיסייה',
        exportReference: 'הורדת מסמך למפתחים (Markdown)'
    },

    modes: {
        edit: 'עריכה',
        preview: 'תצוגה מקדימה',
        inspect: 'עיון למפתחים'
    } satisfies Record<SpecBuilderMode, string>,

    palette: {
        title: 'רכיבים',
        hint: 'גררו רכיב אל העמוד, או לחצו עליו כדי להוסיף אותו.',
        randomLabels: 'תוויות אקראיות לרכיבים חדשים',
        categories: {
            shapes: 'צורות וטקסט',
            actions: 'פעולות',
            fields: 'שדות',
            choices: 'בחירה',
            layout: 'מבנה ותצוגה'
        } satisfies Record<SpecBlockCategory, string>
    },

    pages: {
        label: 'עמודי האפיון',
        add: 'עמוד חדש',
        duplicate: 'שכפול העמוד הנוכחי',
        itemCount: (count: number) => `${count} רכיבים`
    },

    elements: {
        tabs: 'תוכן העמודה',
        add: 'הוספה',
        list: (count: number) => `רשימה (${count})`,
        empty: 'אין עדיין רכיבים בעמוד.',
        locked: 'מיקום וגודל נעולים'
    },

    canvas: {
        label: 'העמוד',
        missingBlock: (type: string) => `רכיב לא מוכר: ${type}`,
        item: (label: string, number: number) => `${label} ${number}`,
        locked: 'נעול',
        typeHint: 'לחיצה כפולה או Enter: הקלדה בשדה',
        zoneEmpty: 'גררו לכאן רכיבים'
    },

    inspector: {
        label: 'מאפיינים',
        documentTitle: 'כל העמודים',
        title: 'שם התהליך / הכלי',
        titleHint: 'מוצג בכותרת של כל עמודי האפיון.',
        pageTitle: 'הגדרות העמוד',
        pageName: 'שם העמוד',
        duplicatePage: 'שכפול העמוד',
        deletePage: 'מחיקת העמוד',
        movePageEarlier: 'הקדמת העמוד',
        movePageLater: 'דחיית העמוד',
        pageHint: 'בחרו רכיב בעמוד כדי לערוך אותו. מקש Tab עובר בין הרכיבים, החיצים מזיזים ו־Delete מוחק.',
        view: 'פריסה',
        pagePreset: 'גודל מוכן',
        customSize: 'גודל אחר',
        geometry: 'מיקום וגודל',
        geometryHint: 'בפיקסלים, מהפינה העליונה בתחילת האזור.',
        lock: 'נעילת מיקום וגודל',
        x: 'מיקום אופקי',
        y: 'מיקום אנכי',
        width: 'רוחב',
        height: 'גובה',
        hug: 'לפי התוכן',
        zone: 'אזור',
        settings: 'הגדרות',
        pickOne: 'אפשר לסמן ערך אחד. סימון ערך אחר מחליף אותו.',
        pickMany: 'אפשר לסמן כמה ערכים.',
        noChoices: 'אין עדיין אפשרויות. הוסיפו אותן בשדה האפשרויות.',
        note: 'הערה למפתחים',
        notePlaceholder: 'התנהגות, מקור הנתונים, מצבים מיוחדים…',
        duplicate: 'שכפול',
        bringToFront: 'הבאה לחזית',
        sendToBack: 'שליחה לרקע',
        remove: 'מחיקה'
    },

    listEditor: {
        row: (rowLabel: string, number: number) => `${rowLabel} ${number}`,
        add: (rowLabel: string) => `הוספת ${rowLabel}`,
        moveEarlier: 'העברה למעלה',
        moveLater: 'העברה למטה',
        remove: 'מחיקה',
        empty: 'הרשימה ריקה.'
    },

    header: {
        noTitle: 'שם התהליך / הכלי'
    },

    tokenPicker: {
        none: 'ללא',
        open: 'בחירת צבע',
        close: 'סגירת רשימת הצבעים',
        empty: 'לא נמצאו טוקנים של צבע בגיליונות הסגנון.'
    },

    reference: {
        label: 'עיון למפתחים',
        hint: 'לחצו על רכיב בעמוד או ברשימה כדי לראות את ההגדרות שלו.',
        empty: 'אין רכיבים בעמוד.',
        list: 'רכיבים בעמוד',
        downloadMarkdown: 'הורדת Markdown',
        copyMarkdown: 'העתקת Markdown',
        copySnippet: 'העתקת הקוד',
        copied: 'הועתק ללוח.',
        copyFailed: 'ההעתקה נכשלה.',
        selector: 'סלקטור',
        zone: 'אזור',
        position: 'מיקום',
        size: 'גודל',
        settings: 'הגדרות',
        note: 'הערה',
        snippet: 'קוד',
        view: 'פריסה',
        page: 'גודל העמוד',
        title: 'תהליך / כלי',
        items: 'רכיבים',
        number: 'מס׳',
        component: 'רכיב',
        none: '—',
        hugAxis: 'לפי התוכן',
        noToken: 'ללא'
    },

    capture: {
        unsupported: 'הדפדפן לא מאפשר לצלם את הכרטיסייה. צלמו ב־Chrome או ב־Edge, בכתובת https או localhost.',
        cancelled: 'הצילום בוטל.',
        wrongSurface: 'כדי לצלם את העמוד, בחרו בחלון השיתוף את הכרטיסייה הנוכחית.',
        partial: 'חלק מהעמוד לא הוצג על המסך ולכן חסר בתמונה. לחצו על "התאמה למסך" וצלמו שוב.',
        failed: 'הצילום נכשל.',
        title: 'צילום העמוד',
        preview: 'תמונת העמוד שצולמה',
        size: (width: number, height: number) => `${width} × ${height} פיקסלים`,
        zoomNote: (percent: number) => `צולם בזום ${percent}%. לתמונה בגודל אמיתי צלמו בזום 100%.`,
        copy: 'העתקה',
        download: 'הורדה',
        close: 'סגירה',
        copied: 'התמונה הועתקה ללוח.',
        copyFailed: 'לא ניתן להעתיק את התמונה מכאן. הורידו אותה במקום.'
    },

    files: {
        newTitle: 'ליצור אפיון חדש?',
        newMessage: 'כל עמודי האפיון הנוכחי יוחלפו בעמוד ריק. אפשר לחזור אליהם עם "ביטול פעולה".',
        deletePageTitle: (name: string) => `למחוק את "${name}"?`,
        deletePageMessage: 'העמוד וכל הרכיבים שבו יימחקו. אפשר לשחזר אותו עם "ביטול פעולה".',
        opened: (name: string) => `האפיון "${name}" נפתח.`,
        invalid: 'הקובץ אינו קובץ אפיון תקין.',
        version: 'הקובץ נוצר בגרסה אחרת של בונה האפיונים ולא ניתן לפתוח אותו.'
    }
};
