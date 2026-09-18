# IMS Radio Implementation Guide

This document describes the current `ims-radio-group` and `ims-radio`
implementation for future maintenance and AI-assisted changes. Treat the
behavior documented here as part of the component contract unless a requested
change explicitly replaces it.

## File Map

- `ims-radio-group.ts`: forms integration, single and multiple value handling,
  `compareWith`, the user selection path, `selectionChange`, and touched state.
- `ims-radio.ts`: one option. Reads its selected state from the group and
  reports user changes back to it.
- `ims-radio.html`: the native input, the visual circle with its dot or check
  mark, and the projected label.
- `ims-radio.types.ts`: `IMS_RADIO_GROUP`, the group contract options depend on,
  and the appearance and layout types.
- `index.ts`: public exports.
- `src/styles/ims-radio.scss`: all radio styles, loaded globally from
  `src/styles.scss`, including `--ims-radio-size`, `--ims-radio-ring-size`,
  and `--ims-radio-check-size` on `:root`.
- `src/styles/tokens/semantic-color-tokens.scss`: the
  `--ims-color-interactive-success*` and `--ims-color-success-focus-ring` tokens
  used by the check appearance.
- `src/app/pages/radio-demo`: appearances, multiple selection, forms, states,
  and color overrides.
- `src/app/pages/component-states-demo`: normal, disabled, readonly, invalid,
  and invalid + readonly examples.

Both components are standalone and use `ChangeDetectionStrategy.OnPush`. The
group extends `BasicValueAccessor`; the option is not a form control.

## Basic Usage

```html
<ims-radio-group [formControl]="channel">
    <ims-radio value="email">דואר אלקטרוני</ims-radio>
    <ims-radio value="sms">SMS</ims-radio>
</ims-radio-group>
```

Multiple selection writes an array, in the order the user selected the values:

```html
<ims-radio-group multiple [formControl]="channels">
    <ims-radio value="email">דואר אלקטרוני</ims-radio>
    <ims-radio value="sms">SMS</ims-radio>
</ims-radio-group>
```

The check appearance draws a green circle with a checkmark instead of a blue dot.
It works in either mode:

```html
<ims-radio-group appearance="check" layout="inline" [(value)]="plan">
    @for (option of plans; track option.id) {
        <ims-radio [value]="option" [disabled]="option.locked">{{ option.label }}</ims-radio>
    }
</ims-radio-group>
```

Object values need `compareWith` whenever the form can hold a different instance
than the option, such as a value loaded from the server:

```html
<ims-radio-group [formControl]="plan" [compareWith]="compareById">...</ims-radio-group>
```

## Public API

### `ims-radio-group`

| Member | Kind | Purpose |
| --- | --- | --- |
| `multiple` | input | Allows any number of selected options. The value becomes a new `readonly T[]` on every change. Default `false`. |
| `appearance` | input | `'radio'` (default) or `'check'`, for every option that does not set its own. |
| `layout` | input | `'stacked'` (default): one option per row. `'inline'`: a wrapping row. |
| `compareWith` | input | `(first, second) => boolean` used to match values to options. Default `===`. |
| `name` | input | Native `name` shared by the options in single mode. Generated when omitted. |
| `required` | input | Sets `aria-required` in single mode. Validation comes from Angular's `required` validator; see States. |
| `disabled` | input | Disables every option; a parent form can also disable the group. |
| `value` | model | From `BasicValueAccessor`, for `[(value)]` without forms. |
| `selectionChange` | output | New group value, emitted only on a user change. |
| `valueChange` | output | From `BasicValueAccessor`; see Events. |

`null` and `undefined` mean nothing is selected, so an option cannot use `null`
as its value. In multiple mode a scalar value counts as a one-value selection,
as in `ims-select`. A value matching no option is kept and selects nothing.

### `ims-radio`

| Member | Kind | Purpose |
| --- | --- | --- |
| `value` | required input | The value this option writes. |
| `disabled` | input | Disables this option only. |
| `appearance` | input | `'radio'`, `'check'`, or `null` (default) to inherit the group's. |
| `aria-label` | input | Accessible name for an option without projected text. Forwarded to the native input. |
| `id` | input | Forwarded to the native input, not the host. |

An `ims-radio` outside an `ims-radio-group` throws.

## Events

- `selectionChange` fires only for a user change: a click, an arrow key in
  single mode, or Space. Form writes (`setValue`, `reset`) and `value` bindings
  never emit it.
- `valueChange` fires whenever the group value changes, including form writes.
  It exists to keep `[(value)]` in sync, not to detect user action.
- The native `change` event is stopped inside each option, so a `(change)`
  binding on either component never fires. Use `selectionChange`.

## Semantics and Keyboard

