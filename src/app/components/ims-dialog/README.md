# IMS Dialog Implementation Guide

## Overview

`ims-dialog` is a standalone Angular CDK dialog facade with a fluent builder API,
severity styling, typed close results, body-constrained dragging, and composable
dialog sections.

It uses:

- `@angular/cdk/dialog` for overlays, focus management, backdrop interaction, and
  lifecycle.
- `@angular/cdk/drag-drop` for dragging the dialog overlay.
- Standalone Angular components and signals for content composition.
- Global SCSS because dialogs render inside the CDK overlay container.

## Basic usage

```ts
import { Component, inject } from '@angular/core';
import { ImsDialogService } from './components/ims-dialog';

@Component({
  selector: 'app-example',
  template: `<button type="button" (click)="remove()">Delete</button>`,
})
export class Example {
  private readonly dialog = inject(ImsDialogService);

  remove(): void {
    this.dialog
      .danger()
      .title('Delete item?')
      .withIcon('delete_forever')
      .asConfirmation('yes_no')
      .open()
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          // Delete the item.
        }
      });
  }
}
```

## Service and builder API

The service exposes one entrypoint per severity:

```ts
dialog.info(component?);
dialog.success(component?);
dialog.warning(component?);
dialog.danger(component?);
```

Each method returns an `ImsDialogBuilder`.

### `data(value)`

Supplies data to the opened component through both `IMS_DIALOG_DATA` and CDK
`DIALOG_DATA`.

```ts
dialog.info(DetailsComponent).data({ policyId: 42 }).open();
```

### `config(config)`

Accepts an Angular CDK `DialogConfig`. Caller configuration is preserved,
including sizing, direction, close behavior, focus settings, panel classes,
providers, and data.

IMS classes are appended to `panelClass`; they do not replace caller classes.

```ts
dialog
  .info(DetailsComponent)
  .config({
    width: '36rem',
    disableClose: true,
    ariaLabel: 'Policy details',
  })
  .open();
```

### `title(text)`

Generates `ims-dialog-title` when the supplied component does not provide its
own title section.

### `withIcon(materialSymbolName?)`

Adds an icon to the generated title. Without a name, the icon is derived from
severity:

| Severity  | Default icon   |
| --------- | -------------- |
| `info`    | `info`         |
| `success` | `check_circle` |
| `warning` | `warning`      |
| `danger`  | `error`        |

The repository already loads the Material Icons ligature font.

### `asConfirmation(labels)`

Changes the dialog to confirmation mode and returns a boolean result.

```ts
asConfirmation('yes_no');
asConfirmation('approve_cancel');
asConfirmation({ yes: 'Deploy now', no: 'Review first' });
```

If the supplied component has no `ims-dialog-actions`, the shell generates the
two confirmation buttons.

The `closed` observable always emits a boolean:

- Affirmative action: `true`
- Negative action: `false`
- Escape, backdrop click, or `close()` without a value: `false`
- A custom confirmation action is converted with normal boolean coercion.

### `asReadonly()`

Generates a Close action when the supplied component has no
`ims-dialog-actions`.

Read-only mode controls generated dialog chrome only. It does not disable form
controls or block interaction inside caller content.

Confirmation and read-only modes are mutually exclusive. Combining them throws
an error.

### `open<Result>()`

Opens the dialog and returns an `ImsDialogRef`.

```ts
const ref = dialog.success(EditorComponent).open<SaveResult>();

ref.closed.subscribe((result) => {
  // SaveResult | undefined
});
```

Confirmation builders infer `ImsDialogRef<boolean>` automatically.

## Supporting components

The package exports four standalone projection components:

```html
<ims-dialog-title>Title</ims-dialog-title>
<ims-dialog-toolbar>Toolbar controls</ims-dialog-toolbar>
<ims-dialog-content>Main content</ims-dialog-content>
<ims-dialog-actions>Footer actions</ims-dialog-actions>
```

Import the components used by the supplied standalone component.

```ts
@Component({
  standalone: true,
  imports: [ImsDialogTitle, ImsDialogToolbar, ImsDialogContent, ImsDialogActions],
  template: `
    <ims-dialog-title icon="manage_accounts">Edit profile</ims-dialog-title>

    <ims-dialog-toolbar>
      <button type="button">Help</button>
    </ims-dialog-toolbar>

    <ims-dialog-content>
      <!-- Dialog body -->
    </ims-dialog-content>

    <ims-dialog-actions>
      <button type="button" (click)="cancel()">Cancel</button>
      <button type="button" (click)="save()">Save</button>
    </ims-dialog-actions>
  `,
})
export class ProfileDialog {
  private readonly dialogRef = inject(ImsDialogRef);

  save(): void {
    this.dialogRef.close({ status: 'saved' });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
```

## Composition rules

