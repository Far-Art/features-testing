import { Directive, signal } from '@angular/core';
import { IMS_READONLY_STATE } from '../../shared/readonly.directive';

/**
 * Marks the button that opens focus mode for its field.
 *
 * The trigger deliberately opts out of any inherited readonly scope.
 * `ImsButtonBase.interactionDisabled` is `disabled || readonly`, so a plain
 * `ims-button-icon` inside a readonly scope would disable itself — exactly when
 * the zoom-in button has to stay usable. Providing a constant `false` state on
 * this node lets the button on the same host resolve an editable scope while
 * every other descendant of the real provider stays readonly.
 *
 * The `data-ims-focus-mode-trigger` marker also keeps `ImsFormField` from
 * adopting this button as a field's labelable control.
 */
@Directive({
  selector: 'button[ims-focus-mode-trigger]',
  standalone: true,
  providers: [
    {
      provide: IMS_READONLY_STATE,
      useValue: { readonlySignal: signal(false) },
    },
  ],
  host: {
    'data-ims-focus-mode-trigger': '',
  },
})
export class ImsFocusModeTrigger {}
