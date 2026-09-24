# IMS Form Layout Implementation Guide

This document describes the current `ims-form-layout` components for future
maintenance and AI-assisted changes. Treat the documented templates, inputs,
projection rules, and accessibility behavior as part of the public contract
unless a requested change explicitly replaces them.

Internal layout code may change, but existing consumer templates should not need
to be rewritten.

## File Map

- `ims-form-field.ts`: label/value projection, label association, hint
  descriptions, logical-column placement, and label stacking for a field on its
  own.
- `ims-form-field-grid.ts`: fixed and responsive column counts, intrinsic-width
  fitting, automatic field placement, and label stacking as a last resort.
- `ims-form-field-row.ts`: stable row inside a grid, or a row of fields side by
  side on its own, with label stacking.
- `ims-form-field-fit.ts`: internal inline-size observation, overflow check,
  layout-parent lookup, and the stacked-label and subgrid attributes shared by
  the field, row, and grid.
- `ims-form-field-group.ts`: stacked or inline compound-control layout, in the
  value column or across the whole field.
- `ims-form-field.directives.ts`: the behavior-free `imsFormFieldLabel`,
  `imsFormFieldHint`, and `imsFormFieldInline` markers.
- `ims-form-field.spec.ts`: focused field projection and label-association tests.
- `index.ts`: public exports.
- `src/styles/ims-form-layout/ims-form-field.scss`: field layout, stacked labels,
  hints and inline values, label interaction color, and checkbox-placement
  styles.
- `src/styles/ims-form-layout/ims-form-field-grid.scss`: grid host styles.
- `src/styles/ims-form-layout/ims-form-field-row.scss`: standalone row and
  in-grid subgrid row styles.
- `src/styles/ims-form-layout/ims-form-field-group.scss`: compound-control styles.
- `src/app/pages/form-layout-demo`: working examples.

All components are standalone and use `ChangeDetectionStrategy.OnPush`.

## Setup

Import the components used by the consumer:

```ts
import {
    ImsFormField,
    ImsFormFieldGrid,
    ImsFormFieldGroup,
    ImsFormFieldHint,
    ImsFormFieldInline,
    ImsFormFieldLabel,
    ImsFormFieldRow
} from './components/ims-form-layout';
```

The global stylesheet must load all form-layout style modules:

```scss
@use './styles/ims-form-layout/ims-form-field';
@use './styles/ims-form-layout/ims-form-field-grid';
@use './styles/ims-form-layout/ims-form-field-group';
@use './styles/ims-form-layout/ims-form-field-row';
```

The styles are intentionally global because the components and their projected
children participate in shared CSS Grid and `subgrid` tracks.

## Basic Usage

```html
<ims-form-field>
    <label>Customer name</label>
    <input>
</ims-form-field>
```

The direct label is placed in the label track. Other direct content is placed in
the value track. When the field is too narrow to hold both side by side, the
label moves above the value. See Stacked Labels.

The field deliberately sets no `inline-size: 100%`. In block flow, and as a
stretched grid or column flex item, it still fills the available width. As an
item in a flex row it is only as wide as its label and value, so fields placed
side by side in a flex row do not each take the full width. Set a width on the
field or its container when it should grow. Inside an `ims-grid` cell the grid
adapter sets `inline-size: 100%` itself.

For a read-only value, mark a non-label element explicitly:

```html
<ims-form-field>
    <span imsFormFieldLabel>Status</span>
    <span>Active</span>
</ims-form-field>
```

`imsFormFieldLabel` only marks layout content. It does not add native label
semantics.

## Public API

### `ims-form-field`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `column` | `number \| string \| null` | `null` | One-based logical column inside a grid or row. Invalid and non-positive values use automatic placement. |
| `span` | `number \| 'row'` | `1` | Number of logical grid columns occupied by the field, or every column remaining after its start. |
| `labelSpan` | `number \| string \| null` | `null` | Optional logical-column allocation for the main label in a multi-column field. |
| `valueSpan` | `number \| string \| null` | `null` | Optional logical-column allocation for the main value in a multi-column field. |