- Single mode: the group host has `role="radiogroup"` and every option renders
  a native `type="radio"` with the group's `name`. The browser provides the
  radio keyboard model: Tab enters on the selected option, arrow keys move and
  select, and disabled options are skipped. Chrome maps Left and Right to the
  element's direction, so in RTL Left moves to the next option.
- Multiple mode: the group host has `role="group"` and every option renders a
  native `type="checkbox"` drawn as a circle, so assistive technology announces
  a multi-select correctly. Each option is a Tab stop and Space toggles it.
- A selected option cannot be cleared by clicking it again in single mode, as
  with native radios. Reset the form to clear it.
- The group is marked touched when focus leaves it, not when focus moves between
  its options.

## States

The native input is the real control: it covers the whole option and receives
clicks, focus, and form state. Styles read its `:checked` and `:disabled`
pseudo-classes, so the visual state always matches what assistive technology
reads.

- Disabled: the native input is disabled. An unselected option uses the subtle
  border on the disabled surface; a selected one paints its dot or fill with
  `--ims-color-on-surface-disabled`.
- Readonly: inside an `ims-readonly` scope the group host gets `.ims-readonly`
  and every native input is disabled. Options keep the regular border on the
  readonly surface, and a selected one paints with
  `--ims-color-on-surface-readonly`.
- Invalid: `ng-invalid` on the group host tints enabled options in
  `--ims-color-invalid`, with the `--ims-color-invalid-focus-ring` focus ring.
  Disabled and readonly options are not tinted.
- Required: Angular's `RequiredValidator` treats `null` and `[]` as empty, so a
  `required` attribute on a group with `formControl`, `formControlName`, or
  `ngModel` is enough. Unlike `ims-checkbox`, the group adds no validator.

## Form Layout and Error Popover

The group host carries two markers that existing components read:

- `data-ims-labelled-group`: inside `ims-form-field`, the main label is
  referenced from the group's `aria-labelledby` rather than pointed at the first
  option with `for`. See `../ims-form-layout/README.md`.
- `data-ims-main-control`: `ims-error-popover` on the group puts `aria-invalid`
  and `aria-describedby` on the group element itself, because its role is
  `radiogroup` or `group`.

Hovering the field label hovers every enabled option at once: each circle gets
the hover border and halo, and the label takes the field accent color. A
checkbox gets the same from its label's `for`. The group has no `for`, so
`ims-radio.scss` matches `ims-form-field:has(> label:hover)` next to each real
hover selector.

Outside a form field, name the group yourself with `aria-labelledby` or
`aria-label` on `<ims-radio-group>`.

## Styling

Classes: `.ims-radio-group-host` (group host, with `[data-layout]`),
`.ims-radio-host` (option host), `.ims-radio`, `.ims-radio__native`,
`.ims-radio__control`, `.ims-radio__dot`,
`.ims-radio__icon`, `.ims-radio__mark`, `.ims-radio__label`, plus the modifiers
`.ims-radio--check` and `.ims-radio--animations-ready`.

The group host is `width: fit-content`: as wide as its options (their
max-content width), not stretched across its container, and capped at the
available width, where an inline group wraps and long labels break. Do not
change it to `max-content`. Even capped with `max-width: 100%`, `max-content`
forces an auto grid track open to the full row. The group then overflows its
container instead of wrapping.

Every option is at least `--field-height` (26px) tall with the circle centered
in it. Three sizes are declared on `:root`, all outer sizes with the border
included:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-radio-size` | `1.25rem` (20px) | The slot every circle sits in: the space it takes in the layout. The same as `--ims-checkbox-size`. |
| `--ims-radio-ring-size` | `1rem` (16px) | The radio appearance's ring, drawn a little smaller than its slot so it reads like a native radio. |
| `--ims-radio-check-size` | `1.375rem` (22px) | The check appearance's circle, drawn a little larger than its slot so the checkmark reads clearly. |

Each circle is drawn at its appearance's size but laid out at the slot size.
The margin makes up the difference: +2px around the ring and -1px around the
check circle at the default sizes. Every option therefore has the footprint of
a checkbox, labels line up across both appearances and checkboxes, and the row
stays a field height tall. The circles are sized, not scaled, because a
transform would blur on low-DPI screens.

The dot is two thirds of the ring's inner box: 8px with a 2px gap at the
default size. The checkmark's viewBox matches the check circle's 18px inner box,
so its 2px stroke stays on whole pixels.

As in `ims-checkbox`, the slot rounds its size to whole pixels with CSS
`round()`, so a low-DPI screen cannot snap a circle to an oval. The margin
rounds to whole pixels too, and the circle takes the slot plus or minus twice
the margin, so it stays centered whatever the sizes are. The dot is sized by a rounded
inset on every side, so it stays centered even when the inner box has an odd
size. These rules sit behind `@supports (width: round(1.5px, 1px))`. A browser
without `round()` keeps the unrounded sizes instead of collapsing the circle to
`auto`.

Color hooks, read as fallbacks so they can be set on any ancestor:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ims-radio-accent` | `--ims-color-interactive` | Radio appearance: selected border and dot, hover border and halo. |
| `--ims-radio-accent-strong` | `--ims-radio-accent`, else `--ims-color-interactive-strong` | Radio appearance: hover on a selected option. |
| `--ims-radio-check-accent` | `--ims-color-interactive-success` | Check appearance: selected fill, hover border and halo. |
| `--ims-radio-check-accent-strong` | `--ims-radio-check-accent`, else `--ims-color-interactive-success-strong` | Check appearance: hover on a selected option. |

