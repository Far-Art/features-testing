# `ReadonlyDirective`

`ReadonlyDirective` provides a reactive readonly state to an element, component, and every
descendant that consumes it. It is standalone and is selected with the `ims-readonly` or the
`ims-readonly-locked` attribute.

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
| `ims-readonly-override-parent` | `boolean \| string \| null \| undefined` (model, coerced with `booleanAttribute`) | `false` | Allows a child provider to explicitly replace an inherited `true` value. A bare attribute enables it. It has no effect under a lock. |
| `ims-readonly-locked` | `boolean \| string \| null \| undefined` (coerced with `booleanAttribute`) | `false` | Makes the host and every descendant readonly with no way to override it. A bare attribute enables it. See [Locked scopes](#locked-scopes). |

The directive's effective value is exposed as `readonlySignal: Signal<boolean>`, and its lock as
`lockedSignal: Signal<boolean>`.

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

## Locked scopes

Use `ims-readonly-locked` when nothing in a scope may be enabled, such as a page that shows a
canceled process. A locked host is readonly, and so is every provider below it, whatever it
requests. `ims-readonly-override-parent` has no effect under a lock.

```html
<section [ims-readonly-locked]="processCanceled()">
    <section [ims-readonly]="false" ims-readonly-override-parent>
        <!-- Readonly while the process is canceled: the lock wins over the override. -->
        <input imsInput />
    </section>
</section>
```

The lock works on its own or next to `ims-readonly`. In the second form, the host follows
`ims-readonly` and its parent as usual until the lock turns on:

```html
<section [ims-readonly]="pageReadonly()" [ims-readonly-locked]="processCanceled()">
```

| Parent locked | Host `ims-readonly-locked` | Host `ims-readonly` and override | Effective host state | Host locked |
| --- | --- | --- | --- | --- |
| `true` | either | any | `true` | `true` |
| `false` | `true` | any | `true` | `true` |
| `false` | `false` | as in [Inheritance and overrides](#inheritance-and-overrides) | as in that table | `false` |

Every provider passes the lock down through `lockedSignal`. Turning the lock off restores the
states the providers resolved before it.

`ImsFocusModeTrigger` is the one exception: it opts out of a lock so the zoom-in button stays
usable. The focus-mode dialog it opens still offers only Close, because `ImsFocusMode` reads the
locked scope's readonly state.

## Consuming the signal

Components should consume readonly state through `injectSignal()`. Call it from an Angular
injection context, such as a field initializer. It returns the nearest generic readonly
provider's effective signal; when no provider exists, it returns a signal whose value is `false`.

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
- Exactly one of `ims-readonly-provider` and `ims-readonly-inherited` is present, and it has the current effective value, `"true"` or `"false"`. `ims-readonly-inherited` marks a host whose effective state is its parent's: the parent is locked, or `ims-readonly` is `null` or `undefined`, or it is `false` under a readonly parent without `ims-readonly-override-parent`. Otherwise the host carries `ims-readonly-provider`. Both are state markers for inspection and styling; neither is a native HTML boolean attribute.
- The `ims-readonly-locked` class is present on every locked host: the one that starts the lock and every provider below it.
- The bare `ims-readonly-lock-provider` attribute marks only the host where a lock starts: it is locked and its nearest ancestor provider is not. A host that sets its own `ims-readonly-locked` inside an already locked scope does not carry it; the outer host does. If the outer lock turns off, the marker moves to the inner host.

```html
<section ims-readonly-provider="true" ims-readonly-lock-provider class="ims-readonly ims-readonly-locked">
    <input ims-readonly-inherited="true" disabled class="ims-readonly ims-readonly-locked" />
</section>
```

For custom controls, use `ReadonlyDirective.injectSignal()` to update their disabled or readonly
behavior instead of relying on the native `disabled` attribute.

## Projected content and dialog integration

Angular dependency injection follows the logical template hierarchy, not only the rendered DOM.
A provider placed around `<ng-content>` inside a component template is therefore not visible to
the projected nodes. Components that own readonly state can participate in the generic
`IMS_READONLY_STATE` provider contract from their host.

The contract, `ImsReadonlyStateProvider`, has two signals: `readonlySignal` and `lockedSignal`.
Both are required, so that every provider passes a lock on to its descendants. A provider resolves
its own inputs against its parent with `resolveImsReadonly(parent, request)`, the same function
`ReadonlyDirective` uses. A component providing the contract on its host can also provide
`IMS_READONLY_HOST_PARENT`. A `ReadonlyDirective` on that same host then resolves against that
provider instead of the nearest ancestor. An ancestor's lock still applies.

`ImsDialogContent` uses that contract. When a dialog is opened with `asReadonly()`, its
content host exposes the reactive readonly provider without installing `ReadonlyDirective` as a
host directive. The dialog title, toolbar, close control, and actions are outside that provider
and remain interactive. `asReadonly({ locked: true })` or `ImsDialogRef.setLocked()` lock the
content, and `ims-dialog-content` then carries `ims-readonly-lock-provider`. A dialog doesn't
inherit the page's state, so a dialog opened from a locked page is locked only when the caller
asks for it.

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