### `ims-form-field-grid`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `columns` | `number \| string \| null` | `null` | Positive integer for fixed mode. Omit it for responsive mode. |
| `columnDistribution` | `'even' \| 'max-content'` | `'even'` | Shares spare width evenly between value tracks, never below their natural width, or keeps intrinsic widths and puts the spare width between fields. |
| `minColumnWidth` | `number \| string` | `320` | Column-width estimate used to resolve open-ended `row` capacity. |
| `columnGap` | `string` | `'1rem'` | Minimum space between complete field pairs. Remaining width is also distributed through these spacer tracks. |
| `rowGap` | `string` | `'0.4rem'` | Vertical space between generated rows and explicit row wrappers. |

### `ims-form-field-group`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `layout` | `'stacked' \| 'inline'` | `'inline'` | Arranges the group's direct label/control pairs vertically or side by side. |
| `fill` | `boolean` | `false` | Spreads the pairs of an inline group across the value, an even share each. No effect on a stacked group. |
| `wide` | `boolean` | `false` | Places the group across the whole field, its label column as well as its value column. See Wide Groups. |

### `ims-form-field-row`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `visible` | `boolean` | `true` | Hides the row while keeping the space it takes. |
| `fill` | `boolean` | `false` | Stretches the fields of a standalone row across its full width. No effect inside a grid. |

`imsFormFieldLabel`, `imsFormFieldHint`, and `imsFormFieldInline` have no
inputs.

## Label Projection And Association

The field template has two projection slots:

1. Direct native `label` elements and direct `[imsFormFieldLabel]` elements.
2. All remaining content.

Use one main label-like element and one main value element per field.

A field may also have no label. Its label track is then empty, so the field
drops the gap after it and the value starts at the field's start. A direct
`ims-checkbox` leaves the label track empty too, since its label sits beside it
in the value track, and so does a wide group, which moves the main label onto a
line of its own, unless it is stacked and its pairs' texts fill the track. See
Wide Groups. Inside an `ims-form-field-grid` the gap stays: there the label
track is shared with the other fields in the column, and the gap lines the value
up with theirs.

When more than one direct label-like element exists, an element marked with
`imsFormFieldLabel` is selected as the main label before an unmarked native
label.

A native main label is automatically associated with a labelable control:

- An explicit consumer-provided `for` is preserved.
- Without `for`, the first owned labelable descendant receives a generated ID.
- Supported targets are `button`, non-hidden `input`, `select`, and `textarea`.
- Controls inside a nested `ims-form-field` are ignored.

The field watches projected child additions and removals. It does not observe
attribute-only changes. Changing `for`, `id`, or `type` dynamically after
rendering may therefore require recreating the affected projected node.

## Grid Layout

Each logical form column consists of a label track, a value track, and, except
after the final column, a track that separates it from the next column. Fields
use CSS `subgrid` to consume the label/value pair. This produces two important
behaviors:

- Labels in the same logical column use the width of that column's longest
  label.
- Values in the same logical column share one value track, never narrower than
  that column's widest value content or control.

`columnDistribution` decides where the width left over goes:

- `even`, the default: value tracks share it equally, and columns are
  `--ims-form-column-gap` apart. A column whose widest value needs more than an
  equal share keeps its natural width while the others share the rest, so no
  control is squeezed, and a control with a width of its own never runs into
  the next column.
- `max-content`: value tracks keep their natural width, and flexible spacer
  tracks distribute the rest between complete field pairs. The spacers do not
  increase the internal gap between a field's label and value.

```html
<ims-form-field-grid columns="3" columnDistribution="max-content">
    <ims-form-field>
        <label>Code</label>
        <input style="inline-size: 8rem">
    </ims-form-field>

    <ims-form-field>
        <label>Preferred service area</label>
        <input style="inline-size: 13rem">
    </ims-form-field>

    <ims-form-field>
        <label>Emergency contact name</label>
        <input style="inline-size: 18rem">
    </ims-form-field>
</ims-form-field-grid>
```

