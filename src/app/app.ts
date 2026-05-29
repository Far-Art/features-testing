import {Component} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {delay, of} from 'rxjs';
import {ImsOption, ImsSelect} from './components/ims-select';
import {ImsAutocomplete, ImsAutocompleteOption} from './components/ims-autocomplete';


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

@Component({
    selector: 'app-root',
    imports: [FormsModule, ReactiveFormsModule, ImsSelect, ImsOption, ImsAutocomplete],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    readonly title = 'Generic Query Infrastructure Demo';
    readonly bagOptions: readonly SelectDemoBag[] = [
        {
            id: 1,
            label: 'Documents',
            count: 35
        },
        {
            id: 2,
            label: 'Receipts',
            count: 12
        },
        {
            id: 3,
            label: 'Policies',
            count: 8
        },
        {
            id: 4,
            label: 'Claims',
            count: 19
        },
        {
            id: 5,
            label: 'Invoices',
            count: 22
        },
        {
            id: 6,
            label: 'Photos',
            count: 4
        },
        {
            id: 7,
            label: 'Medical files',
            count: 16
        },
        {
            id: 8,
            label: 'Vehicle reports',
            count: 9
        },
        {
            id: 9,
            label: 'Legal notices',
            count: 11
        },
        {
            id: 10,
            label: 'Travel forms',
            count: 6
        },
        {
            id: 11,
            label: 'Approvals',
            count: 18
        },
        {
            id: 12,
            label: 'Renewals',
            count: 21
        },
        {
            id: 13,
            label: 'Audits',
            count: 7
        },
        {
            id: 14,
            label: 'Statements',
            count: 13
        },
        {
            id: 15,
            label: 'Schedules',
            count: 15
        },
        {
            id: 16,
            label: 'Archived bags',
            count: 3
        },
        {
            id: 17,
            label: 'Pending review',
            count: 10
        },
        {
            id: 18,
            label: 'Long retention category',
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
            const region = `Region ${String((index % 24) + 1).padStart(2, '0')}`;
            const policy = `Policy ${String((index % 997) + 1).padStart(4, '0')}`;
            const customer = `Customer ${String(id).padStart(6, '0')}`;

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
