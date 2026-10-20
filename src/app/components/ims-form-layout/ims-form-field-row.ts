import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    afterNextRender,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    untracked
} from '@angular/core';
import {
    STACKED_ATTRIBUTE,
    SUBGRID_ATTRIBUTE,
    layoutParent,
    observeInlineSize,
    overflowsInline
} from './ims-form-field-fit';
import {type ImsFormFieldFontWeight, fontWeightToken} from './ims-form-field-font-weight';
import {type ImsFormFieldGrid, findLayoutGrid} from './ims-form-field-grid';

/**
 * Rows by host element, so a field finds the row that lays it out from the
 * rendered layout, wherever the field is declared.
 */
const rowsByHost = new WeakMap<HTMLElement, ImsFormFieldRow>();

/**
 * Returns the row that lays out a field. An element with `display: contents`
 * on the way is passed over, as the layout itself passes over it.
 */
export function findLayoutRow(field: HTMLElement): ImsFormFieldRow | null {
    const parent = layoutParent(field);
    return parent === null ? null : rowsByHost.get(parent) ?? null;
}

@Component({
    selector: 'ims-form-field-row',
    standalone: true,
    template: '<ng-content/>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.visibility]': '!visible() ? "hidden" : null',
        '[style.--ims-form-label-font-weight]': 'labelFontWeightToken()',
        '[style.--ims-form-value-font-weight]': 'valueFontWeightToken()',
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
 * effect here. In a flex container, the row takes the space its siblings
 * leave, as it does in a block.
 *
 * `labelFontWeight` and `valueFontWeight` set the font weights of the row's
 * fields, over those of a grid around it. A field's own take precedence.
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
    /**
     * Font weight of the main label of every field in the row.
     *
     * Takes precedence over the `labelFontWeight` of a grid around the row,
     * and a field's own takes precedence over it. Unset, the row's fields
     * take the grid's weight, and are otherwise `bold`.
     *
     * @example
     * ```html
     * <ims-form-field-row labelFontWeight="regular">...</ims-form-field-row>
     * <ims-form-field-row [labelFontWeight]="labelWeight">...</ims-form-field-row>
     * ```
     */
    readonly labelFontWeight = input<ImsFormFieldFontWeight | null>(null);
    /**
     * Font weight of the value of every field in the row, which its controls
     * and text inherit.
     *
     * Takes precedence over the `valueFontWeight` of a grid around the row,
     * and a field's own takes precedence over it. Unset, the row's fields
     * take the grid's weight, and are otherwise `regular`.
     *
     * @example
     * ```html
     * <ims-form-field-row valueFontWeight="bold">...</ims-form-field-row>
     * <ims-form-field-row [valueFontWeight]="valueWeight">...</ims-form-field-row>
     * ```
     */
    readonly valueFontWeight = input<ImsFormFieldFontWeight | null>(null);
    /** CSS value of `labelFontWeight`, inherited by the row's fields. */
    protected readonly labelFontWeightToken = computed(() => fontWeightToken(this.labelFontWeight()));
    /** CSS value of `valueFontWeight`, inherited by the row's fields. */
    protected readonly valueFontWeightToken = computed(() => fontWeightToken(this.valueFontWeight()));
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    /** Grid that lays this row out, which measures for its fields. */
    private layoutGrid: ImsFormFieldGrid | null = null;
    private stopObservingInlineSize: (() => void) | null = null;
    /** Watches fields being added to or removed from a standalone row. */
    private fieldObserver: MutationObserver | null = null;

    /**
     * Starts label-stacking measurement after rendering when the row stands
     * on its own, measures again when the row's font weights change, and
     * stops measuring when the row is destroyed.
     */
    constructor() {
        rowsByHost.set(this.hostElement, this);

        afterNextRender(() => {
            // In a grid the row adopts the grid's tracks, and the grid decides
            // where labels go. The row marks itself, since an element with
            // display: contents may sit between the two, which the styles'
            // child combinator cannot cross. An ims-grid cell sizes its own
            // content.
            if (layoutParent(this.hostElement)?.matches('ims-form-field-grid')) {
                this.hostElement.setAttribute(SUBGRID_ATTRIBUTE, '');
                this.layoutGrid = findLayoutGrid(this.hostElement);
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

        effect(() => {
            this.labelFontWeight();
            this.valueFontWeight();
            untracked(() => this.refit());
        });

        this.destroyRef.onDestroy(() => {
            rowsByHost.delete(this.hostElement);
            this.stopObservingInlineSize?.();
            this.fieldObserver?.disconnect();
        });
    }

    /**
     * Measures the row again after a change that alters its fields' natural
     * widths without resizing the row, such as their font weights.
     *
     * In a grid, the grid measures. A row in an `ims-grid` cell never stacks,
     * so it has nothing to measure.
     */
    refit(): void {
        if (this.layoutGrid !== null) {
            this.layoutGrid.requestLayout();
        } else if (this.stopObservingInlineSize !== null) {
            afterNextRender(() => this.syncStacking(), {injector: this.injector});
        }
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