The first field stays at the logical start, the last field stays at the logical
end, and free space is distributed between field pairs.

### Spanning Fields

Numeric `span` values count complete logical form columns. Automatic placement
accounts for the requested span and wraps the field when it no longer fits on
the current row.

`span="row"` consumes every logical column remaining after the field's
resolved start. The label stays in its normal label track and the value extends
through the rest of the field.

```html
<ims-form-field-grid columns="3" columnDistribution="even">
    <ims-form-field
        span="row"
    >
        <label>Full address</label>
        <input style="inline-size: 100%">
    </ims-form-field>
</ims-form-field-grid>
```

Providing `labelSpan` or `valueSpan` takes precedence over the default
label/value placement supplied by `row` and partitions the field into
explicit logical regions. If only one part span is provided, the other receives
the remaining columns. Values that exceed the available field span are
clamped.

## Responsive Mode

Omit `columns` to enable responsive mode:

```html
<ims-form-field-grid minColumnWidth="320">
    <ims-form-field>
        <label>First name</label>
        <input>
    </ims-form-field>

    <ims-form-field>
        <label>Customer number</label>
        <input style="inline-size: 20rem">
    </ims-form-field>
</ims-form-field-grid>
```

Responsive fitting works in three stages:

1. The occupancy of the grid's fields determines the maximum candidate column
   count.
   The grid tries every useful content column instead of treating
   `minColumnWidth` as a hard width cap.
2. The count is reduced until every label and value fits at its natural width,
   the last column included. The last column can still grow into spare room,
   but no control is squeezed to make room for another column. This holds for
   `even` distribution too, which shares out only the room left over.
3. If one column still cannot hold every label beside its value at natural
   width, the labels stack. See Stacked Labels.

Explicit `column` positions are included in the occupancy limit.
For open-ended `span="row"`, the available width and `minColumnWidth`
estimate how many logical columns it can consume.

Candidate templates are measured synchronously within one animation frame.
Only the final fitting count is committed, so intermediate candidates are not
painted during resize.

The implementation uses `ResizeObserver` because CSS auto-repeat cannot derive
the repeat count from varying `max-content` field widths while preserving the
current flat consumer markup and shared label tracks.

Resize callbacks are debounced by `RESIZE_DEBOUNCE_MS`.
`RESIZE_INLINE_SIZE_TOLERANCE` filters insignificant or self-induced size
changes. Both live in `ims-form-field-fit.ts`, which standalone fields and rows
share. Only meaningful inline-size changes should restart responsive fitting;
height changes caused by wrapping must not do so.

### Responsive Caveats

- `minColumnWidth` estimates open-ended `row` capacity. Ordinary field
  columns are fitted from their actual intrinsic widths.
- Responsive changes are intentionally delayed by the resize debounce.
- Fixed `columns` mode does not reduce the requested count when content is too
  wide. It stacks labels above values instead. Content still too wide after
  that overflows, so the consumer should choose a count that fits.
- Intrinsic width changes caused only by changing text or a control's internal
  content may not restart fitting unless the grid width, its list of fields,
  or loaded fonts also trigger a layout update.
- Before the first post-render measurement completes, responsive mode may
  briefly use its initial one-column state.

## Rows

### Stable Rows In A Grid

Inside an `ims-form-field-grid`, use `ims-form-field-row` when a set of fields
must remain on one visual row or when missing fields must leave stable
logical-column positions:

```html
<ims-form-field-grid columns="3">
    <ims-form-field-row>
        <ims-form-field column="1">
            <label>Identity number</label>
            <input>
        </ims-form-field>

        <ims-form-field column="3">
            <span imsFormFieldLabel>Status</span>
            <span>Active</span>
        </ims-form-field>
    </ims-form-field-row>
</ims-form-field-grid>
```

The row spans the complete parent grid and adopts its tracks through `subgrid`.
The `column` input remains one-based even though the implementation uses
additional internal spacer tracks.

Fields should be direct children of the row, and rows direct children of the
grid, or reach them only through elements with `display: contents`. See Rows And
Fields Inside Components.

### Rows And Fields Inside Components

