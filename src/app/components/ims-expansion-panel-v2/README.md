# IMS Expansion Panel Implementation Guide

`ims-expansion-panel-v2` is a header that stays and a body that opens and closes
under it. It extends `CdkAccordionItem`; `ims-accordion-v2` extends
`CdkAccordion`. Only the toggle button at the header's start opens and closes
a panel — the header row itself is not clickable, so it can hold controls of
its own.

The same panel also serves as an expandable row: in an `ims-grid-v2` an
`ims-grid-row-v2` takes the header's place, and on a native table the panel is a
`tbody`.

It runs on Angular 18.2 / CDK 18.2 as well as on this repository's version; see
[Angular 18.2](#angular-182).

Treat the behavior documented here as part of the component contract unless a
requested change explicitly replaces it.

## The `-v2` Names

Every name here carries a `-v2` (or `V2`) postfix while it lives beside the
application's older `ims-expansion-panel`, `imsExpandCollapseButton` and
`ims-grid`, so the two never share a selector, a class, a CSS variable, a
TypeScript name or a file path, and the old ones keep working untouched while
they are replaced one by one. The toggle's button is postfixed because the old
panels may use the old button, and the grid because the panel sits in its rows.
`ims-table` and `ims-form-layout` are not renamed, but they recognise only
`ims-grid-v2`.

| Old name | Here |
| --- | --- |
| `ims-expansion-panel`, `tbody[ims-expansion-panel]` | `ims-expansion-panel-v2`, `tbody[ims-expansion-panel-v2]` |
| `ims-expansion-panel-header`, `-body`, `-toggle` | `ims-expansion-panel-header-v2`, `-body-v2`, `-toggle-v2` |
| `ng-template[imsExpansionPanelContent]` | `ng-template[imsExpansionPanelContentV2]` |
| `ims-accordion`, `[imsAccordion]` | `ims-accordion-v2`, `[imsAccordionV2]` |
| `button[imsExpandCollapseButton]` | `button[imsExpandCollapseButtonV2]` |
| `ims-grid`, `ims-grid-header`, `-row`, `-footer`, `-cell`, `ims-grid-sort-header` | `ims-grid-v2`, `ims-grid-header-v2`, `-row-v2`, `-footer-v2`, `-cell-v2`, `ims-grid-sort-header-v2` |
| `[imsGridSort]`, `imsGridSortAccessor`, `imsGridSortCompare`, `(imsGridSortedDataChange)`, `[imsGridClip]` | `[imsGridSortV2]`, `imsGridSortAccessorV2`, `imsGridSortCompareV2`, `(imsGridSortedDataChangeV2)`, `[imsGridClipV2]` |
| `exportAs` `imsExpansionPanel`, `imsAccordion`, `imsGridSort` | `imsExpansionPanelV2`, `imsAccordionV2`, `imsGridSortV2` |
| `.ims-expansion-panel…`, `.ims-accordion`, `.ims-expand-collapse-button…`, `.ims-grid-cell-row-span`, `.ims-grid-clip`, `.ims-grid-sort-header-trigger` | the same with `-v2` after the block: `.ims-expansion-panel-v2--expanded`, `.ims-expansion-panel-header-v2__content`, `.ims-grid-cell-v2-row-span`, `.ims-grid-sort-header-v2-trigger` |
| `--ims-expansion-panel-…`, `--ims-expand-collapse-button-…`, `--ims-grid-…` | `--ims-expansion-panel-v2-…`, `--ims-expand-collapse-button-v2-…`, `--ims-grid-v2-…` |
| `ImsExpansionPanel`, `ImsAccordionDirective`, `ImsExpandCollapseButtonDirective`, `ImsGrid`, `ImsGridRow`, `ImsGridSortDirective`, … | the same with `V2`: `ImsExpansionPanelV2`, `ImsGridRowV2`, `ImsGridSortDirectiveV2`, … |
| `IMS_EXPANSION_PANEL`, `IMS_GRID_CONTEXT`, `IMS_GRID_ROW_CONTEXT` | the same with `_V2` |
| `ims-expansion-panel/`, `ims-expand-collapse-button/`, `ims-grid/`, `ims-expansion-panel.scss`, `ims-grid.scss`, `ims-grid-adapters.scss`, … | the same with `-v2` |

### Renaming back

Once the last old panel and grid are replaced, delete the old components and
their stylesheets, which hold the names, then move the files back and strip
the postfix. From the folder that holds the components:

```bash
for d in ims-expansion-panel-v2 ims-grid-v2; do (cd "$d" && for f in *-v2*; do git mv "$f" "${f/-v2/}"; done); done
git mv ims-expansion-panel-v2 ims-expansion-panel
git mv ims-grid-v2 ims-grid
git mv ims-expand-collapse-button-v2/ims-expand-collapse-button-v2.directive.ts ims-expand-collapse-button-v2/ims-expand-collapse-button.directive.ts
git mv ims-expand-collapse-button-v2 ims-expand-collapse-button
```

From the folder with the stylesheets:

```bash
for f in ims-expansion-panel-v2 ims-expand-collapse-button-v2 ims-grid-v2 ims-grid-adapters-v2; do git mv "$f.scss" "${f%-v2}.scss"; done
```

Then, from the project root, over the sources, `styles.scss` and the ESLint
config:

```bash
find src eslint.config.js -type f \( -name '*.ts' -o -name '*.html' -o -name '*.scss' -o -name '*.md' -o -name '*.js' \) -print0 | xargs -0 perl -pi -e 's/\b(ims-expansion-panel(?:-header|-body|-toggle|-content)?|ims-accordion|ims-expand-collapse-button|ims-grid(?:-sort-header|-sort|-header|-footer|-row|-cell|-clip|-adapters)?)-v2(?![A-Za-z0-9])/$1/g; s/\b(IMS-GRID(?:-SORT-HEADER|-SORT|-HEADER|-FOOTER|-ROW|-CELL|-CLIP)?)-V2\b/$1/g; s/\b([Ii]ms(?:ExpansionPanel|Accordion|ExpandCollapseButton|Grid)\w*?)V2\b/$1/g; s/\b(IMS_EXPANSION_PANEL|IMS_GRID_\w+?)_V2\b/$1/g'
```

The second substitution covers the tag names compared in code
(`tagName === 'IMS-GRID-V2'`). Tried on these files: the panel, the grid,
`ims-table` and `ims-form-layout` all come back identical to their versions
from before the postfix.

## File Map

| File | Purpose |
| --- | --- |
| `ims-expansion-panel-v2.ts` | `ImsExpansionPanelV2`, on `ims-expansion-panel-v2` and `tbody[ims-expansion-panel-v2]`. The state, the region, the grid and table modes. |
| `ims-expansion-panel-header-v2.ts` | `ImsExpansionPanelHeaderV2`: the top row, with a toggle at its start. |
| `ims-expansion-panel-body-v2.ts` | `ImsExpansionPanelBodyV2`: the content box that opens and closes. |
| `ims-expansion-panel-content-v2.directive.ts` | `ImsExpansionPanelContentV2`, on `ng-template[imsExpansionPanelContentV2]`: body content rendered the first time the panel opens. |
| `ims-expansion-panel-toggle-v2.ts` | `ImsExpansionPanelToggleV2`: the button, an `imsExpandCollapseButtonV2` (see `../ims-expand-collapse-button-v2/README.md`). Rendered by the header; placed by hand in a table row. |
| `ims-accordion-v2.directive.ts` | `ImsAccordionDirectiveV2`, on `ims-accordion-v2` and `[imsAccordionV2]`. |
| `ims-expansion-panel-v2.tokens.ts` | `IMS_EXPANSION_PANEL_V2` and `ImsExpansionPanelContextV2`, which connect the header, body and toggle to their panel. |
| `index.ts` | Public API barrel. |
| `src/styles/ims-expansion-panel-v2.scss` | All presentation. Global, loaded from `src/styles.scss`. |
| `src/app/pages/expansion-panel-demo/` | Live examples, routed at `/expansion-panel`. |
| `src/app/shared/ims-virtual-scroll-autosize.directive.ts` | `imsVirtualScrollAutosize`, the virtual scroll strategy for rows that change height. |
| `src/app/components/ims-grid-v2/ims-grid-row-v2.ts` | Re-indexes a row's cells after a render, which cells projected through a panel's header need, and writes their indexes without `allowSignalWrites`. |

## Basic Usage

```html
<ims-expansion-panel-v2>
    <ims-expansion-panel-header-v2>
        <h3>פרטי פוליסה</h3>
        <ims-checkbox [formControl]="includeCancelled">כלול חיובים שבוטלו</ims-checkbox>
    </ims-expansion-panel-header-v2>
    <ims-expansion-panel-body-v2>
        <p>מספר פוליסה 41-220-8873.</p>
    </ims-expansion-panel-body-v2>
</ims-expansion-panel-v2>
```

Clicking the checkbox does not fold the panel; only the toggle at the header's
start does — the right edge in this RTL application.

State, from `CdkAccordionItem`:

```html
<ims-expansion-panel-v2 [(expanded)]="open" [disabled]="locked()" (opened)="load()">…</ims-expansion-panel-v2>
```

```html
<ims-expansion-panel-v2 #notes="imsExpansionPanelV2">
    <ims-expansion-panel-header-v2 hideToggle>
        הערות
        <button type="button" ims-button (click)="notes.toggle()">
            {{ notes.isExpanded() ? 'הסתר' : 'הצג' }}
        </button>
    </ims-expansion-panel-header-v2>
    <ims-expansion-panel-body-v2>…</ims-expansion-panel-body-v2>
</ims-expansion-panel-v2>
```

## Accordion

```html
<ims-accordion-v2 #accordion="imsAccordionV2" [multi]="multi()">
    <ims-expansion-panel-v2>…</ims-expansion-panel-v2>
    <ims-expansion-panel-v2>…</ims-expansion-panel-v2>
</ims-accordion-v2>

<button type="button" ims-button (click)="accordion.closeAll()">סגור הכל</button>
```

Opening a panel closes the others unless `multi` is set. `openAll()` acts only
with `multi`; both skip disabled panels. A panel nested in another panel's body
belongs to no accordion.

The element form stacks its panels the way `mat-accordion` does:

- Closed panels sit tight, with no gap and one border between neighbours
  rather than two. Only the stack's outer corners are rounded.
- An open panel parts from the panels on both sides of it:
  `--ims-expansion-panel-v2-spacing` (1rem) above it and below it, with all four
  of its corners rounded. A closed panel's corners never change: the panels
  beside an open one stay square, apart from the stack's outer corners.
- Every framed panel casts a low shadow, as `mat-expansion-panel` does. In the
  stack each panel covers the part of the shadow above it that falls on it, so
  closed panels read as one raised block, and an open panel, parted from them,
  shows its own shadow all round.
- The space is the neighbours' margin, not the open panel's own: the panel
  above holds the space under itself, the panel below holds the space above
  itself. Where there is no neighbour there is no space, so the first panel
  opens without moving down, and nothing is left under the last. Two open
  panels side by side are one spacing apart.
- A panel with a panel above it moves down by the spacing as it opens, as in
  `mat-accordion`, and its toggle moves with it, away from the pointer.
- The margins and the open panel's radius are transitioned with the body, so
  the stack parts as a panel opens and closes up as it closes. No border
  appears or jumps: the two that overlapped while the panels touched move
  apart.
- With `multi` off, opening a panel still closes the one that was open. When
  that one is above, the panel just opened moves up by its height, as in any
  accordion.

This applies to panels that are direct children of `<ims-accordion-v2>`. The
attribute form adds the behavior and nothing else, for a host that has its own
layout: an `ims-grid-v2` or a `table` whose rows are panels.

## Expandable Rows in `ims-grid-v2`

Write an `ims-grid-row-v2` directly in the panel, in place of the header, and put
an `ims-expansion-panel-toggle-v2` in one of its cells:

```html
<ims-grid-v2 ims-table interactive imsAccordionV2>
    <ims-grid-header-v2>
        <ims-grid-cell-v2 width="3rem"><span class="visually-hidden">פרטים</span></ims-grid-cell-v2>
        <ims-grid-cell-v2 width="9rem">מספר תביעה</ims-grid-cell-v2>
        <ims-grid-cell-v2>שם לקוח</ims-grid-cell-v2>
    </ims-grid-header-v2>

    @for (claim of claims; track claim.id) {
        <ims-expansion-panel-v2 #panel="imsExpansionPanelV2">
            <ims-grid-row-v2 ims-table-row (rowDblclick)="panel.toggle()">
                <ims-grid-cell-v2><ims-expansion-panel-toggle-v2/></ims-grid-cell-v2>
                <ims-grid-cell-v2>{{ claim.number }}</ims-grid-cell-v2>
                <ims-grid-cell-v2>{{ claim.customerName }}</ims-grid-cell-v2>
            </ims-grid-row-v2>
            <ims-expansion-panel-body-v2>{{ claim.description }}</ims-expansion-panel-body-v2>
        </ims-expansion-panel-v2>
    }
</ims-grid-v2>
```

- The panel becomes a group of rows. `ims-grid-v2`'s own rule makes any element
  holding a row a subgrid, so the row lines up with the grid's header. The
  panel drops its frame, radius, shadow and background.
- Every `ims-grid-row-v2` written directly in the panel is projected into the
  header slot and stays visible. The body is laid across the whole grid under
  it, with `contain: inline-size` so a long line in it cannot widen the columns.
- The body is free layout. A list that should line up in columns goes in the
  body as an independent nested `ims-grid-v2`; extra `ims-grid-row-v2`s directly in
  the body are not supported.
- In an `ims-table`, a group is drawn like a row: one line between it and the
  row or group beside it, and the frame's edges left to the frame. A group
  draws the line on both its edges and overlaps whatever is above it by that
  line, so groups that touch share one line, and a group parted from its
  neighbours keeps a line on its side of each gap. The row's own separator
  gives way to the panel's divider, which shows only while the body is open.
  Zebra counts groups, not the rows inside them.
- An open group parts from the groups on both sides of it, as an open panel
  does in an accordion: `--ims-expansion-panel-v2-spacing` (1rem) above it and
  below it, held by the neighbours' margins and transitioned with the body. The
  group right under the header opens without moving down, and nothing is left
  over the footer or the frame's bottom edge. Only groups part: an
  `ims-grid-row-v2` outside a panel stays against the group beside it. This
  applies with or without `imsAccordionV2`.
- No line appears or vanishes as a group opens or closes. The two lines that
  overlapped while the groups touched move apart with the margins.
- The push is in the block direction only. An inline margin on a subgrid shifts
  the items at its edges, which would push the row's fill past its first and
  last cells.
- With `interactive`, the toggle is one of the row's controls: Tab from the
  focused row reaches it. Bind `(rowDblclick)="panel.toggle()"` to let Enter
  open the row too.
- A row with nothing to show takes `[hideToggle]` and `[disabled]` together:
  the first hides its toggle, which keeps its space, so the row is as tall as
  the others; the second stops Enter and `openAll()` opening
  it.
- Not supported inside a `cdk-virtual-scroll-viewport`: a group's height varies,
  and a fixed-size viewport needs every item one row tall.

Roles follow the grid. In an `ims-table`, the body region is a `row` and its
content a `cell` (`gridcell` when interactive), since a table holds rows rather
than regions. In a bare layout grid they have no role.

## Rows That Hold a Panel, With Nested Rows

The other way round from the expandable rows above: write the panel *inside*
an `ims-grid-row-v2`. The panel keeps its look — frame, header band, divider,
body — while its header holds the row's cells and its body holds nested rows,
every cell on the grid's columns, under the grid's header. The rows can scroll
in a virtual viewport, and opening one makes that row taller:

```html
<ims-grid-v2 ims-table>
    <ims-grid-header-v2>
        <ims-grid-cell-v2 width="3rem"><span class="visually-hidden">פרטים</span></ims-grid-cell-v2>
        <ims-grid-cell-v2 width="9rem">מספר</ims-grid-cell-v2>
        <ims-grid-cell-v2 minWidth="12rem" maxWidth="1fr">לקוח / תיאור</ims-grid-cell-v2>
        <ims-grid-cell-v2 width="9rem">סכום</ims-grid-cell-v2>
    </ims-grid-header-v2>

    <ims-accordion-v2>
        <cdk-virtual-scroll-viewport imsVirtualScrollAutosize="33" class="policies-viewport">
            <ims-grid-row-v2 *cdkVirtualFor="let policy of policies; trackBy: trackPolicy; templateCacheSize: 0">
                <ims-expansion-panel-v2
                    [expanded]="openId() === policy.id"
                    (expandedChange)="onExpandedChange(policy.id, $event)"
                >
                    <ims-expansion-panel-header-v2>
                        <ims-grid-cell-v2><ims-expansion-panel-toggle-v2/></ims-grid-cell-v2>
                        <ims-grid-cell-v2>{{ policy.number }}</ims-grid-cell-v2>
                        <ims-grid-cell-v2>{{ policy.customerName }}</ims-grid-cell-v2>
                        <ims-grid-cell-v2>{{ policy.premium }}</ims-grid-cell-v2>
                    </ims-expansion-panel-header-v2>
                    <ims-expansion-panel-body-v2>
                        <ng-template imsExpansionPanelContentV2>
                            @for (claim of policy.claims; track claim.id) {
                                <ims-grid-row-v2>
                                    <ims-grid-cell-v2></ims-grid-cell-v2>
                                    <ims-grid-cell-v2>{{ claim.number }}</ims-grid-cell-v2>
                                    <ims-grid-cell-v2>{{ claim.description }}</ims-grid-cell-v2>
                                    <ims-grid-cell-v2>{{ claim.amount }}</ims-grid-cell-v2>
                                </ims-grid-row-v2>
                            }
                        </ng-template>
                    </ims-expansion-panel-body-v2>
                </ims-expansion-panel-v2>
            </ims-grid-row-v2>
        </cdk-virtual-scroll-viewport>
    </ims-accordion-v2>
</ims-grid-v2>
```

The panel knows it holds a row's content when an `ims-grid-row-v2` is above it
in the template with no `ims-grid-cell-v2` in between, and takes the class
`.ims-expansion-panel-v2--in-grid-row`. A panel written inside a cell is that
cell's content and keeps its ordinary layout.

- **Columns.** `ims-grid-v2` makes every element between a row and its cells a
  subgrid — the panel, its header, the region, the body and each nested row —
  so the cells land on the grid's columns with no help. The panel takes out
  what would push an edge cell off its column: the header's and body's inline
  padding, and the header's gap, since a subgrid's own gap replaces its
  parent's.
- **Toggle.** It goes in a cell, as in an expandable row; the header renders
  none of its own here. Give the toggle column a header cell, as above.
- **Look in an `ims-table`.** The panels look as they do outside a grid —
  frame, corners, shadow, stacked like an accordion's, an open one parted
  from its neighbours — inside the table's own frame. Give the grid
  `offsetStart` and `offsetEnd` (0.5rem in the demo): each panel moves its
  frame into those rails, so it stands inside the table's frame instead of
  doubling it, and its content still starts where the data columns do; the
  header's cells move in by the rail too, so the columns line up. Without
  rails the panels' frames meet the table's. On the row holding a panel the
  table's row fill, separator and height step aside; the nested rows are table
  rows, with fill, separators and hover.
- **Look in a bare `ims-grid-v2`.** The panels keep their frame and stack like an
  accordion's: one border between neighbours, the stack's outer corners
  rounded, an open panel parting from the rows on both sides of it. A bare
  grid's cells have no padding, so inset the content with the grid's
  `offsetStart` and `offsetEnd` (and `columnGap`), which move the header's
  cells by the same amount.
- **`ims-accordion-v2` in a grid** spans it, as a row does. Around a virtual
  viewport it is a block; holding rows directly, the grid's own rule makes it
  a subgrid bridge.

### Virtual scrolling

CDK's `itemSize` strategy assumes every item has that one height, which an
open row breaks. Put `imsVirtualScrollAutosize` on the viewport in its place,
with the closed row height as its value: 33 in an `ims-table`, its 32px row
plus the separator.

- It measures each row once rendered and keeps the measurement. A
  `ResizeObserver` keeps up with a row while it opens or closes; the work runs
  in the next animation frame, not in the observer's callback, which would
  make the browser report a "ResizeObserver loop completed with undelivered
  notifications" error.
- Rows just rendered are measured once the render has settled, in a microtask
  before the browser paints, not in the viewport's own after-render callback.
  That callback runs ahead of the rows' own render hooks, and `ims-grid-row-v2`
  places the cells of a panel's header in one of them: measured there, every
  new row came out 209px tall, its cells still stacked in one column. Scrolling
  up, the strategy then "kept the view in place" by throwing the list about
  1900px down for a frame and back — the blink, at its worst — and scrolling
  down it cut the next range short.
- When a row above the visible ones changes height — the accordion closing
  one up there while you open one on screen, or a row measured for the first
  time as you scroll up — the scroll offset moves with it, so the rows on
  screen, the one just clicked included, stay where they are. The directive
  turns the browser's own scroll anchoring off on that viewport: it makes the
  same correction a step earlier, and the two together scroll twice as far.
- A row changes height with the rows around it only at the bottom of the
  rendered range, in the buffer below the viewport, where nothing on screen
  moves and no scroll correction is needed. Each panel's 1px overlap with the
  next is at its bottom edge, so only the last rendered panel differs; the
  space above an open row is a margin on the row before it, and the space
  below is on the open row's own row. The overlap is not animated, only the
  space. Scrolling down and up through the 400 rows, the strategy made no
  corrections, where with the overlap at the top it made one at every update
  scrolling up.
- `minBufferPx` and `maxBufferPx` work as on CDK's directive, with larger
  defaults: 300 and 600 rather than 100 and 200. A trackpad swipe on a Mac
  scrolls on the compositor, which does not wait for the page, at up to about
  8000px/s — more than 100px a frame. With CDK's defaults the rows added after
  that arrived a frame or two late, and until they did the viewport showed an
  empty edge: the list blinked as it scrolled. Measured in Chrome on a Mac at
  Retina scale, a swipe at that speed painted an empty edge in 20 of 106
  frames before, and in none after; faster still, only the end-of-list bounce
  shows one.
- **Render the nested rows lazily.** Put them in
  `<ng-template imsExpansionPanelContentV2>`, as in the template above. A closed
  panel's body is clipped to nothing but otherwise built in full, and nested
  rows were most of what each row cost to create as it scrolled in. Lazily,
  a closed row is built without them. With that and `ims-grid-row-v2` no longer
  logging a warning per row, an update of the range went from 10.3ms to 4.5ms
  of script at the same buffer.

**Keep the open state in your data.** The viewport destroys a row's panel when
it scrolls out of the buffer, so bind `[expanded]` and `(expandedChange)` to a
field, and add `templateCacheSize: 0` to `*cdkVirtualFor`, so a recycled row
never shows another item's state, or animates into it, as it scrolls in.

**Known limits.**

- Inside a virtual viewport the rows sit on a grid of the viewport's own that
  repeats the grid's template (`ims-grid-adapters-v2.scss`). Columns line up when
  their widths do not depend on content — fixed widths, or `minmax(…, 1fr)`.
  An `auto` column is sized separately inside and outside the viewport.
- With classic, non-overlay scrollbars, the viewport's scrollbar makes its rows
  narrower than the header by its width. A `1fr` column absorbs the
  difference, so the columns past it sit that much off the header's.
- In a virtual viewport the stack's rounded corners go on the first and last
  rows *rendered*. Those sit in the buffer, out of sight, unless the list is
  scrolled to an end.
- In an `ims-table`, the row holding a panel is a `row` and its nested rows are
  `row`s inside it, as nested rows elsewhere in `ims-grid-v2` are. The body takes
  no role.

## Expandable Rows in a Native Table

Put the panel on a `tbody`, one per group. The first `tr` is the header; every
later `tr` is the body:

```html
<table ims-table>
    <thead>…</thead>
    @for (claim of claims; track claim.id) {
        <tbody ims-expansion-panel-v2>
            <tr>
                <td><ims-expansion-panel-toggle-v2/></td>
                <td>{{ claim.number }}</td>
                <td>{{ claim.customerName }}</td>
            </tr>
            <tr>
                <td colspan="3"><ims-expansion-panel-body-v2>{{ claim.description }}</ims-expansion-panel-body-v2></td>
            </tr>
        </tbody>
    }
</table>
```

- A table row cannot animate its height, so the body rows show and hide at once
  (`display: none` while closed). A table also ignores margins on its rows and
  row groups, so an open `tbody` does not push the others away as an open group
  in an `ims-grid-v2` does.
- The panel renders no region of its own here, so the `ims-expansion-panel-body-v2`
  carries the id the toggle's `aria-controls` points to. Use one body per panel.
- In an `ims-table`, body rows take no hover or stripe of their own, a cell
  holding an `ims-expansion-panel-body-v2` loses its padding so the body fills it,
  zebra counts `tbody` groups, and the last closed group leaves its edge to the
  frame.

## Public API

### `ImsExpansionPanelV2`

Selectors `ims-expansion-panel-v2`, `tbody[ims-expansion-panel-v2]`; exported as
`imsExpansionPanelV2`. Inherits from `CdkAccordionItem`:

| Member | Kind | Purpose |
| --- | --- | --- |
| `expanded` | input, two-way with `expandedChange` | Whether the body shows. `booleanAttribute`. |
| `disabled` | input | The toggle is disabled, and `open()`, `close()`, `toggle()` and the accordion's `openAll()`/`closeAll()` skip the panel. Binding `expanded` still works. |
| `opened`, `closed`, `expandedChange`, `destroyed` | outputs | |
| `open()`, `close()`, `toggle()` | methods | |
| `id` | `string` | Unique id. `bodyId` and `headerId` derive from it. |

Added:

| Member | Kind | Purpose |
| --- | --- | --- |
| `hideToggle` | `input<boolean>` | Hides the panel's toggle instead of greying it out: the header's, and an `ims-expansion-panel-toggle-v2` placed in a grid or table cell. The toggle keeps its space, so the header's title stays lined up with the other panels' and a table row keeps its height. The panel still opens from `expanded`, its methods and its accordion; bind `disabled` too for a row with nothing to show. `booleanAttribute`. |
| `variation` | `input<'default' \| 'secondary'>` | `default`: the house-blue header band and a `light` toggle. `secondary`: a white header and a `dark` toggle. Defaults to `'default'`. |
| `severity` | `input<'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'>` | The tone the panel is painted in, in the colours `ims-panel` gives the same word: frame, body, header band and header text. A `light` toggle hovers and presses in it too. A `secondary` panel keeps its white header and takes the rest. Defaults to `'neutral'`, the soft house-blue band. |
| `invalid` | `input<boolean>` | The panel's content needs attention — a field inside it that does not validate, say, unseen while the panel is closed. The header's text and the toggle turn danger red, the toggle over any severity of its own; the panel keeps its `severity`. Say it in the toggle's `expandLabel` too. `booleanAttribute`. See [Invalid content](#invalid-content). |
| `isExpanded` | `Signal<boolean>` | `expanded` as a signal, for OnPush views and template references. |
| `isDisabled` | `Signal<boolean>` | `disabled` as a signal. Updated in `ngDoCheck`; see [Angular 18.2](#angular-182). |
| `bodyId`, `headerId` | `string` | Ids of the region and the header's title area. |
| `isTableBody` | `boolean` | Whether the panel is on a `tbody`. |

### `ImsExpansionPanelHeaderV2`

| Member | Kind | Purpose |
| --- | --- | --- |
| `hideToggle` | `input<boolean>` | Hides this header's toggle, keeping its space. `booleanAttribute`; a bare `hideToggle` attribute works. The panel's own `hideToggle` does the same and also reaches toggles placed in cells. |
| `toggleVariation` | `input<'light' \| 'dark' \| undefined>` | The toggle's variation. Unset, it follows the panel's `variation`. |
| `toggleSeverity` | `input<'info' \| 'success' \| 'warning' \| 'danger' \| undefined>` | The toggle's own severity, its `ims-button-severity`. Unset, a light toggle hovers in the panel's severity. The panel's `invalid` overrides it with `danger`. |
| `expandLabel` | `input<string>` | Toggle's accessible name while closed. Defaults to `'הרחב'`. |
| `collapseLabel` | `input<string>` | Toggle's accessible name while open. Defaults to `'כווץ'`. |

### `ImsExpansionPanelToggleV2`

`expandLabel` and `collapseLabel`, as on the header, and `variation`
(`'light' | 'dark'`), which follows the panel's `variation` when unset: `light`
in a `default` panel, `dark` in a `secondary` one. `severity` (`'info' |
'success' | 'warning' | 'danger'`) is the button's own `ims-button-severity`, as
`toggleSeverity` on the header; the panel's `invalid` overrides it with
`danger`. It toggles the nearest panel, wherever inside it it sits. In a table,
name it after its row:

```html
<ims-expansion-panel-toggle-v2 [expandLabel]="'פרטי תביעה ' + claim.number"/>
```

### `ImsExpansionPanelBodyV2`

No inputs. A padded box that paints its own background.

### `ImsExpansionPanelContentV2`

On `ng-template[imsExpansionPanelContentV2]`, inside the body; no inputs. Its
content is rendered the first time the panel opens rather than with the panel,
as `matExpansionPanelContent`'s is, and then stays: it is there while the panel
folds closed, and opening the panel again does not build it twice. Use it for a
body that is costly to build, and always for nested rows in a virtual viewport.

```html
<ims-expansion-panel-body-v2>
    <ng-template imsExpansionPanelContentV2>…</ng-template>
</ims-expansion-panel-body-v2>
```

It checks the panel's state in `ngDoCheck`, with the view the template is
written in. That view also carries the panel's open class, so it is checked
whenever the panel opens, and the content appears in that same pass.

### `ImsAccordionDirectiveV2`

Selectors `ims-accordion-v2`, `[imsAccordionV2]`; exported as `imsAccordionV2`.
Inherits `multi`, `openAll()` and `closeAll()` from `CdkAccordion`.

## Styling

Three boxes paint the panel, and each paints its own background:

| Element | Paints | Variable | Default |
| --- | --- | --- | --- |
| `ims-expansion-panel-v2` | The frame, and the fill behind the body | `--ims-expansion-panel-v2-background` | The severity's subtle fill, `--ims-color-status-neutral-subtle` for `neutral` (transparent as a grid row group) |
| `ims-expansion-panel-header-v2` | The band | `--ims-expansion-panel-v2-header-background` | The severity's band: `--ims-color-primary-100` for `neutral`, the status accent for the others; `--ims-color-surface-panel` (white) in a `secondary` panel |
| `ims-expansion-panel-body-v2` | The content box | `--ims-expansion-panel-v2-body-background` | transparent |

Every default on these three is wrapped in `:where()`, so it has no specificity.
Selecting a part by its element name is enough, from a global stylesheet or a
component's own, in any load order:

```scss
ims-expansion-panel-header-v2 {
    background: red;
    color: white;
}

ims-expansion-panel-body-v2 {
    background: var(--ims-color-warning-50);
}
```

Or set the variables, on the panel or on any ancestor; each default sits at the
use site as a fallback rather than being declared on the panel:

```scss
.claims-section {
    --ims-expansion-panel-v2-header-background: var(--ims-color-success-200);
}
```

Use `background` rather than `background-color` with the variables: like the
`--ims-background-*` tokens, a value may be a gradient.

### Severity

`severity` paints the panel the way `ims-panel` paints the same word, so the two
agree wherever both appear:

| Severity | Band | Header text | Frame and divider | Fill |
| --- | --- | --- | --- | --- |
| `neutral` (default) | `primary-100` | `on-status-info` | `status-neutral-border` | `status-neutral-subtle` |
| `info` | `status-info-accent` | `on-status-info` | `status-info-border` | `status-info-subtle` |
| `success` | `status-success-accent` | `on-status-success` | `status-success-border` | `status-success-subtle` |
| `warning` | `status-warning-accent` | `warning-900` | `status-warning-border` | `status-warning-subtle` |
| `danger` | `status-danger-accent` | `on-status-danger` | `status-danger-border` | `status-danger-subtle` |

Amber's text is one step darker than its token, as on `ims-panel` and
`.ims-button--warning`: read straight across, it misses AA on the amber band.

A `light` toggle hovers and presses in the panel's severity: its white plate
tints to the hue's 100 step under the pointer and its 150 step while pressed,
and its press ring follows — the steps `.ims-button--secondary` takes from a
button's ramp. `neutral` and `info` keep the house blue, the band's own hue. The
glyph keeps the house navy, and a `dark` toggle its solid house-blue fill.

The severity sets the values the panel falls back to, declared on every panel —
`neutral` included — so a panel nested in another's body never takes its
parent's tone. The variables above still win over it.

### Invalid content

`invalid` marks a panel whose content needs attention, such as a field that does
not validate inside a closed panel. It colours two things and leaves the panel's
severity alone, so the panel still reads as the panel it is:

- The header's text and its headings: `danger-600`, the vivid red, over any
  band. It clears AA for the header's text on the default band (4.5:1) and on a
  white `secondary` header (5.5:1). On a toned band it does not — 3.4:1 on
  `info`'s, 2.9:1 on `success`'s, 2.6:1 on `warning`'s, 2.5:1 on `danger`'s —
  where `danger-800` would still give 5.5:1 or more. Where the header is a row —
  an expandable row in a grid, a `tbody`'s first row — the row's text, through
  `--ims-table-row-color` in an `ims-table`.
- The toggle: `ims-button-severity="danger"`, over any severity it was given.
  A light toggle is a white plate with a red plus that hovers and presses in red;
  a dark one is a solid red fill.

```html
<ims-expansion-panel-v2 [invalid]="form.invalid">
    <ims-expansion-panel-header-v2 [expandLabel]="form.invalid ? 'הרחב, יש שדות שגויים' : 'הרחב'">
        <h3>פרטי מבוטח</h3>
    </ims-expansion-panel-header-v2>
    <ims-expansion-panel-body-v2>…</ims-expansion-panel-body-v2>
</ims-expansion-panel-v2>
```

To colour the toggle alone, give it a severity of its own: `toggleSeverity` on
the header, or `severity` on an `ims-expansion-panel-toggle-v2` placed in a cell.

The rest of the customization API:

| Variable | Default | Purpose |
| --- | --- | --- |
| `--ims-expansion-panel-v2-border` | `--ims-color-status-neutral-border`; `--ims-table-separator` in an `ims-table` | Frame, divider, and a row group's separator. |
| `--ims-expansion-panel-v2-radius` | `0.75rem` | Frame radius. |
| `--ims-expansion-panel-v2-shadow` | a low two-layer shadow tinted with `--ims-color-primary-950`, cast downward only | The frame's shadow. The default reaches the sides and the bottom but not above the top edge, so the top border stays sharp. A panel that is a group of rows in an `ims-grid-v2`, an expandable row, has none. Set `none` to turn it off. |
| `--ims-expansion-panel-v2-padding` | `0.75rem` | The header's inline padding and the body's padding, so their text shares an edge. |
| `--ims-expand-collapse-button-v2-size` | `20px` | Toggle size. The button's own variable, read with a fallback, so it can be set on the panel or any ancestor. |
| `--ims-expand-collapse-button-v2-radius` | `6px` | Toggle corner radius, read the same way. |
| `--ims-expansion-panel-v2-spacing` | `1rem` | The space an open panel opens above and below itself, in an `ims-accordion-v2` and in an `ims-grid-v2`. Held by the neighbouring panels' margins, so the first panel has none above it and the last none below. |

Classes: `.ims-expansion-panel-v2`, `--expanded`, `--disabled`, `--grid-row`, `--secondary`,
`--info`, `--success`, `--warning`, `--danger`, `--invalid`;
`.ims-expansion-panel-v2__region`, `__region-content`; `.ims-expansion-panel-header-v2`,
`__content`, `__toggle`, `__toggle--hidden`; `.ims-expansion-panel-body-v2`;
`.ims-expansion-panel-toggle-v2`, `--hidden`, `__button`, `__button--own-severity`;
`.ims-accordion-v2`.

## Angular 18.2

The same files compile and run on Angular 18.2 / CDK 18.2 (TypeScript 5.5, the
CLI 18 `tsconfig` with `useDefineForClassFields: false`, `strictTemplates`).
Two things in `CdkAccordionItem` differ between CDK 18 and later versions, and
the panel is written so that neither matters:

| CDK 18 | Later | How the panel copes |
| --- | --- | --- |
| Constructor injection: `constructor(accordion, changeDetectorRef, expansionDispatcher)` | `inject()` in field initializers, no constructor parameters | The panel declares no constructor. Angular builds it with the inherited factory, which passes CDK 18 its three arguments, and the panel's own `inject()` calls sit in field initializers, which run in the injection context in both. |
| `disabled` is a plain field | `disabled` is an accessor over a signal | Nothing reads `disabled` in a template. `ngDoCheck` copies it into `isDisabled`, which the toggle reads, so a disabled panel greys its button out after the first render too. An override cannot do this: TypeScript accepts an accessor override of an accessor but not of a field. |

`expanded` is an accessor in both, so the override that keeps `isExpanded` in
step works in both.

Everything else used is Angular 17.2 or older: `input()`, `model()` (in
`imsExpandCollapseButtonV2`), `contentChild()`, `@if`, `ng-content` inside `@if`.

The toggle is an `imsExpandCollapseButtonV2`, which extends `ImsButtonBase`, so
porting the panel brings `ims-button` along: `ims-button.ts`,
`ims-button-presets.ts`, `ims-tooltip/ims-tooltip.types.ts`,
`shared/readonly.directive.ts` and `ims-buttons.scss`. All of them compile and
run on 18.2 unchanged.

Rows that hold a panel bring three more: the changed `ims-grid-v2/ims-grid-row-v2.ts`,
`shared/ims-virtual-scroll-autosize.directive.ts` for a virtual viewport, and
`ims-grid-adapters-v2.scss`, which lays a viewport's rows on the grid's template.
The nested-row layout, opening a row and the strategy's scrolling were checked
on 18.2 / CDK 18.2 as well, and so were the lazy nested rows of
`imsExpansionPanelContentV2` and `ims-grid-row-v2` writing its cells' indexes
untracked. Angular 18 refuses a signal write inside an effect unless the
effect has `allowSignalWrites` or the write is `untracked`; the row uses the
second, which later versions accept without the deprecation warning the flag
now logs.

## Accessibility

- The toggle is a native button with `aria-expanded` and `aria-controls`, and
  an accessible name from `expandLabel` / `collapseLabel`.
- A hidden toggle (`hideToggle`) is `visibility: hidden`: it keeps its space,
  but it is out of the tab order and the accessibility tree, and takes no
  clicks.
- The region is `role="region"`, named by the header's title area. Without a
  header it stays unnamed, which keeps it out of the landmark list.
- A closed body is `visibility: hidden`: out of the tab order and the
  accessibility tree. It keeps its layout and is only clipped to nothing, so a
  list or chart in it measures the same open or closed.
- The header carries no `role`, since it may hold controls. Project an `h2` or
  `h3` when it is a heading; the stylesheet zeroes the heading's margins.
- The toggle's focus halo, press ring and disabled look are `ims-button`'s.
- `invalid` and a toggle's severity are colour, which a screen reader does not
  announce. Say the same in the toggle's `expandLabel` (and `collapseLabel`),
  as the demo does, so the closed panel tells everyone that it needs attention.

## Safe Change Guide

- Keep every paint rule on the panel, header and body inside `:where()`, or a
  call site's `ims-expansion-panel-header-v2 { background: … }` silently loses.
- Keep the defaults as `var()` fallbacks at the use site. Declaring them on the
  panel would stop a variable set on an ancestor from reaching it.
- Keep each background on its own part's host element. Painting it on an inner
  wrapper would cover a background a call site sets on the host.
- Keep the panel frame off `tbody` (`:not(tbody)`), or a table panel becomes a
  block and leaves its table.
- Keep a severity's values declared on every panel, `neutral` included, and
  read beneath the public variables. Declared on the toned panels alone, they
  would reach a neutral panel nested in a toned one's body; read above the
  variables, they would override a call site's colour.
- Keep `invalid` to the header's two ink values and the toggle's severity.
  Repointing the band or the frame too would turn the panel into a `danger`
  one and lose the severity it was given; declared before the severity blocks,
  it would lose to them.
- Keep the panel-tone hover off a toggle that has a severity of its own
  (`__button--own-severity`), which `invalid` gives it too. Its whole ramp is
  that severity's; a hover in the panel's hue would contradict the glyph.
- Keep the light toggle's hover, press and ring reading the panel's tone
  values on `.ims-expansion-panel-toggle-v2__button.ims-button--secondary`, two
  classes, so they hold over `.ims-button--secondary` in any load order. The
  button takes them from its nearest panel by inheritance, so a toggle in a
  grid cell or a table cell follows its panel as one in the header does.
- Keep the divider inside the clip (`__region-content::before`), or a closed
  panel shows a line above its bottom edge.
- Keep `visibility` in the region's transition, or closing hides the content
  before it has folded away.
- Keep the region out of the subgrid chain and `contain: inline-size` on it in
  grid mode, or a long body line widens the grid's columns.
- Keep `CDK_ACCORDION` restated as `undefined` in the panel's providers. They
  are not inherited from `CdkAccordionItem`, and without it a nested panel
  would join its parent's accordion.
- Keep writes to `expanded` going through the overridden setter, which is what
  keeps `isExpanded` in step.
- Keep the toggle and the host class reading `isDisabled()`, not `disabled`. On
  CDK 18 `disabled` is a plain field, which an OnPush view does not follow.
- Keep `ImsExpansionPanelV2` without a constructor, or it has to call
  `super(accordion, changeDetectorRef, dispatcher)` on CDK 18 and `super()` on
  later versions, and no single call compiles on both.
- Keep the grid push in block margins. An inline margin on the grid-row panel,
  a subgrid, is added to its edge items and pushes the row's fill past its first
  and last cells.
- In an `ims-table`, keep a panel inside a grid row a panel — frame, radius,
  shadow — and its inline margin read from the grid's rails, less its border.
  A margin wider than the rail would move the panel's frame over the first
  and last columns' cells, which a subgrid's margin does not move.
- In a panel inside a grid row, keep the header's and the body's inline padding
  at 0 and the header content's `column-gap` at 0, and keep the divider at
  `grid-column: 1 / -1`. On a subgrid, inline padding and gaps move the edge
  cells off their columns, and the divider would land in the zero-width rail.
- Keep `overflow-anchor: none` on the `imsVirtualScrollAutosize` viewport, and
  keep its measuring in the frame after the `ResizeObserver` fires rather than
  in the callback. The first doubles every scroll correction when removed; the
  second brings back the "ResizeObserver loop" error.
- Keep the strategy's measuring of newly rendered rows in the microtask after
  the render (`measureAfterRender`), not in `onContentRendered` itself, which
  runs before the rows have finished their own layout. Measured there, rows
  came out at the height of a half-built layout, and every update while
  scrolling up threw the list down and back.
- Keep `ImsGridRowV2`'s re-index after a render. Cells projected through the
  panel's header reach the row in the DOM only once the header renders, and
  without it they all stack in the first column.
- Keep the push in the neighbours' margins — the panel or row before an open
  one and the one after it — rather than in the open panel's own, in the
  accordion and for expandable rows. That is what keeps the first panel from
  moving down and leaves no space under the last.
- For panels inside grid rows, keep the 1px overlap on each panel's bottom
  edge and unanimated, and the space on the rows: above an open panel on the
  row before it, below it on its own row. A height that depends on the rows
  around it then changes only at the bottom of a virtual viewport's rendered
  range, below the viewport. With the overlap at the top the first rendered
  row changed height with every update, and an animated overlap finished after
  a fast scroll had carried the row above the viewport; both made the strategy
  correct the scroll mid-swipe.
- In an `ims-table`, keep the expandable group's line on both its edges, with
  the -1px overlap. With a line on one edge only, a parted group has a line on
  just one side of each gap, and a line switched on as the group opens jumps
  instead of moving with the margin.
- Keep `align-self: stretch` on `__region-content`. Inside a grid row the
  region is a subgrid bridge, whose items `ims-grid-v2` centers; centered, the
  content box keeps its full height while the track animates, and the content
  shows over the header and the rows around the panel.
- Keep a hidden toggle rendered and `visibility: hidden`, not left out with
  `@if` or `display: none`. Its space is what keeps a header's title lined up
  with the other panels' and a table row as tall as the rest.
- Keep the default shadow's `blur + spread - offset` at 0 or below in each
  layer. Any more and it reaches above the top edge, which softens the top
  border, and in a stack it shades the bottom of the panel above.
- Keep the nested rows of a row in a virtual viewport inside
  `imsExpansionPanelContentV2`, and the autosize buffers at 300 / 600 or more.
  Built with every row, the nested rows were most of what each update of the
  range cost; with CDK's 100 / 200 a fast swipe outran the rendered rows, and
  the list blinked with an empty edge.
- Keep `ImsExpansionPanelContentV2`'s check in `ngDoCheck` of the view the
  template is written in. An effect would run on a schedule that differs
  between Angular 18 and later, and could render the content a pass after the
  panel had started to open.
- Keep `ims-grid-row-v2`'s index writes `untracked`, with no `allowSignalWrites`
  on its effect. With the flag, later Angular versions log a warning for every
  row created, which a virtual viewport turned into a console call per row on
  the scroll path.
- Keep the accordion's stacking rules on `ims-accordion-v2 > ims-expansion-panel-v2`.
  The class `.ims-accordion-v2` is on the attribute form too, and there the panels
  are grid rows or `tbody`s.
