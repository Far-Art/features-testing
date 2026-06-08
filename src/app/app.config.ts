import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import {provideHttpClient} from '@angular/common/http';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import localeHe from '@angular/common/locales/he';

import {routes} from './app.routes';
import {provideImsDatepickerConfig} from './components/ims-datepicker/ims-datepicker.types';

registerLocaleData(localeHe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideImsDatepickerConfig({
      locale: 'he',
      zone: 'Asia/Jerusalem',
      firstDayOfWeek: 7
    }),
    { provide: LOCALE_ID, useValue: 'he-IL' }
  ]
};