A grid lays out the rows and fields the rendered layout gives it, not only the
ones in its own template. A component can therefore hold a row, or fields
directly, and still take part in the grid, as long as its host has
`display: contents`:

```ts
@Component({
    selector: 'app-contact-row',
    imports: [ImsFormField, ImsFormFieldRow],
    template: `
        <ims-form-field-row>
            <ims-form-field column="1">...</ims-form-field>
            <ims-form-field column="2">...</ims-form-field>
        </ims-form-field-row>
    `,
    styles: `:host { display: contents; }`
})
export class ContactRow {
}
```

```html
<ims-form-field-grid columns="2">
    <ims-form-field-row>...</ims-form-field-row>
    <app-contact-row/>
</ims-form-field-grid>
```

- The component's row adopts the grid's tracks like any other row, so its labels
  and values line up with the other rows', and its labels stack with the rest.
- Fields held directly by such a component join the grid's automatic flow, as
  direct children of the grid would. Any element with `display: contents` is
  passed over the same way.
- A host that generates a box of its own, as a component host does by default,
  is a single item of the grid instead, and a row inside it lays out on its own,
  as a standalone row.
- Each field joins its grid when it first renders. Moving a rendered field or
  row to another parent afterwards is not tracked.
- Inside a standalone row, fields must still be direct children.
- A row or field a grid lays out marks itself with the internal
  `data-ims-subgrid` attribute. Consumers should not set or style it.

### Standalone Rows

Outside a grid, a row puts its fields side by side on one line, one automatic
column per field:

```html
<ims-form-field-row>
    <ims-form-field>
        <label>City</label>
        <input>
    </ims-form-field>

    <ims-form-field>
        <label>Postal code</label>
        <input>
    </ims-form-field>
</ims-form-field-row>
```

- Each field is as wide as its label and value. The fields are packed at the
  inline start and separated by `--ims-form-column-gap`, `1rem` by default.
- `fill` stretches the fields across the row instead. Their value tracks, and
  any control without a width of its own, grow with them.
- In a flex container, the row takes the space its siblings leave, as it does
  in a block, so `fill` has that room to spread into. In a column flex
  container with height to spare, it takes a share of that height too. A class
  with `flex: none` keeps it at the size of its content.
- When the fields cannot sit side by side at their natural widths, all of their
  labels stack. See Stacked Labels. Stacked fields that still do not fit move
  onto further lines, `--ims-form-row-gap` apart, rather than being squeezed.
  Only a field wider than the whole row by itself shrinks, to the row's width.
- `column`, `span`, `labelSpan`, and `valueSpan` have no effect.
- Separate standalone rows do not share column widths. Put the rows in an
  `ims-form-field-grid` when their fields must line up.

## Stacked Labels

When a label and its value cannot sit side by side at their natural widths, the
label moves above the value. Both then start at the field's inline start: the
label on the first row, and the value below it, `--ims-form-field-stacked-gap`
away.

Natural width is what the content asks for when nothing squeezes it: a width set
on the control, such as `inline-size` or a `.field-*` class, the width a
component gives itself, such as the datepicker's, or the browser's default width
for an input or textarea. A read-only text value's natural width is its text on
one line.

| Context | Measured by | Stacks when |
| --- | --- | --- |
| Field on its own | the field | its label, gap, and value overflow the field |
| Standalone row | the row, for all of its fields | its fields and gaps overflow the row; then fields that still do not fit wrap |
| Grid, including its rows | the grid, for all of its fields | responsive: one column still overflows; fixed: the fixed count overflows |
| Inside an `ims-grid` cell | nobody | never. The table sizes its own columns |

A grid or row stacks all of its fields at once, so labels and controls stay
aligned with each other. A grid only stacks as a last resort: a responsive grid
first drops columns, and stacks only when one column still does not fit.

- Measurement uses the same resize observation as responsive grids. It runs
  after render, when fonts finish loading, and once a meaningful inline-size
  change settles (`RESIZE_DEBOUNCE_MS`). A standalone row also measures again
  when fields are added or removed.
