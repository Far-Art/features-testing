# IMS Transfer Dialog Implementation Guide

`ImsTransferDialog` is a non-destructive editor for checking rows independently
and moving them between one or more named lists. Checkbox interaction never
changes list membership, and drag-and-drop never changes checked state.

## Public contract

```ts
const dialogRef = transferDialog.open<MyItem, 'available' | 'assigned'>({
    dialogTitle: 'Edit assignment',
    lists: [
        {
            id: 'available',
            title: 'Available',
            rows: [{id: 'item-1', label: 'First item', value: firstItem}]
        },
        {
            id: 'assigned',
            title: 'Assigned',
            rows: [{id: 'item-2', label: 'Second item', value: secondItem, checked: true}]
        }
    ]
});

dialogRef.closed.subscribe((result) => {
    if (result === undefined) return;

    const assignedRows = result.lists.assigned;
    const checkedValues = result.checked;
});
```

Input lists are ordered for display. Every list needs a stable, non-empty,
globally unique `id`; row IDs must be unique across the entire dialog. At least
one list is required. Invalid data is rejected before the dialog opens.

`checked` is optional on input and defaults to `false`. Results normalize it to
a required boolean and return complete rows keyed by list ID:

```ts
interface ImsTransferDialogResult<T, ListId extends string = string> {
    readonly lists: Readonly<Record<ListId, readonly ImsTransferResultRow<T>[]>>;
    readonly checked: readonly T[];
}
```

`checked` contains values in displayed list order and row order. Selection
controls can consume it directly; list-aware consumers should apply membership
and order from `result.lists[id]`.

## Behavior

- The dialog owns cloned working rows. Confirm returns a new snapshot; cancel,
  Escape, and backdrop dismissal return `undefined`. Caller data is never mutated.
- Clicking a checkbox only toggles that row. Dragging is the only transfer and
  reorder interaction, and it preserves `checked`.
- Every list is connected to every other list. Drops within a list reorder it;
  cross-list drops insert at the destination position.
- Filtering applies to all lists. Reordering is disabled while filtered, and a
  cross-list filtered drop appends to the destination's underlying rows.
- Sorting is independent per list. A positional drag clears destination sorting.
- Disabled rows cannot be checked, dragged, or reordered.
- Reset restores original membership, order, checked state, sorting, and filter.
- One list fills the available width. Additional desktop lists form a
  horizontally scrollable row; narrow screens stack lists vertically.

## Consumers

`ims-select` and `ims-autocomplete` open one `options` list and apply
`result.checked` after confirmation. The playlist demo opens `listening` and
`archive` lists and maps returned rows back to its signals.

The fixed list height and styles live in `src/styles/ims-transfer-dialog.scss`
because CDK dialog content is rendered outside consumer component styles.