Internally every state rule paints with `--ims-radio-tone`,
`--ims-radio-tone-strong`, and `--ims-radio-tone-ring`. The appearance and the
invalid, disabled, and readonly states only retune those three variables.

Hover paints a 3px outline halo in an 18% tint of the tone, drawn with
`outline` so it costs no layout. A focused option shows its focus ring instead
of the halo, since both sit in the same place.

Motion is kept cheap for machines without a GPU, where the CPU paints every
transformed frame: there is no hover scale and no click ripple. The only
transform is the selected dot growing in. Transitions start only after the first
render, so an initially selected option does not animate in.
`prefers-reduced-motion: reduce` removes transitions.

## Migration

### From native radios

```html
<!-- Before -->
<label><input type="radio" name="tier" value="gold" [(ngModel)]="tier"> זהב</label>
<label><input type="radio" name="tier" value="silver" [(ngModel)]="tier"> כסף</label>

<!-- After -->
<ims-radio-group [(ngModel)]="tier">
    <ims-radio value="gold">זהב</ims-radio>
    <ims-radio value="silver">כסף</ims-radio>
</ims-radio-group>
```

- The form binding moves from every input to the group, and `name` becomes
  optional.
- `(change)` on the inputs becomes `(selectionChange)` on the group, which emits
  the new value rather than a DOM event.
- `[value]` bindings with objects need `compareWith` on the group.

### From `mat-radio-group`

| Angular Material | IMS |
| --- | --- |
| `<mat-radio-group>` | `<ims-radio-group>` |
| `<mat-radio-button [value]>` | `<ims-radio [value]>` |
| `name`, `disabled`, `required` | Same names. |
| `(change)="onChange($event.value)"` | `(selectionChange)="onChange($event)"` |
| `[checked]` on a button | Set the group value instead. |
| `color` | `--ims-radio-accent` / `--ims-radio-check-accent` on an ancestor. |
| `labelPosition`, `disableRipple`, group `selected` | Not supported. |

Watch for two silent failures:

- A leftover `(change)` binding still compiles but never fires, because the
  native event is stopped inside the option.
- An option whose value is `null`, such as "none", looks like an empty
  selection. Give it a sentinel value instead.

## Safe Change Guide

- Keep `pointer-events: none` on `.ims-radio__control`. It is positioned
  after the native input, so it paints above it. Without the rule, a pointer
  over the circle misses the input and no hover style applies; only the label
  text reacts.
- Keep sizes that must stay square or centered, meaning the slot, the circle
  margin, and the dot inset, rounded to whole pixels inside the `@supports`
  block.
- Resize a circle through `--ims-radio-ring-size` or `--ims-radio-check-size`,
  never `--ims-radio-size` or a transform. The slot must stay the same as the
  checkbox's, or labels in a mixed group stop lining up.
- If you change `--ims-radio-check-size`, update the checkmark's viewBox and
  path to the new inner box, or the 2px stroke scales off whole pixels. Keep
  `stroke-dasharray` longer than the path.
- Keep `.ims-radio__native` immediately before `.ims-radio__control`; every
  state selector depends on that adjacency.
- Do not add scale, ripple, or other transform animations to hover or
  selection. The target machines have no GPU; use color, border, or outline
  changes instead.
- Keep the check mark's `stroke-dasharray` longer than the path, or the mark is
  drawn only partly.
- Never declare the public color hooks inside `ims-radio.scss`: a declaration on
  the option would override a consumer value set on an ancestor.
- Emit `selectionChange` only from `selectFromUser`. Programmatic updates flow
  through `writeValue` and the `value` model.
- Keep the group host as the element carrying `role`, `data-ims-main-control`,
  and `data-ims-labelled-group`; the form field and the error popover find it by
  those attributes.
- Use only signal APIs available in Angular 18 (no `linkedSignal`, no signal
  writes from `effect`).
