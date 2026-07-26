import {
    CdkConnectedOverlay,
    CdkOverlayOrigin
} from '@angular/cdk/overlay';
import {
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport
} from '@angular/cdk/scrolling';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    numberAttribute,
    signal
} from '@angular/core';
import {isObservable, Subscription} from 'rxjs';
import {provideValueAccessor} from '../../shared/basic-value-accessor';
import {ImsTextTruncateDirective} from '../../shared/ims-text-truncate.directive';
import {ImsAutocomplete} from './ims-autocomplete';
import {
    ImsAutocompleteOption,
    ImsAutocompleteOptionsLoader
} from './ims-autocomplete.types';

@Component({
    selector: 'ims-autocomplete-async',
    standalone: true,
    imports: [
        CdkOverlayOrigin,
        CdkConnectedOverlay,
        CdkVirtualScrollViewport,
        CdkVirtualForOf,
        CdkFixedSizeVirtualScroll,
        ImsTextTruncateDirective
    ],
    templateUrl: './ims-autocomplete.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideValueAccessor(ImsAutocompleteAsync)],
    host: {
        class: 'ims-autocomplete-host ims-input-host'
    }
})
/**
 * Form-compatible autocomplete that loads its options whenever the search query changes.
 */
export class ImsAutocompleteAsync<T = unknown> extends ImsAutocomplete<T> {
    private optionsSubscription: Subscription | null = null;
    private asyncRequestId = 0;

    /** Async option source called whenever the search query changes. */
    readonly loadOptions = input.required<ImsAutocompleteOptionsLoader<T>>();

    /** Delay in milliseconds before calling `loadOptions` after the query changes. */
    readonly loadDebounceMs = input(0, {transform: numberAttribute});

    private readonly asyncOptions = signal<readonly ImsAutocompleteOption<T>[]>([]);
    private readonly optionsLoading = signal(false);

    constructor() {
        super();

        effect((onCleanup) => {
            const loader = this.loadOptions();
            const query = this.query();
            const debounceMs = Math.max(0, this.loadDebounceMs());
            const requestId = ++this.asyncRequestId;
            let activeSubscription: Subscription | null = null;

            this.clearOptionsSubscription();
            this.optionsLoading.set(true);

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
    }

    protected override getSourceOptions(): readonly ImsAutocompleteOption<T>[] {
        return this.asyncOptions();
    }

    protected override isLoading(): boolean {
        return this.optionsLoading();
    }

    protected override destroyOptionsSource(): void {
        this.asyncRequestId++;
        this.clearOptionsSubscription();
    }

    private setAsyncOptions(
        requestId: number,
        options: readonly ImsAutocompleteOption<T>[]
    ): void {
        if (requestId !== this.asyncRequestId) return;
        this.asyncOptions.set(options);
        this.optionsLoading.set(false);
    }

    private finishAsyncOptions(requestId: number): void {
        if (requestId !== this.asyncRequestId) return;
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
