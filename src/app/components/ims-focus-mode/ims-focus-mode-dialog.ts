import { CdkPortalOutlet } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { ImsButton } from '../ims-button';
import { ImsAbstractDialog, ImsDialogActions, ImsDialogContent } from '../ims-dialog';
import { IMS_FOCUS_MODE_BUFFERED_EVENTS, ImsFocusModeSession } from './ims-focus-mode.types';

/**
 * Renders one focus-mode session.
 *
 * The component owns no editing state. It projects the session's `DomPortal`,
 * installs the capture-phase buffer gate on the projection stage, and forwards
 * apply and cancel back to the session.
 */
@Component({
  selector: 'ims-focus-mode-dialog',
  standalone: true,
  imports: [CdkPortalOutlet, ImsButton, ImsDialogActions, ImsDialogContent],
  templateUrl: './ims-focus-mode-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-focus-mode-dialog',
  },
})
export class ImsFocusModeDialog extends ImsAbstractDialog<ImsFocusModeSession, boolean> {
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly destroyRef = inject(DestroyRef);

  /** The session created by the `ims-focus-mode` host that opened this dialog. */
  readonly session = this.dialogData;

  constructor() {
    super();

    afterNextRender(() => {
      const stage = this.stage().nativeElement;
      const gate = (event: Event): void => this.session.interceptStageEvent(event);

      for (const type of IMS_FOCUS_MODE_BUFFERED_EVENTS) {
        stage.addEventListener(type, gate, true);
      }

      this.destroyRef.onDestroy(() => {
        for (const type of IMS_FOCUS_MODE_BUFFERED_EVENTS) {
          stage.removeEventListener(type, gate, true);
        }
      });

      this.session.portal.element.focus();
    });
  }

  /**
   * Commits the buffered draft, then closes with an applied result.
   *
   * The guard is not redundant with the disabled action: closing on an invalid
   * draft would discard the user's work while reporting that it was applied.
   */
  apply(): void {
    if (!this.session.draftValid()) {
      return;
    }

    this.session.apply();
    this.closeDialog(true);
  }

  /** Closes without touching the control. */
  cancel(): void {
    this.closeDialog(false);
  }
}
