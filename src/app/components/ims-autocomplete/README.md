# IMS Autocomplete Implementation Guide

This document describes the current `ims-autocomplete` implementation for
future maintenance and AI-assisted changes. Treat the behavior documented here
as part of the component contract unless a requested change explicitly
replaces it.

## File Map

- `ims-autocomplete-base.ts`: `ImsAutocompleteBase`, the abstract directive
  holding all shared behavior — forms integration, free-text and strict
  commits, filtering, sorting, highlighting, keyboard navigation, view modes,
  the multi-select toolbar, the edit-dialog wiring, and the selected-label
  cache. Also exports `IMS_AUTOCOMPLETE_IMPORTS`.
- `ims-autocomplete.ts`: `ims-autocomplete`, which takes a static `options`
  list.
- `ims-autocomplete-async.ts`: `ims-autocomplete-async`, which loads options
  per query through `loadOptions`.
- `ims-autocomplete.html`: the single template both components render — single
  input or multi trigger, CDK connected overlay, toolbar, filter input, and the
  virtualized listbox.
- `ims-autocomplete.types.ts`: `ImsAutocompleteOption`, the value, loader,
  compare and display types, and aliases of the shared selection types.
- `index.ts`: public exports, plus the selection labels re-exported from
  `src/app/shared/ims-selection`.
- `src/app/shared/ims-selection`: pieces shared with `ims-select` — types, the
  `IMS_SELECTION_LABELS` token, helpers in `ims-selection.utils.ts`, and the
  toolbar and readonly-panel components. See `../ims-select/README.md` for the
  toolbar and edit-dialog contract, which the autocomplete follows.
- `src/styles/ims-selection.scss`: styles shared with `ims-select`.
  `src/styles/ims-autocomplete.scss` keeps the autocomplete-only rules.
- `src/app/pages/selection-demo`: working examples, including async loading
  with `loadDebounceMs`. `readonly-demo` and `component-states-demo` cover the
  readonly and disabled states.

Both components are standalone, use `ChangeDetectionStrategy.OnPush`, and
depend on Angular CDK overlay, scrolling and bidi.

## Two Components, One Base

`ims-autocomplete` and `ims-autocomplete-async` differ only in where their
options come from. Each implements `getSourceOptions()`; everything else lives
in `ImsAutocompleteBase`. A new option source should subclass the base the same
way, and may override these hooks:

