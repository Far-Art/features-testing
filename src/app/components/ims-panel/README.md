# IMS Panel Implementation Guide

`ims-panel` wraps content in a toned container: a body filled with a severity's
subtle tint, an optional `ims-panel-header` banded one step darker, and a plain
`hr` that spans the full panel width as a section divider.

Treat the behavior documented here as part of the component contract unless a
requested change explicitly replaces it.

## File Map

| File | Purpose |
| --- | --- |
| `ims-panel.ts` | The container. Two projection slots, one `severity` input. |
| `ims-panel-header.ts` | The header row and the `[imsPanelHeaderActions]` marker. |
| `ims-panel.types.ts` | `ImsPanelSeverity`. |
| `index.ts` | Public API barrel. |
| `src/styles/ims-panel.scss` | All presentation. Global, loaded from `src/styles.scss`. |
| `src/styles/tokens/semantic-color-tokens.scss` | The `--ims-color-status-neutral-*` family this component added. |
| `src/app/pages/panel-demo/` | Live examples, routed at `/panel`. |

## Basic Usage

```html
<ims-panel>
    <ims-panel-header icon="receipt_long">פרטי פוליסה</ims-panel-header>
    <p>מספר פוליסה 41-220-8873.</p>
    <hr>
    <p>בעל הפוליסה: דנה כהן.</p>
</ims-panel>
```

A severity tones the whole panel:

```html
<ims-panel severity="warning">
    <ims-panel-header icon="warning">תשלום באיחור</ims-panel-header>
    <p>החיוב לא נסלק.</p>
</ims-panel>
```

The header is optional, and so is the icon. Project the header in any position —
the panel's first slot places it at the top regardless:

```html
<ims-panel severity="danger">
    <p>קופסה צבועה בלי כותרת.</p>
</ims-panel>
```

The header holds controls, not only text. Mark a trailing element with
`imsPanelHeaderActions` to pin it to the far end of the row:

```html
<ims-panel-header icon="filter_alt">
    <h3>חיובים</h3>
    <ims-checkbox [formControl]="includeCancelled">כלול חיובים שבוטלו</ims-checkbox>
    <ims-select [formControl]="year" ariaLabel="שנת חיוב">…</ims-select>

    <button ims-button-icon imsPanelHeaderActions aria-label="אפשרויות">
        <ims-icon>more_vert</ims-icon>
    </button>
</ims-panel-header>
```

## Public API

### `ImsPanel`

| Member | Kind | Purpose |
| --- | --- | --- |
| `severity` | `input<ImsPanelSeverity>` | Tone of the body, border, header band and header text. Defaults to `'neutral'`. |

### `ImsPanelHeader`

| Member | Kind | Purpose |
| --- | --- | --- |
| `icon` | `input<string \| null>` | Material Symbols ligature rendered before the projected content. Decorative. Defaults to `null`. |

### `ImsPanelHeaderActions`

Behavior-free marker directive. Selecting `[imsPanelHeaderActions]` projects the
element into the header's trailing slot.

Neither component declares Angular outputs.

## Severity

`ImsPanelSeverity` is `'neutral' | 'info' | 'success' | 'warning' | 'danger'`.
The four status words are the ones `ImsButtonSeverity`, `ImsSnackbarSeverity`,
`ImsTooltipSeverity` and `ImsDialogSeverity` use, so one word means the same
thing everywhere.

`neutral` is the addition and the default, which inverts the button's convention
on purpose. A button always reports something, so `info` is its free default. A
panel usually groups content that carries no state, so the untoned one is grey
and `info` is asked for. `neutral` binds no class: it is the ramp
`src/styles/ims-panel.scss` already declares, so it cannot drift.

## The divider

A bare `hr` as a direct child of the panel body is the section divider. It takes
a negative inline margin equal to `--ims-panel-padding`, so it reaches both
inner edges of the panel rather than stopping at the content padding, and it is
drawn in the severity's border colour.

The rule uses the child combinator. A nested panel's divider therefore stays
inside the nested panel and paints in the nested severity, rather than being
pulled out to the outer panel's edges.

An `hr` that is the first or last child pulls its outer margin back in, so it
reads as a divider rather than as a gap.

## Accessibility

