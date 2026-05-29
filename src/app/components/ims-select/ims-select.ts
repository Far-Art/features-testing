import {
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    ConnectedOverlayPositionChange,
    ConnectedPosition
} from '@angular/cdk/overlay';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    booleanAttribute,
    computed,
    contentChildren,
    effect,
    forwardRef,
    input,
    numberAttribute,
    signal,
    viewChild
} from '@angular/core';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {ImsOption} from './ims-option';
import {
    IMS_SELECT_PARENT,
    ImsSelectCompareWith,
    ImsSelectFilterMode,
    ImsSelectFilterPredicate,
    ImsSelectOptionLike,
    ImsSelectParent,
    ImsSelectToolbarSide,
    ImsSelectToolbarMode,
    ImsSelectViewMode
} from './ims-select.types';

type ImsSelectFormValue<T> = T | readonly T[] | null | undefined;

interface ImsSelectDisplayState {
    readonly text: string;
    readonly overflowCount: number;
    readonly firstTruncated: boolean;
}

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

const DEFAULT_DISPLAY: ImsSelectDisplayState = {
    text: '',
    overflowCount: 0,
    firstTruncated: false
};

const defaultCompare = <T>(first: T, second: T) => first === second;
const LISTBOX_MIN_HEIGHT = 144;
const LISTBOX_MAX_HEIGHT = 350;
const VIEWPORT_MARGIN = 12;
const TOOLBAR_FALLBACK_WIDTH = 40;
const TOOLBAR_GAP = 8;

let nextSelectId = 0;

