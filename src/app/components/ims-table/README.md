# IMS Table Implementation Guide

`ims-table` gives a native `table` and an `ims-grid-v2` one look, and with
`interactive` one keyboard model and one pair of row outputs. Treat the
behavior documented here as part of the component contract unless a requested
change explicitly replaces it.

## File Map

| File | Purpose |
| --- | --- |
| `ims-table.directive.ts` | `ImsTableDirective` on `table[ims-table]` and `ims-grid-v2[ims-table]`: the host class, roles, tab stops, keyboard navigation, virtual-viewport support. |
| `ims-table-row.directive.ts` | `ImsTableRowDirective` on `tr[ims-table-row]` and `ims-grid-row-v2[ims-table-row]`: `rowClick`, `rowDblclick`, click filtering, Enter and Space. |
| `ims-table.tokens.ts` | `IMS_TABLE_CONTEXT`, and the contracts between the table, its rows, and `ims-grid-v2`. |
| `index.ts` | Public API barrel. |
| `ims-table.directive.spec.ts` | Specs for both directives, on both hosts, with and without a virtual viewport. |
| `src/styles/ims-table.scss` | All presentation. Global, loaded from `src/styles.scss`. |
| `src/app/pages/table-demo/` | Live examples, routed at `/table`. |

The host class is `.ims-table-new`, not `.ims-table`: that name belongs to an
existing table style this one lives beside. Nothing in this component or its
stylesheet touches `.ims-table`. A table that adopts the directive should drop
the old class, or both styles apply.

## Basic Usage

```html
<table ims-table>
    <thead>
        <tr><th>מספר פוליסה</th><th class="ims-table-new__cell--numeric">פרמיה</th></tr>
    </thead>
    <tbody>
        @for (policy of policies; track policy.id) {
            <tr><td>{{ policy.number }}</td><td class="ims-table-new__cell--numeric">{{ policy.premium }}</td></tr>
        }
    </tbody>
</table>
```

```html
<ims-grid-v2 ims-table>
    <ims-grid-header-v2>
        <ims-grid-cell-v2>מספר פוליסה</ims-grid-cell-v2>
        <ims-grid-cell-v2 class="ims-table-new__cell--numeric">פרמיה</ims-grid-cell-v2>
    </ims-grid-header-v2>
    @for (policy of policies; track policy.id) {
        <ims-grid-row-v2>
            <ims-grid-cell-v2>{{ policy.number }}</ims-grid-cell-v2>
            <ims-grid-cell-v2 class="ims-table-new__cell--numeric">{{ policy.premium }}</ims-grid-cell-v2>
        </ims-grid-row-v2>
    }
</ims-grid-v2>
```

## Zebra

```html
<table ims-table zebra>…</table>
<ims-grid-v2 ims-table [zebra]="striped()">…</ims-grid-v2>
```

`zebra` (off by default) stripes every second body row. The stripe is a
translucent layer like hover and selection, drawn beneath both, so it shows on
a recolored or preset row too, and a hovered stripe still darkens. Rows are
counted among their siblings, the header not included.

Inside a virtual viewport, rows stripe by the item index bound to
`[ims-table-row]`, not by their place among the rendered elements, which moves
as the window scrolls. Without a bound index, virtual rows are not striped.

## Footer

A closing row, such as totals: `tfoot` on a native table, `ims-grid-footer-v2` on
a grid. It takes the header's band and weight and pins to the bottom of the
scrollport, so totals stay in view beside the rows they sum. It is a summary,
not a row of the list: no hover, selection, focus or keyboard stop.

```html
<tfoot>
    <tr>
        <th scope="row" colspan="4">סה״כ</th>
        <td class="ims-table-new__cell--numeric">{{ total }}</td>
    </tr>
</tfoot>
```

```html
<ims-grid-footer-v2>
    <ims-grid-cell-v2 span="1 / 4">סה״כ</ims-grid-cell-v2>
    <ims-grid-cell-v2 span="4 / 5" class="ims-table-new__cell--numeric">{{ total }}</ims-grid-cell-v2>
</ims-grid-footer-v2>
```

In a grid, a cell after a spanning cell needs its own `span`: cells are placed
by their position in the row, not after the span before them.

