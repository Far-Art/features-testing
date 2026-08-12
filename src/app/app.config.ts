import {ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';
import {registerLocaleData} from '@angular/common';
import {provideHttpClient, withXhr} from '@angular/common/http';
import localeHe from '@angular/common/locales/he';

import {routes} from './app.routes';
import {provideImsDatepickerConfig} from './components/ims-datepicker';
import {provideImsErrorPopoverConfig} from './components/ims-error-popover';
import {provideImsSnackbarConfig} from './components/ims-snackbar';


registerLocaleData(localeHe);

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({eventCoalescing: true}),
        provideHttpClient(withXhr()),
        provideRouter(routes),
        provideImsDatepickerConfig({
            rangeMin: Date.UTC(1900, 0, 1),
            rangeMax: Date.UTC(2200, 11, 31),
            locale: 'he',
            zone: 'Asia/Jerusalem',
            firstDayOfWeek: 7,
            labels: {
                openCalendar: 'פתח לוח שנה',
                closeCalendar: 'סגור לוח שנה',
                clearDate: 'נקה תאריך',
                changeCalendarView: 'שנה תצוגת לוח שנה',
                calendarFor: 'לוח שנה עבור {period}',
                chooseMonthIn: 'בחר חודש ב-{period}',
                chooseYearFrom: 'בחר שנה מתוך {period}',
                previousMonth: 'החודש הקודם',
                nextMonth: 'החודש הבא',
                previousYear: 'השנה הקודמת',
                nextYear: 'השנה הבאה',
                previousYears: '{count} השנים הקודמות',
                nextYears: '{count} השנים הבאות',
                startOfMonth: 'תחילת החודש',
                today: 'היום',
                endOfMonth: 'סוף החודש',
                week: 'שבוע'
            }
        }),
        provideImsErrorPopoverConfig({
            duration: 6000,
            errorMapper: {
                required: 'זהו שדה חובה.',
                requiredTrue: 'יש לאשר שדה זה.',
                email: 'יש להזין כתובת דוא״ל תקינה.',
                minlength: 'יש להזין לפחות {requiredLength} תווים.',
                maxlength: 'יש להזין לכל היותר {requiredLength} תווים.',
                min: 'הערך חייב להיות לפחות {min}.',
                max: 'הערך חייב להיות לכל היותר {max}.',
                pattern: 'יש להזין ערך בתבנית הנדרשת.',
                imsDatepickerParse: 'יש להזין תאריך תקין.',
                imsDatepickerMin: 'התאריך לא יכול להיות מוקדם מ-{minFormatted}.',
                imsDatepickerMax: 'התאריך לא יכול להיות מאוחר מ-{maxFormatted}.',
                imsDatepickerFilter: 'לא ניתן לבחור בתאריך זה.'
            }
        }),
        provideImsSnackbarConfig({
            visualStyle: 'accent',
            stackSize: 100
        }),
        {
            provide: LOCALE_ID,
            useValue: 'he-IL'
        }
    ]
};
