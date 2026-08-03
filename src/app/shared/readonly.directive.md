# `ReadonlyDirective`

`ReadonlyDirective` provides a reactive readonly state to an element, component, and every
descendant that consumes it. It is standalone and is selected with the `ims-readonly` attribute.

```ts
import {ReadonlyDirective} from './shared/readonly.directive';

@Component({
    imports: [ReadonlyDirective]
})
export class CustomerPage {}
```

```html
<section [ims-readonly]="isReadonly()">
    <!-- Descendant components can consume the same state. -->
</section>
```

## Inputs

| Attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ims-readonly` | `boolean \| null \| undefined` | `null` | The local requested readonly state. `null` and `undefined` inherit the closest parent provider's state. |
| `ims-readonly-override-parent` | `boolean \| ''` | `false` | Allows a child provider to explicitly replace an inherited `true` value. Bind a boolean value when enabling it. |

The directive's effective value is exposed as `readonlySignal: Signal<boolean>`.

## Inheritance and overrides

Readonly state flows from the nearest ancestor provider. A nested provider can always make an
editable parent readonly, but it cannot accidentally make a readonly parent editable.

| Parent state | Child `ims-readonly` | Override enabled | Effective child state |
| --- | --- | --- | --- |
| `true` | omitted | either | `true` |
| `true` | `true` | either | `true` |
| `true` | `false` | `false` | `true` |
| `true` | `false` | `true` | `false` |
| `false` | `true` | either | `true` |
| `false` | `false` or omitted | either | `false` |

For example, the exception area remains readonly until it is explicitly granted permission to
override its parent:

```html
<section [ims-readonly]="pageReadonly()">
    <input [ims-readonly]="pageReadonly()" />

    <section
        [ims-readonly]="false"
        [ims-readonly-override-parent]="allowException()"
    >
        <input [ims-readonly]="false" />
    </section>
</section>
```

## Consuming the signal

Components should consume readonly state through `injectSignal()`. Call it from an Angular
injection context, such as a field initializer. It returns the nearest `ReadonlyDirective`'s
effective signal; when no provider exists, it returns a signal whose value is `false`.

```ts
import {Component, Signal} from '@angular/core';
import {ReadonlyDirective} from './shared/readonly.directive';

@Component({
    selector: 'app-customer-editor',
    template: `
        <button [disabled]="readonly()">Save</button>
        <p>{{ readonly() ? 'Readonly' : 'Editable' }}</p>
    `
})
export class CustomerEditor {
    readonly readonly: Signal<boolean> = ReadonlyDirective.injectSignal();
}
```

Because `readonly` is a signal, the template updates when any ancestor provider changes.

## Host behavior

Every provider host exposes its effective state in the DOM:

```html
<div
    class="ims-readonly"
    disabled
    ims-readonly-provider="true"
></div>
```

- The `ims-readonly` class is present only while the effective state is `true`; use it for readonly-specific styling.
- The standard `disabled` attribute is present only while the effective state is `true`. On native form controls such as `input`, `textarea`, `select`, and `button`, this disables interaction.
- `ims-readonly-provider` is always present and has the current effective value, `"true"` or `"false"`. It is a state marker for inspection and styling; it is not a native HTML boolean attribute.

For custom controls, use `ReadonlyDirective.injectSignal()` to update their disabled or readonly
behavior instead of relying on the native `disabled` attribute.

## Projected content and dialog integration

Angular dependency injection follows the logical template hierarchy, not only the rendered DOM.
A provider placed around `<ng-content>` inside a component template is therefore not visible to
the projected nodes. Components that provide readonly state to projected descendants should attach
`ReadonlyDirective` to their host, for example with `hostDirectives`.

`ImsDialogContent` uses this pattern. When a dialog is opened with `asReadonly(state)`, its content
host exposes the reactive readonly provider. The dialog title, toolbar, close control, and actions
are outside that provider and remain interactive.

Readonly-aware custom controls such as `ims-select` and `ims-autocomplete` consume the host signal
automatically. Native controls must attach their own inheriting directive because a `disabled`
attribute on an ancestor does not disable descendants:

```html
<ims-dialog-content>
    <input [ims-readonly]="null" />
    <textarea [ims-readonly]="null"></textarea>
    <ims-select></ims-select>
</ims-dialog-content>
```

The `null` value asks each native control provider to inherit the effective state from
`ims-dialog-content`.
