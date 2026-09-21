# IMS Checkbox Implementation Guide

This document describes the current `ims-checkbox` implementation for future
maintenance and AI-assisted changes. Treat the behavior documented here as part
of the component contract unless a requested change explicitly replaces it.

## File Map

- `ims-checkbox.ts`: checked-state resolution, forms integration, the user
  toggle, `checkedChange`, the appearance, and the mark paths it draws.
- `ims-checkbox.html`: the native checkbox, the visual track with its SVG mark,
  and the projected label.
- `index.ts`: public exports.
- `src/styles/ims-checkbox.scss`: all checkbox styles, loaded globally from
  `src/styles.scss`, including `--ims-checkbox-size` on `:root`, which
  `ims-form-field` also reads, and `--ims-checkbox-check-size` beside it.
- `src/styles/tokens/semantic-color-tokens.scss`: the
  `--ims-color-interactive-success*` and `--ims-color-success-focus-ring` tokens
  used by the check appearance.
- `src/app/pages/checkbox-demo`: both appearances with partial selection,
  forms, states, a check checkbox beside a check `ims-radio-group`, and color
  overrides.
- `src/app/pages/component-states-demo`: normal, disabled, readonly, invalid,
  and invalid + readonly examples, in both appearances.

The component is standalone, uses `ChangeDetectionStrategy.OnPush`, and extends
`BasicValueAccessor`.

## Basic Usage

```html
<ims-checkbox [formControl]="accepted">מאושר</ims-checkbox>
```

With custom values, the form receives `trueValue` or `falseValue`:

```html
<ims-checkbox [formControl]="status" trueValue="active" falseValue="inactive">
    פעיל
</ims-checkbox>
```

Without a form, bind `checked` directly. A static attribute is a starting
state that the user can change; two-way binding keeps the parent in sync:

```html
<ims-checkbox checked>שליחת עדכונים</ims-checkbox>
<ims-checkbox [(checked)]="sendUpdates">שליחת עדכונים</ims-checkbox>
```

The check appearance draws the green circle `ims-radio` draws for its own check
appearance, so a checkbox can sit among check options without standing out.
Everything else, the indeterminate dash included, is unchanged:

```html
<ims-checkbox appearance="check" [formControl]="approved">מאושר</ims-checkbox>
```

## Public API

| Member | Kind | Purpose |
| --- | --- | --- |
| `checked` | input | Explicit checked state. When bound (not `null`/`undefined`), it takes precedence over the form value. |
| `intermediate` | model | Indeterminate state. A user click clears it and checks the box. |
| `trueValue` | input | Value written when checked. Default `true`. |
| `falseValue` | input | Value written when unchecked. Default `false`. |
| `required` | input | Requires the box to be checked: a bound form control gets a `required` error while its value is not `trueValue`. Also sets `aria-required`. |
| `appearance` | input | `'checkbox'` (default): the rounded box. `'check'`: the green circle of `ims-radio`'s check appearance. |
| `disabled` | input | Disables the control; a parent form can also disable it. |
| `id` | input | Forwarded to the native checkbox, not the host. |
| `checkedChange` | output | New checked state, emitted only on a user toggle. |
| `valueChange` | output | From `BasicValueAccessor`; see Events. |
| `intermediateChange` | output | Emitted when a user click clears `intermediate`. |

## Events

- `checkedChange` fires only for a user toggle. Form writes (`setValue`,
  `reset`) and parent `checked` bindings never emit it. Use it for "the user
  changed this" reactions.
- `valueChange` fires whenever the component's value changes, including form
  writes. It exists to keep `[(value)]` in sync, not to detect user action.
- The native `change` event is stopped inside the component, so a `(change)`
  binding on `<ims-checkbox>` never fires. Use `checkedChange`.

A click from the indeterminate state emits `checkedChange(true)` even when
`checked` was already true, because the user did act.

## States

The native input is the real control: it covers the whole label and receives
clicks, focus, and form state. Styles read its `:checked`, `:indeterminate`,
and `:disabled` pseudo-classes, so the visual state always matches what
assistive technology reads.

