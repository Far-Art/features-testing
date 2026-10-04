# IMS Toggle Switch Implementation Guide

This document describes the current `ims-toggle-switch` and
`ims-toggle-switch-option` implementation for future maintenance and
AI-assisted changes. Treat the behavior documented here as part of the
component contract unless a requested change explicitly replaces it.

The switch is a choice between two options, such as yes / no or approve /
reject. It behaves as a single-selection `ims-radio-group` and draws the
radio's green check appearance. An option can instead draw a grey X, for the
reject side of an approve / reject pair.

## File Map

- `ims-toggle-switch.ts`: forms integration, `compareWith`, the user selection
  path, `selectionChange`, touched state, and keeping the native radios in line
  with the value.
- `ims-toggle-switch-option.ts`: one option. Reads its selected state from the
  switch and reports the user's pick back to it.
- `ims-toggle-switch-option.html`: the native radio, the circle with its
  checkmark or X, and the projected label.
- `ims-toggle-switch.types.ts`: `IMS_TOGGLE_SWITCH`, the switch contract the
  options depend on, and the appearance type.
- `index.ts`: public exports.
- `src/styles/ims-toggle-switch.scss`: all styles, loaded globally from
  `src/styles.scss`, including `--ims-toggle-switch-size` and
  `--ims-toggle-switch-circle-size` on `:root`.
- `src/styles/tokens/semantic-color-tokens.scss`: the
  `--ims-color-interactive-success*` tokens the check draws with, and the
  `--ims-color-interactive-neutral*` tokens the reject X draws with.
- `src/app/pages/toggle-switch-demo`: both styles, forms, states, icon-only use
  in a table, color overrides, LTR, and a value written back from a handler.
- `src/app/pages/component-states-demo`: normal, disabled, readonly, invalid,
  and invalid + readonly examples of both styles.

Both components are standalone and use `ChangeDetectionStrategy.OnPush`. The
switch extends `BasicValueAccessor`; the option is not a form control.

## Basic Usage

Both options draw the green checkmark when selected:

```html
<ims-toggle-switch [formControl]="smoker">
    <ims-toggle-switch-option [value]="true">כן</ims-toggle-switch-option>
    <ims-toggle-switch-option [value]="false">לא</ims-toggle-switch-option>
</ims-toggle-switch>
```

`appearance="reject"` makes an option draw a grey circle with a white X
instead:

```html
<ims-toggle-switch [formControl]="decision">
    <ims-toggle-switch-option value="approved">אישור</ims-toggle-switch-option>
    <ims-toggle-switch-option value="rejected" appearance="reject">דחייה</ims-toggle-switch-option>
</ims-toggle-switch>
```

Object values need `compareWith` whenever the form can hold a different instance
than the option, such as a value loaded from the server:

```html
<ims-toggle-switch [formControl]="plan" [compareWith]="compareById">...</ims-toggle-switch>
```

## Public API

### `ims-toggle-switch`

| Member | Kind | Purpose |
| --- | --- | --- |
| `compareWith` | input | `(first, second) => boolean` used to match the value to options. Default `===`. |
| `required` | input | Sets `aria-required`. Validation comes from Angular's `required` validator; see States. |
| `disabled` | input | Disables both options; a parent form can also disable the switch. |
| `id` | input | Kept on the switch host, so ARIA references elsewhere can point at it. Unlike other `BasicValueAccessor` controls, it is not forwarded to an inner input. |
| `value` | model | From `BasicValueAccessor`, for `[(value)]` without forms. |
| `selectionChange` | output | The picked option's value, emitted only on a user pick. |
| `valueChange` | output | From `BasicValueAccessor`; see Events. |

`null` and `undefined` mean nothing is selected. A value matching neither
option is kept and selects nothing. The switch has no `name` input: its two
radios share a generated name, so every switch is a group of its own.

### `ims-toggle-switch-option`

| Member | Kind | Purpose |
| --- | --- | --- |
| `value` | required input | The value this option writes. |
| `appearance` | input | `'check'` (default): a green circle with a white checkmark. `'reject'`: a grey circle with a white X. |
| `disabled` | input | Disables this option only. |
| `aria-label` | input | Accessible name for an option without projected text. Forwarded to the native input. |
| `id` | input | Forwarded to the native input, not the host. |

An `ims-toggle-switch-option` outside an `ims-toggle-switch` throws.

### Values to avoid

- Bind non-string values: `[value]="true"`. A static `value="true"` is the
  string `'true'`, which a boolean form value never matches.
- `null` cannot be an option value: it means nothing is selected. Give a
  "none" choice a sentinel value instead.
- Give the two options different values. The switch draws every option holding
  the selected value as selected, but the browser keeps only one radio of the
  group checked, so two options sharing a value fall out of step.

## Events

- `selectionChange` fires only for a user pick: a click, an arrow key, or Space.
  Form writes (`setValue`, `reset`) and `value` bindings never emit it.
- `valueChange` fires whenever the value changes, including form writes. It
  exists to keep `[(value)]` in sync, not to detect user action.