- Height changes never restart measurement, so stacking cannot set it off again.
- As in responsive grids, a change in natural width alone, such as a select
  showing a longer value, does not restart measurement.
- A direct `ims-checkbox` keeps its label beside it. In a stacked field the
  checkbox moves to the field's start, level with the other labels.
- Stacking is marked by the internal `data-ims-stacked` attribute on the host
  that decided it. A grid also puts it on each field it lays out, since a field
  can reach the grid through an element with `display: contents`. Consumers
  should not set or style it.

## Compound Values

Use `ims-form-field-group` for a value made of multiple related controls:

```html
<ims-form-field>
    <label id="validity-label" imsFormFieldLabel>Validity</label>

    <ims-form-field-group
        role="group"
        aria-labelledby="validity-label"
    >
        <label>
            <span>From</span>
            <input type="date">
        </label>

        <label>
            <span>To</span>
            <input type="date">
        </label>
    </ims-form-field-group>
</ims-form-field>
```

In `inline` mode, the default, the pairs sit side by side, two to a row, each at
its natural width and packed at the start, and the group is only as wide as they
are. In `stacked` mode, each direct label spans the group and uses shared local
label and control tracks. A class on the group can set other columns and a
width. See Overriding Sizes.

`fill` spreads the pairs of an inline group across the value, an even share
each:

```html
<ims-form-field-group fill role="group" aria-labelledby="validity-label">
    ...
</ims-form-field-group>
```

A pair whose share is too small keeps its natural width, and the other pair
takes the rest. A control with a width of its own, such as a datepicker or a
control with a `field-*` class, keeps it, so it can end before its share does.
To stretch the control too, give it `field-stretch`. It then has no width of its
own, and its natural width comes from its content: for a datepicker, the
default width of its input, about 20 characters. Grids and fields measure
natural widths to decide how many columns fit and when labels move above their
values, so a stretched control can make both happen sooner.

A pair may hold only its control, with no text. An inline pair then drops the
gap after its empty text track and starts with the control. Stacked pairs share
one text track, so a control without text stays lined up with the others after
it, and the gap goes only when no pair in the group has text.

An inline group neither shrinks nor wraps its pairs, with or without `fill`. In
a value narrower than the pairs side by side, such as a stacked field on a
phone, the group overflows it instead of squeezing their controls.

The group does not create accessible group semantics. Consumers should provide
`role="group"` and `aria-labelledby` or an equivalent accessible name.

The group only arranges its projected pairs. Native controls and custom
components retain their own presentation styles.

A pair spans its whole row, which is wider than its text and control whenever
another pair's are wider or the control has a width of its own. Only the text
and the control answer the pointer, and the text is only as wide as itself, so
a click on the rest of the row does not reach the control.

A checkbox with its own label goes in the group directly, with no pair:

```html
<ims-form-field-group layout="stacked" role="group" aria-labelledby="channels-label">
    <ims-checkbox formControlName="sms">SMS</ims-checkbox>
    <ims-checkbox formControlName="email">Email</ims-checkbox>
</ims-form-field-group>
```

- A child of the group that is not a pair is a control without text. A stacked
  group puts each one on a line of its own in the control track, lined up with
  the pairs' controls, or across the whole field in a wide group. An inline
  group gives it a column, as it does a pair.
- It keeps its own width rather than stretching across its track.

A checkbox can also sit in a pair, after the pair's text. It is then only as
wide as its box, like a native checkbox or radio in a pair, so the rest of the
control track does not toggle it through the pair's label. `ims-checkbox`
renders a `label` of its own, though, and the pair's `label` wraps it. HTML
does not allow a label inside a label. Browsers handle it, and the text and the
box each toggle the checkbox once, but prefer the checkbox's own label.

### Wide Groups

`wide` places the group across the whole field, its label column as well as its
value column:

```html
<ims-form-field-grid columns="2">
    <ims-form-field>
        <label>Customer</label>
        <input>
    </ims-form-field>

    <ims-form-field>
        <ims-form-field-group wide layout="stacked" role="group" aria-label="Coverage">
            <label>
                <span>From</span>
                <input type="date">
            </label>

            <label>
                <span>To</span>
                <input type="date">
            </label>
        </ims-form-field-group>
    </ims-form-field>
</ims-form-field-grid>
```