- `isLoading()`: drives the loading state in the panel. Defaults to `false`.
- `sourceMatchesQuery()`: whether the current options already answer the
  current query. A static list always does; see
  [Strict commits](#strict-commits-and-async-sources).
- `destroyOptionsSource()`: tears down pending loads on destroy.
- `optionsRequested` (protected signal): true while options are needed. An
  on-demand source should load only while it holds.

### Static options

```html
<ims-autocomplete
    placeholder="Type or choose"
    sort="asc"
    [options]="bagOptions"
    [formControl]="bag"
    [compareWith]="compareById"
/>
```

`options` is a readonly `ImsAutocompleteOption<T>[]` of
`{value, label, disabled?}`. It is filtered in the browser.

### Async options

```html
<ims-autocomplete-async
    multiple
    toolbar="auto"
    [loadDebounceMs]="350"
    [loadOptions]="loadCustomers"
    [displayWith]="customerName"
    [formControl]="customers"
    [compareWith]="compareById"
/>
```

`loadOptions` is required. It receives the raw query and may return an array, a
`Promise`, or an `Observable` of options; an Observable may emit several times
and each emission replaces the list. `loadDebounceMs` (default `0`) delays the
call after the query changes.

Loading rules:

- The loader runs only while `optionsRequested()` is true: the panel is open, a
  strict commit is waiting for results, or a selected value still has no label.
  A closed field does not call it for the text it syncs from each value change.
- Results already loaded for the same loader and query are reused when the
  panel reopens. A failed load is not reused.
- A new query cancels the previous request (the Observable is unsubscribed; a
  stale Promise result is ignored by request id).
- A loader that throws or errors leaves the list empty and ends loading; it
  does not surface an error.
- The client-side filter still runs over the loaded results, so a loader may
  return more than the query matches.

## Value Contract

Values flow through `BasicValueAccessor`, so the components work with
`formControl`, `ngModel` and the rest of the forms API.

- **Single, free text (default):** typing writes the text as a `string` on
  every input. Choosing an option writes its `value` (`T`). On blur the text is
  committed as a string unless it still equals the selected option's label.
- **Single, `strict`:** typing writes nothing. On blur, Tab, Escape or an
  outside click the text is matched (trimmed, whitespace-collapsed,
  case-insensitive) against the visible, non-disabled option labels; an exact
  match writes that option's value, anything else writes `null` and clears the
  input.
- **`multiple`:** always strict. Writes a readonly `T[]`; choosing an option
  toggles it, clears the filter and keeps the panel open.

`compareWith` (default `===`) decides equality between option values and the
form value. Supply it whenever values are objects that are rebuilt, such as
server results.

### Labels for selected values

A selected value's label is resolved in this order:

1. An option in the current source.
2. An option remembered in the selected-option cache. The cache keeps options
   that label the current selection after they leave the source, so an async
   selection keeps its label while the user searches for something else. The
   edit dialog adds its rows to it before emitting.
3. `displayWith(value)`, for values no option has ever described, such as an
   initial form value outside the first page an async loader returns.
4. `String(value)` for primitives; an empty string for unlabelled objects
   (never `[object Object]`).

While a selected value has no label and no `displayWith` is set, an async
autocomplete keeps requesting options so it can find one.

## Strict Commits and Async Sources

A strict single commit must not judge the typed text against the previous
query's results — that would clear a value the user typed exactly. When
`sourceMatchesQuery()` is false at commit time, the base sets
`pendingStrictCommit`, which keeps `optionsRequested()` true; once the results
for the current query arrive, the commit runs against them. Opening the panel
again cancels the pending commit.

## Filtering, Sorting and Highlighting

- The query is normalized (trim, collapse whitespace, lowercase). An option
  matches when **every** space-separated term appears somewhere in its label,
  in any order.
- `sort` accepts `'default'` (source order), `'asc'` or `'desc'`
  (`localeCompare` on labels).
- Matching substrings are highlighted in option labels; overlapping term
  matches are merged.
- Single mode filters with the input itself. Multiple mode renders a separate
  search field (`labels.search`) at the top of the panel, cleared when the
  panel closes.
- The listbox is a CDK fixed-size virtual scroll viewport. `optionHeight`
  (default `33`, one `ims-select` option row) must match the rendered row
  height, or scrolling and active-option tracking drift.

## Keyboard

- ArrowDown/ArrowUp open the panel and move the active option, wrapping and
  skipping disabled options.
- Home/End jump to the first/last enabled option while the panel is open,
  except when focus is in a text input (where they move the caret).
- Enter selects the active option.
- Escape closes the panel, commits the single text, and returns focus to the
  input or trigger. Tab closes and commits.
- Keys pressed inside the toolbar are left to the toolbar, except Escape and
  Tab.

## Readonly and Disabled

`interactionDisabled()` covers both `disabled` and the nearest `[ims-readonly]`
provider (`ReadonlyDirective`).

- Single: the input cannot change the value and the panel does not open; an
  open panel closes.
- Multiple: the trigger remains available as a disclosure that opens
  `ims-selection-readonly-panel`, a semantic list of the selected values only.
  The toolbar, search field and available options are not rendered. Escape
  closes it and returns focus to the trigger.

## Multi-Select Display

Selected labels are compacted to fit the trigger: as many labels as fit are
shown, followed by a `+N` badge. Widths are measured with hidden measuring
elements and remeasured on resize (`ResizeObserver`) and on selection changes.
Truncated text exposes its full value through `ImsTextTruncateDirective`.

## Multi-Select Toolbar and Edit Dialog

These follow `ims-select` exactly; see `../ims-select/README.md` for the full
contract. Differences:

- `toolbarAutoMinOptions` defaults to `15` (select: `10`). With
  `toolbar="auto"` the count is taken from the current source, so an async
  autocomplete's toolbar can appear or disappear as results change.
- `editableOptions()` is `filteredOptions()` without disabled options — it
  respects the query but not the view mode. For an async source that means only
  the currently loaded results can be edited in the dialog; values outside them
  pass through `mergeEditDialogResult()` untouched.
- There is no filter mode input: single mode always filters by typing and
  multiple mode always shows the search field.

`editDialogMode` (`'default' | 'custom' | 'off'`), `editDialogDisabled`,
`editDialogAriaLabel` and the `editDialogRequested` output behave as in
`ims-select`.

## Labels

Texts come from `IMS_SELECTION_LABELS`, shared with `ims-select` and exported
from both components' `index.ts`. Provide a replacement at the root to change
them for the whole application, or pass a partial object to the `labels` input
for one instance. The autocomplete uses `autocompletePlaceholder`, `search`,
`loading`, `noOptions`, and the toolbar and edit-dialog texts. `placeholder`
and `editDialogAriaLabel` take precedence when set.

## Accessibility

- Single mode is a combobox input (`aria-autocomplete="list"`) with
  `aria-activedescendant` pointing at the active option.
- Multiple mode is a trigger button with `aria-haspopup="listbox"`; in readonly
  mode it controls the readonly panel instead.
- `ariaLabel` and `ariaLabelledby` label the input or trigger.
- Loading is announced with `role="status"`; the empty state uses
  `role="note"`.

## Safe Change Guide

- Both components render `ims-autocomplete.html`, so template changes affect
  both. Keep source-specific logic in the subclasses and behind the base hooks.
- Use only APIs available in Angular 18. `linkedSignal` is not one of them, so
  `selectedOptionCache` is a `computed` that keeps its last result in
  `previousSelectedOptions`, and `rememberOptions()` feeds it through the
  `rememberedOptions` signal. An effect in the constructor reads it so it stays
  current while its options are still loaded. Removing that effect makes async
  selections lose their labels.
- Every effect that writes a signal passes `{allowSignalWrites: true}`; Angular
  18 throws NG0600 without it. Later versions ignore the flag.
- Don't use ES2023 library methods such as `findLastIndex` or `toSorted`: an
  Angular 18 project compiles against the ES2022 lib.
- The async loader effect reads `loadedQuery` untracked on purpose: tracking it
  would re-run the effect when results land and cancel a loader still
  streaming more of them.
- If you change what counts as "editable" (`editableOptions()`), re-check
  `mergeEditDialogResult()` — it assumes the dialog's rows are exactly the
  values that can change.
- Changes to shared behavior in `src/app/shared/ims-selection` must be checked
  against `ims-select` too.
