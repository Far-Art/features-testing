# ims-dock — macOS-style Dock Navbar

A horizontal navbar whose icons magnify (with their neighbours) as the pointer or
keyboard focus approaches, using a cosine falloff. Magnification is tunable live.

## Done

- [x] `ims-dock.model.ts` — `ImsDockItem` interface (id, label, icon, routerLink, disabled, badge)
- [x] `dock-magnify.ts` — pure `magnifiedSize(distance, range, base, max)` cosine falloff
- [x] `ims-dock-item.ts` / `.html` / `.scss` — presentational icon (glyph, tooltip, badge, focus/blur/activate)
- [x] `ims-dock.ts` / `.html` / `.scss` — container: pointer signal, resting-centre snapshot, magnify maths
- [x] Signal inputs: `baseSize`, `maxSize`, `influenceRange`, `gap` (`numberAttribute`)
- [x] Keyboard focus parity (focus centres the wave) + `aria-label` + `role="toolbar"`
- [x] Reduced-motion guard (`prefers-reduced-motion` disables magnify + transitions)
- [x] `dock-demo` page with live controls: max scale, influence range, base size
- [x] Route `dock` in `app.routes.ts` + RTL nav link in `app.html`

## Suggested follow-ups (pick any)

- [ ] Configurable orientation (bottom / left / right) — maths is already axis-symmetric
- [ ] Spring easing instead of CSS transition for a springier return
- [ ] Separators / grouping between icon clusters
- [ ] Unit spec for `magnifiedSize` edge cases (range 0, distance ≥ range, midpoint)

## Notes

- Sizes derive from each icon's **resting** centre (snapshotted at rest, re-measured on
  resize while idle), not its live magnified position — this avoids feedback jitter.
- The whole effect is driven by one `pointer` signal, so mouse hover and tab-focus share
  identical maths.
