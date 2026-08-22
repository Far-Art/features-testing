# Duotone icon construction rules

Every new icon in this library must follow the spec below. Live reference: the
`/icons` demo page (`src/app/pages/icons-demo`), which renders the whole set
from the registry along with every tone and size.

## The file shape
`<ims-duo-icon>` injects each file's markup into the DOM **verbatim** — the strings in
`../ims-duo-icon.generated.ts` are byte-for-byte copies of these files, with nothing
stripped, rewritten, or wrapped. So the file is not just a design asset: it is
the rendered markup. It must look exactly like this:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Add</title>
  <circle class="tint" transform="translate(2 2)" cx="16" cy="16" r="12" fill="var(--ims-duo-icon-tint, #BFC2F4)"></circle>
  <g fill="none" stroke="var(--ims-duo-icon-contour, #000570)" stroke-width="var(--ims-duo-icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="16" r="12"></circle>
    <path d="M16 10.4v11.2M10.4 16h11.2"></path>
  </g>
</svg>
```

Every attribute on that root element is load-bearing:

| Attribute | Why |
|---|---|
| `xmlns` | Required for the file to render on its own, outside the app |
| `width` / `height` `="32"` | Preview size only — the component's CSS overrides both, so never size an icon by editing these |
| `viewBox="0 0 32 32"` | The grid every glyph is drawn on |
| `fill="none"` | Stops paths without an explicit fill from painting solid black |
| `focusable="false"` | Keeps the glyph out of the tab order |
| `aria-hidden="true"` | The **host** carries the accessible name; without this a labelled icon can be announced twice |

One attribute is **optional**: `data-tone="warning"` declares the tone a glyph
takes when the call site does not set one. Use it only where the meaning implies
the palette — `warning` and `danger` carry their own; everything else stays on
the default palette and is toned by the consumer. The generator validates the
value against the `ImsDuoIconTone` union and fails the build on an unknown tone.

`<title>` is kept as the human record of the icon's name, and is what gets copied
into the registry's `label`. That label is informational only — the gallery uses
it for captions. It is inert at runtime because the root is `aria-hidden`.

Colors, stroke weight and offset are written as `var(--ims-duo-icon-*, fallback)`. There
is no stylesheet in this folder — the fallback **is** the entire standalone
appearance, and it is what a designer sees opening the file directly. So it must
match the shipped default. `npm run icons` checks this for you: it resolves the
real defaults out of `../ims-duo-icon.scss` and warns on any file whose fallback or tint
offset has fallen behind.

## Grid & geometry
- Canvas: `viewBox="0 0 32 32"`. Live area 4–28; **2u minimum clear space** on all sides (an icon may touch 4 / 28 but never cross).
- Optical sizing beats mathematical: circular glyphs may run to r=12 (24u), square-bodied glyphs cap at 24u wide, tall glyphs at 24u high.
- Coordinates snap to 0.2u. Corner radii: 1.4u (small chips/checkboxes), 2u (cards/bodies), 3.2u (large containers). Never mix more than two radii in one glyph.
- Terminals: `stroke-linecap="round"`, `stroke-linejoin="round"`. No sharp miters.
- Counters (gaps between strokes) never below 1.6u so the glyph survives 16px.

## Two layers, in this order
1. **Tint layer** — the glyph's *silhouette only* (outer body shapes, no interior detail), `class="tint"`, `fill="var(--ims-duo-icon-tint, #BFC2F4)"`. The `.tint` class carries the off-register translate as a CSS rule; the same `transform="translate(2 2)"` attribute is kept on the element so a standalone file still reads correctly. In the app `../ims-duo-icon.scss` restates it as a CSS property, which outranks the attribute and keeps `--ims-duo-icon-offset` live.
2. **Contour layer** — `fill="none"`, `stroke="var(--ims-duo-icon-contour, #000570)"`, `stroke-width="var(--ims-duo-icon-stroke-width, 1.5)"`. Outer contour repeats the silhouette path exactly, then interior detail.

Optional **mask layer** between them: `fill="var(--ims-duo-icon-surface, #fff)"` shapes that knock the tint out of interior windows (floppy shutter, label panel, front checkbox). Use only when the interior must read as a separate plane.

Never add: gradients, drop shadows, white specular highlights, extra mid-tone shades, dashed decoration, or a third color. Depth comes from the off-register tint alone.

## Tokens
| Role | Default | Allowed |
|---|---|---|
| Tint | `#BFC2F4` (primary-150) | primary-100 → primary-250 |
| Contour | `#000570` (primary-800) | brand, primary-800, primary-700 |
| Muted | tint `#C8C8CD` (neutral-200), contour `#454550` (neutral-700) | neutral ramp only |
| Accent | tint primary-250, contour primary-600 | — |
| Success / Warning / Danger | tint `<ramp>-200`, contour `<ramp>-800` | the matching semantic ramp |
| Inverted on navy | tint `#000AD2`, contour `#EAEBFB` | — |

