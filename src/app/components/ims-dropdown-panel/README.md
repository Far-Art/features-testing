# IMS Dropdown Panel

`imsDropdownPanel` goes on a button and opens a panel next to it on click, like a
dropdown. You pass in what the panel holds: an `<ng-template>` or a component
type. The panel stays open until it is dismissed, and the content can close it
with a result.

It is a separate thing from `ims-panel`, which is a static toned container in the
page flow. It is also separate from `imsPopover`, which opens on hover and closes
when the pointer leaves.

Treat the behavior documented here as part of the contract unless a requested
change explicitly replaces it.

## File Map

| File | Purpose |
| --- | --- |
| `ims-dropdown-panel.directive.ts` | `ImsDropdownPanelTrigger`: trigger, overlay, dismissal, focus, placement. |
| `ims-dropdown-panel-surface.ts` | The surface, and the one attach path for both content kinds. |
| `ims-dropdown-panel-ref.ts` | `ImsDropdownPanelRef`, which content closes the panel through. |
| `ims-dropdown-panel.types.ts` | Position, alignment, auto-focus and template-context types. |
| `index.ts` | Public API barrel. |
| `src/styles/ims-dropdown-panel.scss` | Surface presentation. Global, loaded from `src/styles.scss`. |
| `src/app/pages/dropdown-panel-demo/` | Demo, routed at `/dropdown-panel`. |

## Basic Usage

A template receives the open panel as its implicit context:

```html
<button ims-button [imsDropdownPanel]="actions" (imsDropdownPanelClosed)="run($event)">
    פעולות
</button>

<ng-template #actions let-panel>
    <button type="button" (click)="panel.close('archive')">העברה לארכיון</button>
</ng-template>
```

A component takes its inputs through `imsDropdownPanelInputs` and injects the
ref:

```html
<button
    ims-button
    [imsDropdownPanel]="PolicyFilterPanel"
    [imsDropdownPanelInputs]="{year: filter().year}"
    (imsDropdownPanelClosed)="applyFilter($event)"
>
    סינון
</button>
```

```ts
export class PolicyFilterPanel {
    private readonly panel = inject<ImsDropdownPanelRef<PolicyFilter>>(ImsDropdownPanelRef);
    readonly year = input(2026);

    apply(): void {
        this.panel.close({year: this.form.value.year});
    }
}
```

A component inside an `<ng-template>` can inject the ref too: the surface hands
its injector to the template outlet.

The directive is exported as `imsDropdownPanel`, for driving it from elsewhere in
the template:

```html
<button ims-button #filters="imsDropdownPanel" [imsDropdownPanel]="filterPanel">סינון</button>
<a href="#" (click)="filters.open(); $event.preventDefault()">פתיחת הסינון</a>
```

## Public API

### `ImsDropdownPanelTrigger` — `[imsDropdownPanel]`

