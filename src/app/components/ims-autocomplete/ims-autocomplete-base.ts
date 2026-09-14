import {
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    ConnectedOverlayPositionChange,
    ConnectedPosition
} from '@angular/cdk/overlay';
import {
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';
import {Directionality} from '@angular/cdk/bidi';
import {
    AfterViewInit,
    booleanAttribute,
    ChangeDetectorRef,
    computed,
    Directive,
    effect,
    ElementRef,
    inject,
    input,
    linkedSignal,
    numberAttribute,
    OnDestroy,
    output,
    signal,
    untracked,
    viewChild
} from '@angular/core';
import {BasicValueAccessor} from '../../shared/basic-value-accessor';
import {ImsTextTruncateDirective} from '../../shared/ims-text-truncate.directive';
import {runViewTransition} from '../../shared/view-transition';
import {ImsSelectionReadonlyPanel} from '../../shared/ims-selection/ims-selection-readonly-panel';
import {ImsSelectionToolbar} from '../../shared/ims-selection/ims-selection-toolbar';
import {
    IMS_SELECTION_EMPTY_DISPLAY,
    IMS_SELECTION_LABELS,
    ImsSelectionDisplayState,
    ImsSelectionLabels,
    ImsSelectionOverlaySide
} from '../../shared/ims-selection/ims-selection.types';
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
} from '../../shared/ims-selection/ims-selection.utils';
import {ImsTransferDialogService, ImsTransferRow} from '../ims-transfer-dialog';
import {
    ImsAutocompleteCompareWith,
    ImsAutocompleteDisplayWith,
    ImsAutocompleteEditDialogMode,
    ImsAutocompleteHighlightPart,
    ImsAutocompleteOption,
    ImsAutocompleteSortMode,
    ImsAutocompleteToolbarMode,
    ImsAutocompleteToolbarSide,
    ImsAutocompleteValue,
    ImsAutocompleteViewMode
} from './ims-autocomplete.types';

interface ImsAutocompleteLabelSource<T> {
    readonly options: readonly ImsAutocompleteOption<T>[];
    readonly values: readonly T[];
    readonly compare: ImsAutocompleteCompareWith<T>;
}

/** Template dependencies of every autocomplete component, all of which render `ims-autocomplete.html`. */
export const IMS_AUTOCOMPLETE_IMPORTS = [
    CdkOverlayOrigin,
    CdkConnectedOverlay,
    CdkVirtualScrollViewport,
    CdkVirtualForOf,
    CdkFixedSizeVirtualScroll,
    ImsSelectionReadonlyPanel,
    ImsSelectionToolbar,
    ImsTextTruncateDirective
];

