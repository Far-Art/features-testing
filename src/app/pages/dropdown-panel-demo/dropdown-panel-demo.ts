import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    ViewEncapsulation,
    inject,
    input,
    signal
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ImsButton} from '../../components/ims-button';
import {ImsCheckbox} from '../../components/ims-checkbox';
import {
    ImsDropdownPanelAlign,
    ImsDropdownPanelPosition,
    ImsDropdownPanelRef,
    ImsDropdownPanelTrigger
} from '../../components/ims-dropdown-panel';
import {ImsIcon} from '../../components/ims-icon';
import {ImsOption, ImsSelect} from '../../components/ims-select';

interface DropdownPanelDemoFilterValue {
    readonly year: number;
    readonly includeCancelled: boolean;
}

interface DropdownPanelDemoPlacement {
    readonly position: ImsDropdownPanelPosition;
    readonly align: ImsDropdownPanelAlign;
    readonly label: string;
}

const YEARS = [2026, 2025, 2024] as const;

function isFilterValue(value: unknown): value is DropdownPanelDemoFilterValue {
    if (typeof value !== 'object' || value === null) return false;

    const candidate = value as Partial<DropdownPanelDemoFilterValue>;
    return typeof candidate.year === 'number' && typeof candidate.includeCancelled === 'boolean';
}

/**
 * Component content for the panel that takes a type rather than a template.
 *
 * It closes the panel itself, with the filter as the result, through the
 * `ImsDropdownPanelRef` it injects. The select inside it opens its own overlay
 * above the panel, which is the layering the panel is built to leave alone.
 */
@Component({
    selector: 'app-dropdown-panel-demo-filter',
    standalone: true,
    imports: [ReactiveFormsModule, ImsButton, ImsCheckbox, ImsOption, ImsSelect],
    template: `
        <form class="dropdown-panel-demo__filter" [formGroup]="form" (ngSubmit)="apply()">
            <strong class="dropdown-panel-demo__filter-title">סינון חיובים</strong>

            <ims-select
                class="dropdown-panel-demo__filter-select"
                ariaLabel="שנת חיוב"
                formControlName="year"
            >
                @for (year of years; track year) {
                    <ims-option [value]="year" [selectionText]="'שנת ' + year">שנת {{ year }}</ims-option>
                }
            </ims-select>

            <ims-checkbox formControlName="includeCancelled">כלול חיובים שבוטלו</ims-checkbox>

            <div class="dropdown-panel-demo__filter-actions">
                <button ims-button type="button" (click)="cancel()">ביטול</button>
                <button ims-button ims-button-variation="primary" type="submit">החל</button>
            </div>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownPanelDemoFilter implements OnInit {
    private readonly panel = inject<ImsDropdownPanelRef<DropdownPanelDemoFilterValue>>(ImsDropdownPanelRef);

    readonly year = input<number>(YEARS[0]);
    readonly includeCancelled = input(false);

    protected readonly years = YEARS;

    protected readonly form = new FormGroup({
        year: new FormControl<number>(YEARS[0], {nonNullable: true}),
        includeCancelled: new FormControl(false, {nonNullable: true})
    });

    ngOnInit(): void {
        // Inputs are set by the time the content initialises, not when it is
        // constructed, so the form takes the applied filter here.
        this.form.setValue({year: this.year(), includeCancelled: this.includeCancelled()});
    }

    protected apply(): void {
        this.panel.close(this.form.getRawValue());
    }

    protected cancel(): void {
        this.panel.close();
    }
}

@Component({
    selector: 'app-dropdown-panel-demo',
    standalone: true,
    imports: [ImsButton, ImsDropdownPanelTrigger, ImsIcon],
    templateUrl: './dropdown-panel-demo.html',
    styleUrl: './dropdown-panel-demo.scss',
    // The surface renders in the overlay container, outside this page, and a
    // class handed to it through imsDropdownPanelClass is only matched by a
    // global rule. Every selector in the stylesheet is prefixed for that reason.
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownPanelDemo {
    protected readonly filterPanel = DropdownPanelDemoFilter;

    protected readonly lastAction = signal<string | null>(null);

    protected readonly filter = signal<DropdownPanelDemoFilterValue>({year: YEARS[0], includeCancelled: false});

    protected readonly placements: readonly DropdownPanelDemoPlacement[] = [
        {position: 'below', align: 'start', label: 'מתחת · התחלה'},
        {position: 'below', align: 'center', label: 'מתחת · מרכז'},
        {position: 'below', align: 'end', label: 'מתחת · סוף'},
        {position: 'above', align: 'start', label: 'מעל · התחלה'},
        {position: 'before', align: 'start', label: 'לפני · למעלה'},
        {position: 'after', align: 'center', label: 'אחרי · מרכז'}
    ];

    protected onActionClosed(result: unknown): void {
        if (typeof result === 'string') this.lastAction.set(result);
    }

    protected onFilterClosed(result: unknown): void {
        if (isFilterValue(result)) this.filter.set(result);
    }
}
