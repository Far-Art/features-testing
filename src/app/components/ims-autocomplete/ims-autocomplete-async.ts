import {
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    numberAttribute,
    signal,
    untracked
} from '@angular/core';
import {isObservable, Subscription} from 'rxjs';
import {provideValueAccessor} from '../../shared/basic-value-accessor';
import {IMS_AUTOCOMPLETE_IMPORTS, ImsAutocompleteBase} from './ims-autocomplete-base';
import {
    ImsAutocompleteOption,
    ImsAutocompleteOptionsLoader
} from './ims-autocomplete.types';

/** The loader call whose results the component currently holds. */
interface ImsAutocompleteLoadedQuery<T> {
    readonly loader: ImsAutocompleteOptionsLoader<T>;
    readonly query: string;
    /** True when the loader failed, so its empty results are not worth reusing. */
    readonly failed: boolean;
}

@Component({
    selector: 'ims-autocomplete-async',
    standalone: true,
    imports: [IMS_AUTOCOMPLETE_IMPORTS],
    templateUrl: './ims-autocomplete.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideValueAccessor(ImsAutocompleteAsync)],
    host: {
        class: 'ims-autocomplete-host'
    }
})
/**
 * Form-compatible autocomplete that loads its options for the current search
 * query through `loadOptions`.
 *
 * The loader is called only while options are needed — the panel is open, a
 * strict commit waits for results, or a selected value still lacks a label —
 * so a closed field doesn't hit it for the text it syncs from each value
 * change. Results already loaded for the current query are reused when the
 * panel reopens.
 */
export class ImsAutocompleteAsync<T = unknown> extends ImsAutocompleteBase<T> {
    private optionsSubscription: Subscription | null = null;
    private asyncRequestId = 0;

    /** Async option source called whenever the search query changes while options are needed. */
    readonly loadOptions = input.required<ImsAutocompleteOptionsLoader<T>>();

    /** Delay in milliseconds before calling `loadOptions` after the query changes. */
    readonly loadDebounceMs = input(0, {transform: numberAttribute});

    private readonly asyncOptions = signal<readonly ImsAutocompleteOption<T>[]>([]);
    private readonly optionsLoading = signal(false);
    private readonly loadedQuery = signal<ImsAutocompleteLoadedQuery<T> | null>(null);

    constructor() {
        super();

        // `allowSignalWrites` lets this effect set `optionsLoading` on Angular 18,
        // which otherwise throws. Later versions allow the write and ignore the flag.
        effect((onCleanup) => {
            const loader = this.loadOptions();
            const query = this.query();
            const debounceMs = Math.max(0, this.loadDebounceMs());
            const requested = this.optionsRequested();
            // Untracked: results landing must not re-run this effect, which would
            // cancel a loader that is still streaming more of them.
            const loadedQuery = untracked(this.loadedQuery);
            const requestId = ++this.asyncRequestId;
            let activeSubscription: Subscription | null = null;

            this.clearOptionsSubscription();

            const alreadyLoaded = loadedQuery !== null
                && !loadedQuery.failed
                && loadedQuery.loader === loader
                && loadedQuery.query === query;

            if (!requested || alreadyLoaded) {
                this.optionsLoading.set(false);
                return;
            }

            this.optionsLoading.set(true);

            const timeoutId = window.setTimeout(() => {
                if (requestId !== this.asyncRequestId) return;

                const loaded: ImsAutocompleteLoadedQuery<T> = {loader, query, failed: false};
                let result: ReturnType<ImsAutocompleteOptionsLoader<T>>;
                try {
                    result = loader(query);
                } catch {
                    this.finishAsyncOptions(requestId, loaded);
                    return;
                }

                if (isObservable(result)) {
                    const subscription = result.subscribe({
                        next: (options) => this.setAsyncOptions(requestId, loaded, options),
                        error: () => {
                            this.finishAsyncOptions(requestId, loaded);
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
                    .then((options) => this.setAsyncOptions(requestId, loaded, options))
                    .catch(() => this.finishAsyncOptions(requestId, loaded));
            }, debounceMs);

            onCleanup(() => {
                window.clearTimeout(timeoutId);
                this.clearOptionsSubscription(activeSubscription);
            });
        }, {allowSignalWrites: true});
    }

    protected override getSourceOptions(): readonly ImsAutocompleteOption<T>[] {
        return this.asyncOptions();
    }

    protected override isLoading(): boolean {
        return this.optionsLoading();
    }

    protected override sourceMatchesQuery(): boolean {
        const loadedQuery = this.loadedQuery();

        return !this.optionsLoading()
            && loadedQuery !== null
            && loadedQuery.loader === this.loadOptions()
            && loadedQuery.query === this.query();
    }

    protected override destroyOptionsSource(): void {
        this.asyncRequestId++;
        this.clearOptionsSubscription();
    }

    private setAsyncOptions(
        requestId: number,
        loadedQuery: ImsAutocompleteLoadedQuery<T>,
        options: readonly ImsAutocompleteOption<T>[]
    ): void {
        if (requestId !== this.asyncRequestId) return;
        this.loadedQuery.set(loadedQuery);
        this.asyncOptions.set(options);
        this.optionsLoading.set(false);
    }

    private finishAsyncOptions(
        requestId: number,
        loadedQuery: ImsAutocompleteLoadedQuery<T>
    ): void {
        if (requestId !== this.asyncRequestId) return;
        this.loadedQuery.set({...loadedQuery, failed: true});
        this.asyncOptions.set([]);
        this.optionsLoading.set(false);
    }

    private clearOptionsSubscription(subscription = this.optionsSubscription): void {
        if (!subscription) return;

        subscription.unsubscribe();
        if (this.optionsSubscription === subscription) {
            this.optionsSubscription = null;
        }
    }
}