const OVERLAY_POSITIONS: ConnectedPosition[] = [
    {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        offsetY: 4
    },
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
const LISTBOX_BOUNDS = {min: 96, max: 350};

let nextAutocompleteId = 0;

/**
 * Behavior shared by `ims-autocomplete` and `ims-autocomplete-async`, which
 * differ only in where their options come from: each supplies them through
 * `getSourceOptions()`.
 *
 * A form-compatible autocomplete supporting free text, strict option
 * selection, multiple values and virtualized option rendering. Single mode
 * writes `T`, a free-text `string`, or `null` depending on `strict`. Multiple
 * mode writes a readonly `T[]` and always requires values from the option list.
 *
 * Selected labels are compacted to fit the trigger. Truncated input or
 * selection text exposes the full value through `ImsTextTruncateDirective`.
 */
@Directive()
export abstract class ImsAutocompleteBase<T = unknown>
    extends BasicValueAccessor<ImsAutocompleteValue<T>>
    implements AfterViewInit, OnDestroy {
    readonly directionality = inject(Directionality);
    /** Enables multi-selection. Multi-select always requires choosing options from the list. */
    readonly multiple = input(false, {transform: booleanAttribute});
    /** Placeholder displayed in the input or trigger when empty. Defaults to `labels.autocompletePlaceholder`. */
    readonly placeholder = input<string | null>(null);
    /** Requires single-selection text to resolve to an option. Multi-select is always strict. */
    readonly strict = input(false, {transform: booleanAttribute});
    /** Sort mode for the visible option labels. `default` preserves source order. */
    readonly sort = input<ImsAutocompleteSortMode>('default');
    /** Controls whether the multi-select toolbar is shown: always, never, or above the auto threshold. */
    readonly toolbar = input<ImsAutocompleteToolbarMode>('auto');
    /** Option count threshold used by `toolbar="auto"`. */
    readonly toolbarAutoMinOptions = input(15, {transform: numberAttribute});
    /** Controls whether the toolbar edit action uses the built-in dialog, emits a request, or is hidden. */
    readonly editDialogMode = input<ImsAutocompleteEditDialogMode>('default');
    /** Lets a custom edit-dialog owner disable the toolbar action independently. */
    readonly editDialogDisabled = input(false, {transform: booleanAttribute});
    /** Accessible label for the toolbar edit action. Defaults to `labels.editSelection`. */
    readonly editDialogAriaLabel = input<string | null>(null);
    /** Emitted instead of opening the built-in dialog when `editDialogMode="custom"`. */
    readonly editDialogRequested = output<void>();
    /** Fixed item height used by the CDK virtual scroll viewport. Defaults to an `ims-select` option row. */
    readonly optionHeight = input(33, {transform: numberAttribute});
    /** Equality function for option values. Defaults to strict reference equality. */
    readonly compareWith = input<ImsAutocompleteCompareWith<T>>(defaultCompare);
    /**
     * Label for a selected value that no known option describes, such as an
     * initial form value outside the first page an async loader returns. An
     * option, including one picked earlier and no longer loaded, always labels
     * its own value; this is only the fallback.
     */
    readonly displayWith = input<ImsAutocompleteDisplayWith<T> | null>(null);
    /** Replaces individual texts of the application-wide `IMS_SELECTION_LABELS`. */
    readonly labels = input<Partial<ImsSelectionLabels> | null>(null);
    /** Accessible label for the single input or multi trigger. */
    readonly ariaLabel = input<string | null>(null, {alias: 'ariaLabel'});
    /** ID reference for one or more external labels. */
    readonly ariaLabelledby = input<string | null>(null, {alias: 'ariaLabelledby'});
    readonly query = signal('');
    readonly open = signal(false);
    readonly viewMode = signal<ImsAutocompleteViewMode>('all');
    readonly activeIndex = signal(-1);
    readonly toolbarSide = signal<ImsAutocompleteToolbarSide>('right');
    readonly panelWidth = signal(0);
    readonly listboxMinHeight = signal(0);
    readonly listboxMaxHeight = signal(LISTBOX_BOUNDS.max);
    readonly multiDisplay = signal<ImsSelectionDisplayState>(IMS_SELECTION_EMPTY_DISPLAY);
    readonly autocompleteId = `ims-autocomplete-${nextAutocompleteId++}`;
    readonly listboxId = `${this.autocompleteId}-listbox`;
    readonly readonlyPanelId = `${this.autocompleteId}-selected-values`;
    readonly readonlyPanelTitleId = `${this.readonlyPanelId}-title`;
    readonly overlayPositions = OVERLAY_POSITIONS;
    readonly effectiveLabels = computed<ImsSelectionLabels>(() => ({
        ...this.injectedLabels,
        ...(this.labels() ?? {})
    }));
    readonly effectivePlaceholder = computed(() =>
        this.placeholder() ?? this.effectiveLabels().autocompletePlaceholder
    );
    readonly readonlyMultipleMode = computed(() => this.interactionDisabled() && this.multiple());
    readonly effectiveStrict = computed(() => this.multiple() || this.strict());
    readonly selectedValues = computed<readonly T[]>(() => {
        const currentValue = this.value();
        if (this.multiple()) {
            return Array.isArray(currentValue) ? currentValue as readonly T[] : [];
        }

        if (currentValue === null || currentValue === undefined || typeof currentValue === 'string') {
            return [];
        }

        return [currentValue as T];
    });
    readonly selectedLabels = computed(() =>
        this.selectedValues().map((selectedValue) => this.resolveValueLabel(selectedValue))
    );
    readonly hasSelection = computed(() => {
        if (this.multiple()) return this.selectedValues().length > 0;
        const currentValue = this.value();
        return currentValue !== null && currentValue !== undefined && currentValue !== '';
    });
    readonly sourceOptions = computed(() => this.getSourceOptions());
    readonly loading = computed(() => this.isLoading());
    readonly showToolbar = computed(() => {
        if (this.readonlyMultipleMode() || !this.multiple()) return false;

        const mode = this.toolbar();
        if (mode === 'on') return true;
        if (mode === 'off') return false;
        return this.sourceOptions().length >= this.toolbarAutoMinOptions();
    });
    readonly editDialogButtonDisabled = computed(() =>
        this.interactionDisabled()
        || this.editDialogDisabled()
        || (this.editDialogMode() === 'default' && this.editableOptions().length === 0)
    );
    readonly filteredOptions = computed(() => {
        const query = normalizeSearchText(this.query());
        let options = this.sourceOptions();

        if (query) {
            options = options.filter((option) => matchesSearchQuery(option.label, query));
        }

        const sort = this.sort();
        if (sort !== 'default') {
            options = [...options].sort((first, second) =>
                first.label.localeCompare(second.label) * (sort === 'asc' ? 1 : -1)
            );
        }

        return options;
    });
    readonly visibleOptions = computed(() => this.optionsInViewMode(this.viewMode()));
    readonly viewOptionCounts = computed(() =>
        countViewModes(this.filteredOptions(), (option) => this.isSelected(option))
    );
    readonly activeOption = computed(() => this.visibleOptions()[this.activeIndex()] ?? null);
    readonly activeOptionId = computed(() => {
        const activeIndex = this.activeIndex();
        return activeIndex < 0 ? null : this.optionId(activeIndex);
    });
    /** Non-disabled options matching the current filter, regardless of view mode. Feeds the edit dialog. */
    readonly editableOptions = computed(() =>
        this.filteredOptions().filter((option) => !option.disabled)
    );
    readonly listboxHeight = computed(() => {
        const optionsCount = this.visibleOptions().length;
        if (optionsCount === 0) return Math.max(this.listboxMinHeight(), this.optionHeight() + 16);

        const optionHeight = Math.min(
            this.listboxMaxHeight(),
            Math.max(this.optionHeight(), optionsCount * this.optionHeight())
        );

        return Math.max(this.listboxMinHeight(), optionHeight);
    });

    /**
     * True while a strict single commit waits for options matching the typed
     * text. Committing against the previous query's options instead would clear
     * a value the user had typed exactly.
     */
    private readonly pendingStrictCommit = signal(false);

    /** True once the source options answer the current query; see `sourceMatchesQuery()`. */
    private readonly sourceCurrent = computed(() => this.sourceMatchesQuery());

    /**
     * Options that label the current selection, kept after they leave the
     * source options. An async source holds only the latest query's results, so
     * without this a selected value would lose its label as soon as the user
     * searched for something else.
     */
    private readonly selectedOptionCache = linkedSignal<
        ImsAutocompleteLabelSource<T>,
        readonly ImsAutocompleteOption<T>[]
    >({
        source: () => ({
            options: this.sourceOptions(),
            values: this.selectedValues(),
            compare: this.compareWith()
        }),
        computation: ({options, values, compare}, previous) => values.flatMap((value) => {
            const option = options.find((candidate) => compare(candidate.value, value))
                ?? previous?.value.find((candidate) => compare(candidate.value, value));
            return option ? [option] : [];
        })
    });

    /** True when some selected value has neither a known option nor a `displayWith` label. */
    private readonly hasUnlabeledSelection = computed(() =>
        this.displayWith() === null
        && this.selectedValues().some((value) => this.findKnownOption(value) === undefined)
    );

    /**
     * True while options are needed: the panel is open, a strict commit waits
     * for results, or a selected value still needs a label. A source that loads
     * on demand should load only while this holds.
     */
    protected readonly optionsRequested = computed(() =>
        this.open() || this.pendingStrictCommit() || this.hasUnlabeledSelection()
    );

    private resizeObserver: ResizeObserver | null = null;
    private measureFrame: ReturnType<typeof requestAnimationFrame> | null = null;
    private overlaySide: ImsSelectionOverlaySide | undefined;
    private readonly injectedLabels = inject(IMS_SELECTION_LABELS);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    private readonly transferDialog = inject(ImsTransferDialogService);
    private readonly origin = viewChild<ElementRef<HTMLElement>>('origin');
    private readonly singleInput = viewChild<ElementRef<HTMLInputElement>>('singleInput');
    private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
    private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
    private readonly readonlyPanel = viewChild(ImsSelectionReadonlyPanel);
    private readonly toolbarPanel = viewChild(ImsSelectionToolbar, {read: ElementRef});
    private readonly valueRow = viewChild<ElementRef<HTMLElement>>('valueRow');
    private readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');
    private readonly measureTextElement = viewChild<ElementRef<HTMLElement>>('measureText');
    private readonly measureBadgeElement = viewChild<ElementRef<HTMLElement>>('measureBadge');

    private readonly valuesEqual = (first: T, second: T): boolean => this.compareWith()(first, second);

    constructor() {
        super();

        // A linked signal recomputes only when read, and label lookups reach the
        // cache only once an option has already left the source. Reading it here
        // keeps it current while the options it must remember are still loaded.
        effect(() => this.selectedOptionCache());

        effect(() => {
            if (this.interactionDisabled() && !this.readonlyMultipleMode() && this.open()) {
                this.closePanel(false);
            }
        });

        effect(() => {
            if (!this.open() || this.readonlyMultipleMode()) return;

            const viewMode = this.viewMode();
            if (viewMode !== 'all' && this.optionsInViewMode(viewMode).length === 0) {
                this.viewMode.set('all');
                this.activeIndex.set(-1);
                return;
            }

            const options = this.visibleOptions();
            const activeIndex = this.activeIndex();
            queueMicrotask(() => this.viewport()?.checkViewportSize());

            if (options.length === 0) {
                if (activeIndex !== -1) this.activeIndex.set(-1);
                return;
            }

            if (activeIndex < 0 || activeIndex >= options.length || options[activeIndex].disabled) {
                this.activeIndex.set(this.findInitialActiveIndex(options));
            }
        });

        effect(() => {
            if (this.multiple()) {
                this.selectedLabels();
                this.scheduleDisplayMeasure();
            }
        });

        effect(() => {
            if (!this.open()) return;
            this.showToolbar();
            queueMicrotask(() => this.updateToolbarSide());
        });

        effect(() => {
            if (this.multiple() || this.open() || this.pendingStrictCommit()) return;
            this.syncSingleTextFromValue();
        });

        effect(() => {
            if (!this.pendingStrictCommit() || !this.sourceCurrent()) return;

            untracked(() => {
                this.pendingStrictCommit.set(false);
                if (!this.open() && !this.interactionDisabled()) {
                    this.commitSingleInput();
                }
            });
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
        this.destroyOptionsSource();
        if (this.measureFrame !== null) {
            cancelAnimationFrame(this.measureFrame);
        }
    }

    openPanel(): void {
        if ((this.interactionDisabled() && !this.readonlyMultipleMode()) || this.open()) return;
        this.pendingStrictCommit.set(false);
        this.overlaySide = undefined;
        this.updatePanelGeometry();
        if (!this.readonlyMultipleMode()) {
            this.activeIndex.set(this.findInitialActiveIndex(this.visibleOptions()));
        }
        this.open.set(true);
    }

    closePanel(commitText: boolean): void {
        if (!this.open()) return;

        this.open.set(false);
        this.viewMode.set('all');
        this.listboxMinHeight.set(0);
        this.activeIndex.set(-1);

        if (commitText && !this.multiple() && !this.interactionDisabled()) {
            this.commitSingleInput();
        }

        if (this.multiple()) {
            this.query.set('');
        }

        this.markAsTouched();
    }

    togglePanel(): void {
        if (this.open()) {
            this.closePanel(true);
        } else {
            this.openPanel();
        }
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
            if (this.multiple()) {
                this.filterInput()?.nativeElement.focus({preventScroll: true});
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
        if (target instanceof Node && this.origin()?.nativeElement.contains(target)) return;
        this.closePanel(true);
    }

    onSingleInput(event: Event): void {
        if (this.interactionDisabled()) return;

        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.query.set(target.value);
        this.openPanel();
        this.activeIndex.set(this.findInitialActiveIndex(this.visibleOptions()));

        if (!this.effectiveStrict()) {
            this.emitValue(target.value);
        }
    }

    onMultiFilterInput(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.query.set(target.value);
        this.activeIndex.set(this.findInitialActiveIndex(this.visibleOptions()));
    }

    /** Marks a multi trigger touched when focus leaves it without the panel having opened. */
    onMultiTriggerBlur(): void {
        if (!this.open()) {
            this.markAsTouched();
        }
    }

    openEditDialog(): void {
        if (this.interactionDisabled()) return;

        const rows: ImsTransferRow<T>[] = this.editableOptions().map((option, index) => ({
            id: `ims-autocomplete-option-${index}`,
            label: option.label,
            value: option.value,
            checked: this.isSelected(option)
        }));

        if (rows.length === 0) return;

        this.closePanel(false);

        const labels = this.effectiveLabels();
        const dialogRef = this.transferDialog.open<T, 'options'>({
            lists: [{id: 'options', title: labels.editDialogOptions, rows}],
            dialogTitle: labels.editDialogTitle
        });

        dialogRef.closed.subscribe((result) => {
            if (result === undefined) return;

            // The rows may have left the source options while the dialog was open.
            this.rememberOptions(rows);
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
            this.closePanel(false);
            this.editDialogRequested.emit();
            return;
        }

        this.openEditDialog();
    }

    setViewMode(mode: ImsAutocompleteViewMode): void {
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
        queueMicrotask(() => {
            this.captureListboxHeight();
            this.viewport()?.checkViewportSize();
        });
    }

    isViewModeDisabled(mode: ImsAutocompleteViewMode): boolean {
        return this.viewOptionCounts()[mode] === 0;
    }

    onSingleBlur(): void {
        queueMicrotask(() => {
            if (!this.open()) {
                if (!this.interactionDisabled()) {
                    this.commitSingleInput();
                }
                this.markAsTouched();
            }
        });
    }

    onKeydown(event: KeyboardEvent): void {
        if (this.readonlyMultipleMode()) {
            if (event.key === 'Escape' && this.open()) {
                event.preventDefault();
                this.closePanel(false);
                this.focusOrigin();
            } else if (event.key === 'Tab') {
                this.closePanel(false);
            }
            return;
        }

        if (this.interactionDisabled()) {
            return;
        }

        if (this.isToolbarKeyboardEvent(event) && event.key !== 'Escape' && event.key !== 'Tab') {
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.openPanel();
                this.moveActiveOption(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.openPanel();
                this.moveActiveOption(-1);
                break;
            case 'Home':
                if (this.open() && !(event.target instanceof HTMLInputElement)) {
                    event.preventDefault();
                    this.moveToBoundary('first');
                }
                break;
            case 'End':
                if (this.open() && !(event.target instanceof HTMLInputElement)) {
                    event.preventDefault();
                    this.moveToBoundary('last');
                }
                break;
            case 'Enter':
                if (this.open()) {
                    event.preventDefault();
                    this.selectActiveOption();
                }
                break;
            case 'Escape':
                if (this.open()) {
                    event.preventDefault();
                    this.closePanel(true);
                    this.focusOrigin();
                }
                break;
            case 'Tab':
                this.closePanel(true);
                break;
        }
    }

    selectOption(option: ImsAutocompleteOption<T>): void {
        if (this.interactionDisabled() || option.disabled) return;

        if (this.multiple()) {
            this.captureListboxHeight();
            this.emitValue(toggleSelectedValue(this.selectedValues(), option.value, this.valuesEqual));
            this.query.set('');
            this.activeIndex.set(this.findInitialActiveIndex(this.visibleOptions()));
            queueMicrotask(() => this.filterInput()?.nativeElement.focus({preventScroll: true}));
            return;
        }

        this.query.set(option.label);
        this.emitValue(option.value);
        this.closePanel(false);
        this.focusOrigin();
    }

    isSelected(option: ImsAutocompleteOption<T>): boolean {
        return this.selectedValues().some((value) => this.valuesEqual(value, option.value));
    }

    activateOption(option: ImsAutocompleteOption<T>): void {
        const index = this.visibleOptions().findIndex((visibleOption) => visibleOption === option);
        if (index < 0 || option.disabled) return;
        this.activeIndex.set(index);
    }

    optionId(index: number): string {
        return `${this.autocompleteId}-option-${index}`;
    }

    trackByOption = (_index: number, option: ImsAutocompleteOption<T>) => option.value;

    highlightParts(label: string): readonly ImsAutocompleteHighlightPart[] {
        const terms = this.searchTerms();
        if (terms.length === 0) {
            return [
                {
                    text: label,
                    match: false
                }
            ];
        }

        const labelLower = label.toLocaleLowerCase();
        const ranges: { start: number; end: number }[] = [];

        for (const term of terms) {
            let matchIndex = labelLower.indexOf(term);

            while (matchIndex >= 0) {
                ranges.push({
                    start: matchIndex,
                    end: matchIndex + term.length
                });
                matchIndex = labelLower.indexOf(term, matchIndex + term.length);
            }
        }

        if (ranges.length === 0) {
            return [
                {
                    text: label,
                    match: false
                }
            ];
        }

        ranges.sort((first, second) => first.start - second.start || second.end - first.end);

        const parts: ImsAutocompleteHighlightPart[] = [];
        let cursor = 0;
        let activeRange: { start: number; end: number } | null = null;

        for (const range of ranges) {
            if (!activeRange) {
                activeRange = range;
                continue;
            }

            if (range.start <= activeRange.end) {
                activeRange = {
                    start: activeRange.start,
                    end: Math.max(activeRange.end, range.end)
                };
                continue;
            }

            this.pushHighlightParts(label, parts, cursor, activeRange);
            cursor = activeRange.end;
            activeRange = range;
        }

        if (activeRange) {
            this.pushHighlightParts(label, parts, cursor, activeRange);
            cursor = activeRange.end;
        }

        if (cursor < label.length) {
            parts.push({
                text: label.slice(cursor),
                match: false
            });
        }

        return parts.length ? parts : [
            {
                text: label,
                match: false
            }
        ];
    }

    /** The options this autocomplete currently offers and filters. */
    protected abstract getSourceOptions(): readonly ImsAutocompleteOption<T>[];

    protected isLoading(): boolean {
        return false;
    }

    /**
     * Whether the source options already answer the current query. A static
     * list always does. A source that loads per query does not, from the moment
     * the query changes until its results arrive, and a strict commit waits for
     * them rather than judging the typed text against the previous results.
     */
    protected sourceMatchesQuery(): boolean {
        return true;
    }

    protected destroyOptionsSource(): void {}

    private searchTerms(): readonly string[] {
        const query = normalizeSearchText(this.query());
        return query ? query.split(' ') : [];
    }

    private pushHighlightParts(
        label: string,
        parts: ImsAutocompleteHighlightPart[],
        cursor: number,
        range: { start: number; end: number }
    ): void {
        if (range.start > cursor) {
            parts.push({
                text: label.slice(cursor, range.start),
                match: false
            });
        }

        parts.push({
            text: label.slice(range.start, range.end),
            match: true
        });
    }

    private isToolbarKeyboardEvent(event: KeyboardEvent): boolean {
        const target = event.target;
        return target instanceof HTMLElement && target.closest('.ims-autocomplete__toolbar') !== null;
    }

    private resolveViewMode(mode: ImsAutocompleteViewMode): ImsAutocompleteViewMode {
        return mode === 'all' || this.optionsInViewMode(mode).length > 0 ? mode : 'all';
    }

    private optionsInViewMode(mode: ImsAutocompleteViewMode): readonly ImsAutocompleteOption<T>[] {
        return optionsForViewMode(this.filteredOptions(), mode, (option) => this.isSelected(option));
    }

    private emitValue(value: ImsAutocompleteValue<T>): void {
        this.value.set(value);
        this.onChange(value);
        this.scheduleDisplayMeasure();
    }

    private commitSingleInput(): void {
        if (this.multiple()) return;

        if (!this.effectiveStrict()) {
            const currentValue = this.value();
            if (
                currentValue !== null &&
                currentValue !== undefined &&
                typeof currentValue !== 'string' &&
                this.resolveValueLabel(currentValue as T) === this.query()
            ) {
                return;
            }

            this.emitValue(this.query());
            return;
        }

        if (!this.sourceCurrent()) {
            this.pendingStrictCommit.set(true);
            return;
        }

        const query = normalizeSearchText(this.query());
        const exactOption = this.visibleOptions().find(
            (option) => !option.disabled && normalizeSearchText(option.label) === query
        );

        if (exactOption) {
            this.query.set(exactOption.label);
            this.emitValue(exactOption.value);
            return;
        }

        this.query.set('');
        this.emitValue(null);
    }

    private syncSingleTextFromValue(): void {
        const currentValue = this.value();
        const nextText = currentValue === null || currentValue === undefined
            ? ''
            : typeof currentValue === 'string'
                ? currentValue
                : this.resolveValueLabel(currentValue as T);

        if (this.query() !== nextText) {
            this.query.set(nextText);
        }
    }

    private findKnownOption(value: T): ImsAutocompleteOption<T> | undefined {
        return this.sourceOptions().find((candidate) => this.valuesEqual(candidate.value, value))
            ?? this.selectedOptionCache().find((candidate) => this.valuesEqual(candidate.value, value));
    }

    private resolveValueLabel(value: T): string {
        const option = this.findKnownOption(value);
        if (option) return option.label;

        const displayWith = this.displayWith();
        if (displayWith) return displayWith(value);

        // An object nobody has labelled has no text worth showing; its default
        // string is "[object Object]".
        return typeof value === 'object' && value !== null ? '' : String(value);
    }

    /** Keeps labels for values about to be selected from options that may no longer be loaded. */
    private rememberOptions(options: readonly ImsAutocompleteOption<T>[]): void {
        this.selectedOptionCache.update((cachedOptions) => [...cachedOptions, ...options]);
    }

    private findInitialActiveIndex(options: readonly ImsAutocompleteOption<T>[]): number {
        if (options.length === 0) return -1;

        const selectedIndex = options.findIndex((option) => !option.disabled && this.isSelected(option));
        if (selectedIndex >= 0) return selectedIndex;

        return options.findIndex((option) => !option.disabled);
    }

    private moveActiveOption(delta: 1 | -1): void {
        const options = this.visibleOptions();
        if (options.length === 0) return;

        let index = this.activeIndex();
        for (let step = 0; step < options.length; step++) {
            index = (index + delta + options.length) % options.length;
            if (!options[index].disabled) {
                this.activeIndex.set(index);
                this.scrollActiveOptionIntoView();
                return;
            }
        }
    }

    private moveToBoundary(boundary: 'first' | 'last'): void {
        const options = this.visibleOptions();
        const index = boundary === 'first'
            ? options.findIndex((option) => !option.disabled)
            : options.findLastIndex((option) => !option.disabled);

        if (index < 0) return;
        this.activeIndex.set(index);
        this.scrollActiveOptionIntoView();
    }

    private selectActiveOption(): void {
        const activeOption = this.activeOption();
        if (!activeOption) return;
        this.selectOption(activeOption);
    }

    private focusOrigin(): void {
        queueMicrotask(() => {
            if (this.multiple()) {
                this.origin()?.nativeElement.querySelector<HTMLElement>('.ims-autocomplete__trigger')?.focus();
            } else {
                this.singleInput()?.nativeElement.focus({preventScroll: true});
            }
        });
    }

    private updatePanelGeometry(): void {
        const originRect = this.origin()?.nativeElement.getBoundingClientRect();
        if (!originRect) return;

        this.panelWidth.set(originRect.width);
        this.updateListboxMaxHeight(this.overlaySide);
        this.updateToolbarSide(originRect);
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
        const originRect = this.origin()?.nativeElement.getBoundingClientRect();
        if (!originRect) return;

        const reservedHeight = this.multiple() && !this.readonlyMultipleMode()
            ? SELECTION_FILTER_FALLBACK_HEIGHT
            : 0;
        const maxHeight = resolveListboxMaxHeight(originRect, reservedHeight, preferredSide, LISTBOX_BOUNDS);

        this.listboxMaxHeight.set(maxHeight);
        if (this.listboxMinHeight() > maxHeight) {
            this.listboxMinHeight.set(maxHeight);
        }
    }

    private captureListboxHeight(): void {
        if (!this.open()) return;

        const height = Math.min(this.listboxMaxHeight(), Math.ceil(this.listboxHeight()));
        if (height > this.listboxMinHeight()) {
            this.listboxMinHeight.set(height);
        }
    }

    private scrollActiveOptionIntoView(): void {
        const viewport = this.viewport();
        const activeIndex = this.activeIndex();
        if (!viewport || activeIndex < 0) return;

        const optionHeight = this.optionHeight();
        const viewportSize = viewport.getViewportSize();
        const scrollTop = viewport.measureScrollOffset('top');
        const optionTop = activeIndex * optionHeight;
        const optionBottom = optionTop + optionHeight;
        const scrollBottom = scrollTop + viewportSize;

        if (optionTop < scrollTop) {
            viewport.scrollToOffset(optionTop, 'auto');
            return;
        }

        if (optionBottom > scrollBottom) {
            viewport.scrollToOffset(Math.max(0, optionBottom - viewportSize), 'auto');
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
            resolveAvailableValueWidth(this.valueRow()?.nativeElement, '.ims-autocomplete__badge'),
            (text) => measureTextWidth(measureText, text),
            (count) => measureTextWidth(measureBadge, `+${count}`)
        ));
    }
}
