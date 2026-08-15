import {Component, ChangeDetectionStrategy, inject, signal} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {delay, of} from 'rxjs';
import {
    ImsAutocomplete,
    ImsAutocompleteAsync,
    ImsAutocompleteOption
} from '../../components/ims-autocomplete';
import {ImsOption, ImsSelect} from '../../components/ims-select';
import {ImsTransferDialogService, ImsTransferRow} from '../../components/ims-transfer-dialog';

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

interface DemoTrack {
    readonly id: number;
    readonly title: string;
}

interface DemoPolicyType {
    readonly code: string;
    readonly label: string;
}

@Component({
    selector: 'app-selection-demo',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ImsSelect,
        ImsOption,
        ImsAutocomplete,
        ImsAutocompleteAsync
    ],
    templateUrl: './selection-demo.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './selection-demo.scss'
})
export class SelectionDemo {
    private readonly transferDialog = inject(ImsTransferDialogService);

    readonly listeningPlaylist = signal<readonly DemoTrack[]>([
        {id: 1, title: 'ליל קיץ'},
        {id: 2, title: 'רחוב שקט'},
        {id: 3, title: 'צלילי בוקר'},
        {id: 4, title: 'מסע ארוך'},
        {id: 5, title: 'רגע לפני'}
    ]);
    readonly archivePlaylist = signal<readonly DemoTrack[]>([
        {id: 6, title: 'ימים ישנים'},
        {id: 7, title: 'זיכרון רחוק'},
        {id: 8, title: 'שיר נשכח'}
    ]);

    readonly policyTypes: readonly DemoPolicyType[] = [
        {code: 'life', label: 'ביטוח חיים'},
        {code: 'health', label: 'ביטוח בריאות'},
        {code: 'vehicle', label: 'ביטוח רכב'},
        {code: 'home', label: 'ביטוח דירה'},
        {code: 'travel', label: 'ביטוח נסיעות'},
        {code: 'business', label: 'ביטוח עסק'}
    ];
    readonly collectPoliciesControl = new FormControl<readonly DemoPolicyType[]>(
        [this.policyTypes[0], this.policyTypes[2]],
        {nonNullable: true}
    );
    readonly ignorePoliciesControl = new FormControl<readonly DemoPolicyType[]>(
        [this.policyTypes[4]],
        {nonNullable: true}
    );

    private readonly initialBagOptions: readonly SelectDemoBag[] = [
        {id: 1, label: 'מסמכים', count: 35},
        {id: 2, label: 'קבלות', count: 12},
        {id: 3, label: 'פוליסות', count: 8},
        {id: 4, label: 'תביעות', count: 19},
        {id: 5, label: 'חשבוניות', count: 22},
        {id: 6, label: 'תמונות', count: 4},
        {id: 7, label: 'תיקים רפואיים', count: 16},
        {id: 8, label: 'דוחות רכב', count: 9},
        {id: 9, label: 'הודעות משפטיות', count: 11},
        {id: 10, label: 'טפסי נסיעה', count: 6},
        {id: 11, label: 'אישורים', count: 18},
        {id: 12, label: 'חידושים', count: 21},
        {id: 13, label: 'ביקורות', count: 7},
        {id: 14, label: 'דוחות', count: 13},
        {id: 15, label: 'לוחות זמנים', count: 15},
        {id: 16, label: 'תיקים בארכיון', count: 3},
        {id: 17, label: 'ממתין לבדיקה', count: 10},
        {id: 18, label: 'קטגוריית שמירה ארוכה', count: 5, disabled: true}
    ];
    readonly bagOptions = signal<readonly SelectDemoBag[]>(this.initialBagOptions);
    readonly selectedBagsControl = new FormControl<readonly SelectDemoBag[]>(
        [
            this.initialBagOptions[0],
            this.initialBagOptions[1],
            this.initialBagOptions[2],
            this.initialBagOptions[3],
            this.initialBagOptions[4]
        ],
        {nonNullable: true}
    );
    readonly readonlyMultiSelectControl = new FormControl<readonly SelectDemoBag[]>(
        {
            value: [this.initialBagOptions[0], this.initialBagOptions[2]],
            disabled: true
        },
        {nonNullable: true}
    );
    readonly disabledSingleSelectControl = new FormControl<SelectDemoBag | null>({
        value: this.initialBagOptions[1],
        disabled: true
    });
    readonly bagAutocompleteOptions: readonly ImsAutocompleteOption<SelectDemoBag>[] = this.initialBagOptions.map((bag) => ({
        value: bag,
        label: bag.label,
        disabled: bag.disabled
    }));
    readonly autocompleteSingleControl = new FormControl<SelectDemoBag | string | null>(null);
    readonly autocompleteMultiControl = new FormControl<readonly SelectDemoBag[]>([], {
        nonNullable: true
    });
    readonly readonlyMultiAutocompleteControl = new FormControl<readonly SelectDemoBag[]>(
        {
            value: [this.initialBagOptions[0], this.initialBagOptions[2]],
            disabled: true
        },
        {nonNullable: true}
    );
    readonly disabledSingleAutocompleteControl =
        new FormControl<SelectDemoBag | string | null>({
            value: this.initialBagOptions[1],
            disabled: true
        });
    readonly largeAutocompleteOptions: readonly ImsAutocompleteOption<LargeAutocompleteRow>[] = Array.from(
        {length: 100_000},
        (_, index) => {
            const id = index + 1;
            const region = `אזור ${String((index % 24) + 1).padStart(2, '0')}`;
            const policy = `פוליסה ${String((index % 997) + 1).padStart(4, '0')}`;
            const customer = `לקוח ${String(id).padStart(6, '0')}`;

            return {
                value: {id, customer, policy, region},
                label: `${customer} - ${policy} - ${region}`
            };
        }
    );
    readonly largeAutocompleteControl = new FormControl<LargeAutocompleteRow | string | null>(null);
    readonly serverAutocompleteControl = new FormControl<LargeAutocompleteRow | string | null>(null);
    selectedBagModel: SelectDemoBag | null = this.initialBagOptions[0];

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

