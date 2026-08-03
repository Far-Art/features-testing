import { Directive, Signal, computed, inject, model, signal } from '@angular/core';

/**
 * Provides a readonly state to the host and its descendants.
 *
 * A child provider may always make an inherited `false` value readonly. It may
 * only make an inherited `true` value writable when `ims-readonly-override-parent`
 * is explicitly enabled.
 */
@Directive({
  selector: '[ims-readonly]',
  standalone: true,
  host: {
    '[class.ims-readonly]': 'readonlySignal()',
    '[attr.disabled]': 'readonlySignal() ? "" : null',
    '[attr.ims-readonly-provider]': 'readonlySignal()',
  },
})
export class ReadonlyDirective {
  /** Injects the nearest readonly provider, or a `false` signal when none exists. */
  static injectSignal(): Signal<boolean> {
    return inject(ReadonlyDirective, { optional: true })?.readonlySignal ?? signal(false);
  }

  /** Local readonly state. `null` and `undefined` inherit the parent state. */
  readonly readonly = model<boolean | null | undefined>(null, { alias: 'ims-readonly' });

  /** Allows this provider to explicitly replace an inherited readonly state. */
  readonly overrideParent = model<boolean | ''>(false, { alias: 'ims-readonly-override-parent' });

  /** The inherited state from the nearest ancestor provider, if any. */
  private readonly parentReadonlyDirective = inject(ReadonlyDirective, {
    optional: true,
    skipSelf: true,
  });

  /** Effective readonly state consumed by descendants. */
  readonly readonlySignal: Signal<boolean> = computed(() => {
    const parentReadonly = this.parentReadonlyDirective?.readonlySignal() ?? false;
    const localReadonly = this.readonly();

    if (localReadonly === null || localReadonly === undefined) {
      return parentReadonly;
    }

    if (localReadonly || !parentReadonly || this.overrideParent() === true) {
      return localReadonly;
    }

    return true;
  });
}
