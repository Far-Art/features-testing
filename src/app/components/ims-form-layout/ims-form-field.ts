import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    input,
    numberAttribute
} from '@angular/core';

/** Monotonic id source for controls that need automatic label association. */
let nextFormControlId = 0;

@Component({
    selector: 'ims-form-field',
    standalone: true,
    template: `
        <ng-content select="label, [imsFormFieldLabel]"/>
        <ng-content/>
    `,
    host: {
        '[style.grid-column]': 'gridColumn()',
        '[style.--ims-form-control-width]': 'controlWidth()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Two-column form-field layout containing one main label and value content.
 *
 * Projection is split into two slots:
 * - A direct native `label` or `[imsFormFieldLabel]` is projected into the
 *   label column.
 * - Every other direct child is projected into the value column.
 *
 * A native main label is automatically associated with the first labelable
 * control owned by this field. Existing explicit `for`/`id` associations are
 * preserved. Nested `ims-form-field` controls are ignored, which prevents an
 * outer field from taking ownership of a nested field's control.
 *
 * The component works standalone with intrinsic label/value tracks. Inside an
 * `ims-form-field-grid` or `ims-form-field-row`, it adopts the parent tracks
 * through CSS `subgrid` so labels and values align across fields.
 *
 * With a direct `ims-checkbox`, the checkbox component and main field label
 * share value column 2 and row 1. The form layout only handles placement;
 * checkbox visuals remain owned by the checkbox component.
 */
export class ImsFormField {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    /** Watches dynamically added or removed projected labels and controls. */
    private contentObserver: MutationObserver | null = null;
    /** Current direct child selected for the main label slot. */
    private mainLabel: HTMLElement | null = null;
    /** Labelable descendant currently associated with the main native label. */
    private mainControl: HTMLElement | null = null;
    /** `for` value created by this component, used to distinguish it from consumer input. */
    private automaticLabelFor: string | null = null;

    /**
     * Optional one-based logical column used inside a field group or row.
     *
     * When omitted, normal CSS grid auto-placement is used. Invalid and
     * non-positive values are treated as omitted.
     */
    readonly column = input<number | null, number | string | null>(null, {
        transform: (value) => {
            const parsed = numberAttribute(value, Number.NaN);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        }
    });
    /**
     * Optional CSS inline size for direct native controls in the value column.
     *
     * The value is exposed as `--ims-form-control-width`. Compound groups and
     * custom value components may choose their own sizing.
     */
    readonly controlWidth = input<string | null>(null);
    /**
     * CSS grid placement for this field.
     *
     * Each logical form column occupies two tracks, so an explicitly placed
     * field starts at the corresponding label track and spans its label/value
     * pair.
     */
    readonly gridColumn = computed(() => {
        const column = this.column();
        return column === null ? null : `${((column - 1) * 2) + 1} / span 2`;
    });

    /**
     * Initializes projected-content synchronization after rendering and
     * removes observers and generated state when the component is destroyed.
     */
    constructor() {
        afterNextRender(() => {
            this.syncFieldParts();
            this.contentObserver = new MutationObserver(() => this.syncFieldParts());
            this.contentObserver.observe(this.hostElement, {
                childList: true,
                subtree: true
            });
        });

        this.destroyRef.onDestroy(() => {
            this.contentObserver?.disconnect();
            this.mainControl?.removeAttribute('data-ims-main-control');
        });
    }

    /**
     * Resolves the current main label from direct projected children.
     *
     * An explicit `[imsFormFieldLabel]` wins over an unmarked native `label`.
     * If dynamic content changes the selected label, any association generated
     * for the previous label is removed before the new label is synchronized.
     */
    private syncFieldParts(): void {
        const directChildren = Array.from(this.hostElement.children)
            .filter((element): element is HTMLElement => element instanceof HTMLElement);
        const labelElements = directChildren.filter((element) =>
            element instanceof HTMLLabelElement ||
            element.hasAttribute('imsFormFieldLabel')
        );
        const label = labelElements.find((element) =>
            element.hasAttribute('imsFormFieldLabel')
        ) ?? labelElements[0] ?? null;

        if (this.mainLabel !== label) {
            this.clearMainControl();
        }

        this.mainLabel = label;
        this.syncMainLabel();
    }

    /**
     * Associates the main native label with its target control.
     *
     * An explicit consumer-provided `for` attribute is resolved and retained.
     * Otherwise the first labelable control belonging to this field receives a
     * generated id and becomes the automatic target. The chosen control is
     * marked for CSS state propagation from nested compound value content.
     */
    private syncMainLabel(): void {
        const label = this.mainLabel;
        if (!(label instanceof HTMLLabelElement)) {
            this.clearMainControl();
            return;
        }

        const explicitFor = label.getAttribute('for');
        const hasExplicitTarget = explicitFor !== null && explicitFor !== this.automaticLabelFor;
        const target = hasExplicitTarget
            ? this.findControlById(explicitFor)
            : this.findFirstLabelableControl();

        if (!target) {
            this.clearMainControl();
            return;
        }

        if (!target.id) {
            target.id = `ims-form-control-${nextFormControlId++}`;
        }

        if (!hasExplicitTarget) {
            label.htmlFor = target.id;
            this.automaticLabelFor = target.id;
        } else {
            this.automaticLabelFor = null;
        }

        if (this.mainControl !== target) {
            this.mainControl?.removeAttribute('data-ims-main-control');
            target.setAttribute('data-ims-main-control', '');
            this.mainControl = target;
        }
    }

    /** Finds an explicitly referenced control only when it belongs to this field. */
    private findControlById(id: string): HTMLElement | null {
        const target = this.hostElement.ownerDocument.getElementById(id);
        return target instanceof HTMLElement && this.belongsToThisField(target) ? target : null;
    }

    /**
     * Returns the first labelable descendant owned by this field.
     *
     * Hidden inputs are excluded because native labels cannot meaningfully
     * activate them.
     */
    private findFirstLabelableControl(): HTMLElement | null {
        const controls = this.hostElement.querySelectorAll<HTMLElement>(
            'button, input:not([type="hidden"]), meter, output, progress, select, textarea'
        );

        return Array.from(controls).find((control) => this.belongsToThisField(control)) ?? null;
    }

    /** Prevents controls inside nested form fields from being claimed by this field. */
    private belongsToThisField(control: HTMLElement): boolean {
        return control.closest('ims-form-field') === this.hostElement;
    }

    /**
     * Removes only associations and markers generated by this component.
     *
     * Consumer-provided `for` and `id` attributes are left intact.
     */
    private clearMainControl(): void {
        if (this.automaticLabelFor !== null) {
            const label = this.mainLabel;
            if (label instanceof HTMLLabelElement && label.htmlFor === this.automaticLabelFor) {
                label.removeAttribute('for');
            }
        }

        this.mainControl?.removeAttribute('data-ims-main-control');
        this.mainControl = null;
        this.automaticLabelFor = null;
    }
}
