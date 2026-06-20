# ims-dock — Performance TODO

Proposals to reduce per-frame cost of the size-based magnification. Nothing here is
implemented yet. The dock resizes 9 icons' `width`/`height` on every `mousemove`, so
the dominant cost is **layout/reflow**.

## 0. Profile first
- [ ] Capture a DevTools Performance trace while hovering, with CPU throttled 4–6×.
- [ ] Confirm layout (reflow) is the bottleneck before changing anything — optimize against the measurement.

## Already in place (no action)
- [x] `contain: layout` on the row and each item — confines reflow to the dock subtree.
- [x] Transition `none` while tracking — no per-frame tween fighting the cursor.
- [x] OnPush + signal inputs — unchanged (far) icons keep `base` size and are skipped.
- [x] `@for` tracks by `item.id` — no structural re-render.

## Tier 1 — low risk, recommended
- [ ] **rAF-coalesce pointer updates.** Guard `onPointerMove` so the `pointer` signal is
      written at most once per frame (pointers can fire >1×/frame).
- [ ] **Track outside the Angular zone.** Register the move handler via
      `NgZone.runOutsideAngular` and re-enter only on the rAF tick, cutting zone ticks
      (even with `eventCoalescing: true`). Pairs with the rAF guard above.

## Tier 2 — moderate, optional
- [ ] **Cache resting centers.** Re-measure on `baseSize`/`gap`/`items`/viewport changes
      instead of on every enter/focus, dropping a forced `getBoundingClientRect` reflow
      per gesture. Risk: per-enter measurement is what fixed the coordinate-frame offset —
      needs careful invalidation (resize + input effects).
- [ ] **Passive pointer listeners** — marginal; only if profiling flags event cost.

## Tier 3 — highest impact, design change (previously rejected)
- [ ] **Transform-based magnification (`scale` + `translateX`).** Eliminates per-frame
      layout entirely (GPU compositing). Biggest win, but it's the version rolled back as
      too complex. Revisit only if profiling shows layout is a real problem on low-end
      target devices.

## Recommendation
If profiling confirms layout cost matters, do **Tier 1 (#1 + #2)** together — contained,
low risk, no change to visual behavior. Hold off on Tier 3 unless there's a measured need.
