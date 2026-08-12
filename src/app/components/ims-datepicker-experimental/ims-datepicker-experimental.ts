import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    LOCALE_ID,
    Type,
    computed,
    effect,
    forwardRef,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition} from '@angular/cdk/overlay';
import {Directionality} from '@angular/cdk/bidi';
import {Temporal} from '@js-temporal/polyfill';
import {
    AbstractControl,
    NG_VALIDATORS,
    ValidationErrors,
    Validator
} from '@angular/forms';
import {BasicValueAccessor, provideValueAccessor} from '../../shared/basic-value-accessor';
import {runScopedViewTransition} from '../../shared/view-transition';
import {IMS_DATEPICKER_PARSER} from '../ims-datepicker/ims-datepicker.parser';
import {
    IMS_DATEPICKER_EXPERIMENTAL_CONFIG,
    ImsDatepickerExperimentalDate,
    ImsDatepickerExperimentalDateFilter,
    ImsDatepickerExperimentalFirstDayOfWeek,
    ImsDatepickerExperimentalFormats,
    ImsDatepickerExperimentalMonthDay,
    ImsDatepickerExperimentalPrecision,
    ImsDatepickerExperimentalValue,
    ImsDatepickerExperimentalValueType,
    ImsDatepickerExperimentalView,
    PartialImsDatepickerExperimentalFormats
} from './ims-datepicker-experimental.types';
import {
    canonicalDate,
    clampDate,
    compareDateOnly,
    formatDate,
    formatWeekdays,
    IMS_DATEPICKER_EXPERIMENTAL_INPUT_PATTERNS,
    isDateInputTextAllowed,
    isTemporalPlainDate,
    mergeDatepickerFormats,
    normalizeDateValue,
    todayInZone,
    toUtcEpochMillis
} from './ims-datepicker-experimental.utils';

interface ImsDatepickerExperimentalDayCell {
    readonly id: string;
    readonly date: ImsDatepickerExperimentalDate;
    readonly label: number;
    readonly currentMonth: boolean;
    readonly active: boolean;
    readonly selected: boolean;
    readonly today: boolean;
    readonly disabled: boolean;
}

interface ImsDatepickerExperimentalMonthCell {
    readonly id: string;
    readonly month: number;
    readonly label: string;
    readonly active: boolean;
    readonly selected: boolean;
    readonly disabled: boolean;
}

interface ImsDatepickerExperimentalYearCell {
    readonly id: string;
    readonly year: number;
    readonly active: boolean;
    readonly selected: boolean;
    readonly disabled: boolean;
}

type ImsDatepickerExperimentalNavigationDistance = 'near' | 'far';
type ImsDatepickerExperimentalNavigationDirection = -1 | 1;
type ImsDatepickerExperimentalShortcut = 'today' | 'month-start' | 'month-end';
type ImsDatepickerExperimentalTransitionDirection = 'view' | 'left-to-right' | 'right-to-left';

const OVERLAY_POSITIONS: ConnectedPosition[] = [
    {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        offsetY: 4
    },
    {
        originX: 'start',
        originY: 'top',
        overlayX: 'start',
        overlayY: 'bottom',
        offsetY: -4
    }
];

const DEFAULT_MIN = canonicalDate(1900, 1, 1)!;
const DEFAULT_MAX = canonicalDate(2100, 12, 31)!;
const YEARS_PER_PAGE = 24;

let nextDatepickerId = 0;

function provideDatepickerValidator(type: Type<unknown>) {
    return {
        provide: NG_VALIDATORS,
        useExisting: forwardRef(() => type),
        multi: true
    };
}

