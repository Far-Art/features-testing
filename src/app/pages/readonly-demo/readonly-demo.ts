import { ChangeDetectionStrategy, Component, Signal, signal } from '@angular/core';
import { ReadonlyDirective } from '../../shared/readonly.directive';

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
  imports: [ReadonlyDirective, ReadonlyState],
  templateUrl: './readonly-demo.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './readonly-demo.scss',
})
export class ReadonlyDemo {
  readonly pageReadonly = signal(true);
  readonly allowChildOverride = signal(false);

  togglePageReadonly(): void {
    this.pageReadonly.update((readonly) => !readonly);
  }

  toggleChildOverride(): void {
    this.allowChildOverride.update((override) => !override);
  }
}
