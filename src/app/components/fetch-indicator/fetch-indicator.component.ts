import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { concat, map, of, switchMap, timer } from 'rxjs';

export type FetchIndicatorState = 'loading' | 'success' | 'error';
type FetchIndicatorPhase =
  | 'loading'
  | 'settling-success'
  | 'success'
  | 'settling-error'
  | 'error';

@Component({
  selector: 'app-fetch-indicator',
  imports: [],
  templateUrl: './fetch-indicator.component.html',
  styleUrl: './fetch-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  host: {
    class: 'snackbar-fetch-indicator-host',
    '[attr.aria-label]': 'ariaLabel()',
    '[style.--indicator-speed]': 'animationSpeed()',
    'role': 'img',
  },
})
export class FetchIndicator {
  readonly state = input<FetchIndicatorState>('loading');
  readonly size = input(20);
  readonly strokeWidth = input(2.35);
  readonly animationSpeed = input(1);

  protected readonly phase = toSignal(
    toObservable(this.state).pipe(
      switchMap(state => {
        const speed = this.animationSpeed();
        if (state === 'success') return concat(
          of<FetchIndicatorPhase>('settling-success'),
          timer(Math.round(230 / speed)).pipe(map((): FetchIndicatorPhase => 'success')),
        );
        if (state === 'error') return concat(
          of<FetchIndicatorPhase>('settling-error'),
          timer(Math.round(150 / speed)).pipe(map((): FetchIndicatorPhase => 'error')),
        );
        return of<FetchIndicatorPhase>('loading');
      }),
    ),
    { initialValue: 'loading' as FetchIndicatorPhase },
  );

  protected readonly isLoading = computed(() => this.phase() === 'loading');
  protected readonly isSettlingSuccess = computed(() => this.phase() === 'settling-success');
  protected readonly isSuccess = computed(() => this.phase() === 'success');
  protected readonly isSettlingError = computed(() => this.phase() === 'settling-error');
  protected readonly isError = computed(() => this.phase() === 'error');
  protected readonly ariaLabel = computed(() => {
    switch (this.state()) {
      case 'success': return 'Request completed successfully';
      case 'error': return 'Request failed';
      default: return 'Request in progress';
    }
  });
}
