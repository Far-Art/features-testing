import {
    AfterViewInit,
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    computed,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import {IMS_SELECT_PARENT, ImsSelectOptionLike, ImsSelectParent} from './ims-select.types';

let nextOptionId = 0;

@Component({
    selector: 'ims-option',
    standalone: true,
    template: `
        <span class="ims-option__label">
            <span #content class="ims-option__content"><ng-content /></span>
            <span #weightReserve class="ims-option__weight-reserve" aria-hidden="true" inert></span>
        </span>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-option',
        '[attr.id]': 'id',
        role: 'option',
        '[attr.aria-selected]': 'selected()',
        '[attr.aria-disabled]': 'disabled()',
        '[class.ims-option--selected]': 'selected()',
        '[class.ims-option--active]': 'active()',
        '[class.ims-option--disabled]': 'disabled()',
        '[hidden]': '!visible()',
        '(click)': 'handleClick($event)',
        '(mouseenter)': 'handleMouseenter()'
    }
})
export class ImsOption<T = unknown> implements AfterViewInit, OnDestroy, ImsSelectOptionLike<T> {
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly contentElement = viewChild.required<ElementRef<HTMLElement>>('content');
    private readonly weightReserveElement = viewChild.required<ElementRef<HTMLElement>>('weightReserve');
    private readonly parent = inject<ImsSelectParent<T> | null>(IMS_SELECT_PARENT, {
        optional: true
    });
    private mutationObserver: MutationObserver | null = null;

    /**
     * Value emitted by the parent select when this option is selected.
     * Also accepts a plain string attribute (`value="active"`); the IDE only
     * allows static attributes on inputs whose write type accepts `string`.
     */
    readonly value = input.required<T, T | string>({transform: (value) => value as T});

    /**
     * Text used in the collapsed select field and default filtering.
     * Projected option content can stay richer or more verbose.
     */
    readonly selectionText = input<string | null>(null);

    /** Prevents this option from being selected or focused by option navigation. */
    readonly disabled = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});
    readonly contentText = signal('');
    readonly id = `ims-option-${nextOptionId++}`;

    readonly selectionLabel = computed(() => {
        const explicitText = this.selectionText();
        if (explicitText !== null) return explicitText;

        const contentText = this.contentText().trim().replace(/\s+/g, ' ');
        if (contentText) return contentText;

        const value = this.readValueIfAvailable();
        return value === null || value === undefined ? '' : String(value);
    });

    readonly selected = computed(() => this.parent?.isOptionSelected(this) ?? false);
    readonly active = computed(() => this.parent?.isOptionActive(this) ?? false);
    readonly visible = computed(() => this.parent?.isOptionVisible(this) ?? true);

    ngAfterViewInit(): void {
        this.syncContent();
        this.mutationObserver = new MutationObserver(() => this.syncContent());
        // The content only: the weight reserve changes with it, and observing
        // that too would answer every sync with another.
        this.mutationObserver.observe(this.contentElement().nativeElement, {
            characterData: true,
            childList: true,
            subtree: true
        });
    }

    ngOnDestroy(): void {
        this.mutationObserver?.disconnect();
    }

    handleClick(event: MouseEvent): void {
        if (this.disabled()) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        this.parent?.selectOption(this, event);
    }

    handleMouseenter(): void {
        if (this.disabled()) return;
        this.parent?.activateOption(this, 'pointer');
    }

    scrollIntoView(): void {
        this.elementRef.nativeElement.scrollIntoView({block: 'nearest'});
    }

    private syncContent(): void {
        const content = this.contentElement().nativeElement;
        this.contentText.set(content.textContent ?? '');
        this.syncWeightReserve(content);
    }

    /**
     * Copies the projected content into the hidden layer laid out at the
     * selected weight, so the option is as wide unselected as it is once
     * selected. A copy of the content itself, not of its text, so the gaps and
     * margins between its parts count too.
     */
    private syncWeightReserve(content: HTMLElement): void {
        const copy = content.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        this.weightReserveElement().nativeElement.replaceChildren(...copy.childNodes);
    }

    private readValueIfAvailable(): T | undefined {
        try {
            return this.value();
        } catch {
            return undefined;
        }
    }
}
