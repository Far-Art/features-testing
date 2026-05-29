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
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    numberAttribute,
    signal,
    viewChild
} from '@angular/core';
import {Directionality} from '@angular/cdk/bidi';
import {MatTooltip} from '@angular/material/tooltip';
import {isObservable, Subscription} from 'rxjs';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {
    ImsAutocompleteCompareWith,
    ImsAutocompleteHighlightPart,
    ImsAutocompleteOption,
    ImsAutocompleteOptionsLoader,
    ImsAutocompleteValue,
    ImsAutocompleteSortMode,
    ImsAutocompleteToolbarMode,
    ImsAutocompleteToolbarSide,
    ImsAutocompleteViewMode
} from './ims-autocomplete.types';

interface ImsAutocompleteDisplayState {
    readonly text: string;
    readonly overflowCount: number;
    readonly firstTruncated: boolean;
}

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

const DEFAULT_DISPLAY: ImsAutocompleteDisplayState = {
    text: '',
    overflowCount: 0,
    firstTruncated: false
};

const defaultCompare = <T>(first: T, second: T) => first === second;
const LISTBOX_MIN_HEIGHT = 96;
const LISTBOX_MAX_HEIGHT = 350;
const VIEWPORT_MARGIN = 12;
const TOOLBAR_FALLBACK_WIDTH = 40;
const TOOLBAR_GAP = 8;

let nextAutocompleteId = 0;

