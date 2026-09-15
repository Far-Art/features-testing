# IMS Checkbox Implementation Guide

This document describes the current `ims-checkbox` implementation for future
maintenance and AI-assisted changes. Treat the behavior documented here as part
of the component contract unless a requested change explicitly replaces it.

## File Map

- `ims-checkbox.ts`: checked-state resolution, forms integration, the user
  toggle, `checkedChange`, and the click ripple.
- `ims-checkbox.html`: the native checkbox, the visual track with its SVG mark,
  and the projected label.
- `index.ts`: public exports.
- `src/styles/ims-checkbox.scss`: all checkbox styles, loaded globally from
  `src/styles.scss`, including `--ims-checkbox-size` on `:root`, which
  `ims-form-field` also reads.
- `src/app/pages/component-states-demo`: normal, disabled, readonly, invalid,
  and invalid + readonly examples.

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

## Public API

| Member | Kind | Purpose |
| --- | --- | --- |
| `checked` | input | Explicit checked state. When bound (not `null`/`undefined`), it takes precedence over the form value. |
| `intermediate` | model | Indeterminate state. A user click clears it and checks the box. |
| `trueValue` | input | Value written when checked. Default `true`. |
| `falseValue` | input | Value written when unchecked. Default `false`. |
| `required` | input | Requires the box to be checked: a bound form control gets a `required` error while its value is not `trueValue`. Also sets `aria-required`. |
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

- Disabled: the native input is disabled; disabled tokens apply.
- Readonly: inside an `ims-readonly` scope the host gets `.ims-readonly` and the
  native input is disabled, so the readable-disabled tokens apply.
- Invalid: `ng-invalid` on the host tints the box border (and the fill when
  checked) with `--ims-color-invalid`, and the focus ring with
  `--ims-color-invalid-focus-ring`. Disabled and readonly boxes are not
  tinted.
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
`.ims-checkbox__track`, `.ims-checkbox__ripple`, `.ims-checkbox__icon`,
`.ims-checkbox__mark`, `.ims-checkbox__label`, plus the component-state
modifiers `.ims-checkbox--animations-ready` and `.ims-checkbox--ripple`.

The host is `inline-flex`, and `.ims-checkbox` is at least `--field-height`
(26px) tall with the box centered in it, so a checkbox lines up with the inputs
beside it.

Colors use semantic tokens only: `--ims-color-border`,
`--ims-color-interactive`, `--ims-color-interactive-strong`,
`--ims-color-on-interactive`, `--ims-color-focus-ring`, the `*-disabled` and
`*-readonly` tokens, and the invalid tokens. The box size is
`--ims-checkbox-size` (outer size, border included), declared on `:root` in
`ims-checkbox.scss`.

Transitions start only after the first render, so an initially checked box does
not animate in. `prefers-reduced-motion: reduce` removes transitions and the
ripple.

## Safe Change Guide

- Keep `.ims-checkbox__native` immediately before `.ims-checkbox__track`; every
  state selector depends on that adjacency.
- If you change `--ims-checkbox-size`, the form-field label offset follows it.
  A size that ignores the variable breaks direct-checkbox alignment in
  `ims-form-field`.
- Keep `--ims-checkbox-size` on `:root`. The field label is a sibling of the
  checkbox host, so a variable declared on `.ims-checkbox` or the host never
  reaches it, and the label ends up on top of the box.
- Keep the ripple duration in `ims-checkbox.scss` and `IMS_CHECKBOX_RIPPLE_MS`
  equal.
- The checkmark and dash paths must keep the same command structure (`M L L`),
  or the `d` morph stops interpolating.
- Emit `checkedChange` only from user interaction. Programmatic updates flow
  through `writeValue` and the `checked` input.
- Use only signal APIs available in Angular 18. `linkedSignal` is not one of
  them, so the local `checked` copy (`checkedState`) is derived with `computed`:
  `checkedBinding` is a new object each time `checked` changes, and a user
  toggle in `checkedOverride` applies only while its binding object is current.
  Do not replace this with an `effect`: in Angular 18 an effect first runs after
  the initial render and needs `allowSignalWrites`.
