# Shared Assistant Rules

## Sass Selector Nesting

- Use Sass nesting only for true DOM descendants, pseudo-classes, pseudo-elements, attributes, and state scopes.
- Do not use the Sass parent selector to extend or construct class names, such as `&__element`, `&--modifier`, `&-suffix`, `&-active`.
- Write full class names explicitly when targeting related classes, variants, or modifiers.

## testing

- Do not generate test files unless explicitly asked.
- On refactor / update if the component or service has tests, explicitly ask to update them.
- If specs exist and a change breaks them, update those specs as part of the same change, without asking first. The question above is for adding or extending tests, not for keeping existing specs passing.

## ESLint

- Follow ESLint best practices: write TypeScript, Angular components, and templates that pass the recommended rules of `@eslint/js`, `typescript-eslint`, and `angular-eslint`.
- Fix what a rule would report instead of silencing it. When an exception is really needed, disable only that rule on that line, with a comment saying why.

## CDK Virtual Scroll

- `cdk-virtual-scroll-viewport` never watches its own element. It re-measures only when `checkViewportSize()` is called, on scroll, or on a window resize (`ViewportRuler`). When the viewport's height is set by bindings — following the item count, or clamped to the room an overlay has — observe the element with a `ResizeObserver` and call `checkViewportSize()` from the callback. Re-measuring only when the data changes is not enough: the height can land in a later change-detection pass than the data that caused it.
- The rendered range only grows while less than `minBufferPx` of it lies past the viewport's end, and `setRenderedRange` ignores a range equal to the one it already holds. A range measured at a small height stays small, and measuring again at that same height changes nothing. Measure at the height the viewport ends up with.
- Call `detectChanges()` after `checkViewportSize()` on the component whose template declares the rows, so the new range renders in the same turn.
- Symptom: fewer rows than the viewport has room for, with blank space below them, until the pointer moves over the list. Hovering only fixes it because it happens to re-run a measurement, so don't mistake it for a rendering delay. Reference implementation: `ImsAutocompleteBase`, in `scheduleListboxMeasure()` and the `ResizeObserver` effect beside it. The full account is in `src/app/components/ims-autocomplete/README.md`.
- Verifying in a hidden or background tab (`document.visibilityState === 'hidden'`, as an assistant's browser pane often is): `requestAnimationFrame` and `ResizeObserver` callbacks never fire and CSS transitions stay frozen, so a reproduction that depends on them passes when it should fail. Invoke the observer callback directly, or verify in a visible browser.