The shell registers supporting components rendered by the supplied component
and composes the final layout without recreating that component.

1. If no `ims-dialog-content` is supplied, the entire component is wrapped in a
   generated content section.
2. If `ims-dialog-content` is supplied, the internal wrapper is flattened and
   the supplied sections occupy their dialog layout areas.
3. A custom title suppresses the builder-generated title and icon.
4. A custom actions section suppresses generated confirmation or read-only
   actions.
5. Toolbars are caller-projected only and occupy a full-width row beneath the
   title. The shell keeps its X close control at the inline end of the title
   row.
6. Multiple custom sections of the same type are allowed, although normal
   usage should provide at most one title, content section, and action section.

For hybrid dialogs, a component can provide only the sections it owns:

```html
<ims-dialog-content> Custom body with builder-generated title and actions. </ims-dialog-content>
```

## Data merging and injection

Data can be supplied through CDK configuration and the builder:

```ts
dialog
  .info(ContentComponent)
  .config({
    data: {
      source: 'config',
      shared: 'config value',
    },
  })
  .data({
    entityId: 42,
    shared: 'builder wins',
  })
  .open();
```

The result is a shallow merge:

```ts
{
  source: 'config',
  entityId: 42,
  shared: 'builder wins'
}
```

When both paths contain data, both values must be non-array objects. A
`TypeError` is thrown for non-mergeable values. When only one path supplies
data, that value is used unchanged.

The merged object is available through:

```ts
const imsData = inject(IMS_DIALOG_DATA);
const cdkData = inject(DIALOG_DATA);
```

Both tokens resolve to the same value.

## `ImsDialogRef`

Caller components should inject the IMS reference rather than the underlying
CDK reference:

```ts
private readonly dialogRef =
  inject(ImsDialogRef) as ImsDialogRef<MyResult | undefined>;
```

The reference exposes:

```ts
dialogRef.close(result?);
dialogRef.closed;
```

For normal dialogs, the builder returns `ImsDialogRef<Result | undefined>`.
For confirmation dialogs, it returns `ImsDialogRef<boolean>`.

## Dragging and boundaries

The dialog surface uses `cdkDrag` with:

```html
cdkDragRootElement=".cdk-overlay-pane" cdkDragBoundary="body"
```

This moves the complete overlay pane and prevents the dialog from escaping the
document body.

- `ims-dialog-title` is the primary drag handle.
- When no title exists, the shell renders a small fallback grab region.
- Toolbar and content controls remain independently interactive.

The surface remains hidden for the initial section-registration microtask and
is revealed only after the final projected layout is known. This prevents
generated sections from flashing before custom sections suppress them.

## Styling

Global styles live in:

```text
src/styles/ims-dialog.scss
```

They are registered from `src/styles.scss`.

The stylesheet provides:

- Info, success, warning, and danger accent tokens.
- Responsive width and viewport-height constraints.
- Logical properties for LTR and RTL layouts.
- Title, toolbar, content, and action grid areas.
- Focus-visible states and reduced-motion behavior.
- Overlay elevation and entry animation.

Caller components can style their projected content normally through their own
component stylesheet.

## Default CDK configuration

Unless overridden through `config()`:

```ts
{
  width: 'min(42rem, calc(100vw - 2rem))',
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: 'calc(100vh - 2rem)',
  scrollStrategy: overlay.scrollStrategies.noop(),
  direction: directionality.value,
  role: confirmation ? 'alertdialog' : 'dialog'
}
```

The no-op scroll strategy is intentional: CDK's default blocking strategy
fixes the document root and can visibly shift page geometry, particularly in
RTL layouts. IMS dialogs therefore leave the body unchanged by default.
Callers that require background scroll locking can explicitly provide a CDK
scroll strategy through `config()`.

The builder title is used as `ariaLabel` when the caller does not provide one.
For custom-title-only dialogs, callers should provide the appropriate
`ariaLabel` or `ariaLabelledBy` through `config()`.

## File map

- `ims-dialog.service.ts`: CDK integration, data merging, providers, and
  severity entrypoints.
- `ims-dialog-builder.ts`: fluent builder and result typing.
- `ims-dialog-ref.ts`: dedicated close reference and confirmation mapping.
- `ims-dialog.ts` / `ims-dialog.html`: internal shell.
- `ims-dialog-section.ts`: the four supporting components.
- `ims-dialog-section-registry.ts`: custom-section registration.
- `ims-dialog.types.ts`: public types, tokens, and label resolution.
- `index.ts`: public exports.
- `src/styles/ims-dialog.scss`: global dialog styles.
- `src/app/pages/dialog-demo`: interactive demo available at `/dialog`.

## Validation

The implementation is validated with:

```bash
npm run build:no-source
```

No dialog test files are currently included. Add them only when explicitly
requested, in accordance with the repository testing rules.
