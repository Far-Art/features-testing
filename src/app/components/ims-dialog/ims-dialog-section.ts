import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  forwardRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import {
  IMS_READONLY_HOST_PARENT,
  IMS_READONLY_STATE,
  ImsReadonlyStateProvider,
} from '../../shared/readonly.directive';
import { ImsDialogSection, ImsDialogSectionRegistry } from './ims-dialog-section-registry';
import { IMS_DIALOG_CONFIG, ImsDialogRuntimeConfig } from './ims-dialog.types';

@Directive()
abstract class ImsDialogSectionBase implements OnInit, OnDestroy {
  /**
   * Marks a section created by the internal dialog shell.
   *
   * Generated sections do not register as caller-provided sections and
   * therefore cannot suppress themselves.
   *
   * @internal
   */
  readonly generated = input(false);

  private readonly registry = inject(ImsDialogSectionRegistry, { optional: true });
  private unregister: (() => void) | null = null;
  private destroyed = false;

  protected abstract readonly section: ImsDialogSection;

  ngOnInit(): void {
    if (!this.generated()) {
      queueMicrotask(() => {
        if (!this.destroyed) {
          this.unregister = this.registry?.register(this.section) ?? null;
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.unregister?.();
  }
}

/**
 * Projects the dialog heading and acts as the primary drag handle.
 *
 * Project title text through the component body. This component declares no
 * Angular outputs; dialog results flow through `ImsDialogRef.closed`.
 */
@Component({
  selector: 'ims-dialog-title',
  standalone: true,
  imports: [CdkDragHandle],
  template: `
    <div class="ims-dialog-title__inner" cdkDragHandle>
      @if (icon()) {
        <span class="ims-dialog-title__icon material-symbols-sharp" aria-hidden="true">
          {{ icon() }}
        </span>
      }
      <span class="ims-dialog-title__text"><ng-content /></span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-dialog-title',
    role: 'heading',
    '[attr.aria-level]': '2',
  },
})
export class ImsDialogTitle extends ImsDialogSectionBase {
  /**
   * Optional Material icon ligature rendered before the projected title.
   *
   * @defaultValue `null`
   */
  readonly icon = input<string | null>(null);
  protected readonly section = 'title' as const;
}

/**
 * Projects caller-owned controls into a full-width toolbar row beneath the
 * title.
 *
 * The shell keeps its X close control in the title row. This component has no
 * public inputs or Angular outputs.
 */
@Component({
  selector: 'ims-dialog-toolbar',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-dialog-toolbar',
    role: 'toolbar',
  },
})
export class ImsDialogToolbar extends ImsDialogSectionBase {
  protected readonly section = 'toolbar' as const;
}

/**
 * Projects the primary, scrollable dialog body.
 *
 * When omitted, the shell wraps the complete supplied component in a generated
 * content section. The content host owns scrolling directly. Its readonly
 * inputs can refine or explicitly override the dialog state.
 */
@Component({
  selector: 'ims-dialog-content',
  standalone: true,
  template: `<ng-content />`,
  providers: [
    {
      provide: IMS_READONLY_STATE,
      useExisting: forwardRef(() => ImsDialogContent),
    },
    {
      provide: IMS_READONLY_HOST_PARENT,
      useFactory: () =>
        inject(IMS_DIALOG_CONFIG, { optional: true })?.readonlySignal ?? signal(false),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-dialog-content',
    '[class.ims-readonly]': 'readonlySignal()',
    '[attr.disabled]': 'readonlySignal() ? "" : null',
    '[attr.ims-readonly-provider]': 'readonlySignal()',
  },
})
export class ImsDialogContent extends ImsDialogSectionBase implements ImsReadonlyStateProvider {
  protected readonly section = 'content' as const;
  private readonly config = inject(IMS_DIALOG_CONFIG, { optional: true }) as
    | ImsDialogRuntimeConfig
    | null;
  /** Local readonly state. `null` and `undefined` inherit the dialog state. */
  readonly localReadonly = input<boolean | null | undefined>(null, { alias: 'ims-readonly' });

  /** Allows the local state to replace an inherited readonly dialog state. */
  readonly overrideDialogReadonly = input<boolean | ''>(false, {
    alias: 'ims-readonly-override-parent',
  });

  readonly readonlySignal = computed(() => {
    const dialogReadonly = this.config?.readonlySignal() ?? false;
    const localReadonly = this.localReadonly();

    if (localReadonly === null || localReadonly === undefined) {
      return dialogReadonly;
    }

    if (localReadonly || !dialogReadonly || this.overrideDialogReadonly() === true) {
      return localReadonly;
    }

    return true;
  });
}

/**
 * Projects caller-owned footer actions.
 *
 * Its presence suppresses actions generated by confirmation or read-only
 * modes. This component has no public inputs or Angular outputs; actions close
 * the dialog through `ImsDialogRef`.
 */
@Component({
  selector: 'ims-dialog-actions',
  standalone: true,
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ims-dialog-actions',
  },
})
export class ImsDialogActions extends ImsDialogSectionBase {
  protected readonly section = 'actions' as const;
}
