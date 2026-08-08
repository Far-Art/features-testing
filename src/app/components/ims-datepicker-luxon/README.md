# IMS Datepicker Luxon Value Handler

The Luxon adapter uses the shared `ImsDatepicker` component. It converts valid
Luxon `DateTime` objects and epoch-millisecond numbers into the component's
internal UTC calendar representation, and creates UTC `DateTime` objects for
concrete outputs.

Luxon is the default value handler, so normal usage needs no adapter directive:

```ts
import {ImsDatepicker} from '../ims-datepicker';
import {ImsDatepickerLuxonValue} from '../ims-datepicker-luxon';
```

```html
<ims-datepicker
    [formControl]="luxonDate"
/>
```

Use `ImsDatepickerLuxonValue` for the form value type:

```ts
type ImsDatepickerLuxonValue = DateTime | number | null | undefined;
```

To restore Luxon beneath an injector that selected another handler, either add
`imsDatepickerLuxon` to that instance or register:

```ts
provideImsDatepickerLuxonValueHandler()
```

`valueType="date"` emits a UTC `DateTime`; `valueType="millis"` emits
UTC-midnight epoch milliseconds. When `valueType` is omitted, output is inferred
from the received value and defaults to the concrete Luxon object.
