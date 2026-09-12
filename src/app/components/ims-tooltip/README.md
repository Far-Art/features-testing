# IMS Tooltip

`ImsTooltip` is a hover-and-focus tooltip built on `MatTooltip`. Material does
the overlay, positioning, touch long-press and `aria-describedby` wiring; it is
applied as a host directive with none of its own inputs exposed, so every
spelling a template sees is an `ims` one.

## On any element

```html
<span imsTooltip="Rounded to the nearest agora">₪12.34</span>
<span imsTooltip="Past its renewal date" imsTooltipSeverity="danger">…</span>
```

| Input | Default | Purpose |
| --- | --- | --- |
| `imsTooltip` | — | Text. Empty or whitespace-only means no tooltip. |
| `imsTooltipSeverity` | `info` | `info`, `success`, `warning`, or `danger`. |
| `imsTooltipPosition` | configured | `above`, `below`, `left`, `right`, `before`, `after`. |
| `imsTooltipDisabled` | `false` | Suppresses the tooltip, message still bound. |

## On an `ims-button`

Buttons carry no tooltip of their own. Every flavor — `ims-button`,
`ims-button-icon`, `ims-button-delete`, `ims-button-edit` — leaves the element
bare, so a tooltip is whichever directive the template puts on it. Either works:

```html
<button ims-button matTooltip="Saves the draft">Save</button>
<button ims-button imsTooltip="Saves the draft">Save</button>
```

`MatTooltip` or `ImsTooltip` goes in that component's `imports` like any other
directive.

This used to be a host directive on `ImsButtonBase`, which read better — no
import, `matTooltip` simply worked on a button. It could not stay. The moment a
template also has `MatTooltip` in scope, which any template using `matTooltip`
on something that is *not* a button already does, `[matTooltip]` matches the
host directive and the template's own at the same time and Angular rejects the
element:

```
NG0309: Directive MatTooltip matches multiple times on the same element.
```

Nothing a call site can write avoids that, so the button gives the element up
entirely and there is only ever the one directive the template asked for.

### House severities

`imsTooltip` carries them as an input:

```html
<button ims-button-delete imsTooltip="Locked policies cannot be deleted"
        imsTooltipSeverity="danger" [disabled]="policy.locked"></button>
```

With `matTooltip` the same thing is a class pair. `.ims-tooltip` carries the
house shape, type and colors; the modifier moves one variable, and both are
needed — without the base class the tooltip falls back to Material's own dark
surface:

```html
<button
    ims-button-delete
    matTooltip="Locked policies cannot be deleted"
    matTooltipClass="ims-tooltip ims-tooltip--danger"
    [disabled]="policy.locked"
></button>
```

A `matTooltip` with no `matTooltipClass` still gets the house look — see
[Configuration](#configuration).

### Disabled buttons

A natively disabled button is not in the tab order, so its tooltip is reachable
by pointer at best, and whether even that works is left to the browser: current
Chrome dispatches `mouseenter` to a disabled control, other engines have
historically suppressed it. `ims-readonly` on an ancestor disables the button
the same way, so a button inside a readonly form has the same limitation
without anyone writing `disabled` on it.

## Configuration

```ts
provideImsTooltipConfig({showDelay: 300, hideDelay: 100})
```

Options are merged over `IMS_TOOLTIP_DEFAULT_OPTIONS` and stored in Material's
`MAT_TOOLTIP_DEFAULT_OPTIONS`; there is no IMS-owned token. `position` set here
applies wherever `imsTooltipPosition` is left unset.

`tooltipClass` is where a plain `matTooltip` gets the house look —
`app.config.ts` sets `'ims-tooltip ims-tooltip--info'`, which reaches any
tooltip that names no classes of its own. A call site that wants another tone
overrides it with `matTooltipClass`; `imsTooltip` always overwrites it from
`imsTooltipSeverity` and so ignores it.

## Styling

`src/styles/ims-tooltip.scss` maps each severity onto the `--ims-color-status-*`
tokens by setting `--mat-tooltip-container-color`. The severity class lands on
the tooltip element one level above the painted surface, and custom properties
inherit down to it, so a modifier never needs a declaration of its own.

## Accessibility

`MatTooltip` adds `aria-describedby`. On `ims-button-icon`, `ims-button-delete`
and `ims-button-edit`, which already carry an `aria-label`, tooltip text that
merely repeats the label is announced twice — the tooltip should add
information, not restate the name.
