/**
 * Which voice a panel speaks in.
 *
 * The four status words are the same ones as `ImsButtonSeverity`,
 * `ImsSnackbarSeverity`, `ImsTooltipSeverity` and `ImsDialogSeverity`, so one
 * word means the same thing wherever the application reports state.
 *
 * `neutral` is the addition, and it is the default. A button that names no
 * severity is still reporting something — it is an action, and `info` is the
 * house blue every action has always been. A container is not: most panels
 * group content that carries no state at all, so the one a call site does not
 * tone is grey, and `info` becomes a thing you ask for rather than a thing you
 * get. That inverts the button's default on purpose; the words still line up.
 */
export type ImsPanelSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
