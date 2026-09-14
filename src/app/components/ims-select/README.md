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
- `../ims-selection`: pieces shared with `ims-autocomplete` — types, the
  `IMS_SELECTION_LABELS` token, helpers in `ims-selection.utils.ts`, and the
  toolbar and readonly-panel components.
- `src/styles/ims-selection.scss`: styles shared with `ims-autocomplete`.
  `src/styles/ims-select.scss` keeps the select-only trigger, listbox and
  clear-button rules.
- `src/app/pages/selection-demo`: working examples, including
  `toolbar="auto"`.

The toolbar pen icon either opens `../ims-transfer-dialog`'s shared
`ImsTransferDialog` or delegates to a consumer-provided edit workflow. See that
component's README for the multi-list contract.

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

## Clearing a Single Select

`clearable` offers a clear button inside a single select while it holds a
value; Delete or Backspace on the closed trigger does the same. Clearing writes
`null`, marks the control touched, and returns focus to the trigger. Multiple,
disabled, and readonly selects never show the button, and a select that must
always hold a value simply leaves the input off.

## Keyboard

- Closed single select: ArrowUp/ArrowDown, Home/End, and typeahead change the
  value in place, as a native select does, stopping at the first and last
  option instead of wrapping.
- Alt+ArrowDown or Alt+ArrowUp on the closed trigger opens the panel without
  changing the value.
- Open panel: the arrows move the active option and Enter selects it.
  Alt+ArrowUp selects it in a single select and closes the panel; Escape closes
  without selecting.

## Labels

Texts come from `IMS_SELECTION_LABELS` in `../ims-selection`, shared with
`ims-autocomplete`. Provide a replacement at the root to change them for the
whole application, or pass a partial object to the `labels` input for one
instance. `placeholder` and `editDialogAriaLabel` still take precedence when set.

## Multi-Select Toolbar

When `multiple()` and `showToolbar()` are true, `ims-selection-toolbar` (shared
with `ims-autocomplete`) renders next to the panel with:

- An optional edit icon button (`labels.editSelection`) whose behavior is
  controlled by `editDialogMode`.
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
   Escape) is a no-op. Otherwise `mergeEditDialogResult()`
   (`../ims-selection/ims-selection.utils.ts`) merges the dialog's checked
   values with previously-selected values outside the dialog's row set, then
   the select emits once.

**Nothing is written to the select's value until the dialog resolves with a
result.** All in-dialog interaction happens inside `ImsTransferDialog` itself,
entirely decoupled from `ims-select`'s own state.

### Custom edit action

`editDialogMode` accepts `'default'`, `'custom'`, or `'off'`:

- `'default'` preserves the built-in one-list editor.
- `'custom'` closes the select overlay and emits `editDialogRequested` without
  opening an internal dialog.
- `'off'` hides only the edit icon; the toolbar's view-mode segments remain.

`editDialogDisabled` independently disables the edit action and
`editDialogAriaLabel` supplies its accessible name. A custom action does not
depend on the initiating select's editable option count because its dialog may
combine data from other controls. The existing `toolbar` rules still determine
whether the toolbar itself renders; use `toolbar="on"` for an always-available
custom trigger.

```html
<ims-select
    multiple
    toolbar="on"
    editDialogMode="custom"
    editDialogAriaLabel="Edit collect and ignore policies"
    (editDialogRequested)="openPolicyTransfer()"
>
    <!-- options -->
</ims-select>
```

## Safe Change Guide

- If you change what counts as "editable" (`editableOptions()`), re-check
  `mergeEditDialogResult()`'s merge logic — it assumes the dialog's row set is
  exactly the set of values that can change, and anything outside it is
  passed through untouched.
- The dialog itself (`ImsTransferDialog`) is generic and value-comparison-free.
  It tracks checked state by row ID and returns opaque values; value equality
  (`compareWith`) remains `ims-select`'s responsibility.
