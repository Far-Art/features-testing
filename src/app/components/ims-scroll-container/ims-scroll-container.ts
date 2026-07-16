import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    booleanAttribute,
    computed,
    inject,
    input,
    numberAttribute,
    signal,
    viewChild
} from '@angular/core';

type ImsScrollAxis = 'x' | 'y' | 'both' | 'none';
type ImsScrollOverflow = 'auto' | 'scroll' | 'hidden';

/**
 * Scrollable wrapper that applies overflow to the host element and projects arbitrary content.
 *
 * The component keeps visual styling minimal: consumers own sizing, borders, background, and
 * spacing. It only manages scroll axis behavior plus edge haze indicators for overflowing content.
 */
@Component({
    selector: 'ims-scroll-container',
    standalone: true,
    templateUrl: './ims-scroll-container.html',
    styleUrl: './ims-scroll-container.scss',
    host: {
        class: 'ims-scroll-container',
        '[style.overflow-x]': 'allowsInlineScroll() ? overflow() : "hidden"',
        '[style.overflow-y]': 'allowsBlockScroll() ? overflow() : "hidden"',
        '[attr.aria-label]': 'ariaLabel()',
        '[attr.tabindex]': 'canKeyboardScroll() ? 0 : null'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsScrollContainer {
    /** Scroll axis to enable. Defaults to vertical scrolling, matching normal document flow. */
    readonly axis = input<ImsScrollAxis>('y');

    /** Overflow mode applied to enabled axes on the host element. */
    readonly overflow = input<ImsScrollOverflow>('auto');

    /** Width/height in pixels of the edge haze. */
    readonly hazeSize = input(32, {transform: numberAttribute});

    /** Hides the visual edge haze and arrows while keeping scroll behavior unchanged. */
    readonly hideHaze = input(false, {transform: booleanAttribute});

    /** Accessible label for the scrollable region. */
    readonly ariaLabel = input<string | null>(null);

    /** Makes the host keyboard-focusable while overflow exists, so arrow/page scrolling works. */
    readonly keyboardScroll = input(true, {transform: booleanAttribute});

    private readonly inlineStartSentinel =
        viewChild.required<ElementRef<HTMLElement>>('inlineStartSentinel');
    private readonly inlineEndSentinel =
        viewChild.required<ElementRef<HTMLElement>>('inlineEndSentinel');
    private readonly blockStartSentinel =
        viewChild.required<ElementRef<HTMLElement>>('blockStartSentinel');
    private readonly blockEndSentinel =
        viewChild.required<ElementRef<HTMLElement>>('blockEndSentinel');

    protected readonly inlineStartOverflow = signal(false);
    protected readonly inlineEndOverflow = signal(false);
    protected readonly blockStartOverflow = signal(false);
    protected readonly blockEndOverflow = signal(false);
    protected readonly viewportWidth = signal(0);
    protected readonly viewportHeight = signal(0);
    protected readonly canKeyboardScroll = computed(
        () =>
            this.keyboardScroll() &&
            (this.inlineStartOverflow() ||
                this.inlineEndOverflow() ||
                this.blockStartOverflow() ||
                this.blockEndOverflow())
    );

    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    constructor() {
        afterNextRender(() => {
            const viewport = this.host.nativeElement;
            const resizeObserver = new ResizeObserver(() => this.updateViewportSize());
            const intersectionObserver = new IntersectionObserver(
                (entries) => this.updateEdgeVisibility(entries),
                {
                    root: viewport,
                    threshold: 0
                }
            );

            resizeObserver.observe(viewport);
            intersectionObserver.observe(this.inlineStartSentinel().nativeElement);
            intersectionObserver.observe(this.inlineEndSentinel().nativeElement);
            intersectionObserver.observe(this.blockStartSentinel().nativeElement);
            intersectionObserver.observe(this.blockEndSentinel().nativeElement);
            this.updateViewportSize();

            this.destroyRef.onDestroy(() => {
                resizeObserver.disconnect();
                intersectionObserver.disconnect();
            });
        });
    }

    /** Keeps the overlay sized to the visible scrollport, excluding scrollbar tracks. */
    private updateViewportSize(): void {
        const viewport = this.host.nativeElement;

        this.viewportWidth.set(viewport.clientWidth);
        this.viewportHeight.set(viewport.clientHeight);
    }

    /** Toggles haze by checking whether each edge marker is currently visible. */
    private updateEdgeVisibility(entries: readonly IntersectionObserverEntry[]): void {
        const inlineStart = this.inlineStartSentinel().nativeElement;
        const inlineEnd = this.inlineEndSentinel().nativeElement;
        const blockStart = this.blockStartSentinel().nativeElement;
        const blockEnd = this.blockEndSentinel().nativeElement;

        for (const entry of entries) {
            const hidden = !entry.isIntersecting;

            if (entry.target === inlineStart) {
                this.inlineStartOverflow.set(hidden);
            } else if (entry.target === inlineEnd) {
                this.inlineEndOverflow.set(hidden);
            } else if (entry.target === blockStart) {
                this.blockStartOverflow.set(hidden);
            } else if (entry.target === blockEnd) {
                this.blockEndOverflow.set(hidden);
            }
        }
    }

    /** True when horizontal scrolling is enabled by the current axis input. */
    protected allowsInlineScroll(): boolean {
        const axis = this.axis();
        return axis === 'x' || axis === 'both';
    }

    /** True when vertical scrolling is enabled by the current axis input. */
    protected allowsBlockScroll(): boolean {
        const axis = this.axis();
        return axis === 'y' || axis === 'both';
    }
}
