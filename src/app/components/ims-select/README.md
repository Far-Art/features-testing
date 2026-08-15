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
- `index.ts`: public exports (`ims-select.ts`, `ims-option.ts`,
  `ims-select.types.ts`).
- `src/styles/ims-select.scss`: global trigger/overlay/toolbar/option styles.
- `src/app/pages/selection-demo`: working examples, including
  `toolbar="auto"`.

The toolbar pen icon opens `../ims-transfer-dialog`'s shared `ImsTransferDialog`
via `ImsDialogService` — see that component's own README for the full
dual-list dialog contract (filter, drag-and-drop, bulk-move, disabled rows,
reset, etc.). `ims-select` doesn't own the dialog anymore; it's just a caller.

Both components are standalone, use `ChangeDetectionStrategy.OnPush`, and
depend on Angular CDK overlay and bidi.

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

When a multiple select is readonly or disabled, its trigger remains available
as a disclosure that opens a semantic list containing only the selected
values; the editing toolbar, filter, and available options are not rendered.
Readonly and disabled single selects do not open an options panel.

`ims-select` also consumes the nearest `ReadonlyDirective` provider. Applying
`[ims-readonly]` to the select or an ancestor blocks value changes using the
same readonly behavior. Multiple selects continue to expose their selected
value details without exposing the selection interface.

## Multi-Select Toolbar

When `multiple()` and `showToolbar()` are true, an `aside` renders next to the
panel with:

- A pen icon button (`ערוך בחירה`) that opens the shared `ImsTransferDialog`.
  Disabled when the control is disabled or `editableOptions()` is empty.
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

1. Builds one `ImsTransferRow<T>[]` from `editableOptions()` and initializes
   each row's independent `checked` state from the current selection.
2. Closes the select's own overlay (`this.close(false)`) before opening the
   dialog, so the popover doesn't linger, covered, behind the modal.
3. Opens `ImsTransferDialog` with one `options` list and lets the IMS dialog
   shell render the title. The service sources `direction` from
   `Directionality` itself, so `ims-select` doesn't pass it explicitly.
4. On `dialogRef.closed`, a result of `undefined` (cancel, backdrop click,
   Escape) is a no-op. Otherwise `applyEditDialogResult(rows, result.checked)`
   merges the dialog's checked values with previously-selected values outside
   the dialog's row set, then emits once.

**Nothing is written to the select's value until the dialog resolves with a
result.** All in-dialog interaction happens inside `ImsTransferDialog` itself,
entirely decoupled from `ims-select`'s own state.

## Safe Change Guide

- If you change what counts as "editable" (`editableOptions()`), re-check
  `applyEditDialogResult()`'s merge logic — it assumes the dialog's row set is
  exactly the set of values that can change, and anything outside it is
  passed through untouched.
- The dialog itself (`ImsTransferDialog`) is generic and value-comparison-free.
  It tracks checked state by row ID and returns opaque values; value equality
  (`compareWith`) remains `ims-select`'s responsibility.
