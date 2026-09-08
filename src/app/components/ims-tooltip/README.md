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

Every button flavor — `ims-button`, `ims-button-icon`, `ims-button-delete`,
`ims-button-edit` — already carries a tooltip, inherited from `ImsButtonBase`.
Nothing needs importing, and the inputs take the button family's dash-cased
spelling:

```html
<button ims-button ims-tooltip="Saves the draft">Save</button>

<button
    ims-button-delete
    ims-tooltip="Locked policies cannot be deleted"
    ims-tooltip-severity="danger"
    ims-tooltip-when-disabled
    [disabled]="policy.locked"
></button>
```

`ims-tooltip`, `ims-tooltip-severity`, `ims-tooltip-position` and
`ims-tooltip-disabled` mean exactly what their camel-cased counterparts mean
above.

**Do not add `imsTooltip` to a button.** It already has a `MatTooltip`; adding
`ImsTooltip` would put a second one on the same element.

`ImsButtonBase` declares those four as its own inputs and shares the wiring
through `connectImsTooltip`, rather than re-exposing `ImsTooltip`'s inputs via
`hostDirectives`. The compiler accepts either, but the base has no selector of
its own — its host directives reach the four button selectors only by
inheritance — and an alias renamed across that hop is more than the editor
tooling follows, so every call site drew an "attribute is not allowed here"
warning. A plain input declared on the base, like `icon-size` and
`call-to-action`, resolves everywhere.

Any other host can do the same: declare four signals, apply
`hostDirectives: [MatTooltip]`, and call `connectImsTooltip` from the
constructor.

### `ims-tooltip-when-disabled`

A natively disabled button is not in the tab order, so its tooltip can only ever
be reached with a pointer — keyboard and screen-reader users get nothing, which
is exactly the audience most likely to need the explanation. Whether even the
pointer works is left to the browser: current Chrome dispatches `mouseenter` to
a disabled control, other engines have historically suppressed it.

This input drops the native `disabled` attribute and leans on what the button
already does without it — `handleClick` swallows the click before any listener
or default action sees it, `aria-disabled` still says the control is
unavailable, and the grayed-out look comes from `.ims-button--disabled` — so the
action stays blocked and the button still looks and reads as disabled.

The one real change is that the button stays in the tab order. That is the ARIA
pattern for an unavailable control carrying an explanation, but it is a change
to tab order, which is why it is opt-in per button rather than automatic.

Without it, a disabled button's tooltip is pointer-only at best.

It takes an optional message. Written bare it only turns the behavior on, and
the button keeps saying whatever `ims-tooltip` says. Given text, that text
replaces the message for as long as the button cannot respond:

```html
<button
    ims-button
    ims-tooltip="Sends the policy to the insured"
    ims-tooltip-when-disabled="The insured has no address on file"
    [disabled]="!policy.hasAddress"
>Send</button>
```

Leaving `ims-tooltip` off entirely is the other half of that — a button that
says nothing until it is unavailable, and then says why:

```html
<button ims-button-delete ims-tooltip-when-disabled="Locked policies cannot be deleted"
        ims-tooltip-severity="danger" [disabled]="policy.locked"></button>
```

| Written | Effect |
| --- | --- |
| absent | Off. A disabled button's tooltip is pointer-only at best. |
| `ims-tooltip-when-disabled` | On. Keeps the `ims-tooltip` message. |
| `ims-tooltip-when-disabled="text"` | On. Shows `text` while unavailable. |
| `[ims-tooltip-when-disabled]="expr"` | A string is a message, `true` is bare, `false`/`null` is off. |

The swap is keyed to the same state that blocks the click, so a readonly button
explains itself the same way a disabled one does. `'true'` and `'false'` are
read as the booleans they spell — the only two strings this input will not
carry as a message.

## Configuration

```ts
provideImsTooltipConfig({showDelay: 300, hideDelay: 100})
```

Options are merged over `IMS_TOOLTIP_DEFAULT_OPTIONS` and stored in Material's
`MAT_TOOLTIP_DEFAULT_OPTIONS`; there is no IMS-owned token. `position` set here
applies wherever `imsTooltipPosition` is left unset. `tooltipClass` is the one
option with no effect — the severity owns that class list.

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
