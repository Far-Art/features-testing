# IMS Button

Two attribute directives on a native `<button>`: `ims-button` for a button with
a label, and `ims-button-icon` for one with only a glyph. The element stays a
real button, so focus, keyboard activation and form behavior are the browser's.
The directives add state, the press ring and the icon presets. Everything
visual lives in the global `src/styles/ims-buttons.scss`.

Treat the behavior documented here as part of the contract unless a requested
change explicitly replaces it.

## File Map

| File | Purpose |
| --- | --- |
| `ims-button.ts` | `ImsButtonBase` with the shared inputs and states, `ImsButton`, and `ImsButtonIcon`. |
| `ims-button-presets.ts` | The icon presets: each one's glyph, default name and pinned tone. |
| `ims-button-actions.ts` | The deprecated `ims-button-delete` and `ims-button-edit`. |
| `index.ts` | Public exports. |
| `src/styles/ims-buttons.scss` | All button styles, loaded globally from `src/styles.scss`. |
| `src/app/pages/buttons-demo/` | Demo, routed at `/buttons`. |

Both directives are standalone and have no template.

## Basic Usage

```html
<button ims-button>ביטול</button>
<button ims-button ims-button-variation="primary" type="submit">שמירה</button>

<button ims-button ims-button-variation="primary">
    <ims-icon class="ims-button__symbol">add</ims-icon>
    הוספה
</button>

<button ims-button-icon aria-label="חיפוש">
    <ims-icon>search</ims-icon>
</button>

<button ims-button-icon ims-button-icon-preset="delete" (click)="remove(policy)"></button>
```

Import `ImsButton` or `ImsButtonIcon` from the `ims-button` barrel, and
`ImsIcon` for a projected glyph.

The selectors are `button[ims-button]` and `button[ims-button-icon]`. There is
no link flavor: on an `<a>` neither directive matches, and the element renders
unstyled.

`type` defaults to `button`, not the native `submit`. A button inside a
`<form>` submits only when `type="submit"` is written on it.

## Public API

### Every flavor

