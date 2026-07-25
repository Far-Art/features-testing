# IMS Transfer Dialog Implementation Guide

This document describes the current `ims-transfer-dialog` implementation for
future maintenance and AI-assisted changes. Treat the behavior documented here
as part of the component contract unless a requested change explicitly
replaces it.

## What it is

A CDK-only (`@angular/cdk/dialog` + `@angular/cdk/drag-drop`, no Angular
Material) dual-list dialog for non-destructively moving opaque
`{id, label, value}` rows between two named columns. It has **no notion of
selection, value equality, or ownership** — it only ever moves rows between
its `start`/`end` arrays and hands back both arrays' final contents when
confirmed.

This is what lets the same component serve two different-looking use cases
identically well:
- **Editing one control's selection** (`ims-select`, `ims-autocomplete`): the
  caller maps its own "unchecked"/"checked" state onto `start`/`end` and only
  reads `result.end` back.
- **Transferring items between two independent sources** that share no
  selection concept at all (see the "playlists" demo in
  `src/app/pages/selection-demo`): the caller seeds `start`/`end` from two
  unrelated signals and writes **both** `result.start` and `result.end` back.

The dialog never needs to know which scenario it's in.

## File Map

- `ims-transfer-dialog.types.ts`: `ImsTransferRow`, `ImsTransferColumn`,
  `ImsTransferDialogData`, `ImsTransferDialogResult`.
- `ims-transfer-dialog.ts`: the dialog component (signals, filter, move/drop
  logic, reset, confirm/cancel).
- `ims-transfer-dialog.html`: two `cdkDropList` columns, filter input, footer.
- `ims-transfer-dialog.service.ts`: `ImsTransferDialogService` — the facade
  callers actually inject (`open(data)`), wraps `Dialog.open()` with default
  sizing and `direction` sourced from `Directionality`.
- `index.ts`: public exports (component, service, all types).
- `src/styles/ims-transfer-dialog.scss`: global styles (see "Styling" below).
- Consumers: `src/app/components/ims-select/ims-select.ts`,
  `src/app/components/ims-autocomplete/ims-autocomplete.ts`,
  `src/app/pages/selection-demo` (all three demonstrate different call
  patterns).

## Basic Usage

```ts
private readonly transferDialog = inject(ImsTransferDialogService);

openDialog(): void {
    const dialogRef = this.transferDialog.open<MyItem>({
        start: {title: 'Available', rows: availableRows},
        end: {title: 'Assigned', rows: assignedRows},
        dialogTitle: 'Edit assignment' // optional
    });

    dialogRef.closed.subscribe((result) => {
        if (result === undefined) return; // cancelled/dismissed — nothing changed
        // result.start / result.end are readonly MyItem[] — the final contents
        // of each column. Apply whichever side(s) you care about.
    });
}
```

Each `ImsTransferRow<T> = {id, label, value, disabled?}` needs a stable `id`
unique within the dialog's lifetime (not necessarily across renders — a fresh
snapshot is fine, see `ims-autocomplete`'s index-based ids below).

## Contract Details

- **Non-destructive**: nothing is read by the caller until `dialogRef.closed`
  emits a defined result. Cancel, backdrop click, and Escape all close with
  `undefined`.
- **No reordering within a column** (`cdkDropListSortingDisabled` on both
  `cdkDropList`s): a drop only ever means "move to the other column" —
  `drop()` no-ops on a same-container event. This is intentional (an explicit
  requirement), not a default CDK behavior. Because sorting is disabled, a
  drop is functionally identical to clicking the row's checkbox — both just
  call `moveToStart`/`moveToEnd`. **If you ever need to support in-column
  reordering, you cannot naively splice the full array by
  `previousIndex`/`currentIndex`** — those indices are positions in the
  *filtered* view being rendered (`filteredStartRows`/`filteredEndRows`), not
  the underlying full array, so a plain splice would scramble hidden rows. An
  anchor-row approach (find the row that should end up immediately after the
  moved row in the filtered destination view, then locate that row's position
  in the full array) was used for this in an earlier version of this dialog;
  see git history if reviving it.
