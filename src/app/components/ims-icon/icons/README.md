# Duotone icon construction rules

Every new icon in this library must follow the spec below. Live reference: the
`/icons` demo page (`src/app/pages/icons-demo`), which renders the whole set
from the registry along with every tone, size and hover mode.

## The file shape
`<ims-icon>` injects each file's markup into the DOM **verbatim** — the strings in
`../ims-icon.generated.ts` are byte-for-byte copies of these files, with nothing
stripped, rewritten, or wrapped. So the file is not just a design asset: it is
the rendered markup. It must look exactly like this:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" focusable="false" aria-hidden="true">
  <title>Add</title>
  <circle class="tint" transform="translate(2 2)" cx="16" cy="16" r="12" fill="var(--icon-tint, #BFC2F4)"></circle>
  <g fill="none" stroke="var(--icon-contour, #000570)" stroke-width="var(--icon-stroke-width, 1.5)" stroke-linecap="round" stroke-linejoin="round">
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

`<title>` is kept as the human record of the icon's name, and is what gets copied
into the registry's `label`. It is inert at runtime because the root is
`aria-hidden`.

Colors, stroke weight and offset are written as `var(--token, fallback)`. There
is no stylesheet in this folder — the fallback **is** the entire standalone
appearance, and it is what a designer sees opening the file directly. So it must
match the shipped default. `npm run icons` checks this for you: it resolves the
real defaults out of `../ims-icon.scss` and warns on any file whose fallback or tint
offset has fallen behind.

## Grid & geometry
- Canvas: `viewBox="0 0 32 32"`. Live area 4–28; **2u minimum clear space** on all sides (an icon may touch 4 / 28 but never cross).
- Optical sizing beats mathematical: circular glyphs may run to r=12 (24u), square-bodied glyphs cap at 24u wide, tall glyphs at 24u high.
- Coordinates snap to 0.2u. Corner radii: 1.4u (small chips/checkboxes), 2u (cards/bodies), 3.2u (large containers). Never mix more than two radii in one glyph.
- Terminals: `stroke-linecap="round"`, `stroke-linejoin="round"`. No sharp miters.
- Counters (gaps between strokes) never below 1.6u so the glyph survives 16px.

## Two layers, in this order
1. **Tint layer** — the glyph's *silhouette only* (outer body shapes, no interior detail), `class="tint"`, `fill="var(--icon-tint, #BFC2F4)"`. The `.tint` class carries the off-register translate as a CSS rule; the same `transform="translate(2 2)"` attribute is kept on the element so a standalone file still reads correctly. In the app `../ims-icon.scss` restates it as a CSS property, which outranks the attribute and keeps `--icon-offset` live.
2. **Contour layer** — `fill="none"`, `stroke="var(--icon-contour, #000570)"`, `stroke-width="var(--icon-stroke-width, 1.5)"`. Outer contour repeats the silhouette path exactly, then interior detail.

Optional **mask layer** between them: `fill="var(--icon-surface, #fff)"` shapes that knock the tint out of interior windows (floppy shutter, label panel, front checkbox). Use only when the interior must read as a separate plane.

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
once in the default palette and re-toned via `tone="…"`. The semantic ramps are
the second documented exception to the primary-only rule below, and exist so
`danger` / `warning` / `info` glyphs can carry their own hue where the meaning
depends on it.

Only tokens from the `--ims-color-primary-*` ramp and `--ims-color-brand`. No new hues — with one exception: the **muted** tone drops to `--ims-color-neutral-*` instead of stepping down within the primary ramp. Stepping down kept it too close to the default to read as a separate tone; draining the hue is what makes it legible as "muted".

## Off-register offset
- Direction: **down-and-right**, equal x and y. Default 2u; range 0–3u.
- Driven by the single `--icon-offset` custom property — the tint is one flat copy, never a duplicated "extrude" stack.

## Stroke weight
Flat **1.5u at every rendered size** — the same paths, the same weight, no
per-size compensation. Override one instance with the `strokeWidth` prop, or
retune the whole set by changing `--icon-stroke-width` in `../ims-icon.scss`.

Because the weight no longer thickens at small sizes, glyphs stop holding up
somewhere below ~16px. Keep the counters rule above (never below 1.6u) and treat
16px as the practical floor.