- Disabled: the native input is disabled. An unchecked box uses the subtle
  border on the disabled surface; a checked or indeterminate box fills with
  `--ims-color-on-surface-disabled`.
- Readonly: inside an `ims-readonly` scope the host gets `.ims-readonly` and the
  native input is disabled. The box keeps the regular `--ims-color-border` on
  the readonly surface, so an unchecked box stays visible, and a checked or
  indeterminate box fills with `--ims-color-on-surface-readonly` behind the
  white mark. The value stays readable and never looks enabled or disabled.
- Invalid: `ng-invalid` on the host tints the box border (and the fill when
  checked) and the hover halo with `--ims-color-invalid`, and the focus ring
  with `--ims-color-invalid-focus-ring`. It outranks the appearance, so a check
  circle is tinted the same way. Disabled and readonly boxes are not tinted.
- Required: `required` makes a bound form control invalid until the box is
  checked, meaning its value equals `trueValue`. The checkbox validates this
  itself, because Angular's `required` validator counts an unchecked `false`
  as filled in. With `ims-error-popover` on the host, the native input is the
  marked main control (`data-ims-main-control`), so it receives `aria-invalid`
  and `aria-describedby`.

## Form Layout

A direct child of `ims-form-field` shares the value column with the field
label, which is offset by `--ims-checkbox-size` plus the field gap. The field
associates its label with the native checkbox through `id`. See
`../ims-form-layout/README.md`.

## Accessibility

- The accessible name is the projected label, or the associated field label.
- Checked and mixed states come from the native `checked` and `indeterminate`
  properties; do not add `aria-checked` to the native checkbox.
- `required` sets `aria-required` on the native checkbox rather than the native
  `required` attribute, so the browser never runs its own validation.
- The track and SVG mark are `aria-hidden`.

## Styling

Classes: `.ims-checkbox-host` (host), `.ims-checkbox`, `.ims-checkbox__native`,
`.ims-checkbox__track`, `.ims-checkbox__icon`, `.ims-checkbox__mark`,
`.ims-checkbox__label`, plus the modifiers `.ims-checkbox--check` and
`.ims-checkbox--animations-ready`.

The host is `inline-flex`, and `.ims-checkbox` is at least `--field-height`
(26px) tall with the box centered in it, so a checkbox lines up with the inputs
beside it.

Colors use semantic tokens only: `--ims-color-border`,
`--ims-color-interactive` and `--ims-color-interactive-strong`, their
`--ims-color-interactive-success` counterparts, `--ims-color-on-interactive`,
`--ims-color-focus-ring`, `--ims-color-success-focus-ring`, the `*-disabled` and
`*-readonly` tokens, and the invalid tokens.

Two sizes are declared on `:root` in `ims-checkbox.scss`, both outer sizes with
the border included:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-checkbox-size` | `1.25rem` (20px) | The slot every box sits in: the space it takes in the layout, and the size the checkbox appearance is drawn at. The same as `--ims-radio-size`. |
| `--ims-checkbox-check-size` | `1.375rem` (22px) | The check appearance's circle, drawn a little larger than its slot so the checkmark reads clearly. The same as `--ims-radio-check-size`. |

The box is drawn at its appearance's size but laid out at the slot size, and the
margin makes up the difference: 0 around the square and -1px around the check
circle at the default sizes. Both appearances therefore keep the same footprint,
labels line up across appearances and with `ims-radio`, and `ims-form-field`
keeps offsetting its label by `--ims-checkbox-size`. The circle is sized, not
scaled, because a transform would blur on low-DPI screens.

The track rounds the slot and the margin to whole pixels with CSS `round()`, and
takes the slot plus or minus twice the margin, so it stays centered whatever the
sizes are. On a low-DPI screen a fractional size, from a rem under a non-16px
root or from browser zoom, would snap to a box a pixel wider than it is tall and
move the mark off center. The rounding sits behind
`@supports (width: round(1.5px, 1px))`. Without that guard, a browser lacking
`round()` would compute the width to `auto` and collapse the box. Such a browser
keeps the unrounded sizes.

Color hooks, read as fallbacks so they can be set on any ancestor:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-checkbox-accent` | `--ims-color-interactive` | Checkbox appearance: checked fill and border, hover border and halo. |
| `--ims-checkbox-accent-strong` | `--ims-checkbox-accent`, else `--ims-color-interactive-strong` | Checkbox appearance: hover on a checked box. |
| `--ims-checkbox-check-accent` | `--ims-color-interactive-success` | Check appearance: checked fill, hover border and halo. |
| `--ims-checkbox-check-accent-strong` | `--ims-checkbox-check-accent`, else `--ims-color-interactive-success-strong` | Check appearance: hover on a checked box. |