| Input | Default | Purpose |
| --- | --- | --- |
| `imsDropdownPanel` | `null` | `TemplateRef` or component `Type`. `null` means no panel. |
| `imsDropdownPanelInputs` | `null` | Inputs for component content. Ignored for a template. |
| `imsDropdownPanelPosition` | `'below'` | `below`, `above`, `before` or `after`. |
| `imsDropdownPanelAlign` | `'start'` | `start`, `center` or `end`: the trigger's edge the panel lines up with. |
| `imsDropdownPanelMatchWidth` | `false` | Makes the panel at least as wide as the trigger. |
| `imsDropdownPanelAutoFocus` | `'first-tabbable'` | `first-tabbable` or `panel`. See [Focus](#focus). |
| `imsDropdownPanelAriaLabel` | trigger's name | Accessible name of the panel. |
| `imsDropdownPanelClass` | `null` | Classes added to the surface. See [Styling](#styling). |
| `imsDropdownPanelDisabled` | `false` | Keeps the panel from opening, and closes it if it is open. |

| Output | Payload | Emits |
| --- | --- | --- |
| `imsDropdownPanelOpened` | `void` | Once the panel is open and its content rendered. |
| `imsDropdownPanelClosed` | `unknown` | On every close: the result passed to `ImsDropdownPanelRef.close()`, or `undefined` for a dismissal. |

The result is `unknown` because a directive's type parameter cannot be inferred
from a template. Narrow it in the handler.

| Member | Purpose |
| --- | --- |
| `open()` | Opens the panel. Does nothing when it is open, disabled or empty. |
| `close()` | Closes it as a dismissal. |
| `toggle()` | What a click on the trigger does. |
| `isOpen` | Read-only signal. |

### `ImsDropdownPanelRef<R>`

| Member | Purpose |
| --- | --- |
| `close(result?: R)` | Closes the panel, returns focus to the trigger, and emits `result`. |
| `updatePosition()` | Re-runs placement. The panel already follows its own size changes. |

A new ref is issued for each opening, and it answers only while that opening
lasts. Content holding an old ref, in a pending subscription for example, cannot
close the panel the next time it opens.

## Dismissal

The panel closes on:

- a click on the trigger;
- a click outside the trigger and the panel;
- <kbd>Esc</kbd>, which returns focus to the trigger;
- <kbd>Tab</kbd> out of the panel, in either direction — see [Focus](#focus);
- `ImsDropdownPanelRef.close()` from the content;
- `imsDropdownPanelDisabled` turning on, or the content becoming `null`.

### Nested overlays stay their own

A select, autocomplete or datepicker inside the panel opens its own overlay
above it. Both the outside-click and the <kbd>Esc</kbd> stream come from the
CDK's overlay dispatchers, which deliver to the topmost overlay listening. A
click on an option in that inner overlay therefore stops there instead of
counting as outside the panel. <kbd>Esc</kbd> closes only the inner overlay.

The <kbd>Esc</kbd> handler also skips an event whose default is already
prevented. That covers content that closes something of its own on
<kbd>Esc</kbd> from a keydown listener, as the IMS selection components do: the
listener runs first, prevents the default, and the panel stays open.

## Focus

On open, focus moves into the panel:

- `first-tabbable`, the default: a `cdkFocusInitial` element if the content
  marks one, else the first tabbable element, else the panel itself.
- `panel`: the panel itself, so the next <kbd>Tab</kbd> reaches the first element.

The panel is `role="dialog"`. The trigger carries `aria-haspopup="dialog"`,
`aria-expanded`, and `aria-controls` while the panel is open. Unless
`imsDropdownPanelAriaLabel` names the panel, it is named after the trigger: the
trigger's `aria-label`, or else its text without `aria-hidden` descendants. That
leaves out an `ims-icon`'s ligature, which is text too.

There is no focus trap. <kbd>Tab</kbd> moves through the content. Tabbing past
either end closes the panel:

- **Forwards** past the last element, focus goes on to whatever follows the
  trigger. The panel renders at the end of the document, so the browser's own
  next stop would be outside the page. The handler focuses the trigger and lets
  the <kbd>Tab</kbd> go ahead, and the browser moves on from there.
- **Backwards** past the first element, focus stops on the trigger.

Closing through the ref, <kbd>Esc</kbd> or <kbd>Tab</kbd> returns focus to the
trigger. Other closes return it only when it was inside the panel, because the
detach would otherwise drop it on the document. An outside click leaves focus
where the click put it.

## Placement

Given a side and an alignment, the panel gets two candidates: that side, then
the opposite side with the same alignment. When neither fits, it slides along
its side until it does. This is the `imsPopover` behavior, for the reason
explained in `ims-tooltip/README.md` under "It shifts, it does not switch". It
depends on `withPush(true)` and `withFlexibleDimensions(false)`.

`start` and `end` follow the reading direction. Under the application's RTL,
`below` + `start` lines the panel's right edge up with the trigger's right edge,
and `before` puts it on the trigger's right. Next to the trigger, `start` and
`end` mean top and bottom.

The gap is 4px, like the select's. The panel keeps 8px from the viewport edge
and scrolls rather than leaving the viewport. A `ResizeObserver` re-runs
placement while it is open, so a panel that grows after an async load still
fits or flips.

## Styling

The surface has a hairline border, a solid fill and one subtle shadow, which
lifts it off the page it covers. The shadow is a single small layer and there is
no backdrop blur: the target machines render on the CPU, and a large or layered
shadow costs on every frame the panel animates. This is the one IMS overlay
surface that ships with a shadow by default.

Restyle the surface through these custom properties on a class passed in
`imsDropdownPanelClass`:

| Variable | Default |
| --- | --- |
| `--ims-dropdown-panel-fill` | `--ims-background-panel` |
| `--ims-dropdown-panel-border` | `--ims-color-border-subtle` |
| `--ims-dropdown-panel-color` | `--ims-color-on-surface` |
| `--ims-dropdown-panel-radius` | `0.5rem` |
| `--ims-dropdown-panel-padding` | `0.5rem` |
| `--ims-dropdown-panel-shadow` | `0 0.25rem 0.75rem`, `--ims-color-primary-950` at 10% |

Set `--ims-dropdown-panel-shadow: none` for a flat panel, or a deeper value for
a raised one. The class lands on the surface, which renders in the overlay
container, outside the page's host. A component-scoped rule cannot reach it, so
the rule must be global.
Template content is different: it is created from the page's own template, so
it carries the page's scoping attribute and component styles reach it.

The panel fades and scales in over 160ms and out over 120ms, from the trigger's
edge, with the popover's easing. Reduced motion removes the enter animation and
shortens the leave to 1ms.

## Safe Change Guide

- Set the placements on the strategy before `attach()`. The CDK validates them
  on attach and throws if there are none.
- Keep `LEAVE_DURATION_MS` equal to the `ims-dropdown-panel-leave` duration, and
  keep the detach on a timer.
- Keep the outside-click and <kbd>Esc</kbd> handling on the overlay's own
  streams. A document listener would close the panel when an option is picked
  in a select inside it.
- Keep the <kbd>Esc</kbd> handler skipping prevented events.
- Keep forward <kbd>Tab</kbd> out of the panel not prevented. The browser's
  default action is what moves focus past the trigger.
- Keep `flex-grow: 1` on `.ims-dropdown-panel`. The CDK pane is a flex row and
  `imsDropdownPanelMatchWidth` sizes the pane, so without it the surface stops
  at its content's width.
- Don't declare a `transform-origin` on the surface. The CDK writes one matching
  the side the panel landed on.
- Keep the default shadow to one small layer and paint it through
  `--ims-dropdown-panel-shadow`, so a page can still turn it off. Don't add a
  `backdrop-filter`.
