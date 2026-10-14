import {
  Directive,
  InjectionToken,
  Signal,
  computed,
  forwardRef,
  inject,
  model,
  signal,
} from '@angular/core';

/** A readonly state exposed to descendant injectors. */
export interface ImsReadonlyStateProvider {
  readonly readonlySignal: Signal<boolean>;
}

/** Generic readonly provider used by directives and component-owned scopes. */
export const IMS_READONLY_STATE = new InjectionToken<ImsReadonlyStateProvider>(
  'IMS_READONLY_STATE',
);

/** Optional inherited state supplied by another provider on the same host. */
export const IMS_READONLY_HOST_PARENT = new InjectionToken<Signal<boolean>>(
  'IMS_READONLY_HOST_PARENT',
);

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
  providers: [
    {
      provide: IMS_READONLY_STATE,
      useExisting: forwardRef(() => ReadonlyDirective),
    },
  ],
  host: {
    '[class.ims-readonly]': 'readonlySignal()',
    '[attr.disabled]': 'disabledAttribute()',
    '[attr.ims-readonly-provider]': 'readonlySignal()',
  },
})
export class ReadonlyDirective implements ImsReadonlyStateProvider {
  /** Injects the nearest readonly provider, or a `false` signal when none exists. */
  static injectSignal(): Signal<boolean> {
    return inject(IMS_READONLY_STATE, { optional: true })?.readonlySignal ?? signal(false);
  }

  /**
   * Hands a control's own disabled state to an `ims-readonly` on the same host.
   *
   * Both write the host's `disabled` attribute, and this directive's binding
   * runs after the control's. Left alone, `[ims-readonly]="false"` on a
   * disabled control would remove the attribute the control just set. With
   * the control's state shared, both bindings compute the same value.
   *
   * Call from the control's constructor. Does nothing when the host carries no
   * `ims-readonly`.
   */
  static shareHostDisabled(disabled: Signal<boolean>): void {
    const provider = inject(IMS_READONLY_STATE, { optional: true, self: true });
    if (provider instanceof ReadonlyDirective) {
      provider.hostDisabled.set(disabled);
    }
  }

  /** Local readonly state. `null` and `undefined` inherit the parent state. */
  readonly readonly = model<boolean | null | undefined>(null, { alias: 'ims-readonly' });

  /** Allows this provider to explicitly replace an inherited readonly state. */
  readonly overrideParent = model<boolean | ''>(false, { alias: 'ims-readonly-override-parent' });

  /** An inherited state supplied by another provider on this host, if any. */
  private readonly hostParentReadonly = inject(IMS_READONLY_HOST_PARENT, {
    optional: true,
    self: true,
  });

  /** The inherited state from the nearest ancestor provider, if any. */
  private readonly parentReadonlyProvider = inject(IMS_READONLY_STATE, {
    optional: true,
    skipSelf: true,
  });

  /** Effective readonly state consumed by descendants. */
  readonly readonlySignal: Signal<boolean> = computed(() => {
    const parentReadonly =
      this.hostParentReadonly?.() ?? this.parentReadonlyProvider?.readonlySignal() ?? false;
    const localReadonly = this.readonly();

    if (localReadonly === null || localReadonly === undefined) {
      return parentReadonly;
    }

    if (localReadonly || !parentReadonly || this.overrideParent() === true) {
      return localReadonly;
    }

    return true;
  });

  /** Disabled state of a control on this same host, once it shares one. */
  private readonly hostDisabled = signal<Signal<boolean> | null>(null);

  /** Set while readonly, and while a control on this host is disabled. */
  protected readonly disabledAttribute = computed(() =>
    this.readonlySignal() || this.hostDisabled()?.() ? '' : null,
  );
}
