import {Routes} from '@angular/router';

export const routes: Routes = [
    {
        path: 'forms',
        loadComponent: () =>
            import('./pages/form-layout-demo/form-layout-demo').then((module) => module.FormLayoutDemo)
    },
    {
        path: 'selection',
        loadComponent: () =>
            import('./pages/selection-demo/selection-demo').then((module) => module.SelectionDemo)
    },
    {
        path: 'buttons',
        loadComponent: () =>
            import('./pages/buttons-demo/buttons-demo').then((module) => module.ButtonsDemo)
    },
    {
        path: 'datepicker',
        loadComponent: () =>
            import('./pages/datepicker-demo/datepicker-demo').then((module) => module.DatepickerDemo)
    },
    {
        path: 'snackbar',
        loadComponent: () =>
            import('./pages/snackbar-demo/snackbar-demo').then((module) => module.SnackbarDemo)
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'forms'
    },
    {
        path: '**',
        redirectTo: 'forms'
    }
];
