import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    input,
    numberAttribute,
    ViewEncapsulation
} from '@angular/core';

let nextFormControlId = 0;

@Component({
    selector: 'ims-form-field',
    standalone: true,
    template: `
        <ng-content select="label, [imsFormFieldLabel]"/>
        <ng-content/>
    `,
    styleUrl: './ims-form-field.scss',
    host: {
        '[style.grid-column]': 'gridColumn()',
        '[style.--ims-form-control-width]': 'controlWidth()'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsFormField {
    private readonly destroyRef = inject(DestroyRef);
    private readonly hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private contentObserver: MutationObserver | null = null;
    private mainLabel: HTMLElement | null = null;
    private mainControl: HTMLElement | null = null;
    private automaticLabelFor: string | null = null;

    readonly column = input<number | null, number | string | null>(null, {
        transform: (value) => {
            const parsed = numberAttribute(value, Number.NaN);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        }
    });
    readonly controlWidth = input<string | null>(null);
    readonly gridColumn = computed(() => {
        const column = this.column();
        return column === null ? 'auto / span 2' : `${((column - 1) * 2) + 1} / span 2`;
    });

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

    private findControlById(id: string): HTMLElement | null {
        const target = this.hostElement.ownerDocument.getElementById(id);
        return target instanceof HTMLElement && this.belongsToThisField(target) ? target : null;
    }

    private findFirstLabelableControl(): HTMLElement | null {
        const controls = this.hostElement.querySelectorAll<HTMLElement>(
            'button, input:not([type="hidden"]), meter, output, progress, select, textarea'
        );

        return Array.from(controls).find((control) => this.belongsToThisField(control)) ?? null;
    }

    private belongsToThisField(control: HTMLElement): boolean {
        return control.closest('ims-form-field') === this.hostElement;
    }

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