@Component({
    selector: 'ims-autocomplete',
    standalone: true,
    imports: [CdkOverlayOrigin, CdkConnectedOverlay, CdkVirtualScrollViewport, CdkVirtualForOf, CdkFixedSizeVirtualScroll, MatTooltip],
    templateUrl: './ims-autocomplete.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideValueAccessor(ImsAutocomplete)],
    host: {
        class: 'ims-autocomplete-host'
    }
})
export class ImsAutocomplete<T = unknown>
    extends BasicValueAccessor<ImsAutocompleteValue<T>>
    implements AfterViewInit, OnDestroy {
    private resizeObserver: ResizeObserver | null = null;
    private measureFrame: ReturnType<typeof requestAnimationFrame> | null = null;
    private optionsSubscription: Subscription | null = null;
    private asyncRequestId = 0;
    readonly directionality = inject(Directionality);

    private readonly origin = viewChild<ElementRef<HTMLElement>>('origin');
    private readonly singleInput = viewChild<ElementRef<HTMLInputElement>>('singleInput');
    private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
    private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
    private readonly toolbarPanel = viewChild<ElementRef<HTMLElement>>('toolbarPanel');
    private readonly valueRow = viewChild<ElementRef<HTMLElement>>('valueRow');
    private readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');
    private readonly measureTextElement = viewChild<ElementRef<HTMLElement>>('measureText');
    private readonly measureBadgeElement = viewChild<ElementRef<HTMLElement>>('measureBadge');

    /** Static options used when no `loadOptions` function is provided. */
    readonly options = input<readonly ImsAutocompleteOption<T>[]>([]);

    /** Enables multi-selection. Multi-select always requires choosing options from the list. */
    readonly multiple = input(false, {transform: booleanAttribute});

    /** Placeholder displayed in the input or trigger when empty. */
    readonly placeholder = input('חיפוש');

    /** Requires single-selection text to resolve to an option. Multi-select is always strict. */
    readonly strict = input(false, {transform: booleanAttribute});

    /** Async option source called whenever the search query changes. */
    readonly loadOptions = input<ImsAutocompleteOptionsLoader<T> | null>(null);

    /** Delay in milliseconds before calling `loadOptions` after the query changes. */
    readonly loadDebounceMs = input(0, {transform: numberAttribute});

    /** Sort mode for the visible option labels. `default` preserves source order. */
    readonly sort = input<ImsAutocompleteSortMode>('default');

    /** Controls whether the multi-select toolbar is shown: always, never, or above the auto threshold. */
    readonly toolbar = input<ImsAutocompleteToolbarMode>('off');

    /** Option count threshold used by `toolbar="auto"`. */
    readonly toolbarAutoMinOptions = input(15, {transform: numberAttribute});

    /** Fixed item height used by the CDK virtual scroll viewport. */
    readonly optionHeight = input(36, {transform: numberAttribute});

    /** Equality function for option values. Defaults to strict reference equality. */
    readonly compareWith = input<ImsAutocompleteCompareWith<T>>(defaultCompare);

    /** Accessible label for the single input or multi trigger. */
    readonly ariaLabel = input<string | null>(null, {alias: 'ariaLabel'});

    /** ID reference for one or more external labels. */
    readonly ariaLabelledby = input<string | null>(null, {alias: 'ariaLabelledby'});

    readonly query = signal('');
    readonly open = signal(false);
    readonly loading = signal(false);
    readonly asyncOptions = signal<readonly ImsAutocompleteOption<T>[]>([]);
    readonly viewMode = signal<ImsAutocompleteViewMode>('all');
    readonly activeIndex = signal(-1);
    readonly toolbarSide = signal<ImsAutocompleteToolbarSide>('right');
    readonly panelWidth = signal(0);
    readonly listboxMinHeight = signal(0);
    readonly listboxMaxHeight = signal(LISTBOX_MAX_HEIGHT);
    readonly multiDisplay = signal<ImsAutocompleteDisplayState>(DEFAULT_DISPLAY);

    readonly autocompleteId = `ims-autocomplete-${nextAutocompleteId++}`;
    readonly listboxId = `${this.autocompleteId}-listbox`;
    readonly overlayPositions = OVERLAY_POSITIONS;

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
        this.selectedValues().map((selectedValue) => this.labelForValue(selectedValue))
    );

    readonly hasSelection = computed(() => {
        if (this.multiple()) return this.selectedValues().length > 0;
        const currentValue = this.value();
        return currentValue !== null && currentValue !== undefined && currentValue !== '';
    });

    readonly sourceOptions = computed(() => this.loadOptions() ? this.asyncOptions() : this.options());

    readonly showToolbar = computed(() => {
        if (!this.multiple()) return false;

        const mode = this.toolbar();
        if (mode === 'on') return true;
        if (mode === 'off') return false;
        return this.sourceOptions().length >= this.toolbarAutoMinOptions();
    });

    readonly filteredOptions = computed(() => {
        const query = this.normalizedQuery();
        let options = this.sourceOptions();

        if (query) {
            options = options.filter((option) => this.matchesSearchQuery(option.label, query));
        }

        const sort = this.sort();
        if (sort !== 'default') {
            options = [...options].sort((first, second) =>
                first.label.localeCompare(second.label) * (sort === 'asc' ? 1 : -1)
            );
        }

        return options;
    });

    readonly visibleOptions = computed(() => this.optionsForViewMode(this.viewMode()));
    readonly activeOption = computed(() => this.visibleOptions()[this.activeIndex()] ?? null);
    readonly activeOptionId = computed(() => {
        const activeIndex = this.activeIndex();
        return activeIndex < 0 ? null : this.optionId(activeIndex);
    });

    readonly selectableVisibleOptions = computed(() =>
        this.visibleOptions().filter((option) => !option.disabled)
    );

    readonly visibleSelectedCount = computed(() =>
        this.selectableVisibleOptions().filter((option) => this.isSelected(option)).length
    );

    readonly bulkChecked = computed(() => {
        const selectableCount = this.selectableVisibleOptions().length;
        return selectableCount > 0 && this.visibleSelectedCount() === selectableCount;
    });

    readonly bulkMixed = computed(() => {
        const selectedCount = this.visibleSelectedCount();
        return selectedCount > 0 && selectedCount < this.selectableVisibleOptions().length;
    });

    readonly listboxHeight = computed(() => {
        const optionsCount = this.visibleOptions().length;
        if (optionsCount === 0) return Math.max(this.listboxMinHeight(), this.optionHeight() + 16);

        const optionHeight = Math.min(
            this.listboxMaxHeight(),
            Math.max(this.optionHeight(), optionsCount * this.optionHeight())
        );

        return Math.max(this.listboxMinHeight(), optionHeight);
    });

    constructor() {
        super();

        effect((onCleanup) => {
            const loader = this.loadOptions();
            const query = this.query();
            const debounceMs = Math.max(0, this.loadDebounceMs());
            const requestId = ++this.asyncRequestId;
            let activeSubscription: Subscription | null = null;

            this.clearOptionsSubscription();

            if (!loader) {
                this.loading.set(false);
                this.asyncOptions.set([]);
                return;
            }

            this.loading.set(true);
            const timeoutId = window.setTimeout(() => {
                if (requestId !== this.asyncRequestId) return;

                let result: ReturnType<ImsAutocompleteOptionsLoader<T>>;
                try {
                    result = loader(query);
                } catch {
                    this.finishAsyncOptions(requestId);
                    return;
                }

                if (isObservable(result)) {
                    const subscription = result.subscribe({
                        next: (options) => this.setAsyncOptions(requestId, options),
                        error: () => {
                            this.finishAsyncOptions(requestId);
                            this.clearOptionsSubscription(activeSubscription);
                        },
                        complete: () => this.clearOptionsSubscription(activeSubscription)
                    });
                    activeSubscription = subscription;

                    if (!subscription.closed && requestId === this.asyncRequestId) {
                        this.optionsSubscription = subscription;
                    }
                    return;
                }

                Promise.resolve(result)
                    .then((options) => this.setAsyncOptions(requestId, options))
                    .catch(() => this.finishAsyncOptions(requestId));
            }, debounceMs);

            onCleanup(() => {
                window.clearTimeout(timeoutId);
                this.clearOptionsSubscription(activeSubscription);
            });
        });

        effect(() => {
            if (!this.open()) return;

            const viewMode = this.viewMode();
            if (viewMode !== 'all' && this.optionsForViewMode(viewMode).length === 0) {
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
            if (this.multiple() || this.open()) return;
            this.syncSingleTextFromValue();
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
        this.asyncRequestId++;
        this.clearOptionsSubscription();
        if (this.measureFrame !== null) {
            cancelAnimationFrame(this.measureFrame);
        }
    }

    openPanel(): void {
        if (this.disabled() || this.open()) return;
        this.updatePanelGeometry();
        this.activeIndex.set(this.findInitialActiveIndex(this.visibleOptions()));
        this.open.set(true);
    }

    closePanel(commitText: boolean): void {
        if (!this.open()) return;

        this.open.set(false);
        this.viewMode.set('all');
        this.listboxMinHeight.set(0);
        this.activeIndex.set(-1);

        if (commitText && !this.multiple()) {
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
            this.updateToolbarSide();
            this.captureListboxHeight();
            if (this.multiple()) {
                this.filterInput()?.nativeElement.focus({preventScroll: true});
            }

            this.scrollActiveOptionIntoView();
        });
    }

    onOverlayPositionChange(event: ConnectedOverlayPositionChange): void {
        this.updateListboxMaxHeight(event.connectionPair.originY === 'top' ? 'above' : 'below');
        this.updateToolbarSide();
    }

    onOutsideClick(event: MouseEvent): void {
        const target = event.target;
        if (target instanceof Node && this.origin()?.nativeElement.contains(target)) return;
        this.closePanel(true);
    }

    onSingleInput(event: Event): void {
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

    onBulkCheckboxChange(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.setVisibleOptionsSelected(target.checked);
    }

    setViewMode(mode: ImsAutocompleteViewMode): void {
        this.captureListboxHeight();
        this.viewMode.set(this.resolveViewMode(mode));
        this.activeIndex.set(-1);
        queueMicrotask(() => {
            this.captureListboxHeight();
            this.viewport()?.checkViewportSize();
        });
    }

    onSingleBlur(): void {
        queueMicrotask(() => {
            if (!this.open()) {
                this.commitSingleInput();
                this.markAsTouched();
            }
        });
    }

    onKeydown(event: KeyboardEvent): void {
        if (this.disabled()) return;

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
        if (this.disabled() || option.disabled) return;

        if (this.multiple()) {
            this.captureListboxHeight();
            this.toggleMultiValue(option.value);
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
        if (terms.length === 0) return [{text: label, match: false}];

        const labelLower = label.toLocaleLowerCase();
        const ranges: {start: number; end: number}[] = [];

        for (const term of terms) {
            let matchIndex = labelLower.indexOf(term);

            while (matchIndex >= 0) {
                ranges.push({start: matchIndex, end: matchIndex + term.length});
                matchIndex = labelLower.indexOf(term, matchIndex + term.length);
            }
        }

        if (ranges.length === 0) return [{text: label, match: false}];

        ranges.sort((first, second) => first.start - second.start || second.end - first.end);

        const parts: ImsAutocompleteHighlightPart[] = [];
        let cursor = 0;
        let activeRange: {start: number; end: number} | null = null;

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

        if (cursor < label.length) parts.push({text: label.slice(cursor), match: false});

        return parts.length ? parts : [{text: label, match: false}];
    }

    private normalizedQuery(): string {
        return this.normalizeSearchText(this.query());
    }

    private searchTerms(): readonly string[] {
        const query = this.normalizedQuery();
        return query ? query.split(' ') : [];
    }

    private matchesSearchQuery(text: string, query: string): boolean {
        const normalizedText = this.normalizeSearchText(text);
        return query.split(' ').every((term) => normalizedText.includes(term));
    }

    private normalizeSearchText(text: string): string {
        return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    }

    private pushHighlightParts(
        label: string,
        parts: ImsAutocompleteHighlightPart[],
        cursor: number,
        range: {start: number; end: number}
    ): void {
        if (range.start > cursor) {
            parts.push({text: label.slice(cursor, range.start), match: false});
        }

        parts.push({text: label.slice(range.start, range.end), match: true});
    }

    private isToolbarKeyboardEvent(event: KeyboardEvent): boolean {
        const target = event.target;
        return target instanceof HTMLElement && target.closest('.ims-autocomplete__toolbar') !== null;
    }

    private resolveViewMode(mode: ImsAutocompleteViewMode): ImsAutocompleteViewMode {
        return mode === 'all' || this.optionsForViewMode(mode).length > 0 ? mode : 'all';
    }

    private optionsForViewMode(mode: ImsAutocompleteViewMode): readonly ImsAutocompleteOption<T>[] {
        const options = this.filteredOptions();

        if (mode === 'selected') {
            return options.filter((option) => this.isSelected(option));
        }

        if (mode === 'unselected') {
            return options.filter((option) => !this.isSelected(option));
        }

        return options;
    }

    private setAsyncOptions(requestId: number, options: readonly ImsAutocompleteOption<T>[]): void {
        if (requestId !== this.asyncRequestId) return;
        this.asyncOptions.set(options);
        this.loading.set(false);
    }

    private finishAsyncOptions(requestId: number): void {
        if (requestId !== this.asyncRequestId) return;
        this.asyncOptions.set([]);
        this.loading.set(false);
    }

    private clearOptionsSubscription(subscription = this.optionsSubscription): void {
        if (!subscription) return;

        subscription.unsubscribe();
        if (this.optionsSubscription === subscription) {
            this.optionsSubscription = null;
        }
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
                this.labelForValue(currentValue as T) === this.query()
            ) {
                return;
            }

            this.emitValue(this.query());
            return;
        }

        const query = this.normalizedQuery();
        const exactOption = this.visibleOptions().find(
            (option) => !option.disabled && this.normalizeSearchText(option.label) === query
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
                : this.labelForValue(currentValue as T);

        if (this.query() !== nextText) {
            this.query.set(nextText);
        }
    }

    private labelForValue(value: T): string {
        const option = this.sourceOptions().find((candidate) => this.valuesEqual(candidate.value, value));
        return option?.label ?? String(value);
    }

    private toggleMultiValue(value: T): void {
        const selectedValues = this.selectedValues();
        const exists = selectedValues.some((selectedValue) => this.valuesEqual(selectedValue, value));
        const nextValue = exists
            ? selectedValues.filter((selectedValue) => !this.valuesEqual(selectedValue, value))
            : [...selectedValues, value];

        this.emitValue(nextValue);
    }

    private setVisibleOptionsSelected(selected: boolean): void {
        if (this.disabled() || !this.multiple()) return;

        const visibleValues = this.selectableVisibleOptions().map((option) => option.value);
        const selectedValues = this.selectedValues();
        const nextValue = selected
            ? [
                ...selectedValues,
                ...visibleValues.filter(
                    (visibleValue) =>
                        !selectedValues.some((selectedValue) =>
                            this.valuesEqual(selectedValue, visibleValue)
                        )
                )
            ]
            : selectedValues.filter(
                (selectedValue) =>
                    !visibleValues.some((visibleValue) => this.valuesEqual(selectedValue, visibleValue))
            );

        this.emitValue(nextValue);
    }

    private valuesEqual(first: T, second: T): boolean {
        return this.compareWith()(first, second);
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
        this.updateListboxMaxHeight();
        this.updateToolbarSide(originRect);
    }

    private updateToolbarSide(fallbackRect?: DOMRect): void {
        if (!this.showToolbar()) return;

        const viewportWidth = document.documentElement.clientWidth;
        const menuRect = this.menu()?.nativeElement.getBoundingClientRect() ?? fallbackRect;
        if (!menuRect) return;

        const toolbarWidth =
            this.toolbarPanel()?.nativeElement.getBoundingClientRect().width ??
            TOOLBAR_FALLBACK_WIDTH;
        const requiredSpace = toolbarWidth + TOOLBAR_GAP;
        const spaceRight = viewportWidth - menuRect.right - VIEWPORT_MARGIN;
        const spaceLeft = menuRect.left - VIEWPORT_MARGIN;

        if (spaceRight >= requiredSpace) {
            this.toolbarSide.set('right');
        } else if (spaceLeft >= requiredSpace) {
            this.toolbarSide.set('left');
        } else {
            this.toolbarSide.set(spaceRight >= spaceLeft ? 'right' : 'left');
        }
    }

    private updateListboxMaxHeight(preferredSide?: 'above' | 'below'): void {
        const originRect = this.origin()?.nativeElement.getBoundingClientRect();
        if (!originRect) return;

        const viewportHeight = window.visualViewport?.height ?? document.documentElement.clientHeight;
        const availableBelow = viewportHeight - originRect.bottom - VIEWPORT_MARGIN;
        const availableAbove = originRect.top - VIEWPORT_MARGIN;
        const filterHeight = this.multiple() ? 56 : 0;
        const belowRoom = availableBelow - filterHeight;
        const aboveRoom = availableAbove - filterHeight;
        const preferredRoom = preferredSide === 'above'
            ? aboveRoom
            : preferredSide === 'below'
                ? belowRoom
                : belowRoom >= LISTBOX_MIN_HEIGHT
                    ? belowRoom
                    : aboveRoom;
        const maxHeight = Math.min(
            LISTBOX_MAX_HEIGHT,
            Math.max(LISTBOX_MIN_HEIGHT, Math.floor(preferredRoom))
        );

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
            this.multiDisplay.set(DEFAULT_DISPLAY);
            return;
        }

        const labels = this.selectedLabels();
        if (labels.length === 0) {
            this.multiDisplay.set(DEFAULT_DISPLAY);
            return;
        }

        if (labels.length === 1) {
            this.multiDisplay.set({text: labels[0], overflowCount: 0, firstTruncated: false});
            return;
        }

        const valueRowWidth = this.valueRow()?.nativeElement.clientWidth ?? 0;
        if (valueRowWidth <= 0) {
            this.multiDisplay.set({
                text: labels[0],
                overflowCount: labels.length - 1,
                firstTruncated: true
            });
            return;
        }

        for (let visibleCount = labels.length; visibleCount >= 1; visibleCount--) {
            const overflowCount = labels.length - visibleCount;
            const text = overflowCount > 0
                ? `${labels.slice(0, visibleCount).join(', ')}, ...`
                : labels.join(', ');
            const badgeWidth = overflowCount > 0 ? this.measureBadgeWidth(overflowCount) + 6 : 0;
            const textWidth = this.measureTextWidth(text);

            if (textWidth + badgeWidth <= valueRowWidth) {
                this.multiDisplay.set({text, overflowCount, firstTruncated: false});
                return;
            }
        }

        this.multiDisplay.set({
            text: labels[0],
            overflowCount: labels.length - 1,
            firstTruncated: true
        });
    }

    private measureTextWidth(text: string): number {
        const element = this.measureTextElement()?.nativeElement;
        if (!element) return 0;

        element.textContent = text;
        return element.getBoundingClientRect().width;
    }

    private measureBadgeWidth(count: number): number {
        const element = this.measureBadgeElement()?.nativeElement;
        if (!element) return 0;

        element.textContent = `+${count}`;
        return element.getBoundingClientRect().width;
    }
}
