import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';

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
    '[attr.aria-label]': 'ariaLabel()',
    '[style.--indicator-speed]': 'animationSpeed()',
    'role': 'img',
  },
})
export class FetchIndicator {
  private readonly destroyRef = inject(DestroyRef);
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = input<FetchIndicatorState>('loading');
  readonly size = input(20);
  readonly strokeWidth = input(2.35);
  readonly animationSpeed = input(1);

  protected readonly phase = signal<FetchIndicatorPhase>('loading');

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

  constructor() {
    effect(() => {
      const state = this.state();
      const speed = this.animationSpeed();

      this.clearPhaseTimer();

      if (state === 'success') {
        this.phase.set('settling-success');
        this.phaseTimer = setTimeout(() => {
          this.phase.set('success');
          this.phaseTimer = null;
        }, Math.round(230 / speed));
        return;
      }

      if (state === 'error') {
        this.phase.set('settling-error');
        this.phaseTimer = setTimeout(() => {
          this.phase.set('error');
          this.phaseTimer = null;
        }, Math.round(150 / speed));
        return;
      }

      this.phase.set('loading');
    });

    this.destroyRef.onDestroy(() => this.clearPhaseTimer());
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer !== null) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }
}
