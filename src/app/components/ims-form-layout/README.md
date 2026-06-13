# IMS Form Layout Implementation Guide

This document describes the current `ims-form-layout` components for future
maintenance and AI-assisted changes. Treat the documented templates, inputs,
projection rules, and accessibility behavior as part of the public contract
unless a requested change explicitly replaces them.

Internal layout code may change, but existing consumer templates should not need
to be rewritten.

## File Map

- `ims-form-field.ts`: label/value projection, label association, and
  logical-column placement.
- `ims-form-field-grid.ts`: fixed and responsive column counts, intrinsic-width
  fitting, and automatic field placement.
- `ims-form-field-row.ts`: full-width stable row wrapper.
- `ims-form-field-group.ts`: stacked or inline compound-control layout.
- `ims-form-field.directives.ts`: the behavior-free `imsFormFieldLabel` marker.
- `ims-form-field.spec.ts`: focused field projection and label-association tests.
- `index.ts`: public exports.
- `src/styles/ims-form-field.scss`: field layout, label interaction color, and
  checkbox-placement styles.
- `src/styles/ims-form-field-grid.scss`: grid host styles.
- `src/styles/ims-form-field-row.scss`: stable row and subgrid styles.
- `src/styles/ims-form-field-group.scss`: compound-control styles.
- `src/app/pages/form-layout-demo`: working examples.

All components are standalone and use `ChangeDetectionStrategy.OnPush`.

## Setup

Import the components used by the consumer:

```ts
import {
    ImsFormField,
    ImsFormFieldGrid,
    ImsFormFieldGroup,
    ImsFormFieldLabel,
    ImsFormFieldRow
} from './components/ims-form-layout';
```

The global stylesheet must load all form-layout style modules:

```scss
@use './styles/ims-form-field';
@use './styles/ims-form-field-grid';
@use './styles/ims-form-field-group';
@use './styles/ims-form-field-row';
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
the value track.

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
| `span` | `number \| 'stretch'` | `1` | Number of logical grid columns occupied by the field, or every column remaining after its start. |
| `labelSpan` | `number \| string \| null` | `null` | Optional logical-column allocation for the main label in a multi-column field. |
| `valueSpan` | `number \| string \| null` | `null` | Optional logical-column allocation for the main value in a multi-column field. |

### `ims-form-field-grid`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `columns` | `number \| string \| null` | `null` | Positive integer for fixed mode. Omit it for responsive mode. |
| `columnDistribution` | `'max-content' \| 'even'` | `'max-content'` | Uses intrinsic logical-column widths or distributes available width evenly. |
| `minColumnWidth` | `number \| string` | `320` | Column-width estimate used to resolve open-ended `stretch` capacity. |
| `columnGap` | `string` | `'1rem'` | Minimum space between complete field pairs. Remaining width is also distributed through these spacer tracks. |
| `rowGap` | `string` | `'0.4rem'` | Vertical space between generated rows and explicit row wrappers. |

### `ims-form-field-group`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `layout` | `'stacked' \| 'inline'` | `'stacked'` | Arranges the group's direct label/control pairs vertically or side by side. |

`ims-form-field-row` and `imsFormFieldLabel` have no inputs.

## Label Projection And Association

The field template has two projection slots:

1. Direct native `label` elements and direct `[imsFormFieldLabel]` elements.
2. All remaining content.

Use one main label-like element and one main value element per field.

When more than one direct label-like element exists, an element marked with
`imsFormFieldLabel` is selected as the main label before an unmarked native
label.

A native main label is automatically associated with a labelable control:

- An explicit consumer-provided `for` is preserved.
- Without `for`, the first owned labelable descendant receives a generated ID.
- Supported targets are `button`, non-hidden `input`, `meter`, `output`,
  `progress`, `select`, and `textarea`.
- Controls inside a nested `ims-form-field` are ignored.
- The selected control receives `data-ims-main-control` so hover and focus can
  update the main label color.

The field watches projected child additions and removals. It does not observe
attribute-only changes. Changing `for`, `id`, or `type` dynamically after
rendering may therefore require recreating the affected projected node.

## Grid Layout

Each logical form column consists of:

1. A `max-content` label track.
2. A `max-content` value track.
3. A flexible spacer track, except after the final logical column.

Fields use CSS `subgrid` to consume the label/value pair. This produces two
important behaviors:

- Labels in the same logical column use the width of that column's longest
  label.
- Values in the same logical column use the width of that column's widest value
  content or control.

Flexible spacer tracks distribute remaining width between complete field pairs.
They do not increase the internal gap between a field's label and value.

```html
<ims-form-field-grid columns="3">
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