@Component({
    selector: 'ims-select',
    standalone: true,
    imports: [CdkOverlayOrigin, CdkConnectedOverlay],
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
export class ImsSelect<T = unknown>
    extends BasicValueAccessor<ImsSelectFormValue<T>>
    implements AfterViewInit, OnDestroy, ImsSelectParent<T> {
    private resizeObserver: ResizeObserver | null = null;
    private measureFrame: ReturnType<typeof requestAnimationFrame> | null = null;

    private readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');
    private readonly filterField = viewChild<ElementRef<HTMLElement>>('filterField');
    private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
    private readonly listbox = viewChild<ElementRef<HTMLElement>>('listbox');
    private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
    private readonly toolbarPanel = viewChild<ElementRef<HTMLElement>>('toolbarPanel');
    private readonly valueRow = viewChild<ElementRef<HTMLElement>>('valueRow');
    private readonly measureTextElement = viewChild<ElementRef<HTMLElement>>('measureText');
    private readonly measureBadgeElement = viewChild<ElementRef<HTMLElement>>('measureBadge');

    readonly options = contentChildren<ImsOption<T>>(ImsOption, {descendants: true});

    /** Enables multi-selection. Multi-select writes a readonly array of selected values. */
    readonly multiple = input(false, {transform: booleanAttribute});

    /** Text displayed in the trigger when no value is selected. */
    readonly placeholder = input('Select');

    /** Controls whether the filter input is shown: always, never, or above the auto threshold. */
    readonly filter = input<ImsSelectFilterMode>('off');

    /** Controls whether the multi-select toolbar is shown: always, never, or above the auto threshold. */
    readonly toolbar = input<ImsSelectToolbarMode>('off');

    /** Option count threshold used by `filter="auto"` and `toolbar="auto"`. */
    readonly filterAutoMinOptions = input(15, {transform: numberAttribute});

    /** Equality function for option values. Defaults to strict reference equality. */
    readonly compareWith = input<ImsSelectCompareWith<T>>(defaultCompare);

    /**
     * Custom filter predicate. The query argument is trimmed and lowercased.
     * Defaults to matching the option selection label.
     */
    readonly filterPredicate = input<ImsSelectFilterPredicate<T> | null>(null);

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
    readonly listboxMaxHeight = signal(LISTBOX_MAX_HEIGHT);
    readonly multiDisplay = signal<ImsSelectDisplayState>(DEFAULT_DISPLAY);

    readonly selectId = `ims-select-${nextSelectId++}`;
    readonly listboxId = `${this.selectId}-listbox`;
    readonly filterInputId = `${this.selectId}-filter`;
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

    readonly showFilter = computed(() => {
        const mode = this.filter();
        if (mode === 'on') return true;
        if (mode === 'off') return false;
        return this.options().length >= this.filterAutoMinOptions();
    });

    readonly showToolbar = computed(() => {
        if (!this.multiple()) return false;

        const mode = this.toolbar();
        if (mode === 'on') return true;
        if (mode === 'off') return false;
        return this.options().length >= this.filterAutoMinOptions();
    });

    readonly textFilteredOptions = computed(() => {
        const query = this.normalizedFilterQuery();
        const options = this.options();

        if (!this.showFilter() || !query) return options;

        const predicate = this.filterPredicate();
        if (predicate) {
            return options.filter((option) => predicate(query, option));
        }

        return options.filter((option) =>
            option.selectionLabel().toLocaleLowerCase().includes(query)
        );
    });

    readonly visibleOptions = computed(() => {
        return this.optionsForViewMode(this.viewMode());
    });

    readonly activeOption = computed(() => this.visibleOptions()[this.activeIndex()] ?? null);
    readonly activeOptionId = computed(() => this.activeOption()?.id ?? null);

    readonly selectableVisibleOptions = computed(() =>
        this.visibleOptions().filter((option) => !option.disabled())
    );

    readonly visibleSelectedCount = computed(() =>
        this.selectableVisibleOptions().filter((option) => this.isOptionSelected(option)).length
    );

    readonly bulkChecked = computed(() => {
        const selectableCount = this.selectableVisibleOptions().length;
        return selectableCount > 0 && this.visibleSelectedCount() === selectableCount;
    });

    readonly bulkMixed = computed(() => {
        const selectedCount = this.visibleSelectedCount();
        return selectedCount > 0 && selectedCount < this.selectableVisibleOptions().length;
    });

    constructor() {
        super();

        effect(() => {
            if (this.disabled() && this.open()) {
                this.close(false);
            }
        });

        effect(() => {
            this.multiple();
            this.selectedLabels();
            this.scheduleDisplayMeasure();
        });

        effect(() => {
            if (!this.open()) return;

            const viewMode = this.viewMode();
            if (viewMode !== 'all' && this.optionsForViewMode(viewMode).length === 0) {
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
    }

    togglePanel(): void {
        if (this.disabled()) return;

        if (this.open()) {
            this.close(true);
            return;
        }

        this.openPanel();
    }

    openPanel(): void {
        if (this.disabled() || this.open()) return;

        this.updatePanelGeometry();
        this.setInitialActiveOption();
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
            queueMicrotask(() => this.triggerButton()?.nativeElement.focus({preventScroll: true}));
        }
    }

    onOverlayAttached(): void {
        queueMicrotask(() => {
            this.updatePanelGeometry();
            this.updateListboxMaxHeight();
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
        this.updateListboxMaxHeight(event.connectionPair.originY === 'top' ? 'above' : 'below');
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

    onBulkCheckboxChange(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        this.setVisibleOptionsSelected(target.checked);
    }

    setViewMode(mode: ImsSelectViewMode): void {
        this.captureListboxHeight();
        this.viewMode.set(this.resolveViewMode(mode));
        this.activeIndex.set(-1);
        queueMicrotask(() => this.captureListboxHeight());
    }

    isOptionSelected(option: ImsSelectOptionLike<T>): boolean {
        const optionValue = this.readOptionValue(option);
        return optionValue.available && this.isValueSelected(optionValue.value);
    }

    isOptionActive(option: ImsSelectOptionLike<T>): boolean {
        return this.activeOption() === option;
    }

    isOptionVisible(option: ImsSelectOptionLike<T>): boolean {
        return this.visibleOptions().some((visibleOption) => visibleOption === option);
    }

    activateOption(option: ImsSelectOptionLike<T>): void {
        const index = this.visibleOptions().findIndex((visibleOption) => visibleOption === option);
        if (index < 0 || option.disabled()) return;
        this.activeIndex.set(index);
    }

    selectOption(option: ImsSelectOptionLike<T>, event?: Event): void {
        event?.preventDefault();

        if (this.disabled() || option.disabled()) return;

        const optionValue = this.readOptionValue(option);
        if (!optionValue.available) return;

        this.activateOption(option);

        if (this.multiple()) {
            this.toggleMultiValue(optionValue.value);
            return;
        }

        this.emitValue(optionValue.value);
        this.close(true);
    }

    onTriggerKeydown(event: KeyboardEvent): void {
        if (this.disabled()) return;

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
                this.moveActiveOption(-1);
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

    private normalizedFilterQuery(): string {
        return this.filterQuery().trim().toLocaleLowerCase();
    }

    private resolveViewMode(mode: ImsSelectViewMode): ImsSelectViewMode {
        return mode === 'all' || this.optionsForViewMode(mode).length > 0 ? mode : 'all';
    }

    private optionsForViewMode(mode: ImsSelectViewMode): readonly ImsOption<T>[] {
        const options = this.textFilteredOptions();

        if (mode === 'selected') {
            return options.filter((option) => this.isOptionSelected(option));
        }

        if (mode === 'unselected') {
            return options.filter((option) => !this.isOptionSelected(option));
        }

        return options;
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

    private readOptionValue(option: ImsSelectOptionLike<T>):
        | {readonly available: true; readonly value: T}
        | {readonly available: false} {
        try {
            return {available: true, value: option.value()};
        } catch {
            return {available: false};
        }
    }

    private valuesEqual(first: T, second: T): boolean {
        return this.compareWith()(first, second);
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

        const visibleValues = this.selectableVisibleOptions()
            .map((option) => this.readOptionValue(option))
            .filter((optionValue): optionValue is {readonly available: true; readonly value: T} =>
                optionValue.available
            )
            .map((optionValue) => optionValue.value);
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

    private emitValue(value: ImsSelectFormValue<T>): void {
        this.value.set(value);
        this.onChange(value);
        this.scheduleDisplayMeasure();
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

    private scrollActiveOptionIntoView(): void {
        queueMicrotask(() => this.activeOption()?.scrollIntoView());
    }

    private updatePanelGeometry(): void {
        const triggerRect = this.triggerButton()?.nativeElement.getBoundingClientRect();
        if (!triggerRect) return;

        this.panelMinWidth.set(triggerRect.width);
        this.updateListboxMaxHeight();
        this.updateToolbarSide(triggerRect);
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
        const triggerRect = this.triggerButton()?.nativeElement.getBoundingClientRect();
        if (!triggerRect) return;

        const viewportHeight = window.visualViewport?.height ?? document.documentElement.clientHeight;
        const availableBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;
        const availableAbove = triggerRect.top - VIEWPORT_MARGIN;
        const reservedHeight = this.filterField()?.nativeElement.getBoundingClientRect().height ??
            (this.showFilter() ? 56 : 0);
        const listboxRoomBelow = availableBelow - reservedHeight;
        const listboxRoomAbove = availableAbove - reservedHeight;
        const preferredRoom = preferredSide === 'above'
            ? listboxRoomAbove
            : preferredSide === 'below'
                ? listboxRoomBelow
                : listboxRoomBelow >= LISTBOX_MIN_HEIGHT
                    ? listboxRoomBelow
                    : listboxRoomAbove;
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
            this.multiDisplay.set(DEFAULT_DISPLAY);
            return;
        }

        const labels = this.selectedLabels();
        if (labels.length === 0) {
            this.multiDisplay.set(DEFAULT_DISPLAY);
            return;
        }

        if (labels.length === 1) {
            this.multiDisplay.set({
                text: labels[0],
                overflowCount: 0,
                firstTruncated: false
            });
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
                this.multiDisplay.set({
                    text,
                    overflowCount,
                    firstTruncated: false
                });
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
