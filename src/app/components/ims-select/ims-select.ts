import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  ConnectedOverlayPositionChange,
  ConnectedPosition
} from '@angular/cdk/overlay';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  viewChild
} from '@angular/core';
import {Directionality} from '@angular/cdk/bidi';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {ImsTextTruncateDirective} from '../../shared/ims-text-truncate.directive';
import {runViewTransition} from '../../shared/view-transition';
import {ImsIcon} from '../ims-icon';
import {ImsSelectionReadonlyPanel} from '../ims-selection/ims-selection-readonly-panel';
import {ImsSelectionToolbar} from '../ims-selection/ims-selection-toolbar';
import {
  IMS_SELECTION_EMPTY_DISPLAY,
  IMS_SELECTION_LABELS,
  ImsSelectionDisplayState,
  ImsSelectionLabels,
  ImsSelectionOverlaySide
} from '../ims-selection/ims-selection.types';
import {
  SELECTION_FILTER_FALLBACK_HEIGHT,
  countViewModes,
  matchesSearchQuery,
  measureTextWidth,
  mergeEditDialogResult,
  normalizeSearchText,
  optionsForViewMode,
  resolveAvailableValueWidth,
  resolveListboxMaxHeight,
  resolveMultiDisplay,
  resolveToolbarSide,
  toggleSelectedValue
} from '../ims-selection/ims-selection.utils';
import {ImsOption} from './ims-option';
import {ImsTransferDialogService, ImsTransferRow} from '../ims-transfer-dialog';
import {
  IMS_SELECT_PARENT,
  ImsSelectCompareWith,
  ImsSelectEditDialogMode,
  ImsSelectFilterMode,
  ImsSelectFilterPredicate,
  ImsSelectOptionLike,
  ImsSelectParent,
  ImsSelectToolbarSide,
  ImsSelectToolbarMode,
  ImsSelectViewMode
} from './ims-select.types';

type ImsSelectFormValue<T> = T | readonly T[] | null | undefined;

const OVERLAY_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'end',
    originY: 'bottom',
    overlayX: 'end',
    overlayY: 'top',
    offsetY: 4
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -4
  },
  {
    originX: 'end',
    originY: 'top',
    overlayX: 'end',
    overlayY: 'bottom',
    offsetY: -4
  }
];

const defaultCompare = <T>(first: T, second: T) => first === second;
const LISTBOX_BOUNDS = {min: 144, max: 350};
const TYPEAHEAD_RESET_MS = 700;

let nextSelectId = 0;

@Component({
  selector: 'ims-select',
  standalone: true,
  imports: [
    CdkOverlayOrigin,
    CdkConnectedOverlay,
    ImsIcon,
    ImsSelectionReadonlyPanel,
    ImsSelectionToolbar,
    ImsTextTruncateDirective
  ],
  templateUrl: './ims-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideValueAccessor(ImsSelect),
    {
      provide: IMS_SELECT_PARENT,
      useExisting: forwardRef(() => ImsSelect)
    }
  ],
  host: {
    class: 'ims-select-host'
  }
})
/**
 * Form-compatible select control backed by projected `ims-option` elements.
 *
 * Supports single and multiple values, optional client-side filtering,
 * keyboard navigation, typeahead, and a multi-select toolbar. Single-select
 * mode writes `T | null`; multiple mode writes a readonly `T[]`. A `clearable`
 * single select can be cleared back to `null`.
 *
 * Selected labels are compacted to fit the trigger. When values are hidden or
 * truncated, hovering the trigger displays their full text through
 * `ImsTextTruncateDirective`.
 */