- The native `change` event is stopped inside each option, so a `(change)`
  binding on either component never fires. Use `selectionChange`.

A handler may write a different value back in the same turn, for example to
refuse a pick. The switch then puts the native radios back in line with the
value. See Safe Change Guide.

## Semantics and Keyboard

- The switch host has `role="radiogroup"` and each option renders a native
  `type="radio"`. The browser provides the radio keyboard model: Tab enters on
  the selected option, or the first when none is selected. Arrow keys move and
  select, and disabled options are skipped. Chrome maps Left and Right to the
  element's direction, so in RTL Left moves to the next option.
- A selected option stays selected when clicked again, as with native radios.
  Reset the form, or write `null`, to clear it.
- The switch is marked touched when focus leaves it, not when focus moves
  between its options.

## States

The native radio is the real control: it covers the whole option and receives
clicks, focus, and form state. Styles read its `:checked`, `:disabled`,
`:hover`, and `:focus-visible` pseudo-classes. Its `checked` is bound to the
value, so the picture is what assistive technology reads.

- Disabled: the native radio is disabled. An unselected option uses the subtle
  border on the disabled surface; a selected one fills with
  `--ims-color-on-surface-disabled`.
- Readonly: inside an `ims-readonly` scope the host gets `.ims-readonly` and
  both radios are disabled. Options keep the regular border on the readonly
  surface, and a selected one fills with `--ims-color-on-surface-readonly`. The
  checkmark and the X then differ by shape alone.
- Invalid: `ng-invalid` on the host tints enabled options in
  `--ims-color-invalid`, with the `--ims-color-invalid-focus-ring` focus ring. A
  selected option, reject included, fills red: with `required` alone, the
  switch is invalid only while nothing is selected, so a red fill means another
  validator refused the chosen value. Disabled and readonly options are not
  tinted.
- Required: Angular's `RequiredValidator` treats `null` as empty, so a
  `required` attribute on a switch with `formControl`, `formControlName`, or
  `ngModel` is enough.

## Form Layout and Error Popover

The switch host carries two markers that existing components read:

- `data-ims-labelled-group`: inside `ims-form-field`, the main label is
  referenced from the switch's `aria-labelledby` rather than pointed at its
  first option with `for`. The field does this only for a native `<label>`.
  See `../ims-form-layout/README.md`.
- `data-ims-main-control`: `ims-error-popover` on the switch puts `aria-invalid`
  and `aria-describedby` on the host itself, because its role is `radiogroup`.
  The role is a static host attribute, so it is in place before the popover
  looks for it.

Hovering the field label hovers both enabled options: each circle gets the
hover border and halo. `ims-toggle-switch.scss` matches
`ims-form-field:has(> label:hover)` next to each real hover selector, as
`ims-radio.scss` does.

Outside a form field, name the switch yourself with `aria-labelledby` or
`aria-label` on `<ims-toggle-switch>`.

Do not put the switch inside the `<label>` of an `ims-form-field-group` pair.
A click on the pair text would activate the label's first labelable
descendant, the first radio, and select that option.

### Icon-only options

An option without projected text needs `aria-label`. At rest both circles are
empty, so two icon-only options look the same until one is selected. Give them
visible context, such as a column header, or a tooltip:

```html
<ims-toggle-switch [attr.aria-labelledby]="rowHeaderId" [(value)]="row.decision">
    <ims-toggle-switch-option value="approved" aria-label="אישור" imsTooltip="אישור" />
    <ims-toggle-switch-option value="rejected" appearance="reject" aria-label="דחייה" imsTooltip="דחייה" />
</ims-toggle-switch>
```

In a container that clips its overflow, such as `ims-grid-cell`, leave about
4px of inline room around the switch. The circle overhangs its slot by 1px and
the focus ring adds 3px.

## Styling

