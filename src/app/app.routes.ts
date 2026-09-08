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
        path: 'scroll-container',
        loadComponent: () =>
            import('./pages/scroll-container-demo/scroll-container-demo').then(
                (module) => module.ScrollContainerDemo
            )
    },
    {
        path: 'datepicker',
        loadComponent: () =>
            import('./pages/datepicker-demo/datepicker-demo').then((module) => module.DatepickerDemo)
    },
    {
        path: 'error-popover',
        loadComponent: () =>
            import('./pages/error-popover-demo/error-popover-demo').then(
                (module) => module.ErrorPopoverDemo
            )
    },
    {
        path: 'snackbar',
        loadComponent: () =>
            import('./pages/snackbar-demo/snackbar-demo').then((module) => module.SnackbarDemo)
    },
    {
        path: 'dialog',
        loadComponent: () =>
            import('./pages/dialog-demo/dialog-demo').then((module) => module.DialogDemo)
    },
    {
        path: 'dock',
        loadComponent: () =>
            import('./pages/dock-demo/dock-demo').then((module) => module.DockDemo)
    },
    {
        path: 'readonly',
        loadComponent: () =>
            import('./pages/readonly-demo/readonly-demo').then((module) => module.ReadonlyDemo)
    },
    {
        path: 'focus-mode',
        loadComponent: () =>
            import('./pages/focus-mode-demo/focus-mode-demo').then((module) => module.FocusModeDemo)
    },
    {
        path: 'component-states',
        loadComponent: () =>
            import('./pages/component-states-demo/component-states-demo').then(
                (module) => module.ComponentStatesDemo
            )
    },
    {
        path: 'pattern',
        loadComponent: () =>
            import('./pages/pattern-demo/pattern-demo').then((module) => module.PatternDemo)
    },
    {
        path: 'format',
        loadComponent: () =>
            import('./pages/format-demo/format-demo').then((module) => module.FormatDemo)
    },
    {
        path: 'icons',
        loadComponent: () =>
            import('./pages/icons-demo/icons-demo').then((module) => module.IconsDemo)
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