Internally every state rule paints with `--ims-checkbox-tone`,
`--ims-checkbox-tone-strong`, and `--ims-checkbox-tone-ring`. The appearance and
the invalid state only retune those three variables, as in `ims-radio`.

Hover turns the border to the tone and paints a 3px outline halo in an 18% tint
of it. The halo is drawn with `outline`, so it costs no layout. A focused box
shows its focus ring instead of the halo, since both sit in the same place.
Hovering an associated `ims-form-field` label hovers the box through the label's
`for`. The hover matches `ims-radio`.

Both appearances draw their mark in the same 18-unit viewBox and differ only in
how far it is inset, because the circle's round edge cuts the corners the square
leaves free. `--ims-checkbox-mark-dash` is the dash pattern each one is drawn
with, longer than either of its shapes: 22 for the square's checkmark and dash
(~15.6 and 9 long), 12 for the circle's (~11.1 and 6.5).

Motion is kept cheap for machines without a GPU, where the CPU paints every
transformed frame: there is no hover scale and no click ripple. Transitions
start only after the first render, so an initially checked box does not animate
in. `prefers-reduced-motion: reduce` removes transitions.

## Safe Change Guide

- Keep `pointer-events: none` on `.ims-checkbox__track`. It is positioned
  after the native input, so it paints above it. Without the rule, a pointer
  over the box misses the input and no hover style applies; only the label
  text reacts.
- Keep `.ims-checkbox__native` immediately before `.ims-checkbox__track`; every
  state selector depends on that adjacency.
- If you change `--ims-checkbox-size`, the form-field label offset follows it.
  A size that ignores the variable breaks direct-checkbox alignment in
  `ims-form-field`.
- Resize the check circle through `--ims-checkbox-check-size`, never
  `--ims-checkbox-size` or a transform. The slot must stay the same as
  `--ims-radio-size`, or labels in a mixed group stop lining up.
- If you change `--ims-checkbox-check-size`, update the check appearance's paths
  to the new inner box, or their 2px stroke scales off whole pixels. Keep each
  appearance's `--ims-checkbox-mark-dash` longer than its own paths, or the mark
  is drawn only partly, and keep it short enough that the draw-in does not
  finish halfway through the transition.
- Never declare the public color hooks inside `ims-checkbox.scss`: a declaration
  on the checkbox would override a consumer value set on an ancestor.
- Keep the track size and the `ims-form-field` label offset rounded the same
  way. If only one of them is rounded, the label sits a fraction of a pixel off
  the box.
- Keep `--ims-checkbox-size` on `:root`. The field label is a sibling of the
  checkbox host, so a variable declared on `.ims-checkbox` or the host never
  reaches it, and the label ends up on top of the box.
- Do not add scale, ripple, or other transform animations to hover or toggle.
  The target machines have no GPU; use color, border, or outline changes
  instead.
- The checkmark and dash paths must keep the same command structure (`M L L`),
  or the `d` morph stops interpolating. That holds per appearance and across
  them, since one `<path>` serves both.
- Emit `checkedChange` only from user interaction. Programmatic updates flow
  through `writeValue` and the `checked` input.
- Use only signal APIs available in Angular 18. `linkedSignal` is not one of
  them, so the local `checked` copy (`checkedState`) is derived with `computed`:
  `checkedBinding` is a new object each time `checked` changes, and a user
  toggle in `checkedOverride` applies only while its binding object is current.
  Do not replace this with an `effect`: in Angular 18 an effect first runs after
  the initial render and needs `allowSignalWrites`.
