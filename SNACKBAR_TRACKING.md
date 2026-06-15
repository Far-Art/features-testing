# ImsSnackbar Tracking

## Goal

Build a service-driven Angular snackbar with behavior similar to Angular Material's snackbar.

## Current State

- Starter implementation is in `src/app/components/ims-snackbar`.
- `ImsSnackbarService.info()`, `success()`, `warning()`, and `danger()` return
  an `ImsSnackbarBuilder`.
- Severity methods accept either a string or an Angular component type.
- `ImsSnackbarBuilder.open()` is the terminal operation that opens a global
  CDK overlay.
- Replace strategy defaults to `stack`; `replace` dismisses the existing stack
  before opening the new snackbar.
- Collapsed stacks keep the newest snackbar nearest the viewport edge and in
  front. Older snackbars remain partially visible with progressively lower
  opacity. Hovering any item expands the stack using measured rendered heights.
- Each position group normally keeps four snackbars. Opening a fifth dismisses
  the oldest non-progress item; pending progress items are never evicted
  automatically, so a group can temporarily exceed four when all items are
  in progress.
- Automatic timeout countdowns pause for the whole stack while it is hovered
  and resume with their remaining time after the pointer leaves.
- Dismissing an item immediately reflows the surviving snackbars into the
  vacated position.
- If the pointer remains over the surviving stack after an item is dismissed,
  the expanded state and paused timers are preserved.
- Hover detection uses the combined bounding region of the whole expanded
  stack, including gaps between individual overlay panes.
- Expanded stacks with multiple items show a dedicated `Dismiss all` overlay
  beside the newest bottom/front snackbar. It chooses the left or right side
  based on available viewport space and dismisses only non-progress items in
  that position group.
- Stack reflow uses stable CDK base positions with translated pane offsets.
  Dismissal observers run before the closed overlay is disposed so surviving
  panes can be repositioned synchronously.
- Dismissal applies a 180ms fade, scale, blur, and edge-directed movement
  before emitting `onDismiss()`, reflowing the stack, and disposing the overlay.
- Builder configuration:
  - `timeout(milliseconds)` controls automatic dismissal; `0` keeps it open.
  - `position(vertical, horizontal)` changes its screen position.
  - `data(value)` provides data through `IMS_SNACKBAR_DATA`.
  - `dismissible(boolean)` controls the close button and defaults to `true`.
  - `progress(source?, config?)` keeps the snackbar open while an Observable,
    Promise, or manually controlled operation is pending. Its individual close
    button appears after five seconds by default, and its resolved state remains
    visible for two seconds before dismissal.
  - `replaceStrategy('stack' | 'replace')` controls concurrent snackbars.
- Global defaults are provided by `IMS_SNACKBAR_GLOBAL_CONFIG` and can be
  overridden with `provideImsSnackbarConfig(...)`.
- Default timeout is `4000` milliseconds and default replacement strategy is
  `stack`. Builders initialize from the global config rather than hardcoded
  timeout, strategy, or position values.
- Default position is bottom-center through `verticalPosition: 'bottom'` and
  `horizontalPosition: 'center'`.
- `ImsSnackbarRef` exposes `dismiss()`, `onDismiss()`, `dismissWithAction()`,
  `onAction()`, and the compatibility alias `afterDismissed()`. Progress refs
  also expose `resolveProgress()`, `rejectProgress()`,
  `onProgressResolved()`, and progress state queries.
- Public exports are available from `src/app/components/ims-snackbar/index.ts`.
- Snackbar styles are global in `src/styles/ims-snackbar.scss` and imported by
  `src/styles.scss`.
- A manual test page is available at `/snackbar` in
  `src/app/pages/snackbar-demo`.
- No test files were added because project instructions require an explicit request.

## Usage

```ts
private readonly snackbar = inject(ImsSnackbarService);

save(): void {
    this.snackbar.success('Saved')
        .data({recordId: 42})
        .dismissible(true)
        .timeout(3000)
        .position('top', 'end')
        .open()
        .onDismiss()
        .subscribe(() => this.refresh());
}
```

```ts
provideImsSnackbarConfig({
    timeout: 6000,
    replaceStrategy: 'replace',
    verticalPosition: 'top',
    horizontalPosition: 'end'
})
```

## Decisions

- Use Angular CDK Overlay instead of requiring a snackbar host in the application template.
- Render text in the snackbar container or instantiate custom Angular component content.
- Custom content can inject `ImsSnackbarRef`, `IMS_SNACKBAR_CONFIG`, and
  `IMS_SNACKBAR_DATA`.
- Match the Material convention that timeout `0` means no automatic dismissal.
- Stacks are grouped by screen position. For the default bottom position, the
  newest snackbar stays at the bottom and older snackbars expand upward.
- Exit animation completes before dismissal observers and stack reflow run.
- Progress sources are subscribed to once by `ImsSnackbarRef`; the existing
  `FetchIndicator` receives the resulting state and does not subscribe itself.
- Pending progress snackbars ignore their normal timeout and the stack's
  dismiss-all actions, including `ImsSnackbarService.dismiss()`. They close
  after the configured settle duration when resolved, or when their own
  delayed close button is clicked.

## Next Candidates

- Consider adding template content if a use case requires it.
- Add configurable defaults through a provider/injection token.
- Consider a queue strategy if sequential display is required.
- Add focused tests when explicitly requested.

## Assistant Handoff

Before making changes:

1. Read this file and `AGENTS.md`.
2. Keep Sass class names explicit; do not construct BEM names with `&`.
3. Update this file with API or behavior decisions.
4. Do not add or modify tests without asking the user first when tests already exist.
