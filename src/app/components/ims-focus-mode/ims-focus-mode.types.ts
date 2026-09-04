import { DomPortal } from '@angular/cdk/portal';
import { InjectionToken, Signal } from '@angular/core';

/** Text shown by the focus-mode trigger and dialog actions. */
export interface ImsFocusModeLabels {
  /** Commits the buffered draft to the control. */
  readonly apply: string;
  /** Discards the buffered draft. */
  readonly cancel: string;
  /** Accessible name of the trigger while the field is editable. */
  readonly edit: string;
  /** Accessible name of the trigger while the field is disabled or readonly. */
  readonly zoom: string;
  /** Unit shown after the character count when the field has no length limit. */
  readonly characters: string;
  /** Note shown while the field must be filled in. */
  readonly required: string;
}

export const IMS_FOCUS_MODE_DEFAULT_LABELS: ImsFocusModeLabels = {
  apply: 'אשר',
  cancel: 'בטל',
  edit: 'עריכה במסך מלא',
  zoom: 'הצגה מוגדלת',
  characters: 'תווים',
  required: 'שדה חובה',
};

/** Application-wide focus-mode labels. Override with a provider at the root. */
export const IMS_FOCUS_MODE_LABELS = new InjectionToken<ImsFocusModeLabels>(
  'IMS_FOCUS_MODE_LABELS',
  {
    providedIn: 'root',
    factory: () => IMS_FOCUS_MODE_DEFAULT_LABELS,
  },
);

/** Events the dialog gates so buffered edits never reach the value accessor. */
export const IMS_FOCUS_MODE_BUFFERED_EVENTS: readonly string[] = [
  'input',
  'change',
  'blur',
  'compositionstart',
  'compositionend',
];

/**
 * One editing session, created by `ImsFocusMode` and rendered by
 * `ImsFocusModeDialog`.
 *
 * The dialog owns no state of its own; it projects the portal, mirrors the
 * session signals, and forwards user intent back through these methods.
 */
export interface ImsFocusModeSession {
  /** The caller's real field element, moved into the dialog and back again. */
  readonly portal: DomPortal;
  /** True while the projected control accepts edits. */
  readonly editable: Signal<boolean>;
  /** Buffered value. Never written to the control before `apply()`. */
  readonly draft: Signal<string>;
  /** Length of the buffered value. */
  readonly length: Signal<number>;
  /** Length limit the field enforces, when it has one. */
  readonly maxLength: Signal<number | null>;
  /**
   * True while the buffered value satisfies the field's own validators.
   *
   * Because edits are buffered, the control's own `status` describes the value
   * the user started from, not the one they are typing — so validity is
   * evaluated against the draft instead.
   */
  readonly draftValid: Signal<boolean>;
  /** True when the field must be filled in. */
  readonly required: Signal<boolean>;
  /** True while the buffered value leaves that requirement unmet. */
  readonly requiredUnmet: Signal<boolean>;
  readonly labels: ImsFocusModeLabels;
  /**
   * Capture-phase gate installed by the dialog on the projection stage.
   *
   * Stops buffered events before they reach the element's own listeners, so
   * Angular's value accessor never observes a keystroke.
   */
  interceptStageEvent(event: Event): void;
  /** Commits the buffered draft through the normal view-to-model pipeline. */
  apply(): void;
}
