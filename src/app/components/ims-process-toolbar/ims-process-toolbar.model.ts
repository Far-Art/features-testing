/**
 * Which voice a message speaks in.
 *
 * The four status words are the ones `ImsPanelSeverity`, `ImsSnackbarSeverity` and
 * `ImsButtonSeverity` use, so one word means the same thing wherever the application
 * reports state. `neutral` is the default, for a message with no state to report.
 */
export type ImsProcessToolbarSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** A single message shown in the {@link ImsProcessToolbar}. */
export interface ImsProcessToolbarMessage {
    /** Stable identity used for tracking. */
    id: string | number;
    /** The message. A message too long for one line wraps. */
    text: string;
    /** Tone of the glyph that leads the message. Defaults to `neutral`. */
    severity?: ImsProcessToolbarSeverity;
}
