# IMS Error Popover

`ims-error-popover` displays Angular validation errors in a connected CDK
overlay. A bare directive reads the `NgControl` on the same host:

```html
<input class="ims-input" ims-error-popover [formControl]="name">
```

The directive input can instead receive an explicit control or a signal of
validation errors:

```html
<div [ims-error-popover]="addressControl">...</div>
<div [ims-error-popover]="serverErrors">...</div>
```

`serverErrors` has type `Signal<ValidationErrors | null>`. Changing an error
key or payload opens a hidden popover. When it is already open, its rows update
in place and its timeout restarts without detaching the overlay.

## Configuration

```ts
provideImsErrorPopoverConfig({
    duration: 6000,
    errorMapper: {
        required: 'This value is required.',
        minlength: 'Minimum {requiredLength}; currently {actualLength}.',
        customError: (details, context) => `Invalid ${context.key}`
    }
})
```

Global mappings extend the built-in Angular and datepicker mappings. A local
`[ims-error-popover-mapper]` extends the resolved global mapper again.

String mappings can reference top-level properties from their Angular
validation-error payload. Every matching `{property}` is replaced with the
string form of its value, including repeated placeholders. Missing properties
remain unchanged so configuration mistakes stay visible. Mapper functions are
treated as final text and should be used for nested values or custom formatting.

Additional inputs:

- `[ims-error-popover-disabled]` disables every opening trigger.
- `[ims-error-popover-duration]` overrides the automatic display duration.
- `ims-error-popover-position="top|bottom"` selects the preferred side; the
  opposite side remains available as a viewport fallback.

Focus keeps the popover visible, while hovering the host reopens existing
errors. Entering the popover deliberately dismisses it. When the popover first
appears beneath a stationary pointer, the initial entry is ignored until the
pointer leaves once. Angular disabled state, native disabled state, and the
nearest `ims-readonly` provider all suppress the popover.

`ims-datepicker` includes the directive internally. An explicitly attached
instance on the datepicker host takes ownership and suppresses the internal
instance so duplicate popovers cannot appear.
