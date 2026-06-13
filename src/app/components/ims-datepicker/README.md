# IMS Datepicker Implementation Guide

This document describes the current `ims-datepicker` implementation for future
maintenance and AI-assisted changes. Treat the behavior documented here as part
of the component contract unless a requested change explicitly replaces it.

## File Map

- `ims-datepicker.ts`: component state, forms integration, validation,
  navigation, selection, and focus management.
- `ims-datepicker.html`: input field, CDK overlay, header controls, shortcuts,
  and the day/month/year grids.
- `ims-datepicker.types.ts`: public types, default formats, configuration token,
  and `provideImsDatepickerConfig`.
- `ims-datepicker.utils.ts`: Temporal normalization, parsing, formatting, and
  date comparison helpers.
- `ims-datepicker.spec.ts`: component, forms, navigation, and focus tests.
- `ims-datepicker.utils.spec.ts`: parsing and normalization tests.
- `index.ts`: public exports.
- `src/styles/ims-datepicker.scss`: global datepicker styles and view-transition
  animations.
- `src/app/pages/datepicker-demo`: working examples.

The component is standalone, uses `ChangeDetectionStrategy.OnPush`, and depends
on Angular CDK overlay, focus trapping, directionality, Angular forms, and
`@js-temporal/polyfill`.

## Basic Usage

```ts
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Temporal} from '@js-temporal/polyfill';
import {
    ImsDatepicker,
    ImsDatepickerValue
} from './components/ims-datepicker';

@Component({
    imports: [ReactiveFormsModule, ImsDatepicker],
    template: `
        <ims-datepicker
            ariaLabel="Choose a date"
            [formControl]="date"
        />
    `
})
export class Example {
    readonly date = new FormControl<ImsDatepickerValue>(
        Temporal.PlainDate.from('2026-06-07')
    );
}
```

Month-only selection:

```html
<ims-datepicker
    format="MM/yyyy"
    monthDay="end"
    valueType="millis"
    [formControl]="month"
/>
```

Global configuration:

```ts
provideImsDatepickerConfig({
    locale: 'he',
    zone: 'Asia/Jerusalem',
    firstDayOfWeek: 7,
    valueType: 'temporal'
})
```

The global stylesheet must include:

```scss
@use './styles/ims-datepicker';
```

## Public Inputs

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `format` | `'dd/MM/yyyy' \| 'MM/yyyy'` | `'dd/MM/yyyy'` | Selection precision, not only display formatting. |
| `min` | `ImsDatepickerValue` | `null` | Instance minimum. It can tighten but not relax the global minimum. |
| `max` | `ImsDatepickerValue` | `null` | Instance maximum. It can tighten but not relax the global maximum. |
| `dateFilter` | `(date) => boolean` | `null` | Instance filter combined with the global filter using logical AND. |
| `valueType` | `'temporal' \| 'millis' \| null` | `null` | Explicit output type. When omitted, it is inferred from received values. |
| `monthDay` | `'start' \| 'end'` | `'start'` | Canonical day used for month-only values. |
| `formats` | `PartialImsDatepickerFormats \| null` | `null` | Instance parsing and display format overrides. |
| `locale` | `string \| null` | `null` | Instance locale override. |
| `zone` | `string \| null` | `null` | Zone used to interpret millisecond inputs and calculate today. |
| `firstDayOfWeek` | `1 \| 7 \| null` | `null` | Monday or Sunday grid start. |
| `placeholder` | `string \| null` | `null` | Input placeholder override. |
| `ariaLabel` | `string \| null` | `null` | Accessible input label. |
| `ariaLabelledby` | `string \| null` | `null` | ID reference for an external input label. |
| `id` | `string \| null` | `null` | Inherited from `BasicValueAccessor`; forwarded to the native input. |
| `disabled` | `boolean` | `false` | Inherited from `BasicValueAccessor`; combined with form disabled state. |

The component supports reactive forms, template-driven forms, and direct value
binding through the inherited value model.

## Value Model

The public value type is:

```ts
type ImsDatepickerValue =
    | Temporal.PlainDate
    | number
    | null
    | undefined;
```

Internally, all date calculations use `Temporal.PlainDate`.

### Temporal values

`Temporal.PlainDate` values are already date-only and are normalized to the
configured precision.

### Millisecond values

Numeric values are interpreted as instants in `zone`, then converted to a plain
calendar date:

```ts
Temporal.Instant
    .fromEpochMilliseconds(value)
    .toZonedDateTimeISO(zone)
    .toPlainDate();
```

Numeric outputs are always serialized at UTC midnight with
`toUtcEpochMillis`. The interpretation zone and output serialization zone are
intentionally different:

