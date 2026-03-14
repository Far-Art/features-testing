import {AfterContentInit, Directive, ElementRef, HostListener, inject, OnDestroy, Renderer2} from '@angular/core';


@Directive({
    selector: 'input[imsFloatingPlaceholder], textarea[imsFloatingPlaceholder]',
    standalone: true
})
export class FloatingPlaceholderDirective implements AfterContentInit, OnDestroy {
    private static counter = 0;

    private labelEl?: HTMLSpanElement;
    private anchorName = `--float-${++FloatingPlaceholderDirective.counter}`;
    private focused = false;

    private host = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
    private renderer = inject(Renderer2);

    ngAfterContentInit(): void {
        const text = (this.host.placeholder ?? '').trim();

        // Prepare host
        this.renderer.addClass(this.host, 'floating-placeholder-input');
        this.renderer.setStyle(this.host, 'anchor-name', this.anchorName);

        // Create label element
        const label = this.renderer.createElement('floating-placeholder') as HTMLElement;
        this.renderer.addClass(label, 'floating-placeholder');
        this.renderer.setStyle(label, 'position-anchor', this.anchorName);
        this.renderer.setProperty(label, 'textContent', text);
        label.setAttribute('aria-hidden', 'true');

        this.labelEl = label;

        this.renderer.insertBefore(this.host.parentNode, label, this.host.nextSibling);

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
        const value = this.host.value;
        const floated = this.focused || value.length > 0;
        this.labelEl.classList.toggle('floated', floated);
    }
}