## Detail budget
- Interior detail is drawn in the **same weight** as the contour — no hairlines.
- Max 4 interior elements. If a glyph needs more, it's two icons.
- Detail must be structural (seams, slots, tick marks, checks), never texture.

## Naming & markup
- `<title>`: sentence case, one or two words ("Floppy disk", "Multi-select"). It becomes the registry `label`.
- Icons live as standalone `<svg>` files here and are inlined into `../ims-icon.generated.ts` by `tools/generate-icons.mjs`; render them with `<ims-icon [icon]="…">`. This folder is the single source of truth — never edit the generated file. They carry no card, frame, or hover treatment of their own; the consumer owns any surface around the glyph.
- Metaphor consistency: reuse existing primitives across the set — the r=12 circle (add / remove / clear / danger / expand / info), the 5.6u chip with rx=1.4 (list), the 9.6u rounded square with rx=2 (multi-select), the r=9.8 lens (search / zoom-in).

## Using the component
Import the icon you want and pass the object itself:

```ts
import {ImsIcon, imsIconFloppyDisk} from '@app/components/ims-icon';

@Component({imports: [ImsIcon], template: `<ims-icon [icon]="save" [size]="24"/>`})
export class SaveButton {
    protected readonly save = imsIconFloppyDisk;
}
```

It takes the icon rather than a `name` string **so unused glyphs tree-shake**. A
name would mean a dynamic lookup into one object, which no bundler can split —
every glyph would ship whether you used it or not. Verified: a component
importing only `imsIconAdd` ships that icon and drops the other fifteen.

`IMS_ICON_ALL` exists for galleries that really do want the whole set. Importing
it defeats tree-shaking by design, which is why the `/icons` demo carries all 16.

`<ims-icon>` takes the defaults below; each maps to one custom property, and
leaving a prop unset defers to the stylesheet so the house default lives in
`../ims-icon.scss` alone.

| Prop | Default | Notes |
|---|---|---|
| `icon` | — (required) | The imported icon object, not a name — see above |
| `size` | `18` | px; matches the Material Symbols ligature size used elsewhere |
| `tone` | `default` | `muted` · `accent` · `success` · `warning` · `danger` · `inverse` |
| `offset` | `2` | Unset defers to `--icon-offset` |
| `strokeWidth` | `1.5` | Unset defers to `--icon-stroke-width` |
| `hover` | `none` | See below |
| `label` | unset → decorative | String sets it; `true` reuses the source `<title>` |

## Hover
Opt in per instance with `hover="lift|register|flip|ink"`; the default is `none`,
since most icons are decorative and sit inside a control that already owns the
hover feedback. All four modes animate the tint layer only — there is no card,
so the spec's `lift` is its off-register half: the tint pushes to 2.1x offset.

| Mode | Tint moves to |
|---|---|
| `lift` | 2.1x the resting offset (2u → 4.2u) |
| `register` | 0 — snaps into register |
| `flip` | the opposite corner (negative offset) |
| `ink` | stays put; deepens 45% toward the contour |

Transition is 0.22s `cubic-bezier(.2,.7,.3,1)`, dropped under
`prefers-reduced-motion: reduce`.

To drive an icon from a surrounding control — so hovering anywhere on a button
moves the glyph, not just the icon's own box — mark the ancestor
`.ims-icon-hover-group`.

## Adding an icon
1. Draw it to the rules above and save as `kebab-case.svg` here, matching **The
   file shape** exactly, with a `<title>` holding the sentence-case label.
2. Run `npm run icons` (also wired to `prestart` / `prebuild`, so a normal
   `npm start` or `npm run build` picks it up on its own).
3. It is exported as `imsIcon<PascalCase>` — `zoom-in.svg` becomes
   `imsIconZoomIn` — and appended to `IMS_ICON_ALL`. Import it by that name; a
   typo is an unresolved import, so it still fails at compile time.

The generator validates before it writes. It **fails the build** on anything that
would render wrong — a missing root attribute, a name that isn't kebab-case, an
absent `<title>`, or other than exactly one `.tint` layer — and **warns** on
anything that only affects the standalone file, such as a colour fallback or tint
offset that no longer matches `../ims-icon.scss`.
