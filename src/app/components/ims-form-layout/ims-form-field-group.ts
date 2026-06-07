import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    effect,
    inject,
    input,
    numberAttribute,
    signal,
    ViewEncapsulation
} from '@angular/core';

function positiveIntegerOrNull(value: number | string | null): number | null {
    const parsed = numberAttribute(value, Number.NaN);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function positiveNumber(value: number | string): number {
    const parsed = numberAttribute(value, 320);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 320;
}

@Component({
    selector: 'ims-form-field-group',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-form-field-group.scss',
    host: {
        '[style.grid-template-columns]': 'columnTemplate()',
        '[style.--ims-form-column-gap]': 'columnGap()',
        '[style.--ims-form-row-gap]': 'rowGap()'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsFormFieldGroup {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private readonly availableWidth = signal(0);
    private resizeObserver: ResizeObserver | null = null;

    readonly columns = input<number | null, number | string | null>(null, {
        transform: positiveIntegerOrNull
    });
    readonly minColumnWidth = input<number, number | string>(320, {
        transform: positiveNumber
    });
    readonly columnGap = input('2.5rem');
    readonly rowGap = input('1rem');
    readonly resolvedColumns = computed(() => {
        const explicitColumns = this.columns();
        if (explicitColumns !== null) {
            return explicitColumns;
        }

        return Math.max(1, Math.floor(this.availableWidth() / this.minColumnWidth()));
    });
    readonly columnTemplate = computed(() =>
        Array.from({length: this.resolvedColumns()}, () => 'max-content max-content').join(' ')
    );

    constructor() {
        afterNextRender(() => {
            this.availableWidth.set(this.hostElement.clientWidth);
            this.resizeObserver = new ResizeObserver(([entry]) => {
                this.availableWidth.set(entry.contentRect.width);
            });
            this.resizeObserver.observe(this.hostElement);
        });

        effect(() => {
            this.minColumnWidth();
            this.columns();
            this.availableWidth.set(this.hostElement.clientWidth);
        });

        this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
    }
}
