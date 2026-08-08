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

## Supported Value Types

```ts
type ImsDatepickerMomentValue =
    | Moment
    | number
    | null
    | undefined;
```

Accepted Angular form values, direct values, and `min`/`max` constraints are:

| Value | Meaning |
| --- | --- |
| `Moment` | A valid Moment value; its calendar date is normalized by the component. |
| `number` | A finite epoch-millisecond instant interpreted in the configured `zone`. |
| `null` | An explicitly empty value. |
| `undefined` | An unset value; treated as empty. |

The component never writes a string to the Angular form. Text entered in the
native input is parsed and then emitted as `Moment`, `number`, or `null`. The
`format` input controls full-date versus month-only precision; it does not
change the value's TypeScript type.

Output is controlled by `valueType`:

| `valueType` | Committed output |
| --- | --- |
| `'moment'` | A UTC `Moment` normalized to the selected calendar date. |
| `'millis'` | An epoch-millisecond `number` for UTC midnight. |
| `null` or omitted | Inferred from the most recent valid `Moment` or `number`; defaults to `'moment'`. |
