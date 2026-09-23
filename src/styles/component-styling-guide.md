# IMS component styling guide

Shared component styles live in `src/styles` and are loaded from
`src/styles.scss`. Components should consume semantic tokens instead of palette
values so themes can change without rewriting component styles.

## Token layers

Use the token layers in this order:

1. `tokens/color-tokens.scss` contains primitive palette values such as
   `--ims-color-primary-500` and `--ims-color-neutral-50`.
2. `tokens/semantic-color-tokens.scss` assigns meaning to solid colors, such as
   `--ims-color-on-surface`, `--ims-color-border`, and
   `--ims-color-interactive`.
3. `tokens/semantic-background-tokens.scss` contains complete background
   treatments, such as `--ims-background-input` and
   `--ims-background-dialog`. These values may be either solid colors or
   gradients.

Do not use primitive palette tokens directly inside a component unless no
semantic role exists. If the role is reusable, add a semantic token first.

Color tokens are guaranteed to be valid anywhere a CSS `<color>` is expected:

```scss
.ims-example {
    border-color: var(--ims-color-border);
    color: var(--ims-color-on-surface);
}
```

Background tokens must be used with `background`, because they may contain a
gradient:

```scss
.ims-example__panel {
    background: var(--ims-background-panel);
}
```

Do not use a background token with `background-color`, `border-color`, `color`,
or `color-mix()`.

## Consuming semantic tokens

Use semantic tokens directly in component styles. Global tokens are declared on
`:root`, so they remain available inside component hosts, CDK overlays, and
detached drag previews.

```scss
.ims-example {
    color: var(--ims-color-on-surface);
}

.ims-example__panel {
    border: 1px solid var(--ims-color-border);
    background: var(--ims-background-panel);
}
```

Do not create component-prefixed aliases that only point to semantic tokens.
Introduce a component variable only when it represents component-specific
configuration or an intentional public customization API.

## Font weights

`tokens/font-weight-tokens.scss` defines the weight scale in steps of 100:

| Token | Utility class | Weight |
| --- | --- | --- |
| `--ims-font-weight-regular` | `.font-weight-regular` | 400 |
| `--ims-font-weight-medium` | `.font-weight-medium` | 500 |
| `--ims-font-weight-semibold` | `.font-weight-semibold` | 600 |
| `--ims-font-weight-bold` | `.font-weight-bold` | 700 |
| `--ims-font-weight-extrabold` | `.font-weight-extrabold` | 800 |

Use the tokens in stylesheets and the classes in templates:

```scss
.ims-example__title {
    font-weight: var(--ims-font-weight-bold);
}
```

```html
<span class="font-weight-semibold">...</span>
```

Do not write in-between values such as `650`. `src/index.html` loads only these
weights of Roboto and Heebo, so the browser renders `650` as `700` and `750` as
`800`. Adding a step means adding it to the font request as well.

## Inputs

Use the shared `.ims-input` class instead of recreating input borders,
backgrounds, focus rings, disabled states, and invalid states.

For a native Angular form control:

```html
<input class="ims-input" type="text" [formControl]="nameControl">
```

Angular places `ng-invalid` directly on the input, and `.ims-input` supplies the
invalid border and focus ring. A component that paints the field *inside*
itself is the other shape, and "A field's states" below is how it declares it.

A `textarea` carrying the class is as tall as its own `rows` attribute says, and
never shorter than one field height — `rows="4"` renders four rows, and
`rows="1"` lines up with the single-line fields beside it. Write a `min-height`
only to raise that floor, not to win the attribute back.

### A field's states

`.ims-input` paints every state from a *tone*, never from a literal. Entering a
state means re-pointing tones; it never means restating the border, the ring and
the fill.

| Tone | Painted onto |
| --- | --- |
| `--ims-input-tone` | the resting border |
| `--ims-input-tone-hover` | the border under the pointer |
| `--ims-input-tone-focus` | the border while focused |
| `--ims-input-tone-ring` | the focus halo |
| `--ims-input-fill` | the hover and focus fill |

