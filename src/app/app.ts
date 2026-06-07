import {Component} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {delay, of} from 'rxjs';
import {ImsOption, ImsSelect} from './components/ims-select';
import {ImsAutocomplete, ImsAutocompleteOption} from './components/ims-autocomplete';
import {
    ImsFormControlGroup,
    ImsFormField,
    ImsFormFieldControl,
    ImsFormFieldGroup,
    ImsFormFieldLabel,
    ImsFormFieldRow
} from './components/ims-form-layout';
import {
    ImsGrid2,
    ImsGrid2Cell,
    ImsGrid2Row,
    ImsGrid2SortDirective,
    ImsGrid2SortHeader
} from './components/ims-grid2';
import {ImsLongPressDirective} from './ims-long-press.directive';


interface SelectDemoBag {
    readonly id: number;
    readonly label: string;
    readonly count: number;
    readonly disabled?: boolean;
}

interface LargeAutocompleteRow {
    readonly id: number;
    readonly customer: string;
    readonly policy: string;
    readonly region: string;
}

interface FormGridDemoRow {
    readonly id: number;
    customerName: string;
    policyNumber: string;
    validUntil: string;
    premium: number;
}

@Component({
    selector: 'app-root',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ImsSelect,
        ImsOption,
        ImsAutocomplete,
        ImsLongPressDirective,
        ImsFormField,
        ImsFormFieldRow,
        ImsFormFieldGroup,
        ImsFormControlGroup,
        ImsFormFieldLabel,
        ImsFormFieldControl,
        ImsGrid2,
        ImsGrid2Row,
        ImsGrid2Cell,
        ImsGrid2SortDirective,
        ImsGrid2SortHeader
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly title = 'הדגמת תשתית שאילתות גנרית';
    criticalActionCount = 0;
    readonly bagOptions: readonly SelectDemoBag[] = [
        {
            id: 1,
            label: 'מסמכים',
            count: 35
        },
        {
            id: 2,
            label: 'קבלות',
            count: 12
        },
        {
            id: 3,
            label: 'פוליסות',
            count: 8
        },
        {
            id: 4,
            label: 'תביעות',
            count: 19
        },
        {
            id: 5,
            label: 'חשבוניות',
            count: 22
        },
        {
            id: 6,
            label: 'תמונות',
            count: 4
        },
        {
            id: 7,
            label: 'תיקים רפואיים',
            count: 16
        },
        {
            id: 8,
            label: 'דוחות רכב',
            count: 9
        },
        {
            id: 9,
            label: 'הודעות משפטיות',
            count: 11
        },
        {
            id: 10,
            label: 'טפסי נסיעה',
            count: 6
        },
        {
            id: 11,
            label: 'אישורים',
            count: 18
        },
        {
            id: 12,
            label: 'חידושים',
            count: 21
        },
        {
            id: 13,
            label: 'ביקורות',
            count: 7
        },
        {
            id: 14,
            label: 'דוחות',
            count: 13
        },
        {
            id: 15,
            label: 'לוחות זמנים',
            count: 15
        },
        {
            id: 16,
            label: 'תיקים בארכיון',
            count: 3
        },
        {
            id: 17,
            label: 'ממתין לבדיקה',
            count: 10
        },
        {
            id: 18,
            label: 'קטגוריית שמירה ארוכה',
            count: 5
        }
    ];
    readonly selectedBagsControl = new FormControl<readonly SelectDemoBag[]>(
        [this.bagOptions[0], this.bagOptions[1], this.bagOptions[2], this.bagOptions[3], this.bagOptions[4]],
        {nonNullable: true}
    );
    readonly bagAutocompleteOptions: readonly ImsAutocompleteOption<SelectDemoBag>[] = this.bagOptions.map((bag) => ({
        value: bag,
        label: bag.label,
        disabled: bag.disabled
    }));
    readonly autocompleteSingleControl = new FormControl<SelectDemoBag | string | null>(null);
    readonly autocompleteMultiControl = new FormControl<readonly SelectDemoBag[]>([], {
        nonNullable: true
    });
    readonly largeAutocompleteOptions: readonly ImsAutocompleteOption<LargeAutocompleteRow>[] = Array.from(
        {length: 100_000},
        (_, index) => {
            const id = index + 1;
            const region = `אזור ${String((index % 24) + 1).padStart(2, '0')}`;
            const policy = `פוליסה ${String((index % 997) + 1).padStart(4, '0')}`;
            const customer = `לקוח ${String(id).padStart(6, '0')}`;

            return {
                value: {
                    id,
                    customer,
                    policy,
                    region
                },
                label: `${customer} - ${policy} - ${region}`
            };
        }
    );
    readonly largeAutocompleteControl = new FormControl<LargeAutocompleteRow | string | null>(null);
    readonly serverAutocompleteControl = new FormControl<LargeAutocompleteRow | string | null>(null);
    readonly formGridSource: FormGridDemoRow[] = [
        {
            id: 1,
            customerName: 'אביגיל לוי',
            policyNumber: 'PL-1048',
            validUntil: '2026-11-30',
            premium: 420
        },
        {
            id: 2,
            customerName: 'יונתן כהן',
            policyNumber: 'PL-0982',
            validUntil: '2026-08-15',
            premium: 315
        },
        {
            id: 3,
            customerName: 'מיכל אברהם',
            policyNumber: 'PL-1274',
            validUntil: '2027-02-01',
            premium: 560
        },
        {
            id: 4,
            customerName: 'רועי ברק',
            policyNumber: 'PL-1011',
            validUntil: '2026-06-30',
            premium: 275
        }
    ];
    selectedBagModel: SelectDemoBag | null = this.bagOptions[0];

    readonly loadBagAutocompleteOptions = (query: string) => {
        const normalizedQuery = this.normalizeSearchText(query);
        const options = normalizedQuery
            ? this.bagAutocompleteOptions.filter((option) =>
                this.matchesSearchQuery(option.label, normalizedQuery)
            )
            : this.bagAutocompleteOptions;

        return of(options).pipe(delay(160));
    };

    readonly loadServerAutocompleteOptions = (query: string) => {
        const normalizedQuery = this.normalizeSearchText(query);
        const options = normalizedQuery
            ? this.largeAutocompleteOptions.filter((option) =>
                this.matchesSearchQuery(option.label, normalizedQuery)
            )
            : this.largeAutocompleteOptions;

        return of(options.slice(0, 100)).pipe(delay(2000));
    };

    readonly compareBagById = (first: unknown, second: unknown) => {
        if (this.isSelectDemoBag(first) && this.isSelectDemoBag(second)) {
            return first.id === second.id;
        }

        return first === second;
    };

    registerCriticalAction(): void {
        this.criticalActionCount++;
    }

    private isSelectDemoBag(value: unknown): value is SelectDemoBag {
        return typeof value === 'object' && value !== null && 'id' in value;
    }

    private matchesSearchQuery(text: string, query: string): boolean {
        const normalizedText = this.normalizeSearchText(text);
        return query.split(' ').every((term) => normalizedText.includes(term));
    }

    private normalizeSearchText(text: string): string {
        return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    }
}
