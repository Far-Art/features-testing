# IMS Experimental Datepicker

`ImsDatepickerExperimental` contains the Temporal API implementation. Its
Angular forms value is `Temporal.PlainDate | number | null | undefined`; set
`valueType="millis"` to force epoch-millisecond output when the initial value is
empty.

```ts
import {
    ImsDatepickerExperimental,
    provideImsDatepickerExperimentalConfig
} from './components/ims-datepicker-experimental';
```

```html
<ims-datepicker-experimental [formControl]="date" />
```

The component shares the global `src/styles/ims-datepicker.scss` styles with
the stable and Moment implementations.