- **`moveToStart`/`moveToEnd` are idempotent**: they check whether the row is
  already in the destination array before appending, so a double-click or a
  drag-then-checkbox-click in quick succession can't create a duplicate.
- **Bulk-move buttons operate on the filtered, non-disabled visible set only**
  (`moveAllVisibleToEnd`/`moveAllVisibleToStart`) — a filtered-out or disabled
  row is never touched by the bulk action.
- **Disabled rows** (`row.disabled === true`) render dim, are excluded from
  `cdkDrag`, checkbox interaction, double-click, and bulk-move. The dialog
  itself never disables a row on your behalf — set `disabled` on the row when
  you build it if you want this.
- **Reset** restores both columns (and clears the filter) to the exact state
  the dialog was opened with, without closing.
- **Fixed-height columns** (`.ims-transfer-dialog__list { height: 18rem; }` —
  not `min-height`/`max-height`) so the dialog never resizes/layout-shifts as
  filtering or drag-drop changes how many rows are in each column. Keep this
  fixed if you touch that rule.
- **Bulk-move icon is a single directional arrow**, not "check all"/"uncheck
  all" text — the columns are arbitrary named buckets, not checked/unchecked,
  so checkbox-specific language doesn't fit. The icon points toward the
  *destination* column: `--forward` (start's button, points at `end`) and
  `--backward` (end's button, points at `start`) are separate modifier
  classes. Direction here means reading order, not a fixed physical side, so
  `--forward` is mirrored under `:dir(rtl)` in the stylesheet (it points right
  in LTR, left in RTL) and `--backward` is the opposite — **do not hardcode
  "forward = right"**, always go through the `:dir()` rules. The `aria-label`
  (built from the *other* column's title) is direction-agnostic text, unaffected
  by any of this.
- **The whole row is the drag origin**, not just the grip icon — there is no
  `cdkDragHandle` in the template. The grip icon (`.ims-transfer-dialog__handle`)
  is purely decorative; the `cursor: grab`/`grabbing` affordance lives on
  `.ims-transfer-dialog__row` itself. A plain click (no pointer movement) on
  the checkbox or label still works as a normal click — CDK only starts a drag
  once the pointer moves past a small threshold, so there's no conflict with
  clicking controls inside the row.
- **`cdkDropListConnectedTo` ids are unique per dialog instance** via a
  module-level `nextDialogInstanceId` counter — preserve this if multiple
  transfer dialogs could ever be open/nested at once.

## Practical limits

Designed for up to a **few hundred rows per column**. CDK drag-drop combined
with virtual scrolling is fragile/semi-experimental (unlike, say,
`ims-autocomplete`'s 100k-row virtual-scrolled list, which has no drag-drop
involved at all) — if a caller has a much larger candidate set, pre-filter it
down before building rows and opening the dialog, rather than expecting the
dialog to handle it.

## Styling

Global stylesheet (`src/styles/ims-transfer-dialog.scss`, registered via
`@use` in `src/styles.scss`) because CDK dialog panels render outside the
component's view encapsulation into the global overlay container — a
component `styleUrl` would never apply. Defines its own `--ims-p`/`--ims-s`
fallbacks, independent of `ims-select.scss`/`ims-autocomplete.scss`.

## Not built — future extension ideas

These were considered and deliberately left out of this version. Revisit if a
real need comes up:

- **Shift/ctrl-click multi-select-then-move** within a column (range/selection
  state, keyboard modifiers) — real added complexity with no current driver.
- **Custom row content** via a caller-supplied `TemplateRef` instead of plain
  label text (richer rows — avatars, secondary text) — needs generic
  template-context typing.
- **Min/max selected-count validation** blocking confirm or blocking moves —
  speculative constraint API with no current caller need.
- **`aria-live` move announcements** for screen readers beyond what native
  checkbox/focus already gives for free — low risk, real accessibility value,
  a reasonable first "polish" follow-up.