export class ImsSelect<T = unknown>
  extends BasicValueAccessor<ImsSelectFormValue<T>>
  implements AfterViewInit, OnDestroy, ImsSelectParent<T> {
  private resizeObserver: ResizeObserver | null = null;
  private measureFrame: ReturnType<typeof requestAnimationFrame> | null = null;
  private overlaySide: ImsSelectionOverlaySide | undefined;
  private typeaheadQuery = '';
  private typeaheadResetTimer: ReturnType<typeof setTimeout> | null = null;
  readonly directionality = inject(Directionality);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly transferDialog = inject(ImsTransferDialogService);
  private readonly injectedLabels = inject(IMS_SELECTION_LABELS);

  private readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');
  private readonly filterField = viewChild<ElementRef<HTMLElement>>('filterField');
  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly listbox = viewChild<ElementRef<HTMLElement>>('listbox');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
  private readonly readonlyPanel = viewChild(ImsSelectionReadonlyPanel);
  private readonly toolbarPanel = viewChild(ImsSelectionToolbar, {read: ElementRef});
  private readonly valueRow = viewChild<ElementRef<HTMLElement>>('valueRow');
  private readonly measureTextElement = viewChild<ElementRef<HTMLElement>>('measureText');
  private readonly measureBadgeElement = viewChild<ElementRef<HTMLElement>>('measureBadge');

  /** Projected options participating in filtering, selection, and keyboard navigation. */
  readonly options = contentChildren<ImsOption<T>>(ImsOption, {descendants: true});

  /** Enables multi-selection. Multi-select writes a readonly array of selected values. */
  readonly multiple = input(false, {transform: booleanAttribute});

  /** Text displayed in the trigger when no value is selected. Defaults to `labels.selectPlaceholder`. */
  readonly placeholder = input<string | null>(null);

  /**
   * Offers a clear button in a single select while it holds a value, and lets
   * Delete or Backspace on the closed trigger clear it. Clearing writes `null`.
   */
  readonly clearable = input(false, {transform: booleanAttribute});

  /** Controls whether the filter input is shown: always, never, or above the auto threshold. */
  readonly filter = input<ImsSelectFilterMode>('auto');

  /** Controls whether the multi-select toolbar is shown: always, never, or above the auto threshold. */
  readonly toolbar = input<ImsSelectToolbarMode>('auto');

  /** Controls whether the toolbar edit action uses the built-in dialog, emits a request, or is hidden. */
  readonly editDialogMode = input<ImsSelectEditDialogMode>('default');

  /** Lets a custom edit-dialog owner disable the toolbar action independently. */
  readonly editDialogDisabled = input(false, {transform: booleanAttribute});

  /** Accessible label for the toolbar edit action. Defaults to `labels.editSelection`. */
  readonly editDialogAriaLabel = input<string | null>(null);

  /** Emitted instead of opening the built-in dialog when `editDialogMode="custom"`. */
  readonly editDialogRequested = output<void>();

  /** Option count threshold used by `filter="auto"` and `toolbar="auto"`. */
  readonly filterAutoMinOptions = input(15, {transform: numberAttribute});

  /** Equality function for option values. Defaults to strict reference equality. */
  readonly compareWith = input<ImsSelectCompareWith<T>>(defaultCompare);

  /**
   * Custom filter predicate. The query argument is trimmed and lowercased.
   * Defaults to matching the option selection label.
   */
  readonly filterPredicate = input<ImsSelectFilterPredicate<T> | null>(null);

  /** Replaces individual texts of the application-wide `IMS_SELECTION_LABELS`. */
  readonly labels = input<Partial<ImsSelectionLabels> | null>(null);

  /** Accessible label for the trigger when there is no external visible label. */
  readonly ariaLabel = input<string | null>(null, {alias: 'ariaLabel'});

  /** ID reference for one or more external labels that describe the trigger. */
  readonly ariaLabelledby = input<string | null>(null, {alias: 'ariaLabelledby'});

  readonly open = signal(false);
  readonly filterQuery = signal('');
  readonly viewMode = signal<ImsSelectViewMode>('all');
  readonly activeIndex = signal(-1);
  readonly toolbarSide = signal<ImsSelectToolbarSide>('right');
  readonly panelMinWidth = signal(0);
  readonly listboxMinHeight = signal(0);
  readonly listboxMaxHeight = signal(LISTBOX_BOUNDS.max);
  readonly multiDisplay = signal<ImsSelectionDisplayState>(IMS_SELECTION_EMPTY_DISPLAY);

  readonly effectiveLabels = computed<ImsSelectionLabels>(() => ({
    ...this.injectedLabels,
    ...(this.labels() ?? {})
  }));

  readonly effectivePlaceholder = computed(() =>
    this.placeholder() ?? this.effectiveLabels().selectPlaceholder
  );

  readonly readonlyMultipleMode = computed(() => this.interactionDisabled() && this.multiple());

  readonly selectId = `ims-select-${nextSelectId++}`;
  readonly listboxId = `${this.selectId}-listbox`;
  readonly filterInputId = `${this.selectId}-filter`;
  readonly readonlyPanelId = `${this.selectId}-selected-values`;
  readonly readonlyPanelTitleId = `${this.readonlyPanelId}-title`;
  readonly overlayPositions = OVERLAY_POSITIONS;

  readonly singleValue = computed<T | null>(() => {
    const currentValue = this.value();
    return currentValue === null || currentValue === undefined ? null : currentValue as T;
  });

  readonly selectedValues = computed<readonly T[]>(() => {
    const currentValue = this.value();

    if (this.multiple()) {
      if (Array.isArray(currentValue)) return currentValue as readonly T[];
      return currentValue === null || currentValue === undefined ? [] : [currentValue as T];
    }

    const singleValue = this.singleValue();
    return singleValue === null ? [] : [singleValue];
  });

  readonly selectedLabels = computed(() =>
    this.selectedValues().map((selectedValue) => this.labelForValue(selectedValue))
  );

  readonly singleDisplayText = computed(() => {
    const selectedValue = this.singleValue();
    return selectedValue === null ? '' : this.labelForValue(selectedValue);
  });

  readonly hasSelection = computed(() =>
    this.multiple() ? this.selectedValues().length > 0 : this.singleValue() !== null
  );

  /** True while the clear button is offered: a clearable single select holding a value it may change. */
  readonly canClear = computed(() =>
    this.clearable() && !this.multiple() && this.hasSelection() && !this.interactionDisabled()
  );

  readonly showFilter = computed(() => {
    if (this.readonlyMultipleMode()) return false;

    const mode = this.filter();
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return this.options().length >= this.filterAutoMinOptions();
  });

  readonly showToolbar = computed(() => {
    if (this.readonlyMultipleMode() || !this.multiple()) return false;

    const mode = this.toolbar();
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return this.options().length >= this.filterAutoMinOptions();
  });

  readonly editDialogButtonDisabled = computed(() =>
    this.interactionDisabled()
    || this.editDialogDisabled()
    || (this.editDialogMode() === 'default' && this.editableOptions().length === 0)
  );

  readonly textFilteredOptions = computed(() => {
    const query = normalizeSearchText(this.filterQuery());
    const options = this.options();

    if (!this.showFilter() || !query) return options;

    const predicate = this.filterPredicate();
    if (predicate) {
      return options.filter((option) => predicate(query, option));
    }

    return options.filter((option) => matchesSearchQuery(option.selectionLabel(), query));
  });

  readonly visibleOptions = computed(() => this.optionsInViewMode(this.viewMode()));

  readonly viewOptionCounts = computed(() =>
    countViewModes(this.textFilteredOptions(), (option) => this.isOptionSelected(option))
  );

  readonly activeOption = computed(() => this.visibleOptions()[this.activeIndex()] ?? null);
  readonly activeOptionId = computed(() => this.activeOption()?.id ?? null);

  /** Non-disabled options matching the current filter, regardless of view mode. Feeds the edit dialog. */
  readonly editableOptions = computed(() =>
    this.textFilteredOptions().filter((option) => !option.disabled())
  );

  /**
   * Visible options as a set. Every projected option asks whether it is
   * visible, so searching the visible list for each one would make a single
   * filter keystroke quadratic in the option count.
   */
  private readonly visibleOptionSet = computed<ReadonlySet<ImsSelectOptionLike<T>>>(
    () => new Set(this.visibleOptions())
  );

  private readonly valuesEqual = (first: T, second: T): boolean => this.compareWith()(first, second);

  constructor() {
    super();

    effect(() => {
      if (this.interactionDisabled() && !this.readonlyMultipleMode() && this.open()) {
        this.close(false);
      }
    });

    effect(() => {
      this.multiple();
      this.selectedLabels();
      this.scheduleDisplayMeasure();
    });

    effect(() => {
      if (!this.open() || this.readonlyMultipleMode()) return;

      const viewMode = this.viewMode();
      if (viewMode !== 'all' && this.optionsInViewMode(viewMode).length === 0) {
        this.viewMode.set('all');
        this.activeIndex.set(-1);
        return;
      }

      const visibleOptions = this.visibleOptions();
      const activeIndex = this.activeIndex();

      if (visibleOptions.length === 0) {
        if (activeIndex !== -1) this.activeIndex.set(-1);
        return;
      }

      if (
        activeIndex < 0 ||
        activeIndex >= visibleOptions.length ||
        visibleOptions[activeIndex].disabled()
      ) {
        this.activeIndex.set(this.findInitialActiveIndex(visibleOptions));
      }
    });
  }

  ngAfterViewInit(): void {
    const valueRow = this.valueRow()?.nativeElement;
    if (valueRow) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleDisplayMeasure());
      this.resizeObserver.observe(valueRow);
    }

    this.scheduleDisplayMeasure();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.measureFrame !== null) {
      cancelAnimationFrame(this.measureFrame);
    }
    this.clearTypeaheadTimer();
  }

  togglePanel(): void {
    if (this.interactionDisabled() && !this.readonlyMultipleMode()) return;

    if (this.open()) {
      this.close(true);
      return;
    }

    this.openPanel();
  }

  openPanel(): void {
    if ((this.interactionDisabled() && !this.readonlyMultipleMode()) || this.open()) return;

    this.overlaySide = undefined;
    this.updatePanelGeometry();
    if (!this.readonlyMultipleMode()) {
      this.setInitialActiveOption();
    }
    this.open.set(true);
  }

  close(focusTrigger: boolean): void {
    if (!this.open()) return;

    this.open.set(false);
    this.filterQuery.set('');
    this.viewMode.set('all');
    this.listboxMinHeight.set(0);
    this.activeIndex.set(-1);
    this.markAsTouched();

    if (focusTrigger) {
      this.focusTrigger();
    }
  }

  /** Clears a clearable single select to `null` and returns focus to its trigger. */
  clearValue(): void {
    if (!this.canClear()) return;

    this.close(false);
    this.emitValue(null);
    this.markAsTouched();
    this.focusTrigger();
  }

  onOverlayAttached(): void {
    queueMicrotask(() => {
      this.updatePanelGeometry();

      if (this.readonlyMultipleMode()) {
        this.readonlyPanel()?.focus();
        return;
      }

      this.updateToolbarSide();
      this.captureListboxHeight();
      this.setInitialActiveOption();

      if (this.showFilter()) {
        this.filterInput()?.nativeElement.focus({preventScroll: true});
      } else {
        this.listbox()?.nativeElement.focus({preventScroll: true});
      }

      this.scrollActiveOptionIntoView();
    });
  }

  onOverlayPositionChange(event: ConnectedOverlayPositionChange): void {
    this.overlaySide = event.connectionPair.originY === 'top' ? 'above' : 'below';
    this.updateListboxMaxHeight(this.overlaySide);
    this.updateToolbarSide();
  }

  onOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Node && this.triggerButton()?.nativeElement.contains(target)) return;
    this.close(false);
  }

  onTriggerBlur(): void {
    if (!this.open()) {
      this.markAsTouched();
    }
  }

  onFilterInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.filterQuery.set(target.value);
    this.activeIndex.set(-1);
  }

  openEditDialog(): void {
    if (this.interactionDisabled()) return;

    const rows: ImsTransferRow<T>[] = [];

    for (const option of this.editableOptions()) {
      const optionValue = this.readOptionValue(option);
      if (!optionValue.available) continue;

      const row: ImsTransferRow<T> = {
        id: option.id,
        label: option.selectionLabel(),
        value: optionValue.value,
        checked: this.isOptionSelected(option)
      };

      rows.push(row);
    }

    if (rows.length === 0) return;

    this.close(false);

    const labels = this.effectiveLabels();
    const dialogRef = this.transferDialog.open<T, 'options'>({
      lists: [{id: 'options', title: labels.editDialogOptions, rows}],
      dialogTitle: labels.editDialogTitle
    });

    dialogRef.closed.subscribe((result) => {
      if (result === undefined) return;

      this.emitValue(mergeEditDialogResult(
        this.selectedValues(),
        rows.map((row) => row.value),
        result.checked,
        this.valuesEqual
      ));
    });
  }

  requestEditDialog(): void {
    if (this.editDialogMode() === 'off' || this.editDialogButtonDisabled()) return;

    if (this.editDialogMode() === 'custom') {
      this.close(false);
      this.editDialogRequested.emit();
      return;
    }

    this.openEditDialog();
  }

  setViewMode(mode: ImsSelectViewMode): void {
    if (this.isViewModeDisabled(mode)) return;

    const nextMode = this.resolveViewMode(mode);
    if (nextMode === this.viewMode()) return;

    this.captureListboxHeight();
    runViewTransition(
      () => {
        this.viewMode.set(nextMode);
        this.activeIndex.set(-1);
      },
      () => this.changeDetectorRef.detectChanges()
    );
    queueMicrotask(() => this.captureListboxHeight());
  }

  isViewModeDisabled(mode: ImsSelectViewMode): boolean {
    return this.viewOptionCounts()[mode] === 0;
  }

  isOptionSelected(option: ImsSelectOptionLike<T>): boolean {
    const optionValue = this.readOptionValue(option);
    return optionValue.available && this.isValueSelected(optionValue.value);
  }

  isOptionActive(option: ImsSelectOptionLike<T>): boolean {
    return this.activeOption() === option;
  }

  isOptionVisible(option: ImsSelectOptionLike<T>): boolean {
    return this.visibleOptionSet().has(option);
  }

  activateOption(option: ImsSelectOptionLike<T>): void {
    const index = this.visibleOptions().findIndex((visibleOption) => visibleOption === option);
    if (index < 0 || option.disabled()) return;
    this.activeIndex.set(index);
  }

  selectOption(option: ImsSelectOptionLike<T>, event?: Event): void {
    event?.preventDefault();

    if (this.interactionDisabled() || option.disabled()) return;

    const optionValue = this.readOptionValue(option);
    if (!optionValue.available) return;

    this.activateOption(option);

    if (this.multiple()) {
      this.emitValue(toggleSelectedValue(this.selectedValues(), optionValue.value, this.valuesEqual));
      return;
    }

    this.emitValue(optionValue.value);
    this.close(true);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.readonlyMultipleMode()) {
      if (event.key === 'Escape' && this.open()) {
        event.preventDefault();
        this.close(true);
      }
      return;
    }

    if (this.interactionDisabled()) {
      return;
    }

    if (!this.open() && this.handleClosedKeydown(event)) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else {
          this.moveActiveOption(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else if (event.altKey) {
          this.commitAndClose();
        } else {
          this.moveActiveOption(-1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else {
          this.selectActiveOption();
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close(true);
        }
        break;
    }
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (this.readonlyMultipleMode()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close(true);
      } else if (event.key === 'Tab') {
        this.close(false);
      }
      return;
    }

    if (this.isToolbarKeyboardEvent(event) && event.key !== 'Escape' && event.key !== 'Tab') {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActiveOption(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) {
          this.commitAndClose();
        } else {
          this.moveActiveOption(-1);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.moveToBoundary('first');
        break;
      case 'End':
        event.preventDefault();
        this.moveToBoundary('last');
        break;
      case 'Enter':
        event.preventDefault();
        this.selectActiveOption();
        break;
      case ' ':
        if (!(event.target instanceof HTMLInputElement)) {
          event.preventDefault();
          this.selectActiveOption();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  private isToolbarKeyboardEvent(event: KeyboardEvent): boolean {
    const target = event.target;
    return target instanceof HTMLElement && target.closest('.ims-select__toolbar') !== null;
  }

  /**
   * Keys with a meaning of their own on a closed trigger. Alt+Arrow opens the
   * panel without touching the value, Delete and Backspace clear a clearable
   * select, and a single select otherwise changes its value in place the way a
   * native select does. Returns true when the key was handled.
   */
  private handleClosedKeydown(event: KeyboardEvent): boolean {
    if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.openPanel();
      return true;
    }

    if (this.canClear() && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      this.clearValue();
      return true;
    }

    return !this.multiple() && this.handleClosedSingleKeydown(event);
  }

  private handleClosedSingleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectClosedAdjacentOption(1);
        return true;
      case 'ArrowUp':
        event.preventDefault();
        this.selectClosedAdjacentOption(-1);
        return true;
      case 'Home':
        event.preventDefault();
        this.selectClosedBoundaryOption('first');
        return true;
      case 'End':
        event.preventDefault();
        this.selectClosedBoundaryOption('last');
        return true;
      case ' ':
        if (!this.typeaheadQuery) return false;
        event.preventDefault();
        this.selectClosedTypeaheadOption(event.key);
        return true;
      default:
        if (!this.isTypeaheadKey(event)) return false;
        event.preventDefault();
        this.selectClosedTypeaheadOption(event.key);
        return true;
    }
  }

  private isTypeaheadKey(event: KeyboardEvent): boolean {
    return event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey;
  }

  /** Steps the value to the neighbouring option, stopping at either end as a native select does. */
  private selectClosedAdjacentOption(delta: 1 | -1): void {
    const options = this.selectableOptions();
    if (options.length === 0) return;

    const selectedIndex = this.selectedOptionIndex(options);
    if (selectedIndex < 0) {
      this.emitClosedOptionValue(delta > 0 ? options[0] : options[options.length - 1]);
      return;
    }

    for (let index = selectedIndex + delta; index >= 0 && index < options.length; index += delta) {
      if (this.emitClosedOptionValue(options[index])) return;
    }
  }

  private selectClosedBoundaryOption(boundary: 'first' | 'last'): void {
    const options = this.selectableOptions();
    const option = boundary === 'first' ? options[0] : options.at(-1);
    if (option) {
      this.emitClosedOptionValue(option);
    }
  }

  private selectClosedTypeaheadOption(key: string): void {
    this.typeaheadQuery += key;
    this.scheduleTypeaheadReset();

    const options = this.selectableOptions();
    if (options.length === 0) return;

    const repeatedSingleKey = this.typeaheadQuery.length > 1 &&
      [...this.typeaheadQuery].every((character) => character === this.typeaheadQuery[0]);
    const query = repeatedSingleKey
      ? normalizeSearchText(this.typeaheadQuery[0])
      : normalizeSearchText(this.typeaheadQuery);
    const startIndex = repeatedSingleKey ? this.selectedOptionIndex(options) : -1;
    const option = this.findTypeaheadOption(options, query, startIndex);

    if (option) {
      this.emitClosedOptionValue(option);
    }
  }

  private scheduleTypeaheadReset(): void {
    this.clearTypeaheadTimer();
    this.typeaheadResetTimer = setTimeout(() => {
      this.typeaheadQuery = '';
      this.typeaheadResetTimer = null;
    }, TYPEAHEAD_RESET_MS);
  }

  private clearTypeaheadTimer(): void {
    if (this.typeaheadResetTimer === null) return;

    clearTimeout(this.typeaheadResetTimer);
    this.typeaheadResetTimer = null;
  }

  private resolveViewMode(mode: ImsSelectViewMode): ImsSelectViewMode {
    return mode === 'all' || this.optionsInViewMode(mode).length > 0 ? mode : 'all';
  }

  private optionsInViewMode(mode: ImsSelectViewMode): readonly ImsOption<T>[] {
    return optionsForViewMode(
      this.textFilteredOptions(),
      mode,
      (option) => this.isOptionSelected(option)
    );
  }

  private labelForValue(value: T): string {
    const option = this.options().find((candidate) =>
      this.optionHasValue(candidate, value)
    );

    if (option) return option.selectionLabel();
    return value === null || value === undefined ? '' : String(value);
  }

  private isValueSelected(value: T): boolean {
    return this.selectedValues().some((selectedValue) => this.valuesEqual(selectedValue, value));
  }

  private optionHasValue(option: ImsSelectOptionLike<T>, value: T): boolean {
    const optionValue = this.readOptionValue(option);
    return optionValue.available && this.valuesEqual(optionValue.value, value);
  }

  private selectableOptions(): readonly ImsSelectOptionLike<T>[] {
    return this.options().filter((option) => !option.disabled() && this.readOptionValue(option).available);
  }

  private selectedOptionIndex(options: readonly ImsSelectOptionLike<T>[]): number {
    return options.findIndex((option) => this.isOptionSelected(option));
  }

  private findTypeaheadOption(
    options: readonly ImsSelectOptionLike<T>[],
    query: string,
    startIndex: number
  ): ImsSelectOptionLike<T> | null {
    return this.findOptionByTypeahead(options, query, startIndex, 'prefix') ??
      this.findOptionByTypeahead(options, query, startIndex, 'contains');
  }

  private findOptionByTypeahead(
    options: readonly ImsSelectOptionLike<T>[],
    query: string,
    startIndex: number,
    strategy: 'prefix' | 'contains'
  ): ImsSelectOptionLike<T> | null {
    for (let offset = 1; offset <= options.length; offset++) {
      const index = (startIndex + offset + options.length) % options.length;
      const option = options[index];
      const label = normalizeSearchText(option.selectionLabel());
      const matches = strategy === 'prefix'
        ? label.startsWith(query)
        : matchesSearchQuery(label, query);

      if (matches) return option;
    }

    return null;
  }

  private emitClosedOptionValue(option: ImsSelectOptionLike<T>): boolean {
    const optionValue = this.readOptionValue(option);
    if (!optionValue.available) return false;

    this.emitValue(optionValue.value);
    return true;
  }

  private readOptionValue(option: ImsSelectOptionLike<T>):
    | { readonly available: true; readonly value: T }
    | { readonly available: false } {
    try {
      return {available: true, value: option.value()};
    } catch {
      return {available: false};
    }
  }

  private emitValue(value: ImsSelectFormValue<T>): void {
    this.value.set(value);
    this.onChange(value);
    this.scheduleDisplayMeasure();
  }

  private focusTrigger(): void {
    queueMicrotask(() => this.triggerButton()?.nativeElement.focus({preventScroll: true}));
  }

  private setInitialActiveOption(): void {
    this.activeIndex.set(this.findInitialActiveIndex(this.visibleOptions()));
  }

  private findInitialActiveIndex(options: readonly ImsSelectOptionLike<T>[]): number {
    if (options.length === 0) return -1;

    const selectedIndex = options.findIndex(
      (option) => !option.disabled() && this.isOptionSelected(option)
    );
    if (selectedIndex >= 0) return selectedIndex;

    return options.findIndex((option) => !option.disabled());
  }

  private moveActiveOption(delta: 1 | -1): void {
    const options = this.visibleOptions();
    if (options.length === 0) return;

    let index = this.activeIndex();
    for (let step = 0; step < options.length; step++) {
      index = (index + delta + options.length) % options.length;
      if (!options[index].disabled()) {
        this.activeIndex.set(index);
        this.scrollActiveOptionIntoView();
        return;
      }
    }
  }

  private moveToBoundary(boundary: 'first' | 'last'): void {
    const options = this.visibleOptions();
    const index = boundary === 'first'
      ? options.findIndex((option) => !option.disabled())
      : options.findLastIndex((option) => !option.disabled());

    if (index < 0) return;
    this.activeIndex.set(index);
    this.scrollActiveOptionIntoView();
  }

  private selectActiveOption(): void {
    const activeOption = this.activeOption();
    if (!activeOption) return;
    this.selectOption(activeOption);
  }

  /** Alt+ArrowUp: a single select takes the active option, as a native select does; either kind closes. */
  private commitAndClose(): void {
    const activeOption = this.activeOption();
    if (!this.multiple() && activeOption && !activeOption.disabled()) {
      this.selectOption(activeOption);
      return;
    }

    this.close(true);
  }

  private scrollActiveOptionIntoView(): void {
    queueMicrotask(() => this.activeOption()?.scrollIntoView());
  }

  private updatePanelGeometry(): void {
    const triggerRect = this.triggerButton()?.nativeElement.getBoundingClientRect();
    if (!triggerRect) return;

    this.panelMinWidth.set(triggerRect.width);
    this.updateListboxMaxHeight(this.overlaySide);
    this.updateToolbarSide(triggerRect);
  }

  private updateToolbarSide(fallbackRect?: DOMRect): void {
    if (!this.showToolbar()) return;

    const menuRect = this.menu()?.nativeElement.getBoundingClientRect() ?? fallbackRect;
    if (!menuRect) return;

    this.toolbarSide.set(resolveToolbarSide(
      menuRect,
      this.toolbarPanel()?.nativeElement.getBoundingClientRect().width
    ));
  }

  private updateListboxMaxHeight(preferredSide?: ImsSelectionOverlaySide): void {
    const triggerRect = this.triggerButton()?.nativeElement.getBoundingClientRect();
    if (!triggerRect) return;

    const reservedHeight = this.filterField()?.nativeElement.getBoundingClientRect().height ??
      (this.showFilter() ? SELECTION_FILTER_FALLBACK_HEIGHT : 0);
    const maxHeight = resolveListboxMaxHeight(triggerRect, reservedHeight, preferredSide, LISTBOX_BOUNDS);

    this.listboxMaxHeight.set(maxHeight);
    if (this.listboxMinHeight() > maxHeight) {
      this.listboxMinHeight.set(maxHeight);
    }
  }

  private captureListboxHeight(): void {
    if (!this.open()) return;

    const listbox = this.listbox()?.nativeElement;
    if (!listbox) return;

    const height = Math.min(
      this.listboxMaxHeight(),
      Math.ceil(listbox.getBoundingClientRect().height)
    );
    if (height > this.listboxMinHeight()) {
      this.listboxMinHeight.set(height);
    }
  }

  private scheduleDisplayMeasure(): void {
    if (this.measureFrame !== null) {
      cancelAnimationFrame(this.measureFrame);
    }

    this.measureFrame = requestAnimationFrame(() => {
      this.measureFrame = null;
      this.updateMultiDisplay();
    });
  }

  private updateMultiDisplay(): void {
    if (!this.multiple()) {
      this.multiDisplay.set(IMS_SELECTION_EMPTY_DISPLAY);
      return;
    }

    const measureText = this.measureTextElement()?.nativeElement;
    const measureBadge = this.measureBadgeElement()?.nativeElement;

    this.multiDisplay.set(resolveMultiDisplay(
      this.selectedLabels(),
      resolveAvailableValueWidth(this.valueRow()?.nativeElement, '.ims-select__badge'),
      (text) => measureTextWidth(measureText, text),
      (count) => measureTextWidth(measureBadge, `+${count}`)
    ));
  }
}
