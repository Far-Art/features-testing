# IMS Expand/Collapse Button

`imsExpandCollapseButtonV2` is a square button that shows and hides something:
a plus that folds into a minus as it opens. It is an `ims-button` — it extends
`ImsButtonBase` — so it has that button's focus halo, press ring, hover plate,
disabled look and severities.

Postfixed with `-v2` / `V2` in every name — selector, classes, CSS variables,
TypeScript names, files — so it lives beside the application's older
`imsExpandCollapseButton` without restyling it. The `-v2` names and how to
rename back are in `../ims-expansion-panel-v2/README.md`.

## File Map

| File | Purpose |
| --- | --- |
| `ims-expand-collapse-button-v2.directive.ts` | `ImsExpandCollapseButtonDirectiveV2` on `button[imsExpandCollapseButtonV2]`, and `ImsExpandCollapseButtonVariationV2`. |
| `index.ts` | Public API barrel. |
| `src/styles/ims-expand-collapse-button-v2.scss` | Size and glyph. Everything else is `src/styles/ims-buttons.scss`. |
| `src/app/pages/buttons-demo/` | Live examples, routed at `/buttons`. |

## Usage

```html
<button imsExpandCollapseButtonV2 [(expanded)]="open" aria-controls="policy-details"></button>
<section id="policy-details" [hidden]="!open()">…</section>
```

```html
<button imsExpandCollapseButtonV2 variation="dark" ims-button-severity="danger" [(expanded)]="open"></button>
```

The button names itself and reports `aria-expanded`. It does not know what it
controls; add `aria-controls` at the call site.

## Variations

| `variation` | Looks like | At rest | Hover / press |
| --- | --- | --- | --- |
| `light` (default) | `ims-button-variation="secondary"` | White plate, glyph in the ramp's 800 | Ramp 100 / 150 |
| `dark` | `ims-button-variation="primary"` | Solid brand fill, white glyph | The solid hover / active tones |

The variations do not restate those colours: the directive puts
`.ims-button--secondary` or `.ims-button--primary` on the button, so a change to
either `ims-button` variation reaches it. `ims-button-severity` works at both,
because it swaps the ramp those classes read.

## Public API

| Member | Kind | Purpose |
| --- | --- | --- |
| `expanded` | `model<boolean>` | Whether the controlled content is showing. Two-way bindable. Defaults to `false`. |
| `variation` | `input<'light' \| 'dark'>` | Defaults to `'light'`. |
| `expandAriaLabel` | `input<string>` | Accessible name while collapsed. Defaults to `'הרחב'`. |
| `collapseAriaLabel` | `input<string>` | Accessible name while expanded. Defaults to `'כווץ'`. |
| `disabled` | `input<boolean>` | From `ImsButtonBase`. `booleanAttribute`. |
| `ims-button-severity` | `input` | From `ImsButtonBase`: `info` (default), `success`, `warning`, `danger`. |
| `call-to-action`, `type` | `input` | From `ImsButtonBase`. `type` defaults to `button`. |
| `toggle()` | method | Flips `expanded`, unless disabled. |

## Behavior

- **Name.** Written as `aria-label` from `expandAriaLabel` / `collapseAriaLabel`
  through the base's label sync, which never overwrites an `aria-label` the
  call site wrote, static or bound.
- **Hiding.** The standard `hidden` attribute hides it: `[hidden]="!hasDetails"`.
  `.ims-button` declares a `display` of its own, which outranks the user
  agent's `[hidden]` rule, so `ims-expand-collapse-button-v2.scss` restates
  `display: none` for it. `disabled` greys it out instead.
- **Readonly.** Unlike every other `ims-button`, it ignores an `ims-readonly`
  scope. Readonly protects data, and showing or hiding a section changes none;
  it is how a readonly view gets read. `disabled` still disables it.
- **Glyph.** Drawn on `::after` as two bars in the button's text colour, since
  `::before` is the icon button's hover plate. Opening shrinks the upright bar
  into the crossbar while the glyph makes a half turn. No motion under
  `prefers-reduced-motion`.
- **Whole pixels.** On low-DPI screens a length that ends between two pixels is
  drawn across both, which smears a 2px bar and moves the plus off center. With
  CSS `round()` available, the button snaps to whole pixels, the glyph box to an
  even number of pixels (the parity of its 2px bars), and the glyph and both
  bars to whole-pixel offsets. On an even-sized button, the 20px default
  included, the plus is exactly centred. On an odd size it sits half a pixel
  toward the start edge instead of straddling two pixels. Without `round()` the
  unrounded rules apply, behind `@supports` as in `ims-checkbox.scss`.

## Styling

| Variable | Default | Purpose |
| --- | --- | --- |
| `--ims-expand-collapse-button-v2-size` | `20px` | Width and height, rounded to whole pixels; set it to `var(--field-height)` (26px) for a button as tall as a field. The glyph is about 42% of it, rounded to an even pixel count. Prefer an even size: only an even button centres the plus exactly. Read with a fallback, so it can be set on the button or any ancestor. |
| `--ims-expand-collapse-button-v2-radius` | `6px` | Corner radius, a little squarer than an icon button's `0.5rem`, which on a 20px button reads nearly round. The hover plate follows it. |

The button carries `.ims-button`, `.ims-button-icon` and
`.ims-expand-collapse-button-v2`, plus `.ims-expand-collapse-button-v2--expanded`
while open. `.ims-button-icon` is transparent at rest; the two-class rule in
`ims-expand-collapse-button-v2.scss` gives the variation's background back.

## Linting

`eslint.config.js` lists `imsExpandCollapseButtonV2` in the `elements-content`
rule's `allowList`. The rule only sees an `aria-label` written in the template,
and this button writes its own, so without the entry every bare
`<button imsExpandCollapseButtonV2>` would be reported as empty.

## Angular 18.2

Compiles and runs on Angular 18.2 / CDK 18.2 unchanged, together with what it
extends: `ims-button.ts`, `ims-button-presets.ts`,
`ims-tooltip/ims-tooltip.types.ts`, `shared/readonly.directive.ts` and
`ims-buttons.scss`.

## Safe Change Guide

- Keep the `[hidden]` rule, or a hidden button still shows.
- Keep the glyph box even and the bars 2px, and keep the glyph offset measured
  inside the button's 1px border. Any of them off, and an offset ends on a half
  pixel again.
- Keep the glyph on `::after`. `::before` is `.ims-button-icon`'s hover plate.
- Keep the variations mapped onto `.ims-button--secondary` / `--primary` rather
  than copying their colours, or they drift from `ims-button`.
- Keep the background rule at two classes, or `.ims-button-icon`'s transparent
  background wins and both variations lose their surface.
- Keep `readonlyMode` overridden, or every expandable section in a readonly
  view stops opening.