- A stacked group puts each pair's text in the field's label track and its
  control in the value track, through to the end of the field. The pairs line
  up with the fields around them as if they were fields of their own: in a
  grid, their texts share the label column with the other labels, and their
  controls start where the other values start. When the field's label stacks,
  the texts move above their controls too.
- A control with its own label, such as an `ims-checkbox` with projected text,
  has no text for the label track. In a stacked group it spans the whole field
  instead, from where the labels start, one per line.
- An inline group starts where the field's labels start and runs to the end
  of the field, pairs and controls with their own labels alike. `fill` spreads
  them across that whole width.
- A main label moves to a line of its own above the group.
- The field's `labelSpan` and `valueSpan` do not divide a wide group.
- It applies to a group that is a direct child of `ims-form-field`.

## Hints

Mark a short text that describes the control with `imsFormFieldHint`:

```html
<ims-form-field>
    <label>Billing date</label>
    <ims-datepicker valueType="date" [(ngModel)]="billingDate"/>
    <span imsFormFieldHint>First day of the month</span>
</ims-form-field>
```

As a direct child after the control, the hint sits under the control,
`--ims-form-field-stacked-gap` below it. It wraps within the value track instead
of widening it, so a long hint never costs a grid a column or stacks the labels.

To put the hint beside the control, wrap both in `imsFormFieldInline`:

```html
<ims-form-field>
    <label>Billing date</label>
    <span imsFormFieldInline>
        <ims-datepicker valueType="date" [(ngModel)]="billingDate"/>
        <span imsFormFieldHint>First day of the month</span>
    </span>
</ims-form-field>
```

- Items in the wrapper sit `--ims-form-field-gap` apart. The hint's first line is
  level with the control's text, like the label, beside a textarea too.
- Any text-only item gets the same alignment, so a unit such as `₪` needs no
  directive.
- The whole line counts toward the field's natural width, so the label moves
  above the value before the line breaks. An item that still does not fit then
  moves under the control rather than squeezing it, and keeps its alignment
  offset, so it sits a little further below than a hint placed there directly.
- A direct `ims-checkbox` must stay a direct child of the field for its layout,
  so it cannot go in the wrapper.

The field gives each hint it owns an id when it has none, and adds the id to the
`aria-describedby` of the control its main label names, so a screen reader reads
the hint with the control. The id goes next to any the control already has, such
as an error popover's message, and only ids the field added are removed again.
Do not bind `aria-describedby` on the control: a binding owns the whole
attribute and would drop the hint. In a field with no labelable control, such as
a read-only value, the hint is shown but describes nothing.

The form layout does not style the hint's text, which keeps the color and size
around it.

## Accessibility Responsibilities

The layout components assist with label association but do not define a complete
form accessibility policy.

- Prefer a direct native `label` for editable fields.
- Use `imsFormFieldLabel` on non-label content only for read-only or otherwise
  explicitly named values.
- When using a non-label main heading, connect it to custom or grouped content
  with `aria-labelledby` where appropriate.
- Give `ims-form-field-group` an accessible group name, normally with
  `role="group"` and `aria-labelledby`.
- Consumers remain responsible for required-state communication, descriptions
  other than `imsFormFieldHint`, error-message IDs, any other
  `aria-describedby` reference, and `aria-invalid`.

## Direct `ims-checkbox` Exception

A direct `ims-checkbox` uses a special field layout:

```html
<ims-form-field>
    <label>Send email updates</label>
    <ims-checkbox checked/>
</ims-form-field>
```

For this structure:

- The checkbox and main label share the value track and first row, centered
  vertically on each other.
- The checkbox aligns to the start of the value track instead of stretching
  across it, so it does not cover the label and clicks on the label reach it.
- While the checkbox is enabled, the label shows a pointer cursor. A disabled
  or readonly checkbox keeps the default cursor.
