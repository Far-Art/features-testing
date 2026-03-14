import {Directive, ElementRef, HostListener, Renderer2} from '@angular/core';


@Directive({
    selector: '[imsTextOverflow]',
    standalone: true
})
export class TextOverflow {
    private tooltip: HTMLElement | null = null;
    private isSelecting = false;
    private selectionListener: (() => void) | null = null;
    private mouseDownListener: (() => void) | null = null;

    constructor(private el: ElementRef, private renderer: Renderer2) {
        this.renderer.setStyle(this.el.nativeElement, 'white-space', 'nowrap');
        this.renderer.setStyle(this.el.nativeElement, 'overflow', 'hidden');
        this.renderer.setStyle(this.el.nativeElement, 'text-overflow', 'ellipsis');
        this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
    }

    @HostListener('mouseenter')
    @HostListener('focus')
    onShow() {
        if (this.tooltip) return;

        const host = this.el.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(host);
        const originalColor = computedStyle.color;
        const direction = this.resolveDirection(computedStyle.direction);
        const rect = host.getBoundingClientRect();

        this.tooltip = host.cloneNode(true) as HTMLElement;
        this.renderer.setStyle(this.tooltip, 'position', 'fixed');
        this.renderer.setStyle(this.tooltip, 'display', computedStyle.display);
        this.renderer.setStyle(this.tooltip, 'box-sizing', 'border-box');
        this.renderer.setStyle(this.tooltip, 'background', computedStyle.background);
        this.renderer.setStyle(this.tooltip, 'color', originalColor);
        this.renderer.setStyle(this.tooltip, 'width', 'max-content');
        this.renderer.setStyle(this.tooltip, 'min-width', `${rect.width}px`);
        this.renderer.setStyle(this.tooltip, 'max-width', 'none');
        this.renderer.setStyle(this.tooltip, 'height', `${rect.height}px`);
        this.renderer.setStyle(this.tooltip, 'min-height', `${rect.height}px`);
        this.renderer.setStyle(this.tooltip, 'max-height', `${rect.height}px`);
        this.renderer.setStyle(this.tooltip, 'z-index', '1000');
        this.renderer.setStyle(this.tooltip, 'white-space', 'nowrap');
        this.renderer.setStyle(this.tooltip, 'overflow', 'visible');
        this.renderer.setStyle(this.tooltip, 'text-overflow', 'clip');
        this.renderer.setStyle(this.tooltip, 'user-select', 'text');
        this.renderer.setStyle(this.tooltip, 'margin', '0');
        this.renderer.setStyle(this.tooltip, 'direction', direction);

        this.setTooltipPosition(rect, direction);

        this.renderer.appendChild(document.body, this.tooltip);
        this.renderer.setStyle(host, 'color', 'transparent');

        this.renderer.listen(this.tooltip, 'mouseenter', () => this.isSelecting = true);
        this.renderer.listen(this.tooltip, 'mousedown', (event) => {
            this.isSelecting = true;
            event.stopPropagation();
        });
        this.renderer.listen(this.tooltip, 'mouseleave', () => {
            const selection = window.getSelection();
            const selectionInTooltip = selection && this.tooltip && selection.containsNode(this.tooltip, true);
            if (!selectionInTooltip || selection.toString().length === 0) {
                this.isSelecting = false;
                this.onHide();
            }
        });

        this.mouseDownListener = this.renderer.listen('document', 'mousedown', (event) => {
            if (this.tooltip && this.tooltip.contains(event.target)) {
                this.isSelecting = true;
            }
        });

        this.selectionListener = this.renderer.listen('document', 'selectionchange', () => {
            if (!this.tooltip) return;

            const selection = window.getSelection();
            const selectionInTooltip = selection && this.tooltip && selection.containsNode(this.tooltip, true);

            if (selection && selection.toString().length === 0 && selectionInTooltip) {
                this.isSelecting = false;
                this.onHide();
            }
        });
    }

    @HostListener('mouseleave')
    @HostListener('blur')
    onHide() {
        setTimeout(() => {
            if (!this.tooltip) return;

            const selection = window.getSelection();
            const hasSelection = selection && selection.toString().length > 0;
            const selectionInTooltip = hasSelection && selection.containsNode(this.tooltip, true);

            if (!this.isSelecting && !selectionInTooltip) {
                this.renderer.removeStyle(this.el.nativeElement, 'color');
                this.renderer.removeChild(document.body, this.tooltip);
                this.tooltip = null;
                if (this.selectionListener) {
                    this.selectionListener();
                    this.selectionListener = null;
                }
                if (this.mouseDownListener) {
                    this.mouseDownListener();
                    this.mouseDownListener = null;
                }
                this.isSelecting = false;
            }
        }, 10);
    }

    private resolveDirection(direction: string): 'ltr' | 'rtl' {
        return direction === 'rtl' ? 'rtl' : 'ltr';
    }

    private setTooltipPosition(rect: DOMRect, direction: 'ltr' | 'rtl'): void {
        if (!this.tooltip) {
            return;
        }

        this.renderer.removeStyle(this.tooltip, 'left');
        this.renderer.removeStyle(this.tooltip, 'right');
        this.renderer.setStyle(this.tooltip, 'top', `${rect.top}px`);

        if (direction === 'rtl') {
            const inlineStartOffset = Math.max(0, window.innerWidth - rect.right);
            this.renderer.setStyle(this.tooltip, 'right', `${inlineStartOffset}px`);
            return;
        }

        this.renderer.setStyle(this.tooltip, 'left', `${rect.left}px`);
    }
}