    openPlaylistTransfer(): void {
        const dialogRef = this.transferDialog.open<DemoTrack, 'listening' | 'archive'>({
            lists: [
                {
                    id: 'listening',
                    title: 'רשימת האזנה',
                    rows: this.tracksToRows(this.listeningPlaylist())
                },
                {
                    id: 'archive',
                    title: 'ארכיון',
                    rows: this.tracksToRows(this.archivePlaylist())
                }
            ],
            dialogTitle: 'העברה בין רשימות'
        });

        dialogRef.closed.subscribe((result) => {
            if (result === undefined) return;
            this.listeningPlaylist.set(result.lists.listening.map((row) => row.value));
            this.archivePlaylist.set(result.lists.archive.map((row) => row.value));
        });
    }

    openPolicyTransfer(): void {
        const collectRows: ImsTransferRow<DemoPolicyType>[] = [];
        const ignoreRows: ImsTransferRow<DemoPolicyType>[] = [];

        for (const policy of this.policyTypes) {
            const selectedForCollect = this.isPolicySelected(this.collectPoliciesControl, policy);
            const selectedForIgnore = this.isPolicySelected(this.ignorePoliciesControl, policy);
            const row: ImsTransferRow<DemoPolicyType> = {
                id: `policy-${policy.code}`,
                label: policy.label,
                value: policy,
                checked: selectedForCollect || selectedForIgnore
            };

            if (selectedForIgnore && !selectedForCollect) {
                ignoreRows.push(row);
            } else {
                collectRows.push(row);
            }
        }

        const dialogRef = this.transferDialog.open<DemoPolicyType, 'collect' | 'ignore'>({
            lists: [
                {id: 'collect', title: 'פוליסות לאיסוף', rows: collectRows},
                {id: 'ignore', title: 'פוליסות להתעלמות', rows: ignoreRows}
            ],
            dialogTitle: 'עריכת מדיניות איסוף'
        });

        dialogRef.closed.subscribe((result) => {
            if (result === undefined) return;

            this.collectPoliciesControl.setValue(
                result.lists.collect.filter((row) => row.checked).map((row) => row.value)
            );
            this.ignorePoliciesControl.setValue(
                result.lists.ignore.filter((row) => row.checked).map((row) => row.value)
            );
        });
    }

    isPolicySelected(
        control: FormControl<readonly DemoPolicyType[]>,
        policy: DemoPolicyType
    ): boolean {
        return control.value.some((selectedPolicy) => selectedPolicy.code === policy.code);
    }

    private tracksToRows(tracks: readonly DemoTrack[]): ImsTransferRow<DemoTrack>[] {
        return tracks.map((track) => ({id: `track-${track.id}`, label: track.title, value: track}));
    }

    readonly compareBagById = (first: unknown, second: unknown) => {
        if (this.isSelectDemoBag(first) && this.isSelectDemoBag(second)) {
            return first.id === second.id;
        }

        return first === second;
    };

    readonly comparePolicyByCode = (first: unknown, second: unknown) => {
        if (this.isDemoPolicyType(first) && this.isDemoPolicyType(second)) {
            return first.code === second.code;
        }

        return first === second;
    };

    private isSelectDemoBag(value: unknown): value is SelectDemoBag {
        return typeof value === 'object' && value !== null && 'id' in value;
    }

    private isDemoPolicyType(value: unknown): value is DemoPolicyType {
        return typeof value === 'object' && value !== null && 'code' in value;
    }

    private matchesSearchQuery(text: string, query: string): boolean {
        const normalizedText = this.normalizeSearchText(text);
        return query.split(' ').every((term) => normalizedText.includes(term));
    }

    private normalizeSearchText(text: string): string {
        return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    }
}