- Input number -> interpret in configured zone.
- Output number -> UTC midnight for the selected plain date.

Do not replace this with native `Date` local-time construction without
explicitly changing the component contract.

### Output type inference

If `valueType` is configured on the instance or globally, that setting wins.
Otherwise:

- Receiving a number changes inferred output to `millis`.
- Receiving a `Temporal.PlainDate` changes inferred output to `temporal`.
- The initial inferred type is `temporal`.

## Precision

### Full date: `dd/MM/yyyy`

- Opens in the day view.
- Selecting a day commits the value and closes the overlay.
- Month and year views are intermediate navigation views.

### Month only: `MM/yyyy`

- Opens in the month view.
- Selecting a month commits the value and closes the overlay.
- `monthDay="start"` stores the first day of the month.
- `monthDay="end"` stores the final day of the month.
- The view cycle excludes the day view.

Precision affects parsing, normalization, validation, selection, and emitted
values. It is not equivalent to changing only `formats.display`.

## Configuration Precedence

Instance settings override global settings, except constraints cannot become
less strict:

1. Instance locale/zone/value type/first day/formats.
2. Global `IMS_DATEPICKER_CONFIG`.
3. Built-in defaults.

Range and filter behavior is stricter:

- Effective minimum is the later of global and instance minimum.
- Effective maximum is the earlier of global and instance maximum.
- A date must pass both the global and instance filters.
- Built-in fallback range is `1900-01-01` through `2100-12-31`.

An instance must never enable a date rejected by global configuration.

## Parsing And Formatting

Input is numeric only. Progressive input allows digits and the separators:

- `/`
- `-`
- `.`
- whitespace

Month or weekday names are not parsed.

Configured parsing formats are tried first. Supported parse tokens are:

- `yyyy`
- `yy`
- `MM`
- `M`
- `dd`
- `d`

If no configured format matches, shorthand coercion is attempted. Examples for
full-date precision include:

- `5` -> day 5 in the current month and year.
- `2028` -> current month/day in year 2028, clamping the day if necessary.
- `5/2` -> 5 February in the current year.
- `5/2/2028` -> 5 February 2028.
- Compact six- and eight-digit date forms are also supported.

Invalid text is retained in the input and creates the `imsDatepickerParse`
validation error. Committed valid values are reformatted using the configured
display format.

Display formatting additionally supports localized month and weekday tokens:
`LLLL`, `LLL`, `MMMM`, `MMM`, `cccc`, `ccc`, `EEEE`, and `EEE`.

## Validation

The component provides both `NG_VALUE_ACCESSOR` and `NG_VALIDATORS`.

Possible validation errors:

```ts
{imsDatepickerParse: {text: string}}
{imsDatepickerMin: {min: value, actual: value}}
{imsDatepickerMax: {max: value, actual: value}}
{imsDatepickerFilter: {actual: value}}
```

Empty values are valid. Invalid non-empty text is represented by the parse
error while the form value is set to `null`.

The validator change callback is triggered when range, filters, precision,
month boundary, parse state, or the normalized value changes.

## State Model

Keep these concepts separate:

- `value`: committed Angular form value.
- `normalizedValue`: committed value converted to `Temporal.PlainDate`.
- `rawText`: current text displayed in the input.
- `cursor`: active date used for calendar traversal.
- `calendarView`: current `day`, `month`, or `year` view.
- `selected`: cell matching the committed value.
- `active`: cell matching `cursor`; this is the roving-tabindex cell.
- `today`: actual current date in the configured interpretation zone.

The active cell can differ from the selected cell while the user traverses the
grid. Do not derive active state from the committed form value.

## Views And Navigation

### Day view

- Six rows of seven positions are generated.
- Dates outside the current month render as inert blank placeholders.
- Near header navigation moves one month.
- Far header navigation moves one year.

### Month view

- Twelve months render in a 3-column grid.
- Near navigation moves one year.
- Far navigation moves ten years.
- For full-date precision, selecting a month opens the day view.
- For month precision, selecting a month commits and closes.

### Year view

- Twenty-four years render in a 4-column grid.
- Near navigation moves 24 years.
- Far navigation moves 48 years.
- Selecting a year opens the month view.

Disabled dates, months, years, and navigation buttons are calculated from the
effective range and both filters. Calendar movement skips disabled cells.

## Keyboard And Focus Contract

The grids use the roving-tabindex pattern:

- Exactly one enabled active cell has `tabindex="0"`.
- Other cells have `tabindex="-1"`.
- Focusing a cell updates `cursor`.

Grid keys:

