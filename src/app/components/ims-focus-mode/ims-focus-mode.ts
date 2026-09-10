import { DomPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Signal,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  NgControl,
  ValidationErrors,
  ValueChangeEvent,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { IMS_BUTTON_EDIT_ICON, ImsButtonEdit, ImsButtonIcon } from '../ims-button';
import { ImsIcon } from '../ims-icon';
import { ImsDialogRef, ImsDialogService } from '../ims-dialog';
import {
  ImsTextFieldElement,
  imsControlState,
  isImsTextField,
} from '../../shared/ims-control-state';
import { ImsFocusModeDialog } from './ims-focus-mode-dialog';
import { ImsFocusModeTrigger } from './ims-focus-mode-trigger';
import {
  IMS_FOCUS_MODE_LABELS,
  ImsFocusModeLabels,
  ImsFocusModeSession,
} from './ims-focus-mode.types';

/**
 * Opens its projected field in a dialog with room to read and edit.
 *
 * The dialog hosts the *real* control. A CDK `DomPortal` moves the element into
 * the dialog and restores it to its original position on close, so `NgControl`,
 * every validator, and the value accessor stay the same instances throughout —
 * nothing is recreated and nothing has to be kept in sync.
 *
 * Edits are buffered: keystrokes are stopped before Angular's value accessor
 * sees them and held in `draft`. Apply replays the draft through the normal
 * view-to-model pipeline; Cancel needs no model work at all, because the
 * control was never modified.
 *
 * @example
 * ```html
 * <ims-focus-mode label="הערות">
 *     <textarea imsInput [formControl]="notes"></textarea>
 * </ims-focus-mode>
 * ```
 */
@Component({
  selector: 'ims-focus-mode',
  standalone: true,
  imports: [ImsButtonEdit, ImsButtonIcon, ImsFocusModeTrigger, ImsIcon],
  templateUrl: './ims-focus-mode.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-focus-mode',
    // The adjacent-action layout exists to seat a field and its button
    // together. A named field is seated by its own container instead, and the
    // host is then nothing but the trigger.
    '[class.ims-input-action]': '!external()',
    '[class.ims-focus-mode--open]': 'open()',
  },
})
export class ImsFocusMode {
  private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
  private readonly dialogService = inject(ImsDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injectedLabels = inject(IMS_FOCUS_MODE_LABELS);

  /** Dialog title. Falls back to the trigger's accessible name when empty. */
  readonly label = input('');

  /** Per-instance label overrides merged over the injected label set. */
  readonly labels = input<Partial<ImsFocusModeLabels> | null>(null);

  /**
   * Free-form note describing what the field expects — a readable spelling of a
   * pattern, a unit, an example value.
   *
   * Shown in the dialog footer and announced as the field's description, so it
   * reaches someone who cannot see the footer. This is the caller's own text;
   * the required note and character count are derived and need no input.
   *
   * @example
   * ```html
   * <ims-focus-mode label="אסמכתא" hint="בפורמט REF-0000-0000">
   *     <input imsInput [formControl]="reference"/>
   * </ims-focus-mode>
   * ```
   */
  readonly hint = input('');

  /**
   * The field to open, when it does not sit inside this host.
   *
   * Projection is the common case and needs nothing here. Some layouts cannot
   * put the two together though — a grid row that carries the field in one
   * column and its actions in another — and there the field is named instead.
   *
   * @example
   * ```html
   * <ims-grid-cell><input imsInput #amount [formControl]="cost"/></ims-grid-cell>
   * <ims-grid-cell><ims-focus-mode [field]="amount" [control]="cost"/></ims-grid-cell>
   * ```
   */
  readonly field = input<ImsTextFieldElement | ElementRef<ImsTextFieldElement> | null>(null);

  /**
   * The control behind a named field.
   *
   * Optional, and only meaningful alongside `field`: a named element carries no
   * reference back to its directives, so the control cannot be discovered the
   * way a projected one can. Without it the dialog still buffers, applies and
   * reads the field's native constraints — it just has no validators to report
   * on, so the required note and any validator-declared length limit are
   * unavailable.
   */
  readonly control = input<AbstractControl | NgControl | null>(null);

  private readonly projectedControl = contentChild(NgControl);
  private readonly projectedControlRef = contentChild(NgControl, { read: ElementRef });
  /** Resolved field for a projected control without an Angular form binding. */
  private readonly fallbackElement = signal<ImsTextFieldElement | null>(null);
  /** Bumped once rendering settles, when `NgControl.control` is finally set. */
  private readonly controlRevision = signal(0);

  /** True while this host drives a field that lives somewhere else. */
  readonly external = computed(() => this.field() !== null);

  /** The field this component drives, named or projected. */
  readonly fieldElement: Signal<ImsTextFieldElement | null> = computed(() => {
    const named = this.field();

    if (named !== null) {
      const element = named instanceof ElementRef ? named.nativeElement : named;
      return isImsTextField(element) ? element : null;
    }

    const projected = this.projectedControlRef()?.nativeElement;
    return isImsTextField(projected) ? projected : this.fallbackElement();
  });

  /** The Angular control bound to that field, when one can be reached. */
  readonly resolvedControl: Signal<AbstractControl | null> = computed(() => {
    this.controlRevision();
    const named = this.control();

    if (named !== null) {
      return named instanceof NgControl ? named.control : named;
    }

    return this.projectedControl()?.control ?? null;
  });

  private readonly state = imsControlState({
    element: this.fieldElement,
    control: this.resolvedControl,
  });

  /** True only while the projected field accepts user edits. */
  readonly editable = this.state.editable;

  /** True while the field is away in the dialog. */
  readonly open = signal(false);

  /** Buffered value shown in the dialog and in the placeholder. */
  readonly draft = signal('');

  /**
   * Stand-in occupying the field's place while it is away in the dialog.
   *
   * It is a clone of the field itself, so it reproduces that element's box
   * exactly — intrinsic sizing, `rows`, a user's resized height, and the
   * inline-level baseline behaviour that no substitute element reproduces.
   */
  private readonly placeholder = signal<ImsTextFieldElement | null>(null);

  /** Length of the buffered value, shown in the dialog. */
  readonly draftLength = computed(() => this.draft().length);

  /**
   * Length limit the field enforces, from the element or from a validator.
   *
   * The element's own limit wins, because that is the one the browser actually
   * enforces. It is read through the state helper rather than off the element
   * so this stays reactive — a limit read directly in a computed would never
   * be recomputed when it changed.
   */
  readonly maxLength = computed(
    () => this.state.nativeMaxLength() ?? readValidatorMaxLength(this.resolvedControl()),
  );

  /** Errors the field's own validators report for the buffered value. */
  private readonly draftErrors = computed(() => runValidator(this.resolvedControl(), this.draft()));

  /** True while the buffered value satisfies the field's own validators. */
  readonly draftValid = computed(() => this.draftErrors() === null);

  /**
   * True when the field must be filled in.
   *
   * Probed with an empty value, since that is the one input every `required`
   * validator rejects. The other common validators — length and pattern — pass
   * an empty value by design, so they cannot be mistaken for this one.
   */
  readonly required = computed(
    () => this.state.nativeRequired() || runValidator(this.resolvedControl(), '')?.['required'] === true,
  );

  /** True while the buffered value leaves that requirement unmet. */
  readonly requiredUnmet = computed(() => this.draftErrors()?.['required'] === true);

  readonly effectiveLabels = computed<ImsFocusModeLabels>(() => ({
    ...this.injectedLabels,
    ...(this.labels() ?? {}),
  }));

  /**
   * Glyph for the dialog title, matching whichever trigger is rendered.
   *
   * The editable trigger is `ims-button-edit`, which pins its own glyph, so the
   * value is taken from that preset rather than restated here.
   */
  readonly triggerIcon = computed(() => (this.editable() ? IMS_BUTTON_EDIT_ICON : 'zoom_in'));

  readonly triggerLabel = computed(() =>
    this.editable() ? this.effectiveLabels().edit : this.effectiveLabels().zoom,
  );

  /**
   * Trigger tooltip: the same action as {@link triggerLabel}, but naming the
   * field it acts on — which is what a pointer user needs, since the button
   * is a bare glyph and may sit a column away from the field it opens.
   *
   * Falls back to the unnamed accessible name when the host carries no
   * `label`. There is nothing to name then, and the generic phrasing already
   * on the button says more than a bare verb would.
   */
  readonly triggerTooltip = computed(() => {
    const name = this.label().trim();
    if (name.length === 0) return this.triggerLabel();

    const labels = this.effectiveLabels();
    const template = this.editable() ? labels.editNamed : labels.zoomNamed;
    return template.replaceAll('{name}', name);
  });

  private readonly activeDialog = signal<ImsDialogRef<boolean | undefined> | null>(null);
  private valueSubscription: Subscription | null = null;
  private closedSubscription: Subscription | null = null;
  private snapshot = '';
  /** True only while `apply()` replays the draft, which must reach the accessor. */
  private committing = false;

  constructor() {
    afterNextRender(() => {
      this.controlRevision.update((revision) => revision + 1);

      if (!this.external() && !this.projectedControlRef()) {
        this.fallbackElement.set(
          this.hostElement.querySelector<ImsTextFieldElement>('input, textarea'),
        );
      }
    });

    // The consumer writes a plain field; the shared adjacent-action layout is
    // this component's concern, so it applies the field class itself.
    effect((onCleanup) => {
      const element = this.fieldElement();

      if (!element || this.external()) {
        return;
      }

      element.classList.add('ims-input-action__field');
      onCleanup(() => element.classList.remove('ims-input-action__field'));
    });

    // While the field is in the dialog, hand its length limit to the browser so
    // typing stops at the limit instead of running past it into an error.
    //
    // Setting the attribute rather than rejecting keystrokes in the buffer gate
    // is what keeps caret position, selection replacement, paste truncation and
    // IME composition correct — all of which the platform already handles for
    // `maxlength` and none of which a hand-rolled guard gets right for free.
    //
    // Scoped to the dialog: a limit the consumer expressed as a validator is
    // theirs to enforce in their own form row, and quietly making their field
    // reject input everywhere is not focus mode's call to make.
    effect((onCleanup) => {
      const element = this.fieldElement();
      const limit = this.maxLength();

      if (!this.open() || !element || limit === null) {
        return;
      }

      const original = element.getAttribute('maxlength');
      element.maxLength = limit;

      onCleanup(() => {
        if (original === null) {
          element.removeAttribute('maxlength');
          return;
        }

        element.setAttribute('maxlength', original);
      });
    });

    // Colour the projected field by the buffered value.
    //
    // `.ng-invalid` is maintained by Angular from the control's own status, and
    // the control still holds the value the user started from — so left alone
    // the field's border keeps reporting on a value that is no longer on
    // screen, and never moves as the user types their way in or out of an
    // error. Focus mode states the draft's validity instead, on the same terms
    // the field uses in its form row.
    //
    // Scoped to the dialog and removed on close: outside it the control's own
    // status is the accurate one again.
    effect((onCleanup) => {
      const element = this.fieldElement();

      if (!this.open() || !element) {
        return;
      }

      const state = this.draftValid()
        ? 'ims-focus-mode__field--valid'
        : 'ims-focus-mode__field--invalid';

      element.classList.add(state);
      onCleanup(() => element.classList.remove(state));
    });

    // The stand-in shows the buffered value, so the row reads as the user's
    // work in progress rather than the value they have already moved past.
    effect(() => {
      const placeholder = this.placeholder();

      if (placeholder) {
        placeholder.value = this.draft();
      }
    });

    // Requirement: a control that becomes disabled or readonly while the dialog
    // is open takes the dialog readonly with it.
    effect(() => {
      this.activeDialog()?.setReadonly(!this.editable());
    });

    this.destroyRef.onDestroy(() => {
      this.releaseSubscriptions();
      this.activeDialog()?.close();
    });
  }

  /** Opens the projected field in a focus-mode dialog. */
  openFocusMode(): void {
    const element = this.fieldElement();

    if (!element || this.open()) {
      return;
    }

    this.snapshot = element.value;
    this.draft.set(element.value);
    this.showPlaceholder(element);
    this.open.set(true);

    const session: ImsFocusModeSession = {
      portal: new DomPortal(new ElementRef(element)),
      editable: this.editable,
      draft: this.draft,
      length: this.draftLength,
      maxLength: this.maxLength,
      draftValid: this.draftValid,
      hint: this.hint,
      required: this.required,
      requiredUnmet: this.requiredUnmet,
      labels: this.effectiveLabels(),
      interceptStageEvent: (event) => this.interceptStageEvent(event),
      apply: () => this.applyDraft(),
    };

    const dialogRef = this.dialogService
      .info(ImsFocusModeDialog)
      .title(this.label() || this.triggerLabel())
      .withIcon(this.triggerIcon())
      .data(session)
      .config({ width: 'min(48rem, calc(100vw - 2rem))' })
      .open<boolean | undefined>();

    this.activeDialog.set(dialogRef);
    this.watchExternalValueChanges();
    this.closedSubscription = dialogRef.closed.subscribe((result) => this.finish(result === true));
  }

  /**
   * Gates one buffered event on its way down to the projected element.
   *
   * Capture-phase `stopPropagation` on an ancestor prevents the event from ever
   * reaching the element's own listeners, which is where Angular's value
   * accessor lives. The draft is read from the element afterwards, so composed
   * text and `ImsInputDirective`'s trimming paste both land correctly.
   */
  private interceptStageEvent(event: Event): void {
    if (this.committing) {
      return;
    }

    event.stopPropagation();

    if (!this.editable()) {
      return;
    }

    const element = this.fieldElement();

    if (element && (event.type === 'input' || event.type === 'compositionend')) {
      this.draft.set(element.value);
    }
  }

  /**
   * Replays the buffered draft as real user input.
   *
   * Dispatching events rather than calling `control.setValue()` is what makes
   * this work for template-driven forms too: `setValue()` never emits
   * `ngModelChange`, so a `[(ngModel)]`-bound property would silently keep the
   * old value. The trailing `blur` marks the control touched and commits
   * controls configured with `updateOn: 'blur'`.
   */
  private applyDraft(): void {
    const element = this.fieldElement();

    if (!element || !this.editable() || !this.draftValid()) {
      return;
    }

    this.committing = true;

    try {
      element.value = this.draft();
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new FocusEvent('blur'));
    } finally {
      this.committing = false;
    }
  }

