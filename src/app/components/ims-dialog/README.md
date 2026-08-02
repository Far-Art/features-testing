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

Each method accepts `ImsDialogContentType<C>` and returns an
`ImsDialogBuilder`. Content can be a component type, a string, or an array of
strings:

```ts
dialog.info(DetailsComponent);
dialog.info('The operation completed.');
dialog.warning(['The current draft has unsaved changes.', 'Continue anyway?']);
```

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

The dialog and its demo use the Material Symbols Sharp ligature font.

### `inside(className)`

Opens the dialog relative to the first element inside `body` with the supplied
class name. Pass a single class name without the leading period.

```ts
dialog.info(EditorComponent).title('Workspace editor').inside('policy-workspace').open();
```

An inside-boundary dialog:

- Opens at the center of the matching element instead of the viewport.
- Uses that element as its drag boundary.
- Is capped to the boundary dimensions with a 1rem inset.
- Opens without a backdrop.
- Repositions with the boundary when the page scrolls.

The inside placement and no-backdrop behavior take precedence over
`config.positionStrategy` and `config.hasBackdrop`. If the class name is
invalid, no matching HTML element exists, or the boundary has no visible area,
an error is logged to the console and the dialog falls back to the normal
viewport-centered `.cdk-overlay-container` boundary.

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

### `asReadonly(state?)`

Generates a Close action when the supplied component has no
`ims-dialog-actions`.

Read-only mode controls generated dialog chrome only. It does not disable form
controls or block interaction inside caller content.

An optional `Signal<boolean>` makes the shell state reactive:

```ts
readonly readonlyState = signal(true);

dialog.info(EditorComponent).asReadonly(this.readonlyState).open();
```

While the signal is `true`, the read-only host class and generated Close action
are active. While it is `false`, both are removed. Component-provided actions
continue to take precedence.

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
2. If `ims-dialog-content` is supplied, the generated content host and supplied
   component are flattened so its sections occupy their dialog layout areas.
3. A custom title suppresses the builder-generated title and icon.
4. A custom actions section suppresses generated confirmation or read-only
   actions.
5. Toolbars are caller-projected only and occupy a full-width row beneath the
   title. The shell keeps its X close control at the inline end of the title
   row.
6. Multiple custom sections of the same type are allowed, although normal
   usage should provide at most one title, content section, and action section.

`ims-dialog-content` owns `overflow-y: auto` directly, so its projected content
scrolls without an additional wrapper element. Its top gutter is a scrolling
spacer rather than container padding, allowing sticky descendants to reach the
content viewport's top edge after the gutter scrolls away. Override
`--ims-dialog-content-padding` to adjust the shared gutter size.

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
dialogRef.panelElement;
```

`panelElement` is the `.cdk-overlay-pane` HTML element containing the dialog
shell. It can be used for scoped measurements, observation, or imperative
access when configuration and component bindings are insufficient.

For normal dialogs, the builder returns `ImsDialogRef<Result | undefined>`.
For confirmation dialogs, it returns `ImsDialogRef<boolean>`.

## `ImsAbstractDialog`

Dialog content components can extend `ImsAbstractDialog<Data, Result>` to gain
typed access to `dialogData`, `dialogRef`, and a forwarding
`closeDialog(result?)`
method:

```ts
@Component({
  standalone: true,
  template: `
    <p>{{ dialogData.name }}</p>
    <button type="button" (click)="closeDialog({ saved: true })">Save</button>
  `,
})
export class EditorDialog extends ImsAbstractDialog<
  { name: string },
  { saved: boolean } | undefined
> {}
```

The abstract directive is intended only for inheritance and has no selector or
rendered host element. Components can still inject `IMS_DIALOG_DATA` and
`ImsDialogRef` directly when inheritance is not appropriate.

## Dragging and boundaries

Viewport dialogs use the fixed CDK overlay container as their drag boundary:

```html
cdkDragRootElement=".cdk-overlay-pane" cdkDragBoundary=".cdk-overlay-container"
```

This moves the complete overlay pane and prevents document scrolling from
shrinking the available viewport boundary. Inside-boundary dialogs instead
pass their resolved HTML element directly to `cdkDragBoundary`.

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
  hasBackdrop: true,
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
- `ims-abstract-dialog.ts`: injectable base directive for dialog components.
- `ims-dialog-ref.ts`: dedicated close reference and confirmation mapping.
- `ims-dialog-shell.ts` / `ims-dialog-shell.html`: private internal shell.
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
