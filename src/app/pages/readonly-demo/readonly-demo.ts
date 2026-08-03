import { ChangeDetectionStrategy, Component, Signal, signal } from '@angular/core';
import { ImsAutocomplete, type ImsAutocompleteOption } from '../../components/ims-autocomplete';
import { ImsOption, ImsSelect } from '../../components/ims-select';
import { ReadonlyDirective } from '../../shared/readonly.directive';

type ContactMethod = 'Email' | 'Phone' | 'Text message';

@Component({
  selector: 'app-readonly-state',
  template: `
    <span class="readonly-state" [class.readonly-state--locked]="readonly()">
      <span class="readonly-state__lamp" aria-hidden="true"></span>
      {{ readonly() ? 'Readonly' : 'Editable' }}
    </span>
  `,
  styles: `
    .readonly-state {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: #21634c;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .readonly-state__lamp {
      width: 0.56rem;
      height: 0.56rem;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 12%, transparent);
    }

    .readonly-state--locked {
      color: #a84132;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ReadonlyState {
  readonly readonly: Signal<boolean> = ReadonlyDirective.injectSignal();
}

@Component({
  selector: 'app-readonly-demo',
  imports: [ReadonlyDirective, ReadonlyState, ImsSelect, ImsOption, ImsAutocomplete],
  templateUrl: './readonly-demo.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './readonly-demo.scss',
})
export class ReadonlyDemo {
  readonly pageReadonly = signal(true);
  readonly allowChildOverride = signal(false);
  readonly contactMethods: readonly ContactMethod[] = ['Email', 'Phone', 'Text message'];
  readonly contactMethodOptions: readonly ImsAutocompleteOption<ContactMethod>[] = this.contactMethods.map(
    (method) => ({ value: method, label: method })
  );
  readonly preferredContactMethod = signal<ContactMethod | readonly ContactMethod[] | null | undefined>(
    'Email'
  );
  readonly preferredContactMethodAutocomplete = signal<
    ContactMethod | string | readonly ContactMethod[] | null | undefined
  >('Phone');

  togglePageReadonly(): void {
    this.pageReadonly.update((readonly) => !readonly);
  }

  toggleChildOverride(): void {
    this.allowChildOverride.update((override) => !override);
  }
}
