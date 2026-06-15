# ImsSnackbar Tracking

## Goal

Build a service-driven Angular snackbar with behavior similar to Angular Material's snackbar.

## Current State

- Starter implementation is in `src/app/components/ims-snackbar`.
- `ImsSnackbarService.open(message, action?, config?)` opens a global CDK overlay.
- Only one snackbar is active at a time; opening another dismisses the current one.
- Supported config:
  - `duration` in milliseconds; `0` keeps the snackbar open.
  - `horizontalPosition`: `start`, `center`, or `end`.
  - `verticalPosition`: `top` or `bottom`.
  - `direction`: `ltr` or `rtl`.
  - `panelClass`, `politeness`, and arbitrary injected `data`.
- `ImsSnackbarRef` exposes `dismiss()`, `dismissWithAction()`, `onAction()`, and
  `afterDismissed()`.
- Public exports are available from `src/app/components/ims-snackbar/index.ts`.
- A manual test page is available at `/snackbar` in
  `src/app/pages/snackbar-demo`.
- No test files were added because project instructions require an explicit request.

## Usage

```ts
private readonly snackbar = inject(ImsSnackbarService);

save(): void {
    const ref = this.snackbar.open('Saved', 'Undo', {duration: 5000});
    ref.onAction().subscribe(() => this.undo());
}
```

## Decisions

- Use Angular CDK Overlay instead of requiring a snackbar host in the application template.
- Keep message/action rendering internal for the first iteration.
- Match the Material convention that duration `0` means no automatic dismissal.
- Dismiss immediately for now; an exit animation can be added without changing the service API.

## Next Candidates

- Add `openFromComponent()` and `openFromTemplate()` APIs.
- Add an exit animation and defer overlay disposal until it completes.
- Add configurable defaults through a provider/injection token.
- Decide whether repeated snackbars replace, queue, or stack.
- Add focused tests when explicitly requested.

## Assistant Handoff

Before making changes:

1. Read this file and `AGENTS.md`.
2. Keep Sass class names explicit; do not construct BEM names with `&`.
3. Update this file with API or behavior decisions.
4. Do not add or modify tests without asking the user first when tests already exist.