A tone has no value at rest — its default sits at the use site as a `var()`
fallback — so an unset tone means "resting" and a state can be cancelled with
`initial`. `ims-checkbox` and `ims-radio` do the same with their own
`--ims-checkbox-tone*` and `--ims-radio-tone*`.

Custom properties inherit, and that is how a wrapped control's state reaches the
field inside it. Angular puts `ng-invalid` on the component host, not on the
`.ims-input` the component paints; mark the host with `.ims-input-host` and the
shared contract re-points the tones there, so every surface inside the host is
painted by inheritance. Nothing is scoped by a descendant selector, nothing has
a specificity to win, and one field costs the same as five:

```html
<!-- host: class="ims-example-host ims-input-host" -->
<input class="ims-input ims-example__input" data-ims-main-control type="text">
```

When the component uses `ims-error-popover`, mark its primary control with
`data-ims-main-control`: the directive puts `aria-invalid` and
`aria-describedby` on the marked element, or on the first focusable element
inside it, and otherwise falls back to the host's first focusable descendant. A
marked element with `role="radiogroup"` or `role="group"`, such as the
`ims-radio-group` host, receives them itself.

A surface that declares a tone itself outranks an inherited one whatever the
specificities say, which is what keeps a disabled or readonly field out of its
control's invalid colours without a `:not()` anywhere. A CDK overlay is detached
from the host, so a panel's own inputs — a filter, for instance — keep their
resting colours with nothing said about them.

Four classes say what a component's own markup cannot:

| On | Class | Means |
| --- | --- | --- |
| host | `ims-input--invalid` | invalid in a way the Angular control does not know about, such as text that will not parse |
| surface | `ims-input--disabled` | paint as disabled; for a surface that cannot carry `:disabled`, such as a wrapper `div` |
| surface | `ims-input--readonly` | paint as not editable while staying interactive |
| surface | `ims-input--valid` | this surface's validity is not its control's, as in `ims-focus-mode`'s draft |

`.ims-input--readonly` and `.ims-readonly` are different things:
`.ims-input--readonly` says the surface is in that state, `.ims-readonly` says
which inert tones to paint it in.

An accent that sits *beside* the field rather than inside it — a chevron, a
clear button, a toggle — reads the tone with its own resting colour as the
fallback, and follows the field without a rule of its own:

```scss
.ims-example__chevron {
    color: var(--ims-input-tone, var(--ims-color-interactive-alt-strong));
}
```

### Composite fields

A field with more than one control behind one border needs nothing beyond the
shape. Put `.ims-input-host` on the host, `.ims-input` on the element that
paints, and leave the inner controls bare:

```html
<!-- host: class="ims-phone-host ims-input-host" -->
<div class="ims-input ims-phone__field" [class.ims-input--disabled]="interactionDisabled()">
    <input class="ims-phone__prefix">
    <span class="ims-phone__separator" aria-hidden="true">-</span>
    <input class="ims-phone__number">
</div>
```

Hover, the focus ring, invalid, disabled and readonly all arrive from the
contract. The component stylesheet strips the inner controls' own border,
background and outline and lays them out, and says nothing about state.

The hover includes the one a label starts: a `<label for>`, and a label that
wraps its control, put the *control* into `:hover` natively and never a wrapper
painted around it, so the contract matches `:has(:hover)` as well as `:hover`.
The focus ring works the same way, through `:has(:focus-visible)`.

The input class supports local overrides:

```scss
.ims-example__filter {
    --ims-input-padding: 0.3rem 0.45rem;
    --ims-input-border-radius: 0.375rem;
}
```

Prefer these variables when changing the shared input contract. Keep
component-only layout, such as icon padding or width, in the component
selector.

### Adjacent input actions

Use the shared input-action layout when a wrapped control has one fixed-size
button next to its primary field:

```html
<div class="ims-input-action">
    <input class="ims-input ims-input-action__field">
    <button
        class="ims-input-action__button"
        ims-button-icon
        aria-label="Search"
    >
        <ims-icon>search</ims-icon>
    </button>
</div>
```

For an Angular form component, put `.ims-input-action` on the component host
alongside `.ims-input-host`. The host's declared `width` or `inline-size`
describes the preferred field width. The host reserves the action size and gap
in its layout footprint; when the containing block cannot fit both, only the
field shrinks.

