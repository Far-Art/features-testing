import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    booleanAttribute,
    inject,
    input
} from '@angular/core';
import {
    STACKED_ATTRIBUTE,
    SUBGRID_ATTRIBUTE,
    layoutParent,
    observeInlineSize,
    overflowsInline
} from './ims-form-field-fit';

@Component({
    selector: 'ims-form-field-row',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.visibility]': '!visible() ? "hidden" : null',
        '[attr.data-fill]': 'fill() ? "" : null'
    }
})
/**
 * Row of `ims-form-field` instances, laid out on one line.
 *
 * Inside an `ims-form-field-grid`, the row spans every field track of the
 * parent grid and adopts those tracks through CSS `subgrid`. Use it there when
 * a set of fields must remain on one visual row even when sibling fields are
 * conditionally added or removed. Child `ims-form-field` instances can use
 * their `column` input to target a stable one-based logical form column within
 * the row, and the grid decides whether their labels stack. The row may also
 * reach the grid through an element with `display: contents`, such as the host
 * of a component that holds the row.
 *
 * On its own, the row places its fields side by side on one line, each at its
 * natural width, packed at the inline start unless `fill` is set. When the
 * fields cannot sit side by side at their natural widths, every field in the
 * row moves its label above its value, and fields that still do not fit move
 * onto further lines rather than being squeezed. `column` and `span` have no
 * effect here.
 */
export class ImsFormFieldRow {
    /**
     * Controls whether the row is visible while preserving its grid space.
     *
     * @example
     * ```html
     * <ims-form-field-row [visible]="showContactFields">...</ims-form-field-row>
     * <ims-form-field-row [visible]="false">...</ims-form-field-row>
     * ```
     */
    visible = input<boolean>(true);
    /**
     * Stretches the fields of a standalone row across the row's full width.
     *
     * Without it, fields keep their natural widths, packed at the inline start.
     * Inside an `ims-form-field-grid` the grid's tracks decide instead.
     *
     * @example
     * ```html
     * <ims-form-field-row fill>...</ims-form-field-row>
     * <ims-form-field-row [fill]="stretchFields">...</ims-form-field-row>
     * ```
     */
    readonly fill = input<boolean, boolean | string | null | undefined>(false, {
        transform: booleanAttribute
    });
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private stopObservingInlineSize: (() => void) | null = null;
    /** Watches fields being added to or removed from a standalone row. */
    private fieldObserver: MutationObserver | null = null;

    /**
     * Starts label-stacking measurement after rendering when the row stands
     * on its own, and stops it when the row is destroyed.
     */
    constructor() {
        afterNextRender(() => {
            // In a grid the row adopts the grid's tracks, and the grid decides
            // where labels go. The row marks itself, since an element with
            // display: contents may sit between the two, which the styles'
            // child combinator cannot cross. An ims-grid cell sizes its own
            // content.
            if (layoutParent(this.hostElement)?.matches('ims-form-field-grid')) {
                this.hostElement.setAttribute(SUBGRID_ATTRIBUTE, '');
                return;
            }
            if (this.hostElement.closest('ims-grid-cell')) {
                return;
            }

            this.stopObservingInlineSize = observeInlineSize(
                this.hostElement,
                () => this.syncStacking()
            );
            this.fieldObserver = new MutationObserver(() => this.syncStacking());
            this.fieldObserver.observe(this.hostElement, {childList: true});

            void this.hostElement.ownerDocument.fonts?.ready.then(() => {
                this.syncStacking();
            });
            this.syncStacking();
        });

        this.destroyRef.onDestroy(() => {
            this.stopObservingInlineSize?.();
            this.fieldObserver?.disconnect();
        });
    }

    /**
     * Stacks every field's label above its value when the fields cannot sit
     * side by side at their natural widths.
     *
     * Without the attribute, the row holds its fields on one line at natural
     * width, so an overflow is exactly the case that needs stacking. With it,
     * fields that still do not fit wrap onto further lines.
     */
    private syncStacking(): void {
        const host = this.hostElement;
        host.removeAttribute(STACKED_ATTRIBUTE);
        host.toggleAttribute(STACKED_ATTRIBUTE, overflowsInline(host));
    }
}