  /**
   * Re-seeds the buffer when the control is written from outside the dialog.
   *
   * The external write wins, which is what would have happened with no dialog
   * open. Without this the draft would silently overwrite it on apply.
   *
   * The comparison is what makes this safe: `disable()` and `enable()` also
   * emit a value change even though the value is untouched. Re-seeding on those
   * would capture the user's in-flight draft as the snapshot, and cancel would
   * then "restore" the very edits it is supposed to discard.
   */
  private watchExternalValueChanges(): void {
    const control = this.resolvedControl();

    if (!control) {
      return;
    }

    this.valueSubscription = control.events.subscribe((event) => {
      if (this.committing || !(event instanceof ValueChangeEvent)) {
        return;
      }

      const value = normalizeFieldValue(control.value);

      if (value === this.snapshot) {
        return;
      }

      this.snapshot = value;
      this.draft.set(value);

      const element = this.fieldElement();

      if (element) {
        element.value = value;
      }
    });
  }

  /** Restores the field after any close that was not an apply. */
  private finish(applied: boolean): void {
    const element = this.fieldElement();

    if (!applied && element) {
      element.value = this.snapshot;
    }

    this.releaseSubscriptions();
    this.activeDialog.set(null);
    this.removePlaceholder();
    this.open.set(false);
  }

