import {ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';
import {registerLocaleData} from '@angular/common';
import {provideHttpClient, withXhr} from '@angular/common/http';
import localeHe from '@angular/common/locales/he';

import {routes} from './app.routes';
import {provideImsDatepickerConfig} from './components/ims-datepicker';
import {provideImsErrorPopoverConfig} from './components/ims-error-popover';
import {provideImsSnackbarConfig} from './components/ims-snackbar';
import {provideImsTooltipConfig} from './components/ims-tooltip';


registerLocaleData(localeHe);

/**
 * Hebrew wording for every reason an `imsPattern` field refuses a change. A bound refusal
 * carries the limit it passed, and `{bound}` is where its sentence names it.
 */
const IMS_PATTERN_MESSAGES: Readonly<Record<string, string>> = {
    wholeNumber: 'ניתן להזין מספרים שלמים בלבד.',
    number: 'ניתן להזין מספרים בלבד.',
    sign: 'לא ניתן להזין ערך שלילי.',
    signPlacement: 'סימן מינוס מותר רק בתחילת הערך.',
    decimalPoint: 'ניתן להזין נקודה עשרונית אחת בלבד.',
    decimals: 'ניתן להזין עד שתי ספרות אחרי הנקודה.',
    // The maqaf keeps the prefix apart from a negative bound's own minus, and the isolate keeps
    // the number reading left to right inside the Hebrew sentence.
    min: 'לא ניתן להזין ערך נמוך מ־⁦{bound}⁩.',
    max: 'לא ניתן להזין ערך גבוה מ־⁦{bound}⁩.'
};

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
            firstDayOfWeek: 7
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
                imsDatepickerFilter: 'לא ניתן לבחור בתאריך זה.',
                imsPattern: (error) => {
                    const refusal = error as {
                        readonly message: string;
                        readonly reason: string;
                        readonly bound?: number;
                    };
                    // A sentence written on the field itself is already in the right words.
                    const hebrew = IMS_PATTERN_MESSAGES[refusal.reason] ?? refusal.message;
                    // Only a bound refusal carries a limit, and only its sentence has a slot.
                    return hebrew.replace('{bound}', String(refusal.bound));
                }
            }
        }),
        provideImsSnackbarConfig({
            visualStyle: 'accent',
            stackSize: 100
        }),
        provideImsTooltipConfig({
            // Instant. A tooltip that waits is a tooltip the user has already
            // given up on, and this application's are mostly short labels on
            // icon buttons where the wait was the whole cost.
            showDelay: 0,
            // The close keeps its grace period, which is doing different work:
            // it stops the bubble flickering as the pointer crosses a gap
            // between two adjacent controls.
            hideDelay: 100
        }),
        {
            provide: LOCALE_ID,
            useValue: 'he-IL'
        }
    ]
};
