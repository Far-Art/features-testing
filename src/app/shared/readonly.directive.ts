import {
  Directive,
  InjectionToken,
  Signal,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

/** A readonly state exposed to descendant injectors. */
export interface ImsReadonlyStateProvider {
  readonly readonlySignal: Signal<boolean>;
  /**
   * True while no descendant may become editable. Every provider passes it
   * on, so a lock can't be dropped partway down the tree.
   */
  readonly lockedSignal: Signal<boolean>;
}

/** Generic readonly provider used by directives and component-owned scopes. */
export const IMS_READONLY_STATE = new InjectionToken<ImsReadonlyStateProvider>(
  'IMS_READONLY_STATE',
);

/** Optional inherited state supplied by another provider on the same host. */
export const IMS_READONLY_HOST_PARENT = new InjectionToken<ImsReadonlyStateProvider>(
  'IMS_READONLY_HOST_PARENT',
);

/** The state a provider resolves its own request against. */
export interface ImsReadonlyParentState {
  readonly readonly: boolean;
  readonly locked: boolean;
}

/** What one provider asks for through its inputs. */
export interface ImsReadonlyRequest {
  /** `null` and `undefined` inherit the parent state. */
  readonly readonly: boolean | null | undefined;
  /** Lets `false` replace a readonly parent. Never applies under a lock. */
  readonly overrideParent: boolean;
  /** Makes this provider and every descendant readonly, whatever they request. */
  readonly locked: boolean;
}

/** A provider's effective state. */
export interface ImsReadonlyResolution {
  readonly readonly: boolean;
  readonly locked: boolean;
  /** True when the effective state is the parent's rather than this provider's own. */
  readonly inherited: boolean;
}

/**
 * Resolves one provider's request against its parent state.
 *
 * The rules apply in order:
 * - A locked parent locks this provider. The parent decides, so the state is inherited.
 * - This provider's own lock makes it readonly and locked.
 * - `null` or `undefined` takes the parent's readonly state.
 * - `false` under a readonly parent stays readonly, and inherited, unless the
 *   override is enabled.
 * - Otherwise this provider's own value applies.
 */
export function resolveImsReadonly(
  parent: ImsReadonlyParentState,
  request: ImsReadonlyRequest,
): ImsReadonlyResolution {
  if (parent.locked) {
    return { readonly: true, locked: true, inherited: true };
  }

  if (request.locked) {
    return { readonly: true, locked: true, inherited: false };
  }

  if (request.readonly === null || request.readonly === undefined) {
    return { readonly: parent.readonly, locked: false, inherited: true };
  }

  if (!request.readonly && parent.readonly && !request.overrideParent) {
    return { readonly: true, locked: false, inherited: true };
  }

  return { readonly: request.readonly === true, locked: false, inherited: false };
}

/**
 * Provides a readonly state to the host and its descendants.
 *
 * A child provider may always make an inherited `false` value readonly. It may
 * only make an inherited `true` value writable when `ims-readonly-override-parent`
 * is explicitly enabled. `ims-readonly-locked` makes the host and every
 * descendant readonly with no way to override it.
 */
@Directive({
  selector: '[ims-readonly], [ims-readonly-locked]',
  standalone: true,
  providers: [
    {
      provide: IMS_READONLY_STATE,
      useExisting: forwardRef(() => ReadonlyDirective),
    },
  ],
  host: {
    '[class.ims-readonly]': 'readonlySignal()',
    '[class.ims-readonly-locked]': 'lockedSignal()',
    '[attr.disabled]': 'disabledAttribute()',
    '[attr.ims-readonly-provider]': 'inherited() ? null : readonlySignal()',
    '[attr.ims-readonly-inherited]': 'inherited() ? readonlySignal() : null',
    '[attr.ims-readonly-lock-provider]': 'lockProvider() ? "" : null',
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

  /**
   * Allows this provider to explicitly replace an inherited readonly state.
   *
   * A model so callers can also set it programmatically; a model takes no
   * transform, so the value is coerced with `booleanAttribute` where it is read
   * and a bare attribute (an empty string) enables it.
   */
  readonly overrideParent = model<boolean | string | null | undefined>(false, {
    alias: 'ims-readonly-override-parent',
  });

  /** Makes this host and every descendant readonly. Nothing below can override it. */
  readonly locked = input<boolean, boolean | string | null | undefined>(false, {
    alias: 'ims-readonly-locked',
    transform: booleanAttribute,
  });

  /** An inherited state supplied by another provider on this host, if any. */
  private readonly hostParentProvider = inject(IMS_READONLY_HOST_PARENT, {
    optional: true,
    self: true,
  });

  /** The inherited state from the nearest ancestor provider, if any. */
  private readonly parentReadonlyProvider = inject(IMS_READONLY_STATE, {
    optional: true,
    skipSelf: true,
  });

  /** Whether the nearest ancestor provider is locked. A host parent doesn't count. */
  private readonly ancestorLocked = computed(
    () => this.parentReadonlyProvider?.lockedSignal() ?? false,
  );

  private readonly state = computed(() =>
    resolveImsReadonly(
      {
        readonly:
          this.hostParentProvider?.readonlySignal() ??
          this.parentReadonlyProvider?.readonlySignal() ??
          false,
        locked: (this.hostParentProvider?.lockedSignal() ?? false) || this.ancestorLocked(),
      },
      {
        readonly: this.readonly(),
        overrideParent: booleanAttribute(this.overrideParent()),
        locked: this.locked(),
      },
    ),
  );

  /** Effective readonly state consumed by descendants. */
  readonly readonlySignal: Signal<boolean> = computed(() => this.state().readonly);

  /** Effective lock passed to descendants. */
  readonly lockedSignal: Signal<boolean> = computed(() => this.state().locked);

  /** Whether the effective state is the parent's rather than this provider's own. */
  protected readonly inherited = computed(() => this.state().inherited);

  /** Whether a lock starts at this host: it is locked and its ancestor is not. */
  protected readonly lockProvider = computed(() => this.lockedSignal() && !this.ancestorLocked());

  /** Disabled state of a control on this same host, once it shares one. */
  private readonly hostDisabled = signal<Signal<boolean> | null>(null);

  /** Set while readonly, and while a control on this host is disabled. */
  protected readonly disabledAttribute = computed(() =>
    this.readonlySignal() || this.hostDisabled()?.() ? '' : null,
  );
}