The layout exposes two customization variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `--ims-input-action-size` | `2.5rem` | Fixed inline and block size of the action. |
| `--ims-input-action-gap` | `0.175rem` | Logical space between the field and action. |

The first version intentionally supports one fixed-size action. Keep the field
in normal flow and use `.ims-input-action__button` for the adjacent button so
the shared host padding, narrow-container clamping, and RTL placement stay in
sync. A containing block narrower than the action plus its gap cannot avoid
overflow while preserving the action's usable size.

## States

Use pseudo-classes and Angular state classes instead of inputs that manually
toggle visual inline styles:

```scss
.ims-example__action:hover {
    background: var(--ims-color-interactive-alt-subtle);
}

.ims-example__action:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--ims-color-focus-ring);
}

.ims-example__action:disabled {
    color: var(--ims-color-on-surface-disabled);
    cursor: not-allowed;
}
```

### Readable disabled controls

The `*-readonly` tokens are an enabled-like visual treatment for disabled
controls whose values must remain easy to read. Despite the token name, they do
not describe an editable state: apply them only while the control is disabled.
The control keeps its disabled behavior while its background and text appear
almost identical to an enabled control.

Use these semantic tokens:

```scss
--ims-color-surface-input-readonly
--ims-color-on-surface-readonly
--ims-color-border-readonly
```

`--ims-color-border-readonly` is for controls drawn only by their border, such
as a checkbox. Shared inputs keep `--ims-color-border-subtle`, which would leave
an unchecked box barely visible against the readonly surface.

`--ims-color-on-surface-readonly` is for a control's own text, such as a
checkbox or radio label. A shared input's *value* is content rather than a
label, so `.ims-readonly` gives it `--ims-color-on-surface`, the colour an
editable field's text has.

Add `.ims-readonly` to a disabled shared input:

```html
<input class="ims-input ims-readonly" type="text" disabled>
```

For a wrapped form component, add the class to the component host; the
customization variables inherit into its disabled control. `BasicValueAccessor`
already does this for hosts inside an `ims-readonly` scope.

Use the regular `*-disabled` tokens when the lower-emphasis disabled appearance
is appropriate. `.ims-readonly` has no visual effect until the shared input is
disabled.

Shared validation colors are:

```scss
--ims-color-invalid
--ims-color-invalid-focus-ring
```

## Selectors and Sass nesting

Use Sass nesting only for actual descendants, pseudo-classes, pseudo-elements,
attributes, and state scopes. Write every related class and modifier name in
full.

```scss
.ims-example {
    &:focus-within {
        color: var(--ims-color-interactive);
    }
}

.ims-example__item {
    color: var(--ims-color-on-surface);
}

.ims-example__item--selected {
    color: var(--ims-color-interactive-strong);
}
```

Do not construct class names with the parent selector:

```scss
// Do not use:
.ims-example {
    &__item {}
    &--disabled {}
}
```

## Component checklist

- Use semantic tokens rather than fixed colors or primitive palette steps.
- Use `--ims-color-*` for solid colors and `--ims-background-*` for complete
  backgrounds.
- Use `--ims-font-weight-*` tokens or the `.font-weight-*` classes instead of
  numeric font weights.
- Consume semantic tokens directly unless a component exposes an intentional
  customization API.
- Use `.ims-readonly` only as a readable visual treatment for disabled
  controls.
- Remember that detached overlays do not inherit component-local variables.
- Apply `.ims-input` to input-like controls, and `.ims-input-host` to a
  component that paints them inside itself.
- Enter a state by re-pointing tones, never by restating the border, the ring
  and the fill — and let an accent beside the field read `--ims-input-tone`.
- Mark a wrapped control's primary control with `data-ims-main-control` when it
  uses `ims-error-popover`.
- Use the shared input-action classes for one fixed-size adjacent button.
- Keep layout and structural styles inside the component stylesheet.
- Write full class names for elements and modifiers.
- Check hover, hover from the field's label, keyboard focus, disabled,
  readonly, invalid, invalid while disabled, LTR, and RTL states.
- Compile the global `src/styles.scss` entry point after changing shared styles.
