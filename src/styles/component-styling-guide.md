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

## Inputs

Use the shared `.ims-input` class instead of recreating input borders,
backgrounds, focus rings, disabled states, and invalid states.

For a native Angular form control:

```html
<input class="ims-input" type="text" [formControl]="nameControl">
```

Angular places `ng-invalid` directly on the input, and `.ims-input` supplies the
invalid border and focus ring.

For a form-compatible component with an internal visual control, put
`.ims-input-host` on the component host and mark only its primary control with
`data-ims-main-control`:

```ts
@Component({
    selector: 'ims-example',
    host: {
        class: 'ims-example-host ims-input-host'
    }
})
export class ImsExample {}
```

```html
<div class="ims-example">
    <input
        class="ims-input ims-example__input"
        data-ims-main-control
        type="text"
    >

    <input class="ims-input ims-example__filter" type="search">
</div>
```

When Angular places `ng-invalid` on the component host, only the element marked
with `data-ims-main-control` receives the invalid style. Auxiliary inputs such
as filters remain unaffected.

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
        icon="search"
        aria-label="Search"
    ></button>
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
| `--ims-input-action-gap` | `0.375rem` | Logical space between the field and action. |

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
```

Add `.ims-readonly` to a disabled shared input:

```html
<input class="ims-input ims-readonly" type="text" disabled>
```

For a wrapped form component, add the class to its `.ims-input-host`. The
customization variables inherit into the disabled element marked with
`data-ims-main-control`.

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
- Consume semantic tokens directly unless a component exposes an intentional
  customization API.
- Use `.ims-readonly` only as a readable visual treatment for disabled
  controls.
- Remember that detached overlays do not inherit component-local variables.
- Apply `.ims-input` to input-like controls.
- Use `.ims-input-host` and `data-ims-main-control` for wrapped Angular form
  controls.
- Use the shared input-action classes for one fixed-size adjacent button.
- Keep layout and structural styles inside the component stylesheet.
- Write full class names for elements and modifiers.
- Check hover, keyboard focus, disabled, invalid, LTR, and RTL states.
- Compile the global `src/styles.scss` entry point after changing shared styles.