  /**
   * Puts a clone of the field in its own place, immediately before it.
   *
   * Cloning is what keeps the row from moving: the stand-in carries the same
   * tag, classes, attributes and inline styles, so it lays out identically
   * without anything having to be measured or reserved.
   *
   * CDK inserts its restore anchor directly before the element, which is after
   * this clone, so the field returns to exactly this position on close.
   */
  private showPlaceholder(element: ImsTextFieldElement): void {
    const clone = element.cloneNode(false) as ImsTextFieldElement;

    // A clone carries the original's identity attributes, which must not be
    // duplicated in the document: `ims-form-field` resolves its label by id.
    clone.removeAttribute('id');
    clone.removeAttribute('name');
    clone.classList.add('ims-focus-mode__placeholder');
    clone.setAttribute('data-ims-focus-mode-placeholder', '');
    clone.setAttribute('aria-hidden', 'true');
    clone.disabled = true;
    clone.value = this.draft();

    element.parentNode?.insertBefore(clone, element);
    this.placeholder.set(clone);
  }

  private removePlaceholder(): void {
    this.placeholder()?.remove();
    this.placeholder.set(null);
  }

  private releaseSubscriptions(): void {
    this.valueSubscription?.unsubscribe();
    this.valueSubscription = null;
    this.closedSubscription?.unsubscribe();
    this.closedSubscription = null;
  }
}

