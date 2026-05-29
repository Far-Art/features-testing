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
    signal
} from '@angular/core';
import {IMS_SELECT_PARENT, ImsSelectOptionLike, ImsSelectParent} from './ims-select.types';

let nextOptionId = 0;

@Component({
    selector: 'ims-option',
    standalone: true,
    template: '<ng-content />',
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
    private readonly parent = inject<ImsSelectParent<T> | null>(IMS_SELECT_PARENT, {
        optional: true
    });
    private mutationObserver: MutationObserver | null = null;

    /** Value emitted by the parent select when this option is selected. */
    readonly value = input.required<T>();

    /**
     * Text used in the collapsed select field and default filtering.
     * Projected option content can stay richer or more verbose.
     */
    readonly selectionText = input<string | null>(null);

    /** Prevents this option from being selected or focused by option navigation. */
    readonly disabled = input(false, {transform: booleanAttribute});
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
        this.updateContentText();
        this.mutationObserver = new MutationObserver(() => this.updateContentText());
        this.mutationObserver.observe(this.elementRef.nativeElement, {
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
        this.parent?.activateOption(this);
    }

    scrollIntoView(): void {
        this.elementRef.nativeElement.scrollIntoView({block: 'nearest'});
    }

    private updateContentText(): void {
        this.contentText.set(this.elementRef.nativeElement.textContent ?? '');
    }

    private readValueIfAvailable(): T | undefined {
        try {
            return this.value();
        } catch {
            return undefined;
        }
    }
}
