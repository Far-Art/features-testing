# IMS Datepicker Moment Value Handler

The Moment adapter uses the shared `ImsDatepicker` component. It converts valid
Moment objects and epoch-millisecond numbers into the component's internal UTC
calendar representation, and creates UTC Moment objects for concrete outputs.

Per-instance usage:

```ts
import {ImsDatepicker} from '../ims-datepicker';
import {
    ImsDatepickerMomentValue,
    ImsDatepickerMomentValueHandlerDirective
} from '../ims-datepicker-moment';
```

```html
<ims-datepicker
    imsDatepickerMoment
    [formControl]="momentDate"
/>
```

Use `ImsDatepickerMomentValue` for the form value type:

```ts
type ImsDatepickerMomentValue = Moment | number | null | undefined;
```

To select Moment for every datepicker under an injector instead, register:

```ts
provideImsDatepickerMomentValueHandler()
```

`valueType="date"` emits a UTC `Moment`; `valueType="millis"` emits UTC-midnight
epoch milliseconds. When `valueType` is omitted, output is inferred from the
received value and defaults to the concrete Moment object.