- The label is offset from the checkbox by the checkbox size plus the normal
  field gap.
- The label track holds nothing, so outside an `ims-form-field-grid` the field
  drops the gap after it and the checkbox starts at the field's start. In a grid
  it stays in the shared value track, level with the other values.
- The label keeps its `max-content` width, like a label in the label track, so
  it never wraps. A grid widens the value track to fit it; a field outside a
  grid, or a single grid column narrower than the label, lets a longer label
  overflow instead. A class on the label that sets another width lets it wrap.
- The field associates the native main label with the checkbox's internal
  native input when that input is available.
- Checkbox rendering, form integration, disabled state, and animation remain
  owned by `ims-checkbox`.

This exception requires `ims-checkbox` to be a direct child of
`ims-form-field`. A wrapped checkbox uses the normal value-content layout.

The placement offset uses `--ims-form-checkbox-size`, defaulting to
`--ims-checkbox-size`, the `:root` variable from `ims-checkbox.scss` that also
sizes the checkbox box. Override it only for a checkbox that does not use that
variable. Where `round()` is supported, the offset rounds that size to whole
pixels, matching the checkbox track.

## Grouped Control Exception

A grouped control, such as `ims-radio-group`, marks its host with
`data-ims-labelled-group`:

```html
<ims-form-field>
    <label>Coverage plan</label>
    <ims-radio-group [formControl]="plan">...</ims-radio-group>
</ims-form-field>
```

A group is not labelable. An automatic `for` would point at its first option, so
clicking the field label would select that option and a screen reader would
read the field label as that option's name. For this structure:

- The marked group counts as the field's control. It comes before its own
  options in document order, so it is found instead of them.
- The label gets a generated id when it has none, and that id is added to the
  group's `aria-labelledby`, next to any ids the consumer already put there.
- The label gets no `for`, so clicking it selects nothing, and the label keeps
  the default cursor.
- Hovering the label still colors it while the group has an enabled option, as
  hovering a checkbox's label does. The group's own stylesheet highlights its
  options for the same hover.
- Cleanup removes only the id the field added. A consumer-provided `for` on the
  label still wins and bypasses this path.
- Layout is unchanged: the group sits in the value track like any other value
  content.

## Native And Custom Value Content

The form-layout styles do not set control height, padding, typography,
background, border, outline, or other presentation. Native controls, read-only
values, custom components, and compound groups retain their own styles.

Set control sizing directly on the control, with a class such as `field-m`, or
through the control component's own API.

## Overriding Sizes

The few sizes the layout sets on elements you place in it are defaults. They are
written with `:where()`, or with element names only, so they carry no more
specificity than an element name, and a single class on the element overrides
them: a sizing class such as `field-l`, a class of your own, or a component's
own styles.

| Element | Default | A class can |
| --- | --- | --- |
| Main label | `justify-self: start`, so it is as wide as its text | stretch it across its track |
| Field value | `min-width: 0`, `box-sizing: border-box` | set a minimum width or another box model |
| Inline `ims-form-field-group` | `grid-template-columns: repeat(2, max-content)`, `justify-self: start`, so the pairs sit together and the group is as wide as they are | set other columns or a width |
| Inline group with `fill` | `grid-template-columns: repeat(2, minmax(max-content, 1fr))`, `justify-self: stretch`, so the pairs share the value evenly | share it differently, such as `minmax(max-content, 2fr) minmax(max-content, 1fr)` |
| Pair in an inline group | `min-inline-size: 0` | set a minimum width for one pair |
| Text of a group pair | `justify-self: start`, so it is as wide as its text | stretch it across its track |
| Control in a group pair | `inline-size: 100%`, `min-inline-size: 0`, `max-inline-size: 100%` | size one control |
| Checkbox or radio in a group pair | `inline-size: auto`, `justify-self: start`, so it is as wide as its box | size it |
| Group child that is not a pair | `justify-self: start`, so it is as wide as itself | stretch it across its track |
| Label of a direct `ims-checkbox` | `width: max-content` | let a long label wrap |
| `ims-form-field-row` in a flex container | `flex: 1`, so it takes the space its siblings leave | keep it at the size of its content, such as `flex: none` |
| Field in a `fill` standalone row | `flex-grow: 1` | keep one field at its natural width |
| Field in a stacked standalone row | `flex-shrink: 1` | stop one field from shrinking |

