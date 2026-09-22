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
- `ims-select.directive.ts`: `select[ims-select]`, the lightweight native
  select described under [Native Select](#native-select). Styled by
  `src/styles/ims-native-select.scss`.
- `ims-select.types.ts`: `ImsSelectOptionLike`, `ImsSelectParent`, and the
  public mode/filter/toolbar/view-mode types.
- `index.ts`: public exports (`ims-select.ts`, `ims-option.ts`,
  `ims-select.directive.ts`, `ims-select.types.ts`, and the selection labels
  re-exported from `src/app/shared/ims-selection`).
- `src/app/shared/ims-selection`: pieces shared with `ims-autocomplete` —
  types, the `IMS_SELECTION_LABELS` token, helpers in `ims-selection.utils.ts`,
  and the toolbar and readonly-panel components.
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
and `toolbar` each accept `'on' | 'off' | 'auto'`. With `'auto'` the filter
appears once `options().length >= filterAutoMinOptions()` (default `15`), and
the multi-select toolbar once `options().length >= toolbarAutoMinOptions()`
(default `10`).

The host sets no width of its own. A grid cell stretches it; in a block or flex
container it sizes to its content, and a multiple select compacts its labels to
that size. Give it a width with a sizing class, as any field takes one:

```html
<ims-select class="field-m" [formControl]="status">...</ims-select>
<ims-select class="field-stretch" [formControl]="branch">...</ims-select>
```

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

Texts come from `IMS_SELECTION_LABELS`, shared with `ims-autocomplete` and
exported from both components' `index.ts`. Provide a replacement at the root
to change them for the whole application, or pass a partial object to the
`labels` input for one instance. `placeholder` and `editDialogAriaLabel` still
take precedence when set.

## Multi-Select Toolbar

When `multiple()` and `showToolbar()` are true, `ims-selection-toolbar` (shared
with `ims-autocomplete`) renders next to the panel with:

- An optional edit icon button (`labels.editSelection`) whose behavior is
  controlled by `editDialogMode`.
- Three view-mode segments (`all` / `selected` / `unselected`) that filter
  `visibleOptions()` without touching the actual selection. While `selected`
  or `unselected` is active, a warning-toned caption (`labels.selectedOnly` /
  `labels.unselectedOnly`) sticks to the top of the listbox, so the narrowed
  list is never mistaken for the full one.

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
   (`src/app/shared/ims-selection/ims-selection.utils.ts`) merges the dialog's
   checked values with previously-selected values outside the dialog's row
   set, then the select emits once.

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

## Native Select

`select[ims-select]` (`ImsSelectDirective`) dresses a native `<select>` as
`ims-select`, for a field that only needs one value picked from a list — a
grid column, a short form — where a component per field costs more than it
gives. The browser supplies the options panel, keyboard navigation and
typeahead, and Angular's built-in select value accessor connects it to forms.
The directive adds the field styles and `ims-readonly` support, nothing else.

```html
<select ims-select class="field-m" [formControl]="status" [compareWith]="compareById">
    <option [ngValue]="null" disabled hidden>Choose a status</option>
    @for (status of statuses; track status.id) {
        <option [ngValue]="status" [disabled]="status.retired">{{ status.label }}</option>
    }
</select>
```

Import `ImsSelectDirective` next to `ReactiveFormsModule` or `FormsModule`;
`ngValue` and `compareWith` are Angular's own `<select>` API.

- **Look.** The field is `.ims-input` with ims-select's padding and chevron.
  The options panel uses ims-select's menu, option rows, active tone and
  checkmark, opens below the field with the end edges aligned, and moves
  above it when less than 144px is left below. Hover, focus, invalid
  (`ng-invalid` lands on the select itself), disabled and readonly states come
  from the shared input styles. Size the field with the `field-*` classes.
- **Placeholder.** A native select has no placeholder. Add an option the user
  cannot pick — `disabled`, `hidden`, or both — for the value that means
  "none"; while it is selected, the field shows it in the placeholder tone.
- **Readonly and disabled.** The directive joins the nearest `ims-readonly`
  provider, as `imsInput` does: a readonly select is disabled and takes the
  readable readonly appearance. It also combines the form control's disabled
  state and a `disabled` attribute or binding, so enabling the control does not
  unlock a readonly select.
- **Single value only.** The selector skips `select[multiple]`, which the
  browser renders as a list box. Use `<ims-select multiple>`.
- **The browser's behaviour.** On a closed field the arrow keys open the panel
  rather than stepping the value. Filtering, the multi-select toolbar,
  `clearable`, the readonly values panel and label compaction are ims-select
  features; pick the component when a field needs them.

The styles rely on Chromium's customizable select (`appearance: base-select`,
Chrome 135 and later). A browser without it keeps its native dropdown inside
the shared field styles.

The directive renders the select's own `<button>` with a `<selectedcontent>`
in it, so a long value truncates beside the chevron: Chrome's built-in value
label keeps its full width. Chrome copies the selected option into
`<selectedcontent>` only when the selection changes, while Angular fills in an
option's text after the option can already be selected, so a
`MutationObserver` on the select refreshes the copy whenever an option
changes. Don't add a `<button>` of your own to the select.

The same observer watches the select's `disabled` attribute and re-applies the
directive's state when something else rewrites it — `ims-readonly` placed on
the select binds that attribute too, and depending on the Angular version that
binding lands after the directive's effect. The directive owns the attribute,
so disable the select through the form control or `[disabled]`, not
`[attr.disabled]`.

The directive only uses Angular 18 APIs (signal inputs, `effect()`,
`untracked()`), so it can be copied into an Angular 18 application together
with `ReadonlyDirective` and the stylesheet. Comments marked
`TODO: Angular 22` hold the `afterRenderEffect` version to switch to after the
upgrade; the Angular 18 code keeps working on Angular 22 until then.
