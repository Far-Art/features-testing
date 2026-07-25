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
    readonly bagAutocompleteOptions: readonly ImsAutocompleteOption<SelectDemoBag>[] = this.initialBagOptions.map((bag) => ({
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
        const dialogRef = this.transferDialog.open<DemoTrack>({
            start: {title: 'רשימת האזנה', rows: this.tracksToRows(this.listeningPlaylist())},
            end: {title: 'ארכיון', rows: this.tracksToRows(this.archivePlaylist())},
            dialogTitle: 'העברה בין רשימות'
        });

        dialogRef.closed.subscribe((result) => {
            if (result === undefined) return;
            this.listeningPlaylist.set(result.start);
            this.archivePlaylist.set(result.end);
        });
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