Components win the same way, so a control's own minimum holds inside a field:
an `.ims-input`, `ims-select`, or `ims-autocomplete` stays at least
`--field-width-xxs` wide, and an `ims-datepicker` at least 10 characters.

Placement is not a default and keeps its specificity: the columns, rows, and
spans that put labels and values in their tracks, and the stacked-label layout.

Inside an `ims-grid` cell, `ims-grid-adapters.scss` stretches the value to the
cell with a stronger selector, so a class on a control there does not set its
width.

## Vertical Alignment

The main label is offset from the top of the field by half the difference
between `--field-height` and its own line height, so its first line is centered
on a single-line control. A taller value, such as a textarea, a radio group, or
a wrapped read-only value, does not move the label to its middle. The label stays
level with the value's first row.

A value with only text and no child elements gets the same offset, so a
read-only value stays on the label's line. Native `input`, `textarea`, and
`button` values are excluded. The direct `ims-checkbox` exception keeps its own
vertical centering.

A stacked field has no control beside its label, so neither the label nor a
text-only value gets the offset.

## Label Interaction Styling

The main label reacts to the owned control:

- Hover applies `--ims-form-accent` as the label color.
- Focus applies `--ims-form-accent` as the label color.
- Disabled controls do not trigger these color states.

Control state is detected from owned native `button`, non-hidden `input`,
`select`, and `textarea` descendants. Validation styling remains entirely
consumer-owned.

The label's box is only as wide as its text, and wraps when it has less room.
It does not stretch across its label track, or across the whole field once
stacked, so a click on the empty space beside a short label does not reach the
control, and hovering there does not color the label.

## Styling Hooks

The main field custom properties are:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-form-field-gap` | `0.5rem` | Gap between a field's label and value when they sit side by side, and between the items of an `imsFormFieldInline` value. Outside a grid, a field with an empty label track has none. |
| `--ims-form-field-stacked-gap` | `0.25rem` | Gap between a stacked label and the value below it, between a control and a hint under it, and between the lines of an `imsFormFieldInline` value. |
| `--ims-form-accent` | `#1769aa` | Focus and hover accent. |
| `--ims-form-checkbox-size` | `--ims-checkbox-size` fallback | Direct-checkbox placement offset. |
| `--ims-form-column-gap` | set by `columnGap`; `1rem` in a standalone row | Minimum flexible space between field pairs, or the gap between fields in a standalone row. |
| `--ims-form-row-gap` | set by `rowGap`; `0.4rem` in a standalone row | Grid row gap, or the gap between the lines of a wrapped standalone row. |

`--ims-form-grid-column-start`, `--ims-form-grid-column-track-span`,
`--ims-form-label-grid-column`, and `--ims-form-value-grid-column` are internal
placement properties and should not be set by consumers.

## Caveats And Constraints

- The supported field structure is one direct main label-like element followed
  by one direct main value element.
- Main label/value children must remain direct children for projection and CSS
  placement to work as documented.
- `imsFormFieldLabel` controls selection and layout only; it does not create
  native form-label semantics.
- An explicit `for` should reference a control owned by the same field.
- `column` values are positive and one-based. Values beyond the configured grid
  count can create implicit CSS Grid tracks and should be avoided.
- The layout depends on browser support for CSS Grid `subgrid` and `:has()`.
- Nested `ims-form-field-grid` instances are independent. Field discovery and
  label association avoid claiming content owned by a nested grid or field.
- The components do not add `fieldset`, `legend`, group roles, required
  indicators, descriptions, or error-message associations automatically.

## Verification

Focused field tests:

```powershell
npm test -- --watch=false --include="src/app/components/ims-form-layout/ims-form-field.spec.ts"
```

Production build:

```powershell
npm run build:no-source
```
