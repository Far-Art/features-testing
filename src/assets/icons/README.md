# Duotone icon construction rules

Every new icon in this library must follow the spec below. Live reference: `Insurance Icons.dc.html`.

## The file shape
`<ims-icon>` injects each file's markup into the DOM **verbatim** — the strings in
`ims-icon.registry.ts` are byte-for-byte copies of these files, with nothing
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

Colors, stroke weight and offset are written as `var(--token, fallback)`. The
fallback is what a designer sees opening the file directly, so it must match the
shipped default — if you retune a default in `ims-icon.scss`, update the
fallbacks here too.

## Grid & geometry
- Canvas: `viewBox="0 0 32 32"`. Live area 4–28; **2u minimum clear space** on all sides (an icon may touch 4 / 28 but never cross).
- Optical sizing beats mathematical: circular glyphs may run to r=12 (24u), square-bodied glyphs cap at 24u wide, tall glyphs at 24u high.
- Coordinates snap to 0.2u. Corner radii: 1.4u (small chips/checkboxes), 2u (cards/bodies), 3.2u (large containers). Never mix more than two radii in one glyph.
- Terminals: `stroke-linecap="round"`, `stroke-linejoin="round"`. No sharp miters.
- Counters (gaps between strokes) never below 1.6u so the glyph survives 16px.

## Two layers, in this order
1. **Tint layer** — the glyph's *silhouette only* (outer body shapes, no interior detail), `class="tint"`, `fill="var(--icon-tint, #BFC2F4)"`. The `.tint` class carries the off-register translate as a CSS rule; the same `transform="translate(2 2)"` attribute is kept on the element so a standalone file still reads correctly, and the CSS property overrides it wherever the stylesheet is loaded.
2. **Contour layer** — `fill="none"`, `stroke="var(--icon-contour, #000570)"`, `stroke-width="var(--icon-stroke-width, 1.5)"`. Outer contour repeats the silhouette path exactly, then interior detail.

Optional **mask layer** between them: `fill="var(--icon-surface, #fff)"` shapes that knock the tint out of interior windows (floppy shutter, label panel, front checkbox). Use only when the interior must read as a separate plane.

Never add: gradients, drop shadows, white specular highlights, extra mid-tone shades, dashed decoration, or a third color. Depth comes from the off-register tint alone.

## Tokens
| Role | Default | Allowed |
|---|---|---|
| Tint | `#BFC2F4` (primary-150) | primary-100 → primary-250 |
| Contour | `#000570` (primary-800) | brand, primary-800, primary-700 |
| Muted | tint `#C8C8CD` (neutral-200), contour `#454550` (neutral-700) | neutral ramp only |
| Inverted on navy | tint `#000AD2`, contour `#EAEBFB` | — |

Only tokens from the `--ims-color-primary-*` ramp and `--ims-color-brand`. No new hues — with one exception: the **muted** tone drops to `--ims-color-neutral-*` instead of stepping down within the primary ramp. Stepping down kept it too close to the default to read as a separate tone; draining the hue is what makes it legible as "muted".

## Off-register offset
- Direction: **down-and-right**, equal x and y. Default 2u; range 0–3u.
- Driven by the single `--icon-offset` custom property — the tint is one flat copy, never a duplicated "extrude" stack.

## Stroke weight
Flat **1.5u at every rendered size** — the same paths, the same weight, no
per-size compensation. Override one instance with the `strokeWidth` prop, or
retune the whole set by changing `--icon-stroke-width` in `ims-icon.scss`.

Because the weight no longer thickens at small sizes, glyphs stop holding up
somewhere below ~16px. Keep the counters rule above (never below 1.6u) and treat
16px as the practical floor.

## Detail budget
- Interior detail is drawn in the **same weight** as the contour — no hairlines.
- Max 4 interior elements. If a glyph needs more, it's two icons.
- Detail must be structural (seams, slots, tick marks, checks), never texture.

## Naming & markup
- Card label: sentence case, one or two words ("Floppy disk", "Multi-select").
- Icons ship as standalone `<svg>` files in this folder. `tools/generate-icons.mjs` inlines them into `ims-icon.generated.ts`; render them with `<ims-icon name="…">`. They carry no card, frame, or hover treatment — the consumer owns any surface around the glyph.
- Metaphor consistency: reuse existing primitives across the set — the 12u circle (add / remove), the 5.6u chip (list / select), the 3.2u-radius card (containers).

## Using the component
`<ims-icon>` takes the defaults below; each maps to one custom property, and
leaving a prop unset defers to the stylesheet so the house default lives in
`ims-icon.scss` alone.

| Prop | Default | Notes |
|---|---|---|
| `name` | — (required) | Typed to `ImsIconName`; a typo is a compile error |
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
2. Paste the file's full contents into `IMS_ICONS` in
   `src/app/components/ims-icon/ims-icon.registry.ts`, keyed by the filename
   without its extension:

   ```ts
   'my-icon': {
       label: 'My icon',
       source: `<svg …>…</svg>`
   }
   ```
3. That's it — the key joins the `ImsIconName` union automatically, so a typo at
   a call site is a compile error. There is no build step and no generator; the
   copy is deliberate, which is why the two must be kept identical by hand.
