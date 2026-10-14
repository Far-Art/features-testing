import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    model,
    output,
    signal,
    viewChild
} from '@angular/core';
import {ImsDock} from '../ims-dock/ims-dock';
import {ImsDockItem} from '../ims-dock/ims-dock.model';
import {ImsIcon} from '../ims-icon';
import {ImsProcessToolbarMessage, ImsProcessToolbarSeverity} from './ims-process-toolbar.model';
import {processToolbarKnob} from './process-toolbar-knob';

let nextProcessToolbarId = 0;

/** Material Symbols glyph that leads a message, per severity. */
const SEVERITY_ICONS: Readonly<Record<ImsProcessToolbarSeverity, string>> = {
    neutral: 'chat_bubble',
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
    danger: 'error'
};

/**
 * The knob never changes shape, so every toolbar shares one set of paths. Its circle's
 * centre sits below the edge, so only a low cap of it rises, which the wide fillets
 * blend into the edge.
 */
const KNOB = processToolbarKnob({radius: 16, lift: -3, filletRadius: 18});

/**
 * A list of messages with an {@link ImsDock} over their end.
 *
 * The dock sits at the inline end (the left in RTL) and the scrollbar at the inline
 * start. Messages wrap at the toolbar's full width and run on under the dock, fading
 * out beneath its glass. Collapsed, the toolbar is as tall as its first two messages.
 * The knob at the top centre expands it to more rows and hides the dock, revealing
 * the messages in full. Haze on the top or bottom edge marks that there are more
 * messages to scroll to.
 */
@Component({
    selector: 'ims-process-toolbar',
    standalone: true,
    imports: [ImsDock, ImsIcon],
    templateUrl: './ims-process-toolbar.html',
    styleUrl: './ims-process-toolbar.scss',
    host: {
        class: 'ims-process-toolbar',
        '[class.ims-process-toolbar--expanded]': 'expanded()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsProcessToolbar {
    /** Messages to show, top to bottom. */
    readonly messages = input.required<readonly ImsProcessToolbarMessage[]>();

    /** Icons for the dock, in visual order. */
    readonly dockItems = input.required<readonly ImsDockItem[]>();

    /** Whether the toolbar is expanded. Expanding hides the dock. */
    readonly expanded = model(false);

    /** Accessible name of the message log. */
    readonly ariaLabel = input('הודעות');

    /** Accessible name of the knob while the toolbar is collapsed. */
    readonly expandAriaLabel = input('הרחבת ההודעות');

    /** Accessible name of the knob while the toolbar is expanded. */
    readonly collapseAriaLabel = input('כיווץ ההודעות');

    /** Emitted when a dock icon is activated (click or keyboard). */
    readonly dockItemActivated = output<ImsDockItem>();

    protected readonly scrollerId = `ims-process-toolbar-${nextProcessToolbarId++}`;
    protected readonly knob = KNOB;
    protected readonly severityIcons = SEVERITY_ICONS;

    /** True while messages lie above the visible ones. */
    protected readonly moreAbove = signal(false);

    /** True while messages lie below the visible ones. */
    protected readonly moreBelow = signal(false);

    /** The log takes keyboard focus only while there is something to scroll. */
    protected readonly scrollable = computed(() => this.moreAbove() || this.moreBelow());

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
    private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
    private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
    private readonly startSentinel = viewChild.required<ElementRef<HTMLElement>>('startSentinel');
    private readonly endSentinel = viewChild.required<ElementRef<HTMLElement>>('endSentinel');

    constructor() {
        afterNextRender(() => {
            const start = this.startSentinel().nativeElement;
            const end = this.endSentinel().nativeElement;

            // A sentinel on each end of the list: one that has scrolled out of view
            // means there are messages past that edge. The observer follows scrolling,
            // resizing and the list changing on its own, with nothing to re-measure.
            const edgeObserver = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.target === start) {
                            this.moreAbove.set(!entry.isIntersecting);
                        } else if (entry.target === end) {
                            this.moreBelow.set(!entry.isIntersecting);
                        }
                    }
                },
                {root: this.scroller().nativeElement}
            );
            edgeObserver.observe(start);
            edgeObserver.observe(end);

            // The list resizes when messages come and go and when the toolbar's width
            // re-wraps them. Expanding doesn't: the messages wrap at the full width
            // either way, only the dock over them goes.
            let fitted = false;
            const listObserver = new ResizeObserver(() => {
                this.fitCollapsedSize(fitted);
                fitted = true;
            });
            listObserver.observe(this.list().nativeElement);

            this.destroyRef.onDestroy(() => {
                edgeObserver.disconnect();
                listObserver.disconnect();
            });
        });
    }

    toggle(): void {
        this.expanded.update((expanded) => !expanded);
    }

    /**
     * Sizes the collapsed toolbar to its first two messages, however many lines they
     * wrap to. The stylesheet keeps it at least two single-line messages tall.
     */
    private fitCollapsedSize(animate: boolean): void {
        const host = this.host.nativeElement;
        const second = this.list().nativeElement.children.item(1);
        const size = second
            ? second.getBoundingClientRect().bottom - this.content().nativeElement.getBoundingClientRect().top
            : 0;

        // The first fit lands before anything has been seen, so it doesn't animate.
        if (!animate) {
            host.style.transition = 'none';
        }
        host.style.setProperty('--ims-process-toolbar-fit-size', `${size}px`);
        if (!animate) {
            host.getBoundingClientRect();
            host.style.transition = '';
        }
    }
}