A native table needs its rows in `thead`, `tbody` or `tfoot`; the stylesheet
uses child combinators so a plain table nested in a cell keeps its own look.
An `ims-grid-v2` without `ims-table` stays a bare layout grid, as forms use it.

## Interactive Rows

```html
<table ims-table interactive>
    <tbody>
        @for (policy of policies; track policy.id) {
            <tr
                ims-table-row
                [attr.aria-selected]="policy.id === selectedId()"
                [class.ims-table-new__row--active]="policy.id === openId()"
                (rowClick)="selectedId.set(policy.id)"
                (rowDblclick)="open(policy)"
            >…</tr>
        }
    </tbody>
</table>
```

`interactive` turns on, together: the pointer cursor, row focus, the keyboard,
and the two outputs. Without it rows are static and the outputs never fire, so
a table cannot answer the mouse while ignoring the keyboard.

Only rows that carry `ims-table-row` take part. A row without it — an
empty-state row, a group heading — is passed over by the keyboard.

### Why outputs, not native events

Native `click` and `dblclick` on a row do not cover:

- Enter and Space on a focused row, which fire neither.
- A click on a button, link, input, label or other control in a cell, which
  bubbles to the row. It belongs to the control.
- A drag that selects cell text, which ends in a `click`.
- A click in a nested row, which also reaches its parent.

`rowClick` and `rowDblclick` filter all four. They emit the triggering
`MouseEvent | KeyboardEvent`, so modifier keys can be read. The row's data
comes from the template, as in `open(policy)`.

A double-click emits `rowClick`, `rowClick`, then `rowDblclick`, in the order
the browser fires them. `rowClick` is not delayed to wait for a second click,
so it should select (harmless twice), not toggle. The second press of a
double-click is cancelled so it does not highlight a word; a drag from a single
press still selects text.

### Keyboard

| Key | Effect |
| --- | --- |
| Tab | Enters the table at the active row: the last focused, else the first selected, else the first. |
| Tab again | The active row's own controls, then out of the table. |
| ↑ / ↓ | Previous or next row. Stops at either end. |
| Home / End | First or last row. |
| PageUp / PageDown | One visible page of rows. |
| Space | `rowClick` |
| Enter | `rowDblclick` |

The table is one tab stop. The active row has `tabindex="0"`, every other row
`-1`. Controls inside rows other than the active one are taken out of the tab
order (`tabindex="-1"`, the original value kept in `data-ims-table-tabindex`
and restored when their row becomes active). They stay clickable, and clicking
one makes its row active. A control that appears in a row later is caught by a
`MutationObserver`.

Keys pressed in a control inside a row belong to that control: the arrows move
an input's caret, Space toggles a checkbox. A grid of form fields should
therefore stay non-interactive.

### Roles

| Host | Not interactive | Interactive |
| --- | --- | --- |
| `table` | its native table role | `grid` |
| `ims-grid-v2` | `table`; rows `row`; cells `cell`; header cells `columnheader` | `grid`; cells `gridcell` |
| `ims-grid-v2` without `ims-table` | none | — |

`ImsGridV2` reads an `ims-table` on its own host and passes the semantics down
through `IMS_GRID_CONTEXT_V2`; each row and cell takes them from its nearest grid.

## Virtual Scrolling

```html
<ims-grid-v2 ims-table interactive>
    <ims-grid-header-v2>…</ims-grid-header-v2>
    <cdk-virtual-scroll-viewport itemSize="32">
        <ims-grid-row-v2
            [ims-table-row]="i"
            *cdkVirtualFor="let policy of policies; let i = index"
        >…</ims-grid-row-v2>
    </cdk-virtual-scroll-viewport>
</ims-grid-v2>
```

Supported inside an `ims-grid-v2`. The active row is tracked by item index, since
CDK recycles row elements. Moving past the rendered window scrolls the viewport
by the least amount that brings the row into view, calls
`checkViewportSize()` so the new window is computed now rather than on the next
scroll event, and focuses the row on the first render that shows it.

Bind the item index to the attribute, as above. It is how the table knows which
item a recycled element is showing at every moment, including the one between
CDK moving its range and the rows re-rendering. Without it the table counts
from the start of the rendered range and warns once in development.