Classes: `.ims-toggle-switch-host` (switch host),
`.ims-toggle-switch-option-host` (option host), `.ims-toggle-switch-option`,
`.ims-toggle-switch-option__native`, `.ims-toggle-switch-option__control`,
`.ims-toggle-switch-option__icon`, `.ims-toggle-switch-option__mark`,
`.ims-toggle-switch-option__label`, plus the modifiers
`.ims-toggle-switch-option--reject`, `.ims-toggle-switch-option--animations-ready`
and `.ims-toggle-switch-option__mark--second` (the X's second stroke).

The host lays the two options side by side and wraps them only where they do
not fit. It is `width: fit-content`, like the radio group: as wide as its
options and capped at the available width. Do not change it to `max-content`,
which forces an auto grid track open to the full row. Given a width of its own,
such as a `field-*` class, the host spreads the options across it with
`justify-content: space-between`: the first at the start, the second at the
end.

The default width is declared inside `:where()`, so it has no specificity, as
the form layout's size defaults do. Any width a consumer sets therefore wins,
wherever its rule sits in the cascade: a `field-*` class, a class from the
consumer's own stylesheet, or an inline style. Keep it inside `:where()`: at the
host class's own specificity, a one-class width rule loaded before
`ims-toggle-switch.scss` loses to it.

Every option is at least `--field-height` (26px) tall with the circle centered
in it. Two sizes are declared on `:root`, both outer sizes with the border
included:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-toggle-switch-size` | `1.25rem` (20px) | The slot each circle sits in: the space it takes in the layout. The same as `--ims-radio-size` and `--ims-checkbox-size`. |
| `--ims-toggle-switch-circle-size` | `1.375rem` (22px) | The circle, drawn a little larger than its slot so the marks read clearly. The same as `--ims-radio-check-size`. |

The circle is drawn at its size but laid out at the slot size, with a -1px
margin making up the difference, so every option keeps the footprint of a
checkbox and labels line up across the three components. At rest the circle
fills with the input surface, as a checkbox does, so its border keeps 3:1
contrast against its own fill on any surface. The marks' viewBox matches the
circle's 18px inner box, so their 2px strokes stay on whole pixels. As in
`ims-radio`, the slot and the margin round to whole pixels with CSS `round()`
behind `@supports (width: round(1.5px, 1px))`.

Color hooks, read as fallbacks so they can be set on any ancestor:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-toggle-switch-accent` | `--ims-color-interactive-success` | Check options: selected fill, hover border and halo. |
| `--ims-toggle-switch-accent-strong` | `--ims-toggle-switch-accent`, else `--ims-color-interactive-success-strong` | Check options: hover on a selected option. |
| `--ims-toggle-switch-reject-accent` | `--ims-color-interactive-neutral` | Reject options: selected fill, hover border and halo. |
| `--ims-toggle-switch-reject-accent-strong` | `--ims-toggle-switch-reject-accent`, else `--ims-color-interactive-neutral-strong` | Reject options: hover on a selected option. |

Internally every state rule paints with `--ims-toggle-switch-tone`,
`--ims-toggle-switch-tone-strong`, and `--ims-toggle-switch-tone-ring`. The
reject appearance and the invalid, disabled, and readonly states only retune
those three variables. A check option's focus ring is
`--ims-color-success-focus-ring`. A reject option keeps the default
`--ims-color-focus-ring`, because a grey ring would look like its grey hover
halo.

Hover paints a 3px outline halo in an 18% tint of the tone. A focused option
shows its focus ring instead of the halo, since both sit in the same place.

Motion is kept cheap for machines without a GPU: there is no transform at all.
A selected mark draws in with `stroke-dashoffset`. The checkmark takes 1.6
times `--ims-toggle-switch-duration`. Each stroke of the X takes 0.9 times, and
the second starts at 0.7, so both marks finish together. Transitions start only
after the first render, so an initially selected option does not animate in.
`prefers-reduced-motion: reduce` removes transitions.

## Safe Change Guide

- Keep `[attr.id]: 'id()'` in the switch's host bindings, after the inherited
  `BasicValueAccessor` binding that clears the host id. Without it, the switch
  silently loses the id a consumer gives it.
- Keep `role: 'radiogroup'` a static host attribute. `ims-error-popover`
  resolves its ARIA target from it.
- Keep `syncNativeChecked()` at the end of `selectFromUser`, on every path. By
  the time `change` fires, the browser has already checked the clicked radio.
  A handler that writes the value back in the same turn changes no `[checked]`
  binding, so without the sync that radio would stay checked, drawn and
  announced as selected, and clicking it again would fire no `change`.
- Test for an empty value with `== null`, never with a falsy check: `false`
  and `0` are option values.
- Do not add a `name` input. One name repeated across table rows would make the
  browser treat every row's radios as one group.
- Keep the host's `width: fit-content` inside `:where()`. At the host class's
  specificity it beats a consumer's one-class width rule that loads earlier.
- Keep `pointer-events: none` on `.ims-toggle-switch-option__control`. It is
  positioned after the native radio, so it paints above it. Without the rule, a
  pointer over the circle misses the radio and no hover style applies.
- Keep `.ims-toggle-switch-option__native` immediately before
  `.ims-toggle-switch-option__control`; every state selector depends on that
  adjacency.
- Keep the disabled and readonly fills limited to unselected options
  (`:not(:checked)`), so the selected rules paint every selected option with the
  retuned tone.
- Resize the circle through `--ims-toggle-switch-circle-size`, never
  `--ims-toggle-switch-size` or a transform. The slot must stay the same as the
  checkbox's and the radio's, or labels stop lining up. If the circle size
  changes, update the marks' viewBox and paths to the new inner box, and keep
  each `stroke-dasharray` longer than its path.
- Do not add scale, ripple, or other transform animations. The target machines
  have no GPU; use color, border, or outline changes instead.
- Never declare the public color hooks inside `ims-toggle-switch.scss`: a
  declaration on the option would override a consumer value set on an ancestor.
- Emit `selectionChange` only from `selectFromUser`. Programmatic updates flow
  through `writeValue` and the `value` model.
- Use only APIs available in Angular 18: no `linkedSignal`,
  `afterRenderEffect`, `@let`, or signal writes from `effect`.