`span="stretch"` consumes every logical column remaining after the field's
resolved start. The label stays in its normal label track and the value extends
through the rest of the field.

```html
<ims-form-field-grid columns="3" columnDistribution="even">
    <ims-form-field
        span="stretch"
    >
        <label>Full address</label>
        <input style="inline-size: 100%">
    </ims-form-field>
</ims-form-field-grid>
```

Providing `labelSpan` or `valueSpan` takes precedence over the default
label/value placement supplied by `stretch` and partitions the field into
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

Responsive fitting works in two stages:

1. Projected field occupancy determines the maximum candidate column count.
   The grid tries every useful content column instead of treating
   `minColumnWidth` as a hard width cap.
2. The count is reduced until the intrinsic label/value tracks no longer
   overflow the grid.

Explicit `column` positions are included in the occupancy limit.
For open-ended `span="stretch"`, the available width and `minColumnWidth`
estimate how many logical columns it can consume.

Candidate templates are measured synchronously within one animation frame.
Only the final fitting count is committed, so intermediate candidates are not
painted during resize.

The implementation uses `ResizeObserver` because CSS auto-repeat cannot derive
the repeat count from varying `max-content` field widths while preserving the
current flat consumer markup and shared label tracks.

Resize callbacks are debounced by `RESIZE_DEBOUNCE_MS`.
`RESIZE_INLINE_SIZE_TOLERANCE` filters insignificant or self-induced size
changes. Only meaningful inline-size changes should restart responsive fitting;
height changes caused by wrapping must not do so.

### Responsive Caveats

- `minColumnWidth` estimates open-ended `stretch` capacity. Ordinary field
  columns are fitted from their actual intrinsic widths.
- Responsive changes are intentionally delayed by the resize debounce.
- Fixed `columns` mode does not reduce the requested count when content is too
  wide. The consumer must choose a count that fits.
- Intrinsic width changes caused only by changing text or a control's internal
  content may not restart fitting unless the grid width, projected field list,
  or loaded fonts also trigger a layout update.
- Before the first post-render measurement completes, responsive mode may
  briefly use its initial one-column state.

## Stable Rows

Use `ims-form-field-row` when a set of fields must remain on one visual row or
when missing fields must leave stable logical-column positions:

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

Fields should be direct children of the row. Rows should be direct children of
the grid.

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

In `stacked` mode, each direct label spans the group and uses shared local label
and control tracks. In `inline` mode, two equal pair areas are placed side by
side.

The group does not create accessible group semantics. Consumers should provide
`role="group"` and `aria-labelledby` or an equivalent accessible name.

The group only arranges its projected pairs. Native controls and custom
components retain their own presentation styles.

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
- Consumers remain responsible for required-state communication, descriptions,
  error-message IDs, `aria-describedby`, and `aria-invalid`.

## Direct `ims-checkbox` Exception

A direct `ims-checkbox` uses a special field layout:

```html
<ims-form-field>
    <label>Send email updates</label>
    <ims-checkbox checked/>
</ims-form-field>
```

For this structure:

- The checkbox and main label share the value track and first row.
- The label is offset from the checkbox by the checkbox size plus the normal
  field gap.
- The field associates the native main label with the checkbox's internal
  native input when that input is available.
- Checkbox rendering, form integration, disabled state, and animation remain
  owned by `ims-checkbox`.

This exception requires `ims-checkbox` to be a direct child of
`ims-form-field`. A wrapped checkbox uses the normal value-content layout.

The placement offset uses `--ims-form-checkbox-size`, defaulting to `1rem`.
Override that variable if the checkbox visual size differs.

## Native And Custom Value Content

The form-layout styles do not set control width, height, padding, typography,
background, border, outline, or other presentation. Native controls, read-only
values, custom components, and compound groups retain their own styles.

Set control sizing directly on the control or through the control component's
own API.

## Label Interaction Styling

The main label reacts to the owned control:

- Hover applies `--ims-form-accent` as the label color.
- Focus applies `--ims-form-accent` as the label color.
- Disabled controls do not trigger these color states.

For direct native controls, state is detected directly. For controls nested in a
compound or custom component, the automatically associated native control is
marked with `data-ims-main-control` so its state can propagate to the main
label. Validation styling remains entirely consumer-owned.

## Styling Hooks

The main field custom properties are:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-form-field-gap` | `0.5rem` | Gap between a field's label and value. |
| `--ims-form-accent` | `#1769aa` | Focus and hover accent. |
| `--ims-form-checkbox-size` | `1rem` fallback | Direct-checkbox placement offset. |
| `--ims-form-column-gap` | set by `columnGap` | Minimum flexible space between field pairs. |
| `--ims-form-row-gap` | set by `rowGap` | Grid row gap. |

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
