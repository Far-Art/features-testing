# FeaturesTesting

This project uses [Angular CLI](https://github.com/angular/angular-cli) version 22.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## ImsDatepicker

`ImsDatepicker` is a standalone, Angular-forms-compatible datepicker built around
Luxon. Its signal-based API is compatible with Angular 18 and later.

```ts
import {
  ImsDatepicker,
  provideImsDatepickerConfig
} from './app/components/ims-datepicker';

providers: [
  provideImsDatepickerConfig({
    min: DateTime.utc(1900, 1, 1),
    max: DateTime.utc(2100, 12, 31),
    locale: 'en',
    zone: 'local'
  })
]
```

```html
<ims-datepicker
  [formControl]="dateControl"
  format="dd/MM/yyyy"
  [min]="instanceMin"
  [max]="instanceMax"
/>

<ims-datepicker
  [(ngModel)]="monthMillis"
  format="MM/yyyy"
  monthDay="end"
  valueType="millis"
/>
```

The form value accepts either a Luxon `DateTime` or milliseconds. Set
`valueType="millis"` when a nullable numeric control cannot provide a value from
which the output type can be inferred. Date values are emitted at UTC midnight.
Millisecond inputs are first interpreted in the configured `zone`, then reduced
to their calendar date.

The component contributes `imsDatepickerParse`, `imsDatepickerMin`, and
`imsDatepickerMax` validation errors through Angular's `NG_VALIDATORS` mechanism.
Per-instance min/max values are clamped to the global strict range.