Every item in the viewport must be exactly one `ims-table-row`, which a
fixed-size viewport needs anyway. The host gets `aria-rowcount` and each
rendered row, header and footer `aria-rowindex`, so assistive technology knows
where a row sits in the whole list. `itemSize` should match `--ims-table-row-height` (32px by
default).

## Colors

All colors are custom properties. Each one inherits, so it can be set on the
table, on a row, or above the table, and the defaults sit at zero specificity
so any rule on the table wins.

| Variable | Default | Paints |
| --- | --- | --- |
| `--ims-table-row-fill` | `--ims-color-surface-panel` | Row background |
| `--ims-table-row-color` | `--ims-color-on-surface` | Row text |
| `--ims-table-row-accent` | `--ims-color-interactive` | Selection bar, selected and active tints, focus ring |
| `--ims-table-hover-layer` | neutral-600 at 7% | Hover layer |
| `--ims-table-stripe-layer` | neutral-600 at 4% | Stripe layer of a `zebra` table |
| `--ims-table-header-fill` | `--ims-color-surface-subtle` | Header band |
| `--ims-table-header-color` | `--ims-color-on-surface` | Header text |
| `--ims-table-border` | `--ims-color-border-subtle` | Frame |
| `--ims-table-separator` | `--ims-color-border-subtle` | Line under each row and the header |
| `--ims-table-cell-fill` | transparent | One cell's own fill. Not inherited. |

Hover, selected and active are translucent layers painted over the row's fill,
not replacements for it. One variable recolors a row, and the states still show
on it:

```html
<tr ims-table-row [style.--ims-table-row-fill]="policy.overdue ? '#FFE0B2' : null">
```

```scss
.overdue-row {
    --ims-table-row-fill: var(--ims-color-warning-100);
    // Optional: select it in its own hue rather than blue over orange.
    --ims-table-row-accent: var(--ims-color-warning-600);
}
```

Presets repoint the fill and the accent from the status tokens:
`ims-table-new__row--success`, `--warning`, `--danger`. There is no `info`: its
fill is the blue a selected row is tinted with.

A cell fill is painted above its row, so a highlighted cell does not show the
row's hover or selected tint. The selection bar still does.

## Row States

| State | Hook | Look |
| --- | --- | --- |
| Hover | `:hover` | `--ims-table-hover-layer`, on every row as a reading aid |
| Selected | `aria-selected="true"` | Accent at 10%, plus a 3px bar on the start edge |
| Active | `.ims-table-new__row--active` | Accent at 20%, no bar. Emphasis the call site asks for, with no ARIA meaning. |
| Focused | `:focus-visible` | 2px accent ring drawn inside the row |

Selected and active together take the stronger tint and the bar.
`aria-selected` belongs on rows of an interactive table, whose role is `grid`.

## Layout

| Variable | Default | Purpose |
| --- | --- | --- |
| `--ims-table-row-height` | `--field-height` + 6px (32px) | Minimum row height. Room for an input and its focus halo. |
| `--ims-table-cell-padding-block` | `0.1875rem` | Keeps a control's focus halo inside the cell's clip. |
| `--ims-table-cell-padding-inline` | `0.625rem` | |
| `--ims-table-radius` | `0.5rem` | Frame radius. |
| `--ims-table-sticky-offset` | `0px` | How far below the scrollport's top the header pins. |
| `--ims-table-sticky-offset-end` | `0px` | How far above the scrollport's bottom the footer pins. |

In an `ims-grid-v2`, cells pad themselves and the column gutter is `0`. An
explicit `columnGap` on the grid is still written inline and adds to the
padding. When none of its columns can grow — all fixed widths, or
`minmax(…, max-content)` — the end rail takes the leftover width, so rows, the
header band and the separators still reach the frame. `.ims-table-new__cell--numeric` lines digits up with `tabular-nums`
on the end edge, in a header cell too, sort header included.

The header and footer are sticky. The table clips with `overflow: clip`, not
`hidden`, so they pin to whatever scrolls around the table — the page
included, where a footer sits at the window's bottom edge while the table's
top is in view.