Tones are classes on the host, not something you draw in — a glyph is authored
once in the default palette and re-toned via `tone="…"`. Resolution order is
**call site → the glyph's own `data-tone` → default**, so `<ims-duo-icon
[icon]="warning"/>` comes out amber with nothing else said, and
`tone="muted"` still wins over it. The semantic ramps are
the second documented exception to the primary-only rule below, and exist so
`danger` / `warning` / `info` glyphs can carry their own hue where the meaning
depends on it.

Only tokens from the `--ims-color-primary-*` ramp and `--ims-color-brand`. No new hues — with one exception: the **muted** tone drops to `--ims-color-neutral-*` instead of stepping down within the primary ramp. Stepping down kept it too close to the default to read as a separate tone; draining the hue is what makes it legible as "muted".

## Off-register offset
- Direction: **down-and-right**, equal x and y. Default 2u; range 0–3u.
- Driven by the single `--ims-duo-icon-offset` custom property — the tint is one flat copy, never a duplicated "extrude" stack.

## Stroke weight
Flat **1.5u at every rendered size** — the same paths, the same weight, no
per-size compensation. Override one instance with the `strokeWidth` prop, or
retune the whole set by changing `--ims-duo-icon-stroke-width` in `../ims-duo-icon.scss`.

Because the weight no longer thickens at small sizes, glyphs stop holding up
somewhere below ~16px. Keep the counters rule above (never below 1.6u) and treat
16px as the practical floor.

## Detail budget
- Interior detail is drawn in the **same weight** as the contour — no hairlines.
- Max 4 interior elements. If a glyph needs more, it's two icons.
- Detail must be structural (seams, slots, tick marks, checks), never texture.

## Naming & markup
- `<title>`: sentence case, one or two words ("Floppy disk", "Multi-select"). It becomes the registry `label`.
- Icons live as standalone `<svg>` files here and are inlined into `../ims-duo-icon.generated.ts` by `tools/generate-duo-icons.mjs`; render them with `<ims-duo-icon [icon]="…">`. This folder is the single source of truth — never edit the generated file. They carry no card, frame, or hover treatment of their own; the consumer owns any surface around the glyph.
- Metaphor consistency: reuse existing primitives across the set — the r=12 circle (add / remove / clear / danger / expand / info), the 5.6u chip with rx=1.4 (list), the 9.6u rounded square with rx=2 (multi-select), the r=9.8 lens (search / zoom-in).

## Using the component
Import the icon you want and pass the object itself:

```ts
import {ImsDuoIcon, imsDuoIconFloppyDisk} from '@app/components/ims-duo-icon';

@Component({imports: [ImsDuoIcon], template: `<ims-duo-icon [icon]="save" [size]="24"/>`})
export class SaveButton {
    protected readonly save = imsDuoIconFloppyDisk;
}
```

It takes the icon rather than a `name` string **so unused glyphs tree-shake**. A
name would mean a dynamic lookup into one object, which no bundler can split —
every glyph would ship whether you used it or not. Verified: a component
importing only `imsDuoIconAdd` ships that icon and drops all the rest.

`IMS_DUO_ICON_ALL` exists for galleries that really do want the whole set. Importing
it defeats tree-shaking by design, which is why the `/icons` demo carries the
whole set.

`<ims-duo-icon>` takes the defaults below; each maps to one custom property, and
leaving a prop unset defers to the stylesheet so the house default lives in
`../ims-duo-icon.scss` alone.

| Prop | Default | Notes |
|---|---|---|
| `icon` | — (required) | The imported icon object, not a name — see above |
| `size` | `18` | px; matches the Material Symbols ligature size used elsewhere |
| `tone` | the glyph's `data-tone`, else `default` | `muted` · `accent` · `success` · `warning` · `danger` · `inverse` |
| `offset` | `2` | Unset defers to `--ims-duo-icon-offset` |
| `strokeWidth` | `1.5` | Unset defers to `--ims-duo-icon-stroke-width` |
| `hover` | `false` | Boolean attribute; opts into the lift treatment |

### Accessibility
The icon is **always decorative** — every source file's `<svg>` root carries
`aria-hidden="true"` and the host adds no role. There is no `label` prop; naming
belongs to the thing the icon is part of:

```html
<!-- icon-only control: name the control -->
<button ims-button-icon aria-label="Save"><ims-duo-icon [icon]="save"/></button>

<!-- standalone icon that must carry meaning: name the element -->
<ims-duo-icon [icon]="warning" role="img" aria-label="Overdue"/>
```

Next to visible text, add nothing — the text already names it, and a second
announcement is noise.

## Hover
One treatment, off by default. Add the `hover` attribute to opt in:

```html
<ims-duo-icon [icon]="save" hover/>
```

On hover the tint pushes to **2.1x its resting offset** (2u → 4.2u), which reads
as the glyph lifting off the page. Icons carry no card, so the tint is the only
thing that moves. Transition is 0.22s `cubic-bezier(.2,.7,.3,1)`, dropped under
`prefers-reduced-motion: reduce`. Retune the distance with
`--ims-duo-icon-hover-offset`.

It is off by default because most icons are decorative and sit inside a control
that already owns the hover feedback — an icon animating on its own is usually
wrong.

To drive an icon from a surrounding control — so hovering anywhere on a button
moves the glyph, not just the icon's own box — mark the ancestor
`.ims-duo-icon-hover-group`. The icon still needs its own `hover` attribute.

## Adding an icon
1. Draw it to the rules above and save as `kebab-case.svg` here, matching **The
   file shape** exactly, with a `<title>` holding the sentence-case label.
2. Run `npm run icons` (also wired to `prestart` / `prebuild`, so a normal
   `npm start` or `npm run build` picks it up on its own).
3. It is exported as `imsDuoIcon<PascalCase>` — `zoom-in.svg` becomes
   `imsDuoIconZoomIn` — and appended to `IMS_DUO_ICON_ALL`. Import it by that name; a
   typo is an unresolved import, so it still fails at compile time.

The generator validates before it writes. It **fails the build** on anything that
would render wrong — a missing root attribute, a name that isn't kebab-case, an
absent `<title>`, or other than exactly one `.tint` layer — and **warns** on
anything that only affects the standalone file, such as a colour fallback or tint
offset that no longer matches `../ims-duo-icon.scss`.