@Component({
    selector: 'ims-datepicker-experimental',
    standalone: true,
    imports: [CdkOverlayOrigin, CdkConnectedOverlay, CdkTrapFocus],
    templateUrl: './ims-datepicker-experimental.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideValueAccessor(ImsDatepickerExperimental),
        provideDatepickerValidator(ImsDatepickerExperimental)
    ],
    host: {
        class: 'ims-datepicker-host ims-input-host'
    }
})
export class ImsDatepickerExperimental
    extends BasicValueAccessor<ImsDatepickerExperimentalValue>
    implements Validator {
    private readonly globalConfig = inject(IMS_DATEPICKER_EXPERIMENTAL_CONFIG);
    private readonly dateParser = inject(IMS_DATEPICKER_PARSER);
    private readonly angularLocale = inject(LOCALE_ID);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    readonly directionality = inject(Directionality);
    private readonly field = viewChild<ElementRef<HTMLElement>>('field');
    private readonly textInput = viewChild<ElementRef<HTMLInputElement>>('textInput');
    private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
    private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');
    private validatorChange: () => void = () => undefined;
    private focusFrame: number | null = null;
    private pendingNavigationCursor: ImsDatepickerExperimentalDate | null = null;
    private readonly userEditing = signal(false);
    private readonly inferredValueType = signal<ImsDatepickerExperimentalValueType>('temporal');

    /** Selection precision. This is independent from the configured display format. */
    readonly format = input<ImsDatepickerExperimentalPrecision>('dd/MM/yyyy');
    readonly min = input<ImsDatepickerExperimentalValue>(null);
    readonly max = input<ImsDatepickerExperimentalValue>(null);
    readonly dateFilter = input<ImsDatepickerExperimentalDateFilter | null>(null);
    readonly valueType = input<ImsDatepickerExperimentalValueType | null>(null);
    readonly monthDay = input<ImsDatepickerExperimentalMonthDay>('start');
    readonly formats = input<PartialImsDatepickerExperimentalFormats | null>(null);
    readonly locale = input<string | null>(null);
    readonly zone = input<string | null>(null);
    readonly firstDayOfWeek = input<ImsDatepickerExperimentalFirstDayOfWeek | null>(null);
    readonly placeholder = input<string | null>(null);
    readonly ariaLabel = input<string | null>(null, {alias: 'ariaLabel'});
    readonly ariaLabelledby = input<string | null>(null, {alias: 'ariaLabelledby'});

    readonly open = signal(false);
    readonly rawText = signal('');
    readonly parseInvalid = signal(false);
    readonly calendarView = signal<ImsDatepickerExperimentalView>('day');
    readonly calendarTransitionDirection = signal<ImsDatepickerExperimentalTransitionDirection>('view');
    readonly cursor = signal(DEFAULT_MIN);

    readonly datepickerId = `ims-datepicker-${nextDatepickerId++}`;
    readonly dialogId = `${this.datepickerId}-dialog`;
    readonly headerButtonId = `${this.datepickerId}-period`;
    readonly inputPattern = computed(() =>
        IMS_DATEPICKER_EXPERIMENTAL_INPUT_PATTERNS[this.format()]
    );
    readonly overlayPositions = OVERLAY_POSITIONS;

    readonly effectiveLocale = computed(
        () => this.locale() ?? this.globalConfig.locale ?? this.angularLocale
    );
    readonly interpretationZone = computed(() => this.zone() ?? this.globalConfig.zone ?? 'local');
    readonly outputType = computed(() => {
        const configuredType = this.valueType() ?? this.globalConfig.valueType;
        if (configuredType) return configuredType;
        return this.inferredValueType();
    });
    readonly effectiveFirstDayOfWeek = computed(
        () => this.firstDayOfWeek() ?? this.globalConfig.firstDayOfWeek ?? 1
    );
    readonly effectiveFormats = computed<ImsDatepickerExperimentalFormats>(() =>
        mergeDatepickerFormats(this.globalConfig.formats, this.formats() ?? undefined)
    );

    readonly globalMin = computed(() =>
        normalizeDateValue(
            this.globalConfig.min,
            this.interpretationZone(),
            'dd/MM/yyyy',
            'start'
        ) ?? DEFAULT_MIN
    );
    readonly globalMax = computed(() =>
        normalizeDateValue(
            this.globalConfig.max,
            this.interpretationZone(),
            'dd/MM/yyyy',
            'start'
        ) ?? DEFAULT_MAX
    );
    readonly effectiveMin = computed(() => {
        const instanceMin = normalizeDateValue(
            this.min(),
            this.interpretationZone(),
            'dd/MM/yyyy',
            'start'
        );
        const globalMin = this.globalMin();
        return instanceMin && compareDateOnly(instanceMin, globalMin) > 0 ? instanceMin : globalMin;
    });
    readonly effectiveMax = computed(() => {
        const instanceMax = normalizeDateValue(
            this.max(),
            this.interpretationZone(),
            'dd/MM/yyyy',
            'start'
        );
        const globalMax = this.globalMax();
        return instanceMax && compareDateOnly(instanceMax, globalMax) < 0 ? instanceMax : globalMax;
    });

    readonly normalizedValue = computed(() =>
        normalizeDateValue(
            this.value(),
            this.interpretationZone(),
            this.format(),
            this.monthDay()
        )
    );
    readonly today = computed(() => todayInZone(this.interpretationZone()));
    readonly inputPlaceholder = computed(() => {
        if (this.placeholder()) return this.placeholder();

        const formats = this.effectiveFormats().display;
        return this.format() === 'dd/MM/yyyy'
            ? formats.dateInput
            : formats.monthInput;
    });
    readonly headerLabel = computed(() => {
        const cursor = this.cursor();
        const formats = this.effectiveFormats().display;

        if (this.calendarView() === 'year') {
            const start = this.yearPageStart();
            return `${start}-${start + YEARS_PER_PAGE - 1}`;
        }

        return formatDate(cursor, formats.monthYearLabel, this.effectiveLocale());
    });
    readonly gridAriaLabel = computed(() => {
        const view = this.calendarView();
        if (view === 'day') return `Calendar for ${this.headerLabel()}`;
        if (view === 'month') return `Choose a month in ${this.headerLabel()}`;
        return `Choose a year from ${this.headerLabel()}`;
    });
    readonly activeCellId = computed(() => {
        const cursor = this.cursor();
        const view = this.calendarView();
        if (view === 'day') return this.dayCellId(cursor);
        if (view === 'month') return this.monthCellId(cursor.year, cursor.month);
        return this.yearCellId(cursor.year);
    });

    readonly weekdayLabels = computed(() =>
        formatWeekdays(this.effectiveLocale(), this.effectiveFirstDayOfWeek())
    );

    readonly dayCells = computed<readonly ImsDatepickerExperimentalDayCell[]>(() => {
        const cursor = this.cursor();
        const firstOfMonth = canonicalDate(cursor.year, cursor.month, 1)!;
        const offset = (
            firstOfMonth.dayOfWeek - this.effectiveFirstDayOfWeek() + 7
        ) % 7;
        const gridStart = firstOfMonth.subtract({days: offset});
        const selected = this.normalizedValue();
        const today = this.today();

        return Array.from({length: 42}, (_, index) => {
            const date = gridStart.add({days: index});
            return {
                id: this.dayCellId(date),
                date,
                label: date.day,
                currentMonth: date.month === cursor.month,
                active: date.equals(cursor),
                selected: !!selected && date.equals(selected),
                today: date.equals(today),
                disabled: !this.isDateEnabled(date)
            };
        });
    });

    readonly monthCells = computed<readonly ImsDatepickerExperimentalMonthCell[]>(() => {
        const cursor = this.cursor();
        const selected = this.normalizedValue();

        return Array.from({length: 12}, (_, index) => {
            const month = index + 1;
            const monthDate = canonicalDate(cursor.year, month, 1)!;
            return {
                id: this.monthCellId(cursor.year, month),
                month,
                label: formatDate(
                    monthDate,
                    this.effectiveFormats().display.monthLabel,
                    this.effectiveLocale()
                ),
                active: cursor.month === month,
                selected: !!selected && selected.year === cursor.year && selected.month === month,
                disabled: !this.periodIntersectsRange(cursor.year, month)
            };
        });
    });

    readonly yearPageStart = computed(() =>
        Math.floor(this.cursor().year / YEARS_PER_PAGE) * YEARS_PER_PAGE
    );
    readonly yearCells = computed<readonly ImsDatepickerExperimentalYearCell[]>(() => {
        const start = this.yearPageStart();
        const selected = this.normalizedValue();

        return Array.from({length: YEARS_PER_PAGE}, (_, index) => {
            const year = start + index;
            return {
                id: this.yearCellId(year),
                year,
                active: this.cursor().year === year,
                selected: selected?.year === year,
                disabled: !this.yearIntersectsRange(year)
            };
        });
    });

    readonly canPreviousNear = computed(() => this.canNavigate('near', -1));
    readonly canNextNear = computed(() => this.canNavigate('near', 1));
    readonly canPreviousFar = computed(() => this.canNavigate('far', -1));
    readonly canNextFar = computed(() => this.canNavigate('far', 1));
    readonly canSelectToday = computed(() => this.canSelectShortcut('today'));
    readonly canSelectMonthStart = computed(() => this.canSelectShortcut('month-start'));
    readonly canSelectMonthEnd = computed(() => this.canSelectShortcut('month-end'));

    constructor() {
        super();
        this.destroyRef.onDestroy(() => {
            if (this.focusFrame !== null) cancelAnimationFrame(this.focusFrame);
        });

        effect(() => {
            const rawValue = this.value();
            if (typeof rawValue === 'number') {
                this.inferredValueType.set('millis');
            } else if (isTemporalPlainDate(rawValue)) {
                this.inferredValueType.set('temporal');
            }

            if (this.userEditing()) return;

            const value = this.normalizedValue();
            const format = this.format();
            const formats = this.effectiveFormats();
            const locale = this.effectiveLocale();

            this.rawText.set(value ? this.formatValue(value, format, formats, locale) : '');
            this.parseInvalid.set(false);
        }, {allowSignalWrites: true});

        effect(() => {
            this.effectiveMin();
            this.effectiveMax();
            this.dateFilter();
            this.format();
            this.monthDay();
            this.parseInvalid();
            const value = this.normalizedValue();
            if (value) this.passesDateFilters(value);
            this.validatorChange();
        });

        effect(() => {
            if (this.open()) {
                const cursor = this.cursor();
                const resolved = this.resolveActiveDate(cursor, this.calendarView());
                if (compareDateOnly(cursor, resolved) !== 0) {
                    this.cursor.set(resolved);
                    this.scheduleActiveCellFocus();
                }
            }
        }, {allowSignalWrites: true});
    }

    override writeValue(value: ImsDatepickerExperimentalValue): void {
        this.userEditing.set(false);
        this.value.set(value);
    }

    validate(control: AbstractControl<ImsDatepickerExperimentalValue>): ValidationErrors | null {
        if (this.parseInvalid()) {
            return {imsDatepickerParse: {text: this.rawText()}};
        }

        const value = normalizeDateValue(
            control.value,
            this.interpretationZone(),
            this.format(),
            this.monthDay()
        );

        if (!value) return null;

        if (compareDateOnly(value, this.effectiveMin()) < 0) {
            return {
                imsDatepickerMin: {
                    min: this.serialize(this.effectiveMin()),
                    actual: this.serialize(value)
                }
            };
        }

        if (compareDateOnly(value, this.effectiveMax()) > 0) {
            return {
                imsDatepickerMax: {
                    max: this.serialize(this.effectiveMax()),
                    actual: this.serialize(value)
                }
            };
        }

        if (!this.passesDateFilters(value)) {
            return {
                imsDatepickerFilter: {
                    actual: this.serialize(value)
                }
            };
        }

        return null;
    }

    registerOnValidatorChange(fn: () => void): void {
        this.validatorChange = fn;
    }

    onBeforeInput(event: InputEvent): void {
        if (
            event.data === null
            || event.isComposing
            || event.inputType.startsWith('delete')
        ) {
            return;
        }

        const input = event.target as HTMLInputElement;
        const selectionStart = input.selectionStart ?? input.value.length;
        const selectionEnd = input.selectionEnd ?? selectionStart;
        const nextValue = input.value.slice(0, selectionStart)
            + event.data
            + input.value.slice(selectionEnd);

        if (!isDateInputTextAllowed(nextValue, this.format())) {
            event.preventDefault();
        }
    }

    onTextInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!isDateInputTextAllowed(input.value, this.format())) {
            input.value = this.rawText();
            return;
        }

        this.userEditing.set(true);
        this.rawText.set(input.value);
        this.parseInvalid.set(false);
    }

    onInputBlur(): void {
        this.commitText();
        this.markAsTouched();
    }

    onInputKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.commitText();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.openPicker();
            return;
        }

        if (event.key === 'Escape' && this.open()) {
            event.preventDefault();
            this.closePicker();
        }
    }

    togglePicker(): void {
        if (this.open()) {
            this.closePicker();
        } else {
            this.openPicker();
        }
    }

    openPicker(): void {
        if (this.interactionDisabled()) return;

        if (this.userEditing()) this.commitText();
        const base = this.normalizedValue() ?? this.today();
        const view = this.format() === 'dd/MM/yyyy' ? 'day' : 'month';
        this.calendarView.set(view);
        this.cursor.set(this.resolveActiveDate(base, view));
        this.open.set(true);
    }

    onOverlayAttached(): void {
        this.scheduleActiveCellFocus();
    }

    closePicker(): void {
        this.open.set(false);
    }

    onPanelEscape(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.closePicker();
        this.textInput()?.nativeElement.focus();
    }

    onOutsideClick(event: MouseEvent): void {
        const target = event.target;
        if (target instanceof Node && this.field()?.nativeElement.contains(target)) return;
        this.closePicker();
        this.markAsTouched();
    }

    cycleView(): void {
        const current = this.calendarView();

        if (current === 'day') {
            this.setCalendarView('year');
        } else if (current === 'year') {
            this.setCalendarView('month');
        } else {
            this.setCalendarView(this.format() === 'dd/MM/yyyy' ? 'day' : 'year');
        }
    }

    onHeaderKeydown(event: KeyboardEvent): void {
        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                this.onCalendarKeydown(event);
        }
    }

    onHeaderClick(event: MouseEvent): void {
        if (event.detail !== 0) return;

        const target = event.target;
        const button = target instanceof Element
            ? target.closest<HTMLButtonElement>('button')
            : null;
        if (!button) return;

        this.cancelActiveCellFocus();
        button.focus({preventScroll: true});
    }

    onCalendarKeydown(event: KeyboardEvent): void {
        const active = this.cursor();
        let target: ImsDatepickerExperimentalDate | null = null;
        const horizontalDirection = this.horizontalDirection(event.key);

        if (horizontalDirection !== 0) {
            target = this.moveActiveHorizontally(active, horizontalDirection);
        } else {
            switch (event.key) {
                case 'ArrowUp':
                    target = this.moveActiveByRow(active, -1);
                    break;
                case 'ArrowDown':
                    target = this.moveActiveByRow(active, 1);
                    break;
                case 'Home':
                    target = this.activeBoundary('first');
                    break;
                case 'End':
                    target = this.activeBoundary('last');
                    break;
                case 'PageUp':
                    target = this.moveActiveByPage(active, -1, event.altKey);
                    break;
                case 'PageDown':
                    target = this.moveActiveByPage(active, 1, event.altKey);
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.selectActiveCell();
                    return;
                case 'Escape':
                    this.onPanelEscape(event);
                    return;
                default:
                    return;
            }
        }

        event.preventDefault();
        if (target) this.setActiveDate(target, true);
    }

    onGridClick(event: MouseEvent): void {
        const target = event.target;
        if (target instanceof Element && target.closest('.ims-datepicker__cell')) return;
        this.scheduleActiveCellFocus();
    }

    navigate(
        distance: ImsDatepickerExperimentalNavigationDistance,
        direction: ImsDatepickerExperimentalNavigationDirection
    ): void {
        if (!this.canNavigate(distance, direction)) return;

        const {unit, amount} = this.navigationStep(distance);
        const target = this.resolveActiveDate(
            this.addDate(this.pendingNavigationCursor ?? this.cursor(), unit, amount * direction),
            this.calendarView()
        );
        this.pendingNavigationCursor = target;
        this.runCalendarTransition(
            () => {
                const pendingCursor = this.pendingNavigationCursor;
                this.pendingNavigationCursor = null;
                if (pendingCursor) this.cursor.set(pendingCursor);
            },
            this.navigationTransitionDirection(direction)
        );
    }

    navigationLabel(
        distance: ImsDatepickerExperimentalNavigationDistance,
        direction: ImsDatepickerExperimentalNavigationDirection
    ): string {
        const {amount, label} = this.navigationStep(distance);
        const action = direction < 0 ? 'Previous' : 'Next';
        return `${action} ${amount === 1 ? label : `${amount} ${label}s`}`;
    }

    navigationIcon(
        distance: ImsDatepickerExperimentalNavigationDistance,
        direction: ImsDatepickerExperimentalNavigationDirection
    ): string {
        const pointsForward = this.directionality.value === 'rtl' ? direction < 0 : direction > 0;
        const suffix = pointsForward ? 'right' : 'left';
        return distance === 'far'
            ? `keyboard_double_arrow_${suffix}`
            : `chevron_${suffix}`;
    }

    dayAriaLabel(date: ImsDatepickerExperimentalDate): string {
        return formatDate(
            date,
            this.effectiveFormats().display.dayAriaLabel,
            this.effectiveLocale()
        );
    }

    focusShortcut(shortcut: ImsDatepickerExperimentalShortcut): void {
        const date = this.shortcutDate(shortcut);
        if (!date || !this.isDateEnabled(date)) return;

        this.setActiveDate(date, true);
    }

    activateDay(date: ImsDatepickerExperimentalDate): void {
        if (this.isDateEnabled(date)) this.cursor.set(date);
    }

    activateMonth(month: number): void {
        const cursor = this.cursor();
        if (!this.periodIntersectsRange(cursor.year, month)) return;
        this.cursor.set(this.resolveActiveDate(
            this.dateInMonth(cursor.year, month, cursor.day),
            'month'
        ));
    }

    activateYear(year: number): void {
        if (!this.yearIntersectsRange(year)) return;
        const cursor = this.cursor();
        this.cursor.set(this.resolveActiveDate(
            this.dateInMonth(year, cursor.month, cursor.day),
            'year'
        ));
    }

    selectDay(cell: ImsDatepickerExperimentalDayCell): void {
        if (cell.disabled) return;
        this.cursor.set(cell.date);
        this.commitDate(cell.date);
        this.closePicker();
        this.textInput()?.nativeElement.focus();
    }

    selectMonth(cell: ImsDatepickerExperimentalMonthCell): void {
        if (cell.disabled) return;

        const cursor = this.cursor();
        const candidate = this.format() === 'MM/yyyy'
            ? this.monthValue(cursor.year, cell.month)
            : this.dateInMonth(cursor.year, cell.month, cursor.day);
        const date = this.format() === 'MM/yyyy'
            ? candidate
            : this.findEnabledDate(
                candidate,
                canonicalDate(cursor.year, cell.month, 1)!,
                canonicalDate(
                    cursor.year,
                    cell.month,
                    candidate.daysInMonth
                )!
            );
        if (!date) return;
        this.cursor.set(date);

        if (this.format() === 'MM/yyyy') {
            this.commitDate(date);
            this.closePicker();
            this.textInput()?.nativeElement.focus();
        } else {
            this.setCalendarView('day');
        }
    }

    selectYear(cell: ImsDatepickerExperimentalYearCell): void {
        if (cell.disabled) return;

        const cursor = this.cursor();
        const firstOfMonth = canonicalDate(cell.year, cursor.month, 1)!;
        const day = Math.min(cursor.day, firstOfMonth.daysInMonth);
        const candidate = canonicalDate(cell.year, cursor.month, day)!;
        const date = this.findEnabledDate(
            candidate,
            canonicalDate(cell.year, 1, 1)!,
            canonicalDate(cell.year, 12, 31)!
        );
        if (!date) return;
        this.cursor.set(date);
        this.setCalendarView('month');
    }

    private commitText(): void {
        const text = this.rawText().trim();

        if (!text) {
            this.userEditing.set(false);
            this.parseInvalid.set(false);
            this.rawText.set('');
            this.setValue(null);
            return;
        }

        const parsedMillis = this.dateParser.parse(text, {
            precision: this.format(),
            monthDay: this.monthDay(),
            formats: this.effectiveFormats(),
            locale: this.effectiveLocale(),
            interpretationZone: this.interpretationZone()
        });
        const parsed = this.fromParserMillis(parsedMillis);

        if (!parsed) {
            this.parseInvalid.set(true);
            this.setValue(null);
            return;
        }

        this.commitDate(parsed);
    }

    private fromParserMillis(value: number | null): ImsDatepickerExperimentalDate | null {
        if (value === null || !Number.isFinite(value)) return null;

        try {
            return Temporal.Instant
                .fromEpochMilliseconds(value)
                .toZonedDateTimeISO('UTC')
                .toPlainDate();
        } catch {
            return null;
        }
    }

    private commitDate(value: ImsDatepickerExperimentalDate): void {
        const normalized = normalizeDateValue(
            value,
            this.interpretationZone(),
            this.format(),
            this.monthDay()
        );
        if (!normalized) return;

        this.userEditing.set(false);
        this.parseInvalid.set(false);
        this.rawText.set(
            this.formatValue(
                normalized,
                this.format(),
                this.effectiveFormats(),
                this.effectiveLocale()
            )
        );
        this.setValue(this.serialize(normalized));
    }

    private serialize(value: ImsDatepickerExperimentalDate): ImsDatepickerExperimentalDate | number {
        return this.outputType() === 'millis' ? toUtcEpochMillis(value) : value;
    }

    private formatValue(
        value: ImsDatepickerExperimentalDate,
        precision: ImsDatepickerExperimentalPrecision,
        formats: ImsDatepickerExperimentalFormats,
        locale: string
    ): string {
        const displayFormat = precision === 'dd/MM/yyyy'
            ? formats.display.dateInput
            : formats.display.monthInput;
        return formatDate(value, displayFormat, locale);
    }

    private isDateEnabled(date: ImsDatepickerExperimentalDate): boolean {
        return compareDateOnly(date, this.effectiveMin()) >= 0
            && compareDateOnly(date, this.effectiveMax()) <= 0
            && this.passesDateFilters(date);
    }

    private passesDateFilters(date: ImsDatepickerExperimentalDate): boolean {
        const globalFilter = this.globalConfig.dateFilter;
        const instanceFilter = this.dateFilter();
        return (!globalFilter || globalFilter(date))
            && (!instanceFilter || instanceFilter(date));
    }

    private monthValue(year: number, month: number): ImsDatepickerExperimentalDate {
        const firstDay = canonicalDate(year, month, 1)!;
        const day = this.monthDay() === 'end' ? firstDay.daysInMonth : 1;
        return canonicalDate(year, month, day)!;
    }

    private dateInMonth(
        year: number,
        month: number,
        preferredDay: number
    ): ImsDatepickerExperimentalDate {
        const firstDay = canonicalDate(year, month, 1)!;
        return canonicalDate(year, month, Math.min(preferredDay, firstDay.daysInMonth))!;
    }

    private selectActiveCell(): void {
        const view = this.calendarView();

        if (view === 'day') {
            const date = this.cursor();
            if (!this.isDateEnabled(date)) return;
            this.commitDate(date);
            this.closePicker();
            this.textInput()?.nativeElement.focus();
            return;
        }

        if (view === 'month') {
            const cell = this.monthCells().find((candidate) => candidate.active);
            if (cell && !cell.disabled) this.selectMonth(cell);
            return;
        }

        const cell = this.yearCells().find((candidate) => candidate.active);
        if (cell && !cell.disabled) this.selectYear(cell);
    }

    private horizontalDirection(key: string): -1 | 0 | 1 {
        if (key !== 'ArrowLeft' && key !== 'ArrowRight') return 0;
        const leftDirection = this.directionality.value === 'rtl' ? 1 : -1;
        if (key === 'ArrowLeft') return leftDirection;
        return leftDirection === 1 ? -1 : 1;
    }

    private moveActiveHorizontally(
        date: ImsDatepickerExperimentalDate,
        direction: -1 | 1
    ): ImsDatepickerExperimentalDate {
        return this.moveActiveInGrid(date, direction);
    }

    private moveActiveByRow(date: ImsDatepickerExperimentalDate, direction: -1 | 1): ImsDatepickerExperimentalDate {
        const view = this.calendarView();
        const columns = view === 'day' ? 7 : view === 'month' ? 3 : 4;
        return this.moveActiveInGrid(date, direction * columns);
    }

    private moveActiveInGrid(fallback: ImsDatepickerExperimentalDate, offset: number): ImsDatepickerExperimentalDate {
        const cursor = this.cursor();
        const view = this.calendarView();
        let activeIndex = -1;
        let dates: readonly (ImsDatepickerExperimentalDate | null)[];

        if (view === 'day') {
            const cells = this.dayCells();
            activeIndex = cells.findIndex((cell) => cell.active);
            dates = cells.map((cell) =>
                cell.currentMonth && !cell.disabled ? cell.date : null
            );
        } else if (view === 'month') {
            const cells = this.monthCells();
            activeIndex = cells.findIndex((cell) => cell.active);
            dates = cells.map((cell) => {
                if (cell.disabled) return null;
                return this.format() === 'MM/yyyy'
                    ? this.monthValue(cursor.year, cell.month)
                    : this.dateInMonth(cursor.year, cell.month, cursor.day);
            });
        } else {
            const cells = this.yearCells();
            activeIndex = cells.findIndex((cell) => cell.active);
            dates = cells.map((cell) =>
                cell.disabled
                    ? null
                    : this.dateInMonth(cell.year, cursor.month, cursor.day)
            );
        }

        if (activeIndex < 0 || dates.length === 0) return fallback;

        let candidateIndex = activeIndex;
        for (let attempt = 0; attempt < dates.length; attempt++) {
            candidateIndex = (
                (candidateIndex + offset) % dates.length + dates.length
            ) % dates.length;
            const candidate = dates[candidateIndex];
            if (candidate) return candidate;
        }

        return fallback;
    }

    private activeBoundary(boundary: 'first' | 'last'): ImsDatepickerExperimentalDate {
        const cursor = this.cursor();
        const view = this.calendarView();

        if (view === 'day') {
            const firstDay = canonicalDate(cursor.year, cursor.month, 1)!;
            return boundary === 'first'
                ? firstDay
                : canonicalDate(cursor.year, cursor.month, firstDay.daysInMonth)!;
        }

        if (view === 'month') {
            return this.dateInMonth(
                cursor.year,
                boundary === 'first' ? 1 : 12,
                cursor.day
            );
        }

        const year = boundary === 'first'
            ? this.yearPageStart()
            : this.yearPageStart() + YEARS_PER_PAGE - 1;
        return this.dateInMonth(year, cursor.month, cursor.day);
    }

    private moveActiveByPage(
        date: ImsDatepickerExperimentalDate,
        direction: -1 | 1,
        largeStep: boolean
    ): ImsDatepickerExperimentalDate {
        const view = this.calendarView();

        if (view === 'day') {
            return largeStep
                ? date.add({years: direction})
                : date.add({months: direction});
        }

        if (view === 'month') {
            return date.add({years: direction * (largeStep ? 10 : 1)});
        }

        return date.add({
            years: direction * YEARS_PER_PAGE * (largeStep ? 10 : 1)
        });
    }

    private setActiveDate(date: ImsDatepickerExperimentalDate, focus: boolean): void {
        const resolved = this.resolveActiveDate(date, this.calendarView());
        this.cursor.set(resolved);
        if (focus) this.scheduleActiveCellFocus();
    }

    private setCalendarView(view: ImsDatepickerExperimentalView): void {
        if (view === this.calendarView()) return;

        this.calendarTransitionDirection.set('view');
        this.calendarView.set(view);
        this.scheduleActiveCellFocus();
    }

    private runCalendarTransition(
        update: () => void,
        direction: ImsDatepickerExperimentalTransitionDirection
    ): void {
        if (!this.open() || !this.panel()) {
            update();
            return;
        }

        this.calendarTransitionDirection.set(direction);
        this.changeDetectorRef.detectChanges();
        runScopedViewTransition(
            this.grid()?.nativeElement,
            update,
            () => this.changeDetectorRef.detectChanges()
        );
    }

    private navigationTransitionDirection(
        direction: ImsDatepickerExperimentalNavigationDirection
    ): ImsDatepickerExperimentalTransitionDirection {
        const movesForward = direction > 0;
        const isRtl = this.directionality.value === 'rtl';
        return movesForward !== isRtl ? 'right-to-left' : 'left-to-right';
    }

    private resolveActiveDate(
        date: ImsDatepickerExperimentalDate,
        view: ImsDatepickerExperimentalView
    ): ImsDatepickerExperimentalDate {
        if (view === 'day') {
            return this.findEnabledDate(
                date,
                this.effectiveMin(),
                this.effectiveMax()
            ) ?? clampDate(date, this.effectiveMin(), this.effectiveMax());
        }

        if (view === 'year') {
            const candidate = this.findEnabledDate(
                date,
                canonicalDate(date.year, 1, 1)!,
                canonicalDate(date.year, 12, 31)!
            );
            if (candidate) {
                return candidate;
            }

            return this.findEnabledDate(
                date,
                this.effectiveMin(),
                this.effectiveMax()
            ) ?? clampDate(date, this.effectiveMin(), this.effectiveMax());
        }

        const candidate = this.format() === 'MM/yyyy'
            ? this.monthValue(date.year, date.month)
            : this.dateInMonth(date.year, date.month, date.day);

        const enabledInMonth = this.format() === 'MM/yyyy'
            ? (this.isDateEnabled(candidate) ? candidate : null)
            : this.findEnabledDate(
                candidate,
                canonicalDate(candidate.year, candidate.month, 1)!,
                canonicalDate(
                    candidate.year,
                    candidate.month,
                    candidate.daysInMonth
                )!
            );
        if (enabledInMonth) {
            return enabledInMonth;
        }

        const direction = compareDateOnly(candidate, this.effectiveMin()) < 0
            ? 1
            : compareDateOnly(candidate, this.effectiveMax()) > 0
                ? -1
                : 1;
        return this.findSelectableMonth(candidate, direction);
    }

    private findEnabledDate(
        candidate: ImsDatepickerExperimentalDate,
        periodStart: ImsDatepickerExperimentalDate,
        periodEnd: ImsDatepickerExperimentalDate
    ): ImsDatepickerExperimentalDate | null {
        const start = compareDateOnly(periodStart, this.effectiveMin()) < 0
            ? this.effectiveMin()
            : periodStart;
        const end = compareDateOnly(periodEnd, this.effectiveMax()) > 0
            ? this.effectiveMax()
            : periodEnd;

        if (compareDateOnly(start, end) > 0) return null;

        const clamped = clampDate(candidate, start, end);
        if (this.isDateEnabled(clamped)) return clamped;

        const maxDistance = start.until(end, {largestUnit: 'day'}).days;
        for (let distance = 1; distance <= maxDistance; distance++) {
            const forward = clamped.add({days: distance});
            if (
                compareDateOnly(forward, end) <= 0
                && this.isDateEnabled(forward)
            ) {
                return forward;
            }

            const backward = clamped.subtract({days: distance});
            if (
                compareDateOnly(backward, start) >= 0
                && this.isDateEnabled(backward)
            ) {
                return backward;
            }
        }

        return null;
    }

    private findSelectableMonth(
        date: ImsDatepickerExperimentalDate,
        direction: -1 | 1
    ): ImsDatepickerExperimentalDate {
        return this.findSelectableMonthInDirection(date, direction)
            ?? this.findSelectableMonthInDirection(date, direction === 1 ? -1 : 1)
            ?? clampDate(date, this.effectiveMin(), this.effectiveMax());
    }

    private findSelectableMonthInDirection(
        date: ImsDatepickerExperimentalDate,
        direction: -1 | 1
    ): ImsDatepickerExperimentalDate | null {
        let month = canonicalDate(date.year, date.month, 1)!;

        while (
            compareDateOnly(month, this.startOfMonth(this.effectiveMin())) >= 0
            && compareDateOnly(month, this.startOfMonth(this.effectiveMax())) <= 0
        ) {
            if (this.periodIntersectsRange(month.year, month.month)) {
                const candidate = this.format() === 'MM/yyyy'
                    ? this.monthValue(month.year, month.month)
                    : this.dateInMonth(month.year, month.month, date.day);
                return this.format() === 'MM/yyyy'
                    ? candidate
                    : this.findEnabledDate(
                        candidate,
                        canonicalDate(month.year, month.month, 1)!,
                        canonicalDate(month.year, month.month, month.daysInMonth)!
                    )!;
            }

            month = month.add({months: direction});
        }

        return null;
    }

    private scheduleActiveCellFocus(retry = true): void {
        this.cancelActiveCellFocus();

        this.focusFrame = requestAnimationFrame(() => {
            this.focusFrame = null;
            const activeCell = this.panel()?.nativeElement.querySelector<HTMLElement>(
                `#${this.activeCellId()}`
            );
            if (activeCell && !activeCell.matches(':disabled')) {
                activeCell.focus({preventScroll: true});
                return;
            }

            if (retry) {
                this.scheduleActiveCellFocus(false);
                return;
            }

            this.panel()?.nativeElement.querySelector<HTMLElement>(
                `#${this.headerButtonId}`
            )?.focus({preventScroll: true});
        });
    }

    private cancelActiveCellFocus(): void {
        if (this.focusFrame === null) return;
        cancelAnimationFrame(this.focusFrame);
        this.focusFrame = null;
    }

    private dayCellId(date: ImsDatepickerExperimentalDate): string {
        return `${this.datepickerId}-day-${date.toString()}`;
    }

    private monthCellId(year: number, month: number): string {
        return `${this.datepickerId}-month-${year}-${month}`;
    }

    private yearCellId(year: number): string {
        return `${this.datepickerId}-year-${year}`;
    }

    private canSelectShortcut(shortcut: ImsDatepickerExperimentalShortcut): boolean {
        const date = this.shortcutDate(shortcut);
        return !!date && this.isDateEnabled(date);
    }

    private shortcutDate(shortcut: ImsDatepickerExperimentalShortcut): ImsDatepickerExperimentalDate | null {
        let date: ImsDatepickerExperimentalDate;

        if (shortcut === 'today') {
            date = this.today();
        } else {
            const cursor = this.cursor();
            const firstDay = canonicalDate(cursor.year, cursor.month, 1)!;
            date = shortcut === 'month-start'
                ? firstDay
                : canonicalDate(cursor.year, cursor.month, firstDay.daysInMonth)!;
        }

        return normalizeDateValue(
            date,
            this.interpretationZone(),
            this.format(),
            this.monthDay()
        );
    }

    private periodIntersectsRange(year: number, month: number): boolean {
        if (this.format() === 'MM/yyyy') {
            return this.isDateEnabled(this.monthValue(year, month));
        }

        const start = canonicalDate(year, month, 1)!;
        const end = canonicalDate(year, month, start.daysInMonth)!;
        return this.findEnabledDate(start, start, end) !== null;
    }

    private yearIntersectsRange(year: number): boolean {
        return Array.from(
            {length: 12},
            (_, index) => index + 1
        ).some((month) => this.periodIntersectsRange(year, month));
    }

    private yearPageIntersectsRange(year: number): boolean {
        const startYear = Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
        return Array.from(
            {length: YEARS_PER_PAGE},
            (_, index) => startYear + index
        ).some((candidateYear) => this.yearIntersectsRange(candidateYear));
    }

    private canNavigate(
        distance: ImsDatepickerExperimentalNavigationDistance,
        direction: ImsDatepickerExperimentalNavigationDirection
    ): boolean {
        const {unit, amount} = this.navigationStep(distance);
        const target = this.addDate(this.cursor(), unit, amount * direction);

        if (this.calendarView() === 'day') {
            return this.periodIntersectsRange(target.year, target.month);
        }

        if (this.calendarView() === 'month') {
            return this.yearIntersectsRange(target.year);
        }

        return this.yearPageIntersectsRange(target.year);
    }

    private navigationStep(distance: ImsDatepickerExperimentalNavigationDistance): {
        readonly unit: 'months' | 'years';
        readonly amount: number;
        readonly label: 'month' | 'year';
    } {
        const view = this.calendarView();

        if (view === 'day') {
            return distance === 'near'
                ? {unit: 'months', amount: 1, label: 'month'}
                : {unit: 'years', amount: 1, label: 'year'};
        }

        if (view === 'month') {
            return distance === 'near'
                ? {unit: 'years', amount: 1, label: 'year'}
                : {unit: 'years', amount: 10, label: 'year'};
        }

        return distance === 'near'
            ? {unit: 'years', amount: YEARS_PER_PAGE, label: 'year'}
            : {unit: 'years', amount: YEARS_PER_PAGE * 2, label: 'year'};
    }

    private addDate(
        date: ImsDatepickerExperimentalDate,
        unit: 'months' | 'years',
        amount: number
    ): ImsDatepickerExperimentalDate {
        return unit === 'months'
            ? date.add({months: amount})
            : date.add({years: amount});
    }

    private startOfMonth(date: ImsDatepickerExperimentalDate): ImsDatepickerExperimentalDate {
        return canonicalDate(date.year, date.month, 1)!;
    }
}