| Input | Default | Purpose |
| --- | --- | --- |
| `ims-button-severity` | `'info'` | `info`, `success`, `warning`, or `danger`: what kind of action this is. See [Variation and Severity](#variation-and-severity). |
| `call-to-action` | `false` | A pulsing halo that marks the one way forward. See [Call to Action](#call-to-action). |
| `disabled` | `false` | Disables the button natively. |
| `type` | `'button'` | `button`, `submit`, or `reset`. |
| `icon-size` | `null` | Size of a `.ims-button__symbol` glyph that has no size of its own, a preset's included. A bare number means px; any other CSS length passes through. See [`icon-size`](#icon-size). |

`call-to-action` and `disabled` accept boolean attributes.

There are no outputs. Bind the native `(click)`.

Also public and read-only: `interactionDisabled` (disabled or readonly),
`readonlyMode`, and `tooltipDefaults`.

### `ims-button`

| Input | Default | Purpose |
| --- | --- | --- |
| `ims-button-variation` | `'default'` | `default`, `primary`, `secondary`, or `outline`: how loudly the button speaks. |

### `ims-button-icon`

| Input | Default | Purpose |
| --- | --- | --- |
| `ims-button-icon-preset` | `null` | `edit` or `delete`. Pins a glyph and a default name, and possibly a severity and a class. See [Presets](#presets). |

The preset is bound as `ims-button-icon-preset`, prefixed the way
`ims-button-variation` and `ims-button-severity` are. A bare `preset="…"` binds
nothing: it compiles as a plain attribute, and the button draws no glyph.

An icon button takes no variation. It always gets the default treatment, with
no surface at rest.

### Exports

`ImsButton`, `ImsButtonIcon`, the types `ImsButtonSeverity`,
`ImsButtonVariation` and `ImsButtonIconPreset`, and `IMS_BUTTON_EDIT_ICON`: the
`edit` preset's glyph, for chrome that sits beside an edit action so it cannot
drift from the preset. Focus mode passes it to its dialog. The deprecated
`ImsButtonDelete` and `ImsButtonEdit` are still exported.

## Variation and Severity

These are two separate axes. `ims-button-variation` sets how much of its hue a
button puts on screen. `ims-button-severity` sets which hue it uses, and so what
kind of action it carries. Every severity works with every variation.

| Variation | At rest |
| --- | --- |
| `default` | A soft tint of the hue, with a dark label. |
| `primary` | A solid fill, with a white label. |
| `secondary` | The input surface, with a dark label. The tint appears on hover. |
| `outline` | Transparent, with a border and a label in the hue. |

The severities are the four `ims-snackbar`, `ims-tooltip` and `ims-dialog` use,
so one word means the same colour wherever the application reports state.
`info` is the default and the house blue, so a call site with nothing to report
writes nothing.

A severity replaces the whole colour ramp the variation reads from, so the
ripple, the press ring, the focus halo and the call-to-action halo all follow
it with nothing written at the call site.

- `warning` is the one ramp not read straight across. Amber fails contrast at
  the step the other hues use for a solid fill, an outline label and an outline
  border, so the half of the ramp that carries contrast is read one step darker.
  `ims-panel` darkens its warning header text for the same reason, so a warning
  panel and a warning button agree.
- On an icon button, a severity other than `info` puts the glyph on its vivid
  status colour, the one the snackbar and tooltip use, rather than the darker
  tone a label would get: the glyph is all the colour the button has. `info`
  keeps its navy.

A preset can pin a fifth severity, `neutral`: the grey `ims-panel` defaults to,
for an action that should not draw the eye. `ims-button-severity` does not
offer it, so a button is only ever neutral through a preset. It is a ramp like
the other four and works at every variation. Grey clears the same contrast the
other hues clear at each step, so unlike `warning` it is read straight across,
and its glyph sits on `neutral-600`, the neutral status colour.

## Icons

### Beside a label

Project an `<ims-icon>` carrying `ims-button__symbol`, before the label:

```html
<button ims-button>
    <ims-icon class="ims-button__symbol">tune</ims-icon>
    הגדרות
</button>
```

The class opts the glyph into the button's layout:

- The padding on the glyph's side tightens (`padding-inline: 0.4rem 0.8rem`).
  The tight side is the inline start, so the glyph goes first.
- The label drops a pixel to center Roboto's letters optically, and the glyph
  is held where it was.
- The glyph is sized from `--ims-button-symbol-size`, 1.125rem by default.

A plain `<ims-icon>` still renders, but with the label's padding on both sides
and without the nudge.

An `<ims-duo-icon>` that is a direct child gets the same layout without a class.
It takes the button's colours instead of the brand palette on every variation,
and inside a button it neither animates nor lifts on hover.

### On its own

An icon button is a square as tall as a field (`--field-height`, 26px), with no
padding. Project the glyph, and size it with the icon's own `size`:

```html
<button ims-button-icon aria-label="חיפוש">
    <ims-icon size="12">search</ims-icon>
</button>
```

It has no visible text, so it needs an accessible name: an `aria-label`, or a
preset's. See [Accessibility](#accessibility).

### `icon-size`

`icon-size` writes `--ims-button-symbol-size` on the button. It therefore
resizes every `.ims-button__symbol` glyph without a size of its own: a preset's,
and a projected `<ims-icon class="ims-button__symbol">`. An
`<ims-icon size="…">` writes its size inline and wins, and a projected
`<ims-icon>` without the class is not reached.

`icon-size="14"` is 14px. `icon-size="1.25rem"`, or any other length, passes
through as written. Neither the compiler nor the directive can catch a
malformed length: CSS drops it and the default size applies.

It is an override for one button. A preset that needs a different size sets
`--ims-button-symbol-size` in the block its class keys, as `delete` does, and
`icon-size`, being inline, still replaces it.

## Presets

```html
<button ims-button-icon ims-button-icon-preset="edit" (click)="edit(policy)"></button>
<button ims-button-icon ims-button-icon-preset="delete" (click)="remove(policy)"></button>
<button ims-button-icon [ims-button-icon-preset]="policy.locked ? null : 'delete'"></button>
```

A preset names an affordance rather than a glyph, so one action looks and reads
the same on every screen. It pins the glyph, which the button draws itself as
its first child, and brings a default accessible name. Project nothing into a
preset button, or the projected icon sits beside the pinned one.

| Preset | Glyph | Default name | Tone | Class |
| --- | --- | --- | --- | --- |
| `edit` | `ink_pen`, outlined, 1.125rem | `Edit` | Follows `ims-button-severity`, like any icon button. | `ims-button--edit` |
| `delete` | `cancel`, filled, 0.9rem | `Delete` | Pinned to `danger`. `ims-button-severity` is accepted and ignored. | `ims-button--delete` |

- `edit` is an icon button with a pinned glyph and nothing more. Its
  `.ims-button--edit` class is a hook and styles nothing.
- `delete` rests quiet: transparent, in the surrounding text colour. It takes
  the danger tone only under the pointer or keyboard focus, so a column of rows
  does not turn into a wall of red. Its glyph is filled and drawn smaller,
  because it puts down more ink than the outlined pencil beside it.
- The default names are English. A call site's own `aria-label` always replaces
  them, and one that says which row is better:
  `aria-label="מחיקת פוליסה 4821"`.
- `ims-button-icon-preset` is bindable. A new value swaps the glyph, the name,
  the severity and the class together, and with the class whatever its block
  sets, such as the glyph size. `null` removes them all.

### Adding a preset

1. Add its name to `ImsButtonIconPreset`.
2. Give it a spec in `IMS_BUTTON_ICON_PRESETS`. The record is typed over the
   union, so a name without a spec does not compile.
3. Only if it departs from a plain icon button painted in its severity, as
   `delete` does by resting in the surrounding text colour and drawing a
   smaller glyph: give its spec a `class`, and key a block in
   `ims-buttons.scss` to it. A pinned severity is the spec's to say, so it
   needs neither.

Nothing on `ImsButtonIcon` changes. The compiler checks the first two steps.

| Spec field | Required | Purpose |
| --- | --- | --- |
| `icon` | Yes | The glyph the button draws. |
| `label` | Yes | The default accessible name. The drawn glyph is `aria-hidden`, so without one the button has no name. |
| `severity` | No | `info`, `success`, `warning`, `danger` or `neutral`. Picks the ramp the button is painted from and the tone a tooltip on it inherits, whatever `ims-button-severity` says. Left out, the button follows that input. |
| `class` | No | Class the button carries while the preset is in force, the hook for its stylesheet block. That block says whatever the spec does not, such as a glyph size through `--ims-button-symbol-size`. `ims-button--<name>` by convention; several are space-separated. Not for a severity or a variation, which the button binds itself. |

A quiet close button, for example, needs nothing beyond its spec:

```ts
close: {icon: 'close', label: 'Close', severity: 'neutral'},
```

### Deprecated spellings

`<button ims-button-delete>` and `<button ims-button-edit>` are the presets
under their old names. Each pins its preset and inherits everything else, so the
two spellings cannot drift apart, and an `ims-button-icon-preset` written on one
is ignored. Replace them with
`<button ims-button-icon ims-button-icon-preset="…">` and import
`ImsButtonIcon`.

Only the buttons demo still uses them. Deleting `ims-button-actions.ts` and its
line in `index.ts` finishes the migration.

## Call to Action

```html
<button ims-button ims-button-variation="primary" call-to-action>המשך לתשלום</button>
```

A slow halo pulses outward from the button to mark the one action the view is
waiting for. It is not a variation: it combines with any of them, and with an
icon button, and takes its colour from the press ring, so it follows both
variation and severity.

- Use at most one per view. The halo works because it is the only thing moving.
- The pulse pauses while the button is hovered, pressed or keyboard-focused, and
  while the press ring shows, and it resumes afterwards.
- A disabled or readonly button never pulses.

The colour, reach and period are `--ims-button-pulse-color` (the press-ring
colour), `--ims-button-pulse-spread` (6px) and `--ims-button-pulse-duration`
(2.4s), all declared on `.ims-button--cta`.

## States

- Disabled: the `disabled` input. The button is natively `disabled`, carries
  `aria-disabled="true"` and `.ims-button--disabled`, and is rendered
  desaturated and faded (`grayscale(55%)`, `opacity: 0.55`) in its own hue,
  with a `not-allowed` cursor, no ripple and no hover plate.
- Readonly: inherited from the nearest `ims-readonly`, on the button itself or
  an ancestor. The button is natively `disabled` as well, and carries
  `aria-disabled="true"`, `.ims-readonly` and `.ims-button--readonly`.

In both states the host's click listener cancels any click that still arrives.

Readonly currently renders exactly like disabled. `.ims-button--readonly`
itself only sets the cursor, and the comment above it says readonly should stay
close to the enabled look, but a readonly button is natively disabled, so
`.ims-button:disabled` matches it too.

## Press Ring and Focus

Every activation repaints the 1px border in the variation's ring colour, holds
it for a beat and fades it out, 450ms in all. The ring fires on a pointer click,
and on the release of an Enter or Space press that started on the button. Focus
leaving the button before the release cancels it.

The ring is the only part the directive handles. Activation stays native: Enter
clicks on keydown and Space on keyup, and the directive changes neither.

Keyboard focus draws a 3px halo outside the border, in the ramp's 200 step, so
it follows the severity. Pointer focus draws nothing. The halo is a
`box-shadow` and the ring is the `border-color`, so a keyboard press shows both
at once without either one interrupting the other.

## Accessibility

- Role, focus and activation are the native button's.
- A disabled or readonly button carries `aria-disabled="true"` beside the native
  `disabled`, and is out of the tab order like any disabled button.
- An icon button needs an accessible name. Write `aria-label`, either as a
  static attribute or as `[attr.aria-label]`, or use a preset, which writes a
  default name itself.
- The directive only ever changes a name it wrote itself. Whenever the call site
  writes one, in either form, the preset's default stays out of the way,
  whichever order the bindings run in.
- The glyph a preset draws is `aria-hidden`, and so is a projected `<ims-icon>`
  without a `label`, so the ligature text is never announced.

## Tooltips

A button has no tooltip of its own. Import `ImsTooltip` and put `imsTooltip` on
the button as on any element. What the button supplies is defaults: each flavor
provides `IMS_TOOLTIP_DEFAULTS` with its severity, so the tooltip takes the
button's tone without the template repeating it.

```html
<button ims-button ims-button-severity="warning" imsTooltip="חלק מהשדות עדיין ריקים">שליחה</button>
<button ims-button-icon ims-button-icon-preset="delete" imsTooltip="לא ניתן למחוק פוליסה נעולה"></button>
```

A preset's pinned severity outranks `ims-button-severity` here as well, so a
tooltip on `delete` is danger. A `neutral` one hands on no severity, since a
tooltip has no neutral of its own, and the application default applies. An
explicit `imsTooltipSeverity` always wins. Placement is not supplied. On an
icon button, the tooltip should add to the name rather than repeat it.

The [tooltip guide](../ims-tooltip/README.md#on-an-ims-button) has the rest,
including why the tooltip is not a host directive.

## Styling

Classes on the host:

| Class | When |
| --- | --- |
| `.ims-button` | Every flavor. |
| `.ims-button-icon` | Icon buttons, including the deprecated spellings, which do not carry the `ims-button-icon` attribute. |
| `.ims-button--default`, `--primary`, `--secondary`, `--outline` | The variation. Every icon button carries `--default`, a preset's included. |
| `.ims-button--success`, `--warning`, `--danger`, `--neutral` | The severity in force: a preset's pinned one, else `ims-button-severity`. `info` has no class, and `--neutral` only ever comes from a preset. |
| `.ims-button--edit`, `--delete` | The preset: its spec's `class`, while it is in force. |
| `.ims-button--with-symbol` | The button draws a glyph itself, meaning it has a preset. |
| `.ims-button--cta` | `call-to-action`. |
| `.ims-button--disabled` | The `disabled` input. Readonly does not set it. |
| `.ims-button--readonly`, `.ims-readonly` | Readonly. |
| `.ims-button--action-blink` | The press ring, for 450ms. |
| `.ims-button--mounting` | The first frame after the button is created. |

`.ims-button__symbol` marks a glyph: the one a preset draws, or a projected
`<ims-icon>` beside a label.

A button is an inline grid, one field high, laid out in a row with a 0.5rem gap.
A label button has `0 1rem` padding, is at least 64px wide, and never wraps its
label.

### The ramp

The variation blocks name only `--ims-button-ramp-*` slots, never a palette
token, and each severity block repoints those slots and does nothing else. Four
variations and four severities give sixteen looks from seven blocks, and a
variation added later works in every severity without either side changing.
`info` has no block: its ramp is the one `.ims-button` declares. `neutral` is
an eighth block, reached only through a preset.

### Restyling a button in place

A variation sets these variables. A stylesheet that needs a button to look
different in its own context overrides them:

| Variable | Paints |
| --- | --- |
| `--ims-button-background` | The fill at rest. |
| `--ims-button-background-hover` | The hover ripple, or an icon button's hover plate. |
| `--ims-button-background-active` | The pressed fill. |
| `--ims-button-color` | The label or glyph. |
| `--ims-button-color-active` | The label or glyph while pressed. |
| `--ims-button-border` | The 1px border at rest. Transparent except on `outline`. |
| `--ims-button-ring-color` | The press ring and the call-to-action halo. |
| `--ims-button-focus-ring` | The keyboard focus halo. |
| `--ims-button-radius` | A label button's corners, 4px. An icon button is rounded to 0.5rem by a rule of its own. |
| `--ims-button-symbol-size` | `.ims-button__symbol` glyphs, 1.125rem. A preset's block may set its own; `icon-size` writes it inline, over both. |

The selection toolbar's quiet actions, for example:

```scss
.ims-button.ims-selection-toolbar__action {
    --ims-button-background: transparent;
    --ims-button-background-hover: var(--ims-color-interactive-alt-subtle);
    --ims-button-background-active: var(--ims-color-interactive-subtle);
    --ims-button-color: var(--ims-color-on-surface);
    --ims-button-color-active: var(--ims-color-interactive-strong);
    --ims-button-ring-color: var(--ims-color-interactive-alt);
    --ims-button-border: transparent;
}
```

- Set them on the button itself. Every variable in the table except
  `--ims-button-symbol-size` is declared on `.ims-button`, so a value set on an
  ancestor never reaches the button.
- Use a selector heavier than one class: two classes, or one class plus a
  component's scoping attribute. The variation blocks are one class each, and
  `ims-buttons.scss` loads after most of the global stylesheets, so a one-class
  rule in one of those loses to them on order.
- Restate only what differs. The ripple, the ring and the halo keep following
  whatever the slots hold.

### Motion

The motion is built for the CPU-rendered machines this ships to:

- A label button's ripple is a radial gradient in the button's own
  `background-image`, driven by three registered custom properties
  (`@property`), rather than a transformed layer. It grows from the center over
  320ms on hover, press or keyboard focus. On the way out it fades where it
  stands, and only then does its radius reset.
- An icon button has no ripple, because at 26px the gradient's soft edge steps
  visibly. It fades and scales in a hover plate (`::before`) instead.
- The press ring is a 450ms keyframe animation on `border-color`. The focus halo
  is a `box-shadow`, and the call-to-action halo is a `box-shadow` animation.
- A duo icon inside a button does not animate.
- `.ims-button--mounting` turns every transition off for the first frame, so a
  button that mounts under a stationary pointer does not animate a hover in and
  straight back out.

`ims-buttons.scss` has no `prefers-reduced-motion` rule. The ripple, the ring
and the call-to-action pulse all run regardless of that setting.

## Safe Change Guide

- Keep `ACTION_BLINK_MS` in `ims-button.ts` equal to the 450ms of the
  `ims-button-action-blink` animation. If it is shorter, the fade is cut off.
- Keep `border-color` out of the `.ims-button` transitions. The press ring's
  keyframes own that property, and a transition would fight them on the way out.
- Declare the call-to-action halo only on the idle button, as the `:not(…)` rule
  does. An element has one `animation` property, so an `animation: none` in the
  engaged states would override `.ims-button--action-blink` and remove the
  press ring.
- Write `background-image` after any `background` shorthand, and use
  `background-color` on `.ims-button-icon`. The shorthand resets
  `background-image`, which removes the ripple.
- Keep the three `@property` registrations. A custom property that is not
  registered cannot interpolate, so the ripple would snap.
- Keep `.ims-button--default:where(.ims-button-icon)` at the weight of one
  class. Focus mode, the transfer dialog, the datepicker and the selection
  toolbar restyle icon buttons with heavier selectors from stylesheets that
  load earlier, and a heavier selector here would override their colours.
- Target icon buttons with the `.ims-button-icon` class, not the attribute. The
  deprecated spellings carry only the class, and an icon button that misses
  those rules gets label padding and renders as a pill.
- Name only `--ims-button-ramp-*` slots in a variation block, and in a severity
  block only repoint the ramp.
- Keep `IMS_TOOLTIP_DEFAULTS` in the `providers` of every concrete directive,
  including the deprecated ones. `providers` is the one piece of directive
  metadata that a subclass with its own decorator does not inherit.
- Keep `syncLabel` imperative. A host `[attr.aria-label]` binding would remove a
  static `aria-label` on its first pass and overwrite a bound one.
- Keep `resolveIcon`, `resolveLabel`, `resolveSeverity` and `resolvePreset` as
  overridable methods, not fields. The base's computed signals are created
  before any subclass field exists, and the deprecated directives override
  `resolvePreset` to pin their preset.
- Route a preset's pinned severity through `resolveSeverity`, not through a
  stylesheet block of its own. The severity classes, and so the ramp, and the
  tooltip default all read it, which is why a preset in any severity needs no
  CSS to be painted in it.
- Give a preset its class through its spec's `class`, not a binding of its own
  on `ImsButtonIcon`. The one `[class]` map binding there adds and removes only
  the classes a spec names, so the static classes and a call site's own `class`
  survive a preset changing.
- Do not bring back a free `icon` input. A glyph is either projected or pinned
  by a preset. Allowing both lets a call site write both, which draws two
  glyphs.
- Use only signal APIs available in Angular 18: no `linkedSignal`, and an
  `effect` that writes a signal needs `allowSignalWrites`.
