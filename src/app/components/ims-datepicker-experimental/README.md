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

## Supported Value Types

```ts
type ImsDatepickerExperimentalValue =
    | Temporal.PlainDate
    | number
    | null
    | undefined;
```

Accepted Angular form values, direct values, and `min`/`max` constraints are:

| Value | Meaning |
| --- | --- |
| `Temporal.PlainDate` | A valid calendar date without a time or time zone. |
| `number` | A finite epoch-millisecond instant interpreted in the configured `zone`. |
| `null` | An explicitly empty value. |
| `undefined` | An unset value; treated as empty. |

The component never writes a string to the Angular form. Text entered in the
native input is parsed and then emitted as `Temporal.PlainDate`, `number`, or
`null`. The `format` input controls full-date versus month-only precision; it
does not change the value's TypeScript type.

Output is controlled by `valueType`:

| `valueType` | Committed output |
| --- | --- |
| `'temporal'` | A `Temporal.PlainDate`. |
| `'millis'` | An epoch-millisecond `number` for UTC midnight. |
| `null` or omitted | Inferred from the most recent valid `Temporal.PlainDate` or `number`; defaults to `'temporal'`. |

## Injectable Date Parser

This adapter uses the shared `IMS_DATEPICKER_PARSER` from `ims-datepicker`.
The parser returns UTC-midnight epoch milliseconds, which this component
converts to `Temporal.PlainDate`. Import `ImsDatepickerParser`,
`ImsDatepickerParserOptions`, and `provideImsDatepickerParser` from this package
to register the same custom parser API described in the stable datepicker guide.
