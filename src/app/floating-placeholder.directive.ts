import {Directive, ElementRef, HostListener, inject, Input, OnDestroy, OnInit, Renderer2} from '@angular/core';


@Directive({
    selector: 'input[imsFloatingPlaceholder], textarea[imsFloatingPlaceholder]',
    standalone: true
})
export class FloatingPlaceholderDirective implements OnInit, OnDestroy {
    private static counter = 0;

    @Input('imsFloatingPlaceholder') labelText?: string;

    private labelEl?: HTMLSpanElement;
    private anchorName = `--float-${++FloatingPlaceholderDirective.counter}`;
    private focused = false;

    private host = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef);
    private renderer = inject(Renderer2);

    ngOnInit(): void {
        const input = this.host.nativeElement;
        const text = (this.labelText ?? input.getAttribute('placeholder') ?? '').trim() || 'Placeholder';

        // Prepare host
        this.renderer.addClass(input, 'floating-placeholder-input');
        this.renderer.setStyle(input, 'anchor-name', this.anchorName);
        // keep native placeholder empty so the floated label is the only visible text
        this.renderer.setAttribute(input, 'placeholder', ' ');

        // Create label element
        const label = this.renderer.createElement('span') as HTMLSpanElement;
        this.renderer.addClass(label, 'floating-placeholder');
        this.renderer.setStyle(label, 'position-anchor', this.anchorName);
        this.renderer.setProperty(label, 'textContent', text);

        this.labelEl = label;
        this.renderer.insertBefore( input.parentNode, label, input.nextSibling);

        this.updateFloated();
    }

    ngOnDestroy(): void {
        if (this.labelEl?.parentNode) {
            this.labelEl.parentNode.removeChild(this.labelEl);
        }
    }

    @HostListener('focus')
    onFocus(): void {
        this.focused = true;
        this.updateFloated();
    }

    @HostListener('blur')
    onBlur(): void {
        this.focused = false;
        this.updateFloated();
    }

    @HostListener('input')
    onInput(): void {
        this.updateFloated();
    }

    private updateFloated(): void {
        if (!this.labelEl) {
            return;
        }
        const value = this.host.nativeElement.value;
        const floated = this.focused || value.length > 0;
        this.labelEl.classList.toggle('floated', floated);
    }
}
