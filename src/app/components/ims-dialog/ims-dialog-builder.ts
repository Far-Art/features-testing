import { DialogConfig } from '@angular/cdk/dialog';
import { Signal } from '@angular/core';
import { ImsDialogRef } from './ims-dialog-ref';
import {
  ImsDialogConfirmationLabels,
  ImsDialogContentType,
  ImsDialogMode,
  ImsDialogOpenOptions,
  ImsDialogSeverity,
} from './ims-dialog.types';

export interface ImsDialogBuilderHost {
  openFromBuilder(options: ImsDialogOpenOptions): ImsDialogRef<unknown>;
}

/**
 * Fluent configuration object returned by the severity methods on
 * `ImsDialogService`.
 *
 * @typeParam C - Component type rendered inside the dialog.
 * @typeParam Confirmation - Whether the builder returns a boolean confirmation reference.
 */
export class ImsDialogBuilder<C = unknown, Confirmation extends boolean = false> {
  private customData: unknown;
  private hasCustomData = false;
  private dialogConfig: DialogConfig<unknown> = {};
  private dialogTitle = '';
  private hasIcon = false;
  private materialIconName: string | null = null;
  private dialogMode: ImsDialogMode = 'standard';
  private readonlySignal: Signal<boolean> | null = null;
  private labels: ImsDialogConfirmationLabels | null = null;
  private insideClassName: string | null = null;

  constructor(
    private readonly host: ImsDialogBuilderHost,
    private readonly component: ImsDialogContentType<C> | null,
    private readonly severity: ImsDialogSeverity,
  ) {}

  /**
   * Supplies data to the opened component.
   *
   * When `config.data` is also present, both objects are shallow-merged and
   * values from this method take precedence for duplicate keys. The resolved
   * value is injectable through both `IMS_DIALOG_DATA` and CDK `DIALOG_DATA`.
   *
   * @param data Object made available to the dialog content.
   * @returns This builder for continued chaining.
   */
  data<D extends object>(data: D): ImsDialogBuilder<C, Confirmation> {
    this.customData = data;
    this.hasCustomData = true;
    return this;
  }

  /**
   * Applies Angular CDK dialog configuration.
   *
   * IMS defaults are used for omitted properties. Caller panel classes and
   * providers are preserved, while `data` participates in the IMS data merge.
   * A later call replaces the configuration supplied by an earlier call.
   *
   * @param config CDK configuration used when opening the dialog.
   * @returns This builder for continued chaining.
   */
  config<D = unknown>(config: DialogConfig<D>): ImsDialogBuilder<C, Confirmation> {
    this.dialogConfig = config as DialogConfig<unknown>;
    return this;
  }

  /**
   * Sets the generated dialog title.
   *
   * The value is ignored when the supplied component renders its own
   * `ims-dialog-title`.
   *
   * @param text Text displayed in the generated title section.
   * @returns This builder for continued chaining.
   */
  title(text: string): ImsDialogBuilder<C, Confirmation> {
    this.dialogTitle = text;
    return this;
  }

  /**
   * Adds an icon to the generated title.
   *
   * Omitting the name selects the default Material icon for the current
   * severity. A component-provided `ims-dialog-title` takes precedence over
   * both the generated title and icon.
   *
   * @param materialSymbolName Optional Material icon ligature name.
   * @returns This builder for continued chaining.
   */
  withIcon(materialSymbolName?: string): ImsDialogBuilder<C, Confirmation> {
    this.hasIcon = true;
    this.materialIconName = materialSymbolName?.trim() || null;
    return this;
  }

  /**
   * Opens the dialog inside an element instead of the viewport.
   *
   * The first element inside `body` with the provided class becomes both the
   * initial positioning origin and the drag boundary. Inside dialogs open
   * without a backdrop and follow their boundary when the page scrolls.
   *
   * @param className A single class name without a leading period.
   * @returns This builder for continued chaining.
   */
  inside(className: string): ImsDialogBuilder<C, Confirmation> {
    this.insideClassName = className.trim();
    return this;
  }

  /**
   * Configures the dialog as a boolean confirmation.
   *
   * Generated affirmative and negative actions are added unless the supplied
   * component owns `ims-dialog-actions`. The returned reference emits `true`
   * for an affirmative close and `false` for all negative or empty closes.
   *
   * @param labels Built-in label set or custom affirmative/negative labels.
   * @returns This builder narrowed to a boolean confirmation result.
   * @throws Error when read-only mode was already selected.
   */
  asConfirmation(labels: ImsDialogConfirmationLabels): ImsDialogBuilder<C, true> {
    this.assertModeAvailable('confirmation');
    this.dialogMode = 'confirmation';
    this.labels = labels;
    return this as unknown as ImsDialogBuilder<C, true>;
  }

  /**
   * Configures generated chrome for a read-only dialog.
   *
   * A Close action is generated when the supplied component does not render
   * `ims-dialog-actions`. This mode does not disable controls inside caller
   * content. When a signal is provided, generated read-only chrome follows its
   * current boolean value.
   *
   * @param state Optional signal controlling whether read-only mode is active.
   * @returns This builder for continued chaining.
   * @throws Error when confirmation mode was already selected.
   */
  asReadonly(state?: Signal<boolean>): ImsDialogBuilder<C, Confirmation> {
    this.assertModeAvailable('readonly');
    this.dialogMode = 'readonly';
    this.readonlySignal = state ?? null;
    return this;
  }

  /**
   * Opens the configured dialog.
   *
   * @typeParam R - Result accepted by `ImsDialogRef.close()` for a standard dialog.
   * @returns A boolean reference in confirmation mode; otherwise a reference
   * that emits `R` or `undefined`.
   */
  open<R = unknown>(): Confirmation extends true
    ? ImsDialogRef<boolean>
    : ImsDialogRef<R | undefined> {
    return this.host.openFromBuilder({
      severity: this.severity,
      component: this.component,
      title: this.dialogTitle,
      iconRequested: this.hasIcon,
      iconName: this.materialIconName,
      mode: this.dialogMode,
      readonlySignal: this.readonlySignal,
      confirmationLabels: this.labels,
      data: this.customData,
      hasData: this.hasCustomData,
      insideClassName: this.insideClassName,
      config: this.dialogConfig,
    }) as Confirmation extends true ? ImsDialogRef<boolean> : ImsDialogRef<R | undefined>;
  }

  /**
   * Ensures generated dialog modes cannot conflict.
   *
   * @param nextMode Mode requested by the current builder operation.
   */
  private assertModeAvailable(nextMode: Exclude<ImsDialogMode, 'standard'>): void {
    if (this.dialogMode !== 'standard' && this.dialogMode !== nextMode) {
      throw new Error(`Dialog mode "${nextMode}" cannot be combined with "${this.dialogMode}".`);
    }
  }
}