| Key | Behavior |
| --- | --- |
| `ArrowLeft` / `ArrowRight` | Move one cell, respecting LTR/RTL direction. |
| `ArrowUp` / `ArrowDown` | Move one row based on the current grid column count. |
| `Home` / `End` | Move to the first/last item in the current period. |
| `PageUp` / `PageDown` | Move one month/year/page depending on the view. |
| `Alt+PageUp` / `Alt+PageDown` | Use the larger page step. |
| `Enter` / `Space` | Select the active cell. |
| `Escape` | Close the overlay and return focus to the text input. |

Important focus behavior:

- Opening the overlay focuses the active grid cell.
- The focus scheduler retries for one additional animation frame after a view
  change before falling back to the header view button.
- Selecting a year focuses the active month after the month view renders.
- Selecting a month in full-date mode focuses the active day after the day view
  renders.
- Arrow keys pressed while any header button is focused are delegated to grid
  navigation and return focus to the active grid cell.
- Enter or Space on a header button performs the native button click and keeps
  focus on that header button.
- Clicking empty grid space or a blank day placeholder focuses the active cell,
  allowing immediate keyboard traversal.
- Clicking a real grid cell keeps its normal selection behavior.
- The CDK focus trap keeps focus inside the dialog while it is open.

When changing view rendering or transitions, preserve
`scheduleActiveCellFocus`, its retry, and `cancelActiveCellFocus`.

## Shortcuts

Header shortcuts are:

- Start of month, day view only.
- Today.
- End of month, day view only.

A shortcut moves the active cursor and focuses the resulting grid cell. It does
not commit the form value immediately. Disabled shortcuts cannot be activated.

## Accessibility

- The overlay is a modal dialog with `cdkTrapFocus`.
- Each calendar is a `role="grid"`.
- Cells use `role="gridcell"`, row/column indexes, `aria-selected`, and disabled
  state.
- Today uses `aria-current="date"`.
- The dialog is labelled by the header view button.
- Day labels use the configurable localized `dayAriaLabel` format.
- Directionality comes from Angular CDK `Directionality`.
- Navigation icons and horizontal keyboard movement adapt to RTL.

## Styling

Styles are global because the CDK overlay panel is rendered outside the
component host. The main CSS variables are declared on both
`.ims-datepicker-host` and `.ims-datepicker__panel` so overlay content has its
own token values:

```scss
--ims-datepicker-primary
--ims-datepicker-surface
--ims-datepicker-on-surface
--ims-datepicker-on-primary
--ims-datepicker-error
--ims-datepicker-shadow-rgb
```

Cell state classes:

- `.ims-datepicker__cell--selected`: committed value, filled primary
  background.
- `.ims-datepicker__cell--active`: current traversal cursor.
- `.ims-datepicker__cell--today`: actual current date.

Focus uses a native CSS outline, not a pseudo-element. The active selected cell
uses an outward `outline-offset` so the outline remains distinguishable from
the filled selected background. Avoid reintroducing a focus pseudo-element
because it overlays today/selected styling.

Sass nesting follows the repository rule: use nesting for descendants,
pseudo-classes, pseudo-elements, attributes, and state scopes only. Write full
class names for related classes and modifiers.

Grid navigation uses scoped View Transitions when available and falls back to a
normal synchronous update. Transition direction is reversed appropriately for
RTL.

## Safe Change Guide

When changing values or parsing:

1. Keep internal calculations on `Temporal.PlainDate`.
2. Check both precision modes.
3. Check Temporal and millisecond output.
4. Verify interpretation-zone and UTC-output behavior.
5. Update `ims-datepicker.utils.spec.ts`.

When changing views or selection:

1. Preserve the distinction between `cursor` and committed `value`.
2. Resolve candidates through range and filters.
3. Preserve month boundary behavior.
4. Ensure the next view has a valid active cell.
5. Update `ims-datepicker.spec.ts`.

When changing keyboard or focus behavior:

1. Test day, month, and year views.
2. Test both LTR and RTL assumptions.
3. Test header arrow delegation.
4. Test Enter/Space focus retention on header buttons.
5. Test focus after year-to-month and month-to-day changes.
6. Test empty grid-space clicks.
7. Avoid synchronous focus before Angular renders the new view.

When changing styling:

1. Test selected, active, today, disabled, and combined states.
2. Keep focus visible when active and selected are the same cell.
3. Remember that overlay styles and variables cannot rely on host inheritance.
4. Keep selectors compatible with the repository Sass nesting rules.

## Verification

Focused component tests:

```powershell
npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/components/ims-datepicker/ims-datepicker.spec.ts'
```

Focused utility tests:

```powershell
npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/components/ims-datepicker/ims-datepicker.utils.spec.ts'
```

Production build:

```powershell
npm run build:no-source
```

The current build has an unrelated existing stylesheet budget warning for
`ims-form-field.scss`.