/** Matches how a text value accessor writes a control value into the DOM. */
function normalizeFieldValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Value used to ask a validator what length it enforces.
 *
 * `Validators.maxLength` inspects nothing but `value.length`, so a probe
 * carrying only a length answers the question without allocating a string long
 * enough to fail a limit that is not known yet.
 */
const LENGTH_PROBE = { length: Number.MAX_SAFE_INTEGER };

/**
 * Recovers the length limit a control's validators enforce.
 *
 * Validators are opaque functions, so the only way to learn the limit is to run
 * one against a value that fails it and read `requiredLength` off the error.
 */
function readValidatorMaxLength(control: AbstractControl | null): number | null {
  const requiredLength: unknown = runValidator(control, LENGTH_PROBE)?.['maxlength']?.[
    'requiredLength'
  ];

  return typeof requiredLength === 'number' && requiredLength > 0 ? requiredLength : null;
}

/**
 * Runs a control's own validators against a candidate value.
 *
 * The candidate is wrapped in a detached control so every validator receives
 * the shape it expects. A validator that reaches past its own control — for a
 * parent or a sibling — cannot be answered by a detached probe; those are
 * treated as satisfied rather than left to block the dialog on a question that
 * cannot be asked here.
 */
function runValidator(control: AbstractControl | null, value: unknown): ValidationErrors | null {
  const validator = control?.validator;

  if (!validator) {
    return null;
  }

  try {
    return validator(new FormControl(value));
  } catch {
    return null;
  }
}
