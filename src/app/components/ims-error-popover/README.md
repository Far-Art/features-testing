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

## Use inside components

Composite controls can render `ims-error-popover` internally on the real visual
field instead of forcing consumers to attach the directive themselves. This is
the pattern used by `ims-datepicker`: the component owns its component-specific
errors by default, but yields ownership when the developer explicitly places
`ims-error-popover` on the component host.

Import `ImsErrorPopoverDirective` into the component and provide
`IMS_ERROR_POPOVER_COMPONENT_HOST` from the component instance:

```ts
@Component({
    selector: 'my-control',
    imports: [ImsErrorPopoverDirective],
    providers: [{
        provide: IMS_ERROR_POPOVER_COMPONENT_HOST,
        useExisting: forwardRef(() => MyControl)
    }]
})
export class MyControl implements ImsErrorPopoverComponentHost {
    private readonly externalErrorPopoverCount = signal(0);

    readonly componentErrors = computed<ValidationErrors | null>(() =>
        this.resolveValidationErrors()
    );

    readonly internalErrorPopoverDisabled = computed(() =>
        this.disabled() || this.readonly() || this.externalErrorPopoverCount() > 0
    );

    registerExternalErrorPopover(): () => void {
        this.externalErrorPopoverCount.update((count) => count + 1);
        let registered = true;

        return () => {
            if (!registered) return;
            registered = false;
            this.externalErrorPopoverCount.update((count) => Math.max(0, count - 1));
        };
    }
}
```

Attach the internal directive to the element that should anchor the popover:

```html
<div
    class="my-control__field"
    [ims-error-popover]="componentErrors"
    [ims-error-popover-disabled]="internalErrorPopoverDisabled()"
>
    ...
</div>
```

This gives the component a default popover for parse, range, filter, or other
internal validation errors. If a consumer writes this:

```html
<my-control ims-error-popover [formControl]="control" />
```

the external directive calls `registerExternalErrorPopover()`, the component
disables its internal instance, and the external instance reads the full bound
Angular control errors. The external instance owns its own mapper, duration,
position, and disabled inputs.
