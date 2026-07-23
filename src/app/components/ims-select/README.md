# IMS Select Implementation Guide

This document describes the current `ims-select` implementation for future
maintenance and AI-assisted changes. Treat the behavior documented here as part
of the component contract unless a requested change explicitly replaces it.

## File Map

- `ims-select.ts`: component state, forms integration, filtering, view modes,
  keyboard navigation, typeahead, multi-select toolbar, and the edit-dialog
  wiring.
- `ims-select.html`: trigger button, CDK connected overlay, toolbar, filter
  input, and the projected listbox.
- `ims-option.ts`: projected `ims-option` items; reads selection/active/visible
  state from the parent via `IMS_SELECT_PARENT`.
- `ims-select.types.ts`: `ImsSelectOptionLike`, `ImsSelectParent`, and the
  public mode/filter/toolbar/view-mode types.
- `ims-select-edit-dialog.ts` / `.html`: the multi-select "edit selection"
  dialog opened from the toolbar pen icon. Not exported from `index.ts` — it is
  an internal collaborator opened directly via `@angular/cdk/dialog`'s
  `Dialog` service from `ims-select.ts`.
- `index.ts`: public exports (`ims-select.ts`, `ims-option.ts`,
  `ims-select.types.ts`).
- `src/styles/ims-select.scss`: global trigger/overlay/toolbar/option styles.
- `src/styles/ims-select-edit-dialog.scss`: global edit-dialog styles.
- `src/app/pages/selection-demo`: working examples, including
  `toolbar="auto"`.

Both components are standalone, use `ChangeDetectionStrategy.OnPush`, and
depend on Angular CDK overlay, dialog, drag-drop, and bidi.

## Basic Usage

```html
<ims-select
    multiple
    filter="auto"
    toolbar="auto"
    placeholder="Choose folders"
    [formControl]="selected"
    [compareWith]="compareById"
>
    @for (item of items; track item.id) {
        <ims-option [value]="item" [selectionText]="item.label">
            {{ item.label }}
        </ims-option>
    }
</ims-select>
```

`multiple` writes a readonly `T[]`; single-select writes `T | null`. `filter`
and `toolbar` each accept `'on' | 'off' | 'auto'`, where `'auto'` activates
once `options().length >= filterAutoMinOptions()` (default `15`).

## Multi-Select Toolbar

When `multiple()` and `showToolbar()` are true, an `aside` renders next to the
panel with:

- A pen icon button (`ערוך בחירה`) that opens `ImsSelectEditDialog`. Disabled
  when the control is disabled or `editableOptions()` is empty.
- Three view-mode segments (`all` / `selected` / `unselected`) that filter
  `visibleOptions()` without touching the actual selection.

There is intentionally no "select all / clear all" checkbox anymore — that
behavior now lives entirely in the edit dialog.

`editableOptions()` is `textFilteredOptions()` (respects the filter query, not
the view-mode toggle) with disabled options excluded. This is the row source
handed to the dialog, so disabled and filtered-out options are left untouched
regardless of what happens in the dialog.

## Edit Dialog Contract

`openEditDialog()` in `ims-select.ts`:

1. Builds `checked`/`unchecked` `ImsSelectEditRow<T>[]` rows from
   `editableOptions()`.
2. Closes the select's own overlay (`this.close(false)`) before opening the
   dialog, so the popover doesn't linger, covered, behind the modal.
3. Opens `ImsSelectEditDialog` via the injected `Dialog` service, passing
   `direction: this.directionality.value` so the dialog overlay matches the
   originating control's LTR/RTL context.
4. On `dialogRef.closed`, a result of `undefined` (cancel, backdrop click,
   Escape) is a no-op. Otherwise `applyEditDialogResult()` merges the dialog's
   final checked values back with any previously-selected values that were
   outside the dialog's row set (filtered out or disabled), then emits once.

**Nothing is written to the select's value until the dialog resolves with a
result.** All in-dialog interaction operates on the dialog's own
`checkedRows`/`uncheckedRows` signals.

Inside `ImsSelectEditDialog`:

- Two `cdkDropList`s ("לא נבחרו" / "נבחרו") hold `checkedRows`/`uncheckedRows`.
  `cdkDropListSortingDisabled` is set on both — **reordering within a column
  is intentionally unsupported**; a drop only ever means "move to the other
  column" (`drop()` no-ops for a same-container event, otherwise delegates to
  `moveToChecked`/`moveToUnchecked`, appending to the end of the target list).
- A row's checkbox is a plain move-to-the-other-column toggle, not a real
  per-row checked/unchecked flag — a checked-column row always renders
  `checked`, an unchecked-column row never does.
- A drag handle (`cdkDragHandle`) is used instead of making the whole row
  draggable, so clicking the checkbox or label never fights with drag
  initiation.
- `filterQuery` filters both columns by label (trim/collapse
  whitespace/lowercase, every whitespace-separated term must be a substring
  match — same shape as `ims-select`'s own filter predicate, duplicated
  locally since the dialog doesn't have access to the parent's private
  helpers). `[cdkDropListData]`/`@for` are bound to the **filtered** arrays;
  because sorting is disabled, this needs no index translation to the
  underlying full arrays.
- `confirm()` closes with `checkedRows().map(row => row.value)`; `cancel()`
  closes with no argument (`undefined`).

## Styling

Both stylesheets are global (`src/styles/ims-select.scss`,
`src/styles/ims-select-edit-dialog.scss`) because CDK overlay/dialog panels
render outside the component host, and both are registered in
`src/styles.scss`. Each defines its own `--ims-p` / `--ims-s` fallbacks so they
don't depend on the other's scope.

`.ims-select-edit-dialog__list` uses a **fixed `height`** (not
`min-height`/`max-height`) so the dialog doesn't resize as the filter or
drag-drop changes how many rows are visible in either column — keep it fixed
if you touch that rule.

## Safe Change Guide

- If you change what counts as "editable" (`editableOptions()`), re-check
  `applyEditDialogResult()`'s merge logic — it assumes the dialog's row set is
  exactly the set of values that can change, and anything outside it is
  passed through untouched.
- If you re-enable in-column sorting, `drop()` needs the index-translation
  logic (map `previousIndex`/`currentIndex`, which are positions in the
  *filtered* view, back to the underlying full array — do not splice the full
  array directly by those indices). An anchor-row-based approach (find the row
  that should end up immediately after the moved row in the filtered
  destination view, then locate that row's position in the full array) was
  used for this before sorting was disabled; see git history if reviving it.
- Keep `ImsSelectEditDialog` generic (`<T>`) and value-comparison-free — it
  only ever moves opaque rows between two arrays and returns `value`s
  untouched. Value equality (`compareWith`) stays the caller's
  (`ims-select.ts`'s) responsibility.
