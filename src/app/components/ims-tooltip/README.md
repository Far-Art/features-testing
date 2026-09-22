# IMS Tooltip

Two directives over one core. `imsTooltip` is a text explanation that opens on
hover and on keyboard focus and never takes the pointer. `imsPopover` is a
surface holding a template or a component that the user can reach into.

Both are built on the CDK overlay and owned here. Neither goes through
`MatTooltip` any more — see [Why not MatTooltip](#why-not-mattooltip).

Treat the behavior documented here as part of the contract unless a requested
change explicitly replaces it.

## File Map

| File | Purpose |
| --- | --- |
| `ims-tooltip.directive.ts` | `ImsTooltip` — the text tooltip. |
| `ims-tooltip.service.ts` | The one overlay every text tooltip shares. |
| `ims-tooltip-panel.ts` | The painted bubble. |
| `ims-popover.directive.ts` | `ImsPopover` — content surface, interactive. |
| `ims-popover-panel.ts` | The popover surface; one attach path for both content kinds. |
| `ims-overlay-trigger.ts` | Shared core: trigger, delays, placement, ARIA. |
| `ims-tooltip.types.ts` | Severities, positions, configuration, the defaults token. |
| `src/styles/ims-tooltip.scss` | Bubble presentation. |
| `src/styles/ims-popover.scss` | Surface presentation. |
| `src/app/pages/tooltip-demo/` | Demo, routed at `/tooltip`. |

## `imsTooltip`

```html
<span imsTooltip="Rounded to the nearest agora">₪12.34</span>
<span imsTooltip="Past its renewal date" imsTooltipSeverity="danger">…</span>
```

| Input | Default | Purpose |
| --- | --- | --- |
| `imsTooltip` | — | Text. Empty or whitespace-only means no tooltip. |
| `imsTooltipSeverity` | inherited | `info`, `success`, `warning`, or `danger`. |
| `imsTooltipPosition` | inherited | `above`, `below`, `left`, `right`, `before`, `after`. |
| `imsTooltipDisabled` | `false` | Suppresses the tooltip, message still bound. |

An empty or whitespace-only message is inert, so a bound message that has not
arrived yet costs nothing.

### Only one is ever on screen

Every text tooltip in the application shares a single overlay, created on the
first hover anywhere and re-aimed at each new host. The most recent trigger
wins.

This differs from Material, which would show a focused button's tooltip and a
hovered element's at the same time. It is deliberate: two tooltips on screen at
once is almost never what was wanted, and the shared overlay is what keeps the
cost flat. `MatTooltip` and `ImsTextTruncateDirective` both keep a per-instance
`OverlayRef` alive once an element has been hovered, so running the pointer
along a row of fifty buttons retains fifty overlays for as long as those buttons
live. Here the ceiling is one.

## `imsPopover`

```html
<span [imsPopover]="preview">…</span>
<ng-template #preview><a href="/policy/12">Open the policy</a></ng-template>

<span [imsPopover]="PolicyCard" [imsPopoverInputs]="{policyId: 12}">…</span>
```

| Input | Default | Purpose |
| --- | --- | --- |
| `imsPopover` | — | `TemplateRef` or component `Type`. `null` means no popover. |
| `imsPopoverInputs` | `null` | Inputs for component content. Ignored for a template. |
| `imsPopoverSeverity` | inherited | Same four tones. |
| `imsPopoverPosition` | inherited | Same six sides. |
| `imsPopoverInteractive` | `true` | Whether the surface takes the pointer. |
| `imsPopoverDisabled` | `false` | Suppresses the popover, content still bound. |

Each instance owns its overlay — a shared one is impossible here, since the
content differs per host and the surface is meant to stay put while it is used.
It is still created on the first open, so an untriggered popover costs nothing
but the directive.

An interactive popover stays open while the pointer travels from the host to the
surface, including diagonally: the corridor between the two counts as inside. It
closes when the pointer leaves all three regions, on <kbd>Esc</kbd>, or on a
click outside. Focus moving into the surface does not close it.

### Why this is a separate directive

A tooltip and a popover look alike and behave almost nothing alike. A tooltip is
`role="tooltip"`, is referenced by the host's `aria-describedby`, has
`pointer-events: none`, and ends when the pointer leaves. A popover is
`role="dialog"`, is referenced by `aria-controls`, takes the pointer, and is
dismissed.

Folding them into one directive would put the hover bridge, the dismiss
handling and the document listeners into every plain text tooltip. Kept apart,
`ims-popover.directive.ts` drops out of any bundle that does not import it,
which is most of them — and rich content is the rare case.

## On an `ims-button`

A button carries no tooltip of its own. What it carries is *defaults*: every
flavor provides `IMS_TOOLTIP_DEFAULTS` with its own severity, so the common case
says the tone once.

```html
<!-- danger, without the template repeating what the button already says -->
<button ims-button-icon ims-button-icon-preset="delete" imsTooltip="Locked policies cannot be deleted"></button>

<!-- warning, taken from ims-button-severity -->
<button ims-button ims-button-severity="warning" imsTooltip="Some fields are empty">…</button>
```

The `delete` preset pins `danger` for the same reason it pins its glyph. Every
other flavor passes `ims-button-severity` through, and follows it when it is
rebound. An explicit `imsTooltipSeverity` always wins.

A button with no tooltip pays for one provider record: no overlay, no portal, no
listeners.

The defaults token is resolved from the nearest contributing element *or
ancestor*, the way `ims-readonly` reaches a subtree — so a toolbar can set the
tone for everything inside it.

### Why not a host directive

This is the second attempt at putting a tooltip on the button itself, and the
answer is still no. A tooltip applied through `hostDirectives` reads better at
the call site, but then a template that also puts one on the element has two of
them: two trigger instances and two overlays opening on one hover. When the host
directive was Material's, whose selector a template can also match, Angular
refused the element outright:

```
NG0309: Directive MatTooltip matches multiple times on the same element.
```

Contributing defaults instead leaves exactly one tooltip engine on the element —
the one the template asked for — and costs nothing when there is none.

## Accessibility

An open tooltip adds its ID to the host's `aria-describedby`, and removes only
its own ID on close: the attribute is written directly rather than bound,
because a binding owns the whole attribute and would erase references the host
already carries, such as a hint or an error popover's message.

A popover uses `aria-haspopup="dialog"` on the host, plus `aria-expanded` and
`aria-controls` while open. It is not a description, so it is not added to
`aria-describedby`. No focus trap is applied; content that needs one manages its
own focus.

On `ims-button-icon`, which already carries an `aria-label` — its own, or the
default a preset brings — tooltip text that merely repeats the label is
announced twice. The tooltip should add information, not restate the name.

A natively disabled button is not in the tab order, so its tooltip is reachable
by pointer at best, and whether even that works is left to the browser.
`ims-readonly` on an ancestor disables a button the same way.

### Only keyboard focus opens a surface

Focus opens a tooltip or popover only when the keyboard is what the user last
drove the page with, as the CDK's `InputModalityDetector` reports it. Focus from
a click is already covered by the hover. Focus from a script is usually a dialog
handing focus back to the button that opened it, and a surface opened on that
appears over a host the pointer is nowhere near. Nothing closes it until focus
moves on, because the pointer never entered the host and so never leaves it.

The rule reads the last input rather than the cause of each focus, so focus
that a script moves in answer to a key still counts. A dialog closed with
<kbd>Esc</kbd> hands focus back as keyboard focus, and the tooltip opens as it
would for <kbd>Tab</kbd>.

## Touch

There is none. The application is desktop-only, so hover and keyboard focus are
the whole trigger surface and no touch listener exists anywhere in this family.
Material's long-press path has no counterpart here on purpose.

## Configuration

```ts
provideImsTooltipConfig({showDelay: 0, hideDelay: 100})
```

| Option | Default | Purpose |
| --- | --- | --- |
| `showDelay` | `0` | Milliseconds before opening. |
| `hideDelay` | `0` | Milliseconds before closing. |
| `position` | `'above'` | Preferred side wherever none is named. Applies to popovers too. |
| `severity` | `'info'` | Tone wherever neither call site nor host supplies one. |

Merged over `IMS_TOOLTIP_DEFAULT_CONFIG` and stored in `IMS_TOOLTIP_CONFIG`.
Both delays must be non-negative and finite or the factory throws `RangeError`.

New options belong here as `ImsTooltipConfig` properties rather than as new
inputs.

## Resolution order

Severity and position each resolve through three tiers, first match wins:

1. The input written at the call site.
2. `IMS_TOOLTIP_DEFAULTS` from the host element or an ancestor.
3. `IMS_TOOLTIP_CONFIG`.

## Placement

`before` and `after` are logical and follow the reading direction; `left` and
`right` are absolute and are translated against `Directionality`. The
application runs `dir="rtl"`, so in it `before` is on the right.

The gap between host and surface is 8px on every side. Getting that right under
RTL needs care, because the CDK is only half logical here: it resolves
`originX`/`overlayX` against the overlay's direction, but applies `offsetX`
verbatim, as a physical `translateX()`. A single fixed sign therefore places a
`before` surface correctly off the host's right edge under RTL and then drags it
8px back *over* the host. `before()` and `after()` take the direction and pick
the sign themselves.

### It shifts, it does not switch

A surface with no room on its preferred side **slides along that side** until it
fits. It changes side only when the preferred one has no room on its own axis,
and then only to the opposite side — `below` becomes `above`, never `before`.

This is the `MatTooltip` behavior, and it comes from offering the CDK exactly
two candidate placements: the preferred side and its opposite. The strategy
takes the first candidate that fits the viewport *completely*, and only pushes a
partly-fitting one back inside when none does. Add the perpendicular pair to the
list and a tooltip below a host near the right edge jumps to the left of it —
`before` fits completely, while `below`, overflowing by a few pixels
horizontally, does not. Withholding those two candidates is what leaves the
strategy no choice but to push, which is the slide.

It depends on `withPush(true)` and `withFlexibleDimensions(false)` on both
callers. Remove either and the slide stops.

## Animation

Both surfaces fade and scale in, and fade and scale out again.

| | Enter | Leave |
| --- | --- | --- |
| Tooltip | 150ms, `scale(0.94)` | 90ms, `scale(0.97)` |
| Popover | 180ms, `scale(0.97)` | 120ms, `scale(0.985)` |

They grow out of the host rather than swelling in place: both position
strategies are given `withTransformOriginOn`, so the CDK writes a
`transform-origin` matching the side the surface landed on. A tooltip above its
host scales from `center bottom`, one placed `before` in an RTL page from
`left center` — in each case the edge that touches the host. No origin is
declared in CSS; overriding one there would break this.

### The easing is doing a specific job

The curve is `cubic-bezier(0.1, 0.5, 0.5, 0.9)`, and deliberately not the house
overlay curve. This is the fix for a real artifact.

A scaled box has its text rasterised at one size and resampled while the
transform is live, then re-rasterised crisply the instant the transform is
dropped. That final frame is a step change, and no easing removes it. What
easing controls is how long the animation lingers next to it.

The house `cubic-bezier(0.22, 1, 0.36, 1)` ends on a horizontal tangent. It is
96% finished at the halfway point, 99.9% finished at 80%, and spends **35% of
its duration more than 99% done** — a third of the animation parked on the
almost-finished state, which is what makes the final snap so legible. It read as
the tooltip settling into shape after it had apparently stopped.

This curve's second control point sits below 1, so it arrives with real velocity
instead of creeping: 5.8% of the change still happens in the final 20% of the
time, and only **4.6% of the duration** is spent above 99% done. Roughly a
sevenfold shorter tail.

The scale amounts are part of the same fix, since the drift is proportional to
the delta. The tooltip started at `0.88`, which moved a 96px bubble's edges
about 6px; at `0.94` it is 2.9px. The popover is shallower again at `0.97`,
because the same factor on a 384px surface travels four times as far.

If the settle ever comes back, the levers in order are: lower the curve's second
control point (shorter tail, more abrupt stop), then raise the scale start
toward 1, then drop the transform entirely — opacity alone cannot produce the
artifact at all.

### The leave

The leave is the fiddly half, because the surface has to outlive the close. On
hide it gains a `--leaving` class and is detached on a timer instead of at once.
Three consequences worth keeping:

- **The leave durations are duplicated** — once in the keyframe, once as
  `LEAVE_DURATION_MS` in `ims-tooltip.service.ts` and `ims-popover.directive.ts`.
  Change one and change the other, or the animation is cut off or the surface
  lingers.
- **Re-opening mid-fade detaches first.** Reusing the attached element would
  skip the enter animation and the surface would simply appear.
- **A leaving popover drops `pointer-events`**, and gives up `aria-expanded` and
  its listeners the moment it closes rather than when the fade ends — it must not
  answer a click already heading for what is behind it.

Under `prefers-reduced-motion: reduce` the enter animation is removed and the
leave is shortened to `1ms` rather than removed: the detach is on a timer either
way, so dropping it would leave the surface at full opacity for its last frames,
which is a flicker.

## Styling

Both stylesheets are global, because these render in the CDK overlay container,
outside every component's host; the `:root` tokens they consume still reach
there.

Each follows the slot pattern: the base class declares the whole colour API and
every paint rule names a slot, so a severity is one block that repoints them.

| Variable | Paints |
| --- | --- |
| `--ims-tooltip-fill` | The bubble. |
| `--ims-tooltip-color` | Its text. |
| `--ims-popover-fill` | The surface. |
| `--ims-popover-border` | Its hairline. |
| `--ims-popover-color` | Its text. |

A tooltip is a filled bubble in the solid status colour. A popover is a light
panel with a toned border instead, because it holds content that would otherwise
have to fight a solid fill — the same treatment, for the same reason, as
`ims-error-popover`.

`.ims-tooltip` sets `pointer-events: none` itself and not only on the overlay
pane. The pane is set to `none` too, but the bubble is a child of it and `auto`
is the initial value, so a child re-enables what its parent switched off.

## Why not MatTooltip

Three things at once:

- `MatTooltip` renders a string and nothing else, so `imsPopover` could not have
  been built on it.
- Styling meant repointing `--mat-tooltip-*` variables and naming the internal
  `.mat-mdc-tooltip-surface` class to beat a hardcoded 200px cap that no
  variable reached — tight for a sentence of Hebrew, which most of this
  application's tooltip copy is.
- Its selector made the button integration above impossible.

Dropping it also retired the `font-family` override the bubble used to carry:
owning the surface means it inherits the application's typeface like everything
else. `@angular/material` remains a dependency — `ims-grid-sort` uses `MatSort`.

## Safe Change Guide

- Keep `ImsTooltipService.hide` guarded on the owner, or a tooltip whose hide
  delay elapses late will close whichever one took the panel after it.
- Keep `focusin` gated on keyboard input in `ImsOverlayTrigger`. Opened on any
  focus, a tooltip comes back on the button behind every dialog that restores
  focus on close, under a pointer that is somewhere else — see
  [Only keyboard focus opens a surface](#only-keyboard-focus-opens-a-surface).
- Keep the panel detached on hide and re-attached on show. Reusing an attached
  panel would not replay the enter animation; disposing the overlay would give
  up the shared-overlay property entirely.
- Keep `pointer-events: none` on `.ims-tooltip` itself, or the bubble swallows
  presses on the host beneath it.
- Keep the ID helpers adding and removing single IDs. Binding `aria-describedby`
  erases whatever else the host references.
- Keep `before`/`after` taking the direction and choosing their own `offsetX`
  sign. `originX`/`overlayX` are logical and the CDK resolves them against the
  overlay's direction, but `offsetX` is applied verbatim as a physical
  `translateX()`. A fixed sign puts the surface on the correct side under RTL
  and then pulls it back across the host instead of opening a gap.
- Keep `getConnectedPositions` returning **two** placements. A third makes
  surfaces jump to a perpendicular side instead of sliding — see
  [It shifts, it does not switch](#it-shifts-it-does-not-switch).
- Keep each `LEAVE_DURATION_MS` equal to its keyframe's duration, and keep the
  detach on a timer rather than on `animationend`, which reduced motion makes
  unreliable.
- Keep the enter easing off the house overlay curve. Its horizontal end tangent
  parks the animation on the almost-finished state and makes the surface look
  like it settles into shape; see
  [The easing is doing a specific job](#the-easing-is-doing-a-specific-job).
- If the merge TODO at the top of `ims-overlay-trigger.ts` is ever taken up,
  `ImsTextTruncateDirective` and `ImsConnectedPopoverBase` both have specs.