The header carries no `role`. `ims-dialog-title` is `role="heading"` because a
dialog title is always text; this row is specified to hold checkboxes, selects
and buttons, and an ARIA heading must not contain focusable content. Project a
real `<h2>` or `<h3>` when the header is a heading — better markup than the role
would have been. The header zeroes the user-agent block margins such a heading
arrives with, so it sits in the band without inflating it; its size and weight
are left alone, because the level is a choice the call site made.
`src/app/pages/panel-demo/panel-demo.html` shows it.

The `icon` input is decorative and stays `aria-hidden`, like any `ims-icon`
without a `label`. An icon that carries meaning on its own goes in the projected
content as `<ims-icon label="…">`.

The panel itself is a plain container and adds no landmark. Wrap it in a
`<section aria-labelledby>` when it needs to be one.

## Styling

Classes: `.ims-panel`, `.ims-panel__content`, `.ims-panel--info` /
`--success` / `--warning` / `--danger`, `.ims-panel-header`,
`.ims-panel-header__icon`, `.ims-panel-header__content`,
`.ims-panel-header__actions`.

Four colour slots carry the severity. Every paint rule names a slot and never a
palette token, so a severity is one block that repoints the four:

| Variable | Paints |
| --- | --- |
| `--ims-panel-fill` | Body background. |
| `--ims-panel-border` | Surrounding hairline, header's lower edge, and the `hr`. |
| `--ims-panel-header-fill` | Header band. |
| `--ims-panel-header-color` | Header text and icon. |
| `--ims-panel-header-heading-color` | A projected `h1`–`h6`, a step or two up the ramp so it reads as its severity. |

Two more are the intended customization API:

| Variable | Default | Purpose |
| --- | --- | --- |
| `--ims-panel-padding` | `0.6rem` | Body padding, header inline padding, and the divider's bleed distance. |
| `--ims-panel-radius` | `0.75rem` | Corner radius. |

The header takes its colours by inheritance: it is projected into the panel, so
it is a DOM descendant and the slots reach it. The severity classes sit on the
panel alone, and the header never learns which severity it is in. Its four
`var()`s name the neutral token as a fallback, so a header outside a panel still
paints grey.

`neutral` does not paint its header from its own family. It borrows the `info`
band, ink and heading outright: an untoned panel is the default, and the default
should still look like this application, where blue is the house colour. A grey
band over a grey body read as drab rather than as neutral.

Its band is a softer blue than `info` uses — `--ims-color-primary-100` against
info's `-200` — so the two stay distinguishable at a glance, and the body fill
and border stay grey. One consequence worth knowing:
`--ims-color-status-neutral-accent` and `--ims-color-on-status-neutral` are no
longer used by this component. They stay in the token file so the neutral status
family is complete for the next component that wants a grey band.

`.ims-panel--warning` is the one block that does not read its family straight
across. Amber's accent band and its `--ims-color-on-status-warning` ink land at
4.0:1 together, the only pairing of the five that misses WCAG AA. The header
text goes one step darker, to `--ims-color-warning-900`, which puts it at 6.5:1.
`.ims-button--warning` makes the same correction for the same reason.

## Safe Change Guide

- Keep `neutral` without a class of its own, or the default panel stops being
  the base ramp and can drift from it.
- Keep every paint rule naming a slot rather than a palette token, or a severity
  stops being one block.
- Keep the child combinator on the `hr` rule, or a nested panel's divider bleeds
  out to the outer panel.
- Keep `--ims-panel-padding` driving both the content padding and the divider's
  negative margin, or changing the padding leaves the divider short.
- Keep `overflow: clip` rather than `hidden` on the panel: the header band must
  stop at the rounded corners, but a panel holds selects and tooltips whose
  overlays must not be trapped in a scroll container.
- Keep the warning header text at step 900, or the warning header drops below
  AA.
- Keep the header free of a `role`, or a header holding controls starts lying to
  assistive tech.
- Keep the heading margin reset, or a projected `h1`–`h6` inflates the band by a
  different amount at every level.
- `min-block-size` on the header is a floor for a text-only band, not a height
  every header shares. It is below `--field-height` plus the block padding, so a
  header holding a control is sized by that control and sits taller. Raise it to
  `2.625rem` if every header should instead be the same height.
