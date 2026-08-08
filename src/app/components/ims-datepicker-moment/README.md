# IMS Moment Datepicker

`ImsDatepickerMoment` is the Moment-specific datepicker implementation. Its
Angular forms value is `Moment | number | null | undefined`; set
`valueType="millis"` to force epoch-millisecond output when the initial value is
empty.

```ts
import {
    ImsDatepickerMoment,
    provideImsDatepickerMomentConfig
} from './components/ims-datepicker-moment';
```

```html
<ims-datepicker-moment [formControl]="date" />
```

The component shares the global `src/styles/ims-datepicker.scss` styles with
the other datepicker implementations.
