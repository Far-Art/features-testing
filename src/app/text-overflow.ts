import {ConnectedPosition, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {DomPortal} from '@angular/cdk/portal';
import {Directive, ElementRef, HostListener, Renderer2} from '@angular/core';


@Directive({
    selector: '[imsTextOverflow]',
    standalone: true
})
export class TextOverflow {
    private tooltip: HTMLElement | null = null;
    private overlayRef: OverlayRef | null = null;
    private portalStagingParent: HTMLElement | null = null;
    private isSelecting = false;
    private selectionListener: (() => void) | null = null;
    private mouseDownListener: (() => void) | null = null;

    constructor(
        private el: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private overlay: Overlay
    ) {
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
        const direction = this.resolveDirection(host, computedStyle.direction);
        const rect = host.getBoundingClientRect();

        this.tooltip = host.cloneNode(true) as HTMLElement;
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
        this.renderer.setStyle(this.tooltip, 'white-space', 'nowrap');
        this.renderer.setStyle(this.tooltip, 'overflow', 'visible');
        this.renderer.setStyle(this.tooltip, 'text-overflow', 'clip');
        this.renderer.setStyle(this.tooltip, 'user-select', 'text');
        this.renderer.setStyle(this.tooltip, 'margin', '0');
        this.renderer.setStyle(this.tooltip, 'direction', direction);

        this.portalStagingParent = this.renderer.createElement('div');
        this.renderer.setStyle(this.portalStagingParent, 'display', 'none');
        this.renderer.appendChild(document.body, this.portalStagingParent);
        this.renderer.appendChild(this.portalStagingParent, this.tooltip);

        this.overlayRef = this.createOverlay(direction, host);
        this.overlayRef.attach(new DomPortal(this.tooltip));
        this.overlayRef.updatePosition();
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
                this.overlayRef?.dispose();
                this.overlayRef = null;
                if (this.portalStagingParent) {
                    this.renderer.removeChild(document.body, this.portalStagingParent);
                    this.portalStagingParent = null;
                }
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

    private resolveDirection(host: HTMLElement, computedDirection: string): 'ltr' | 'rtl' {
        const hostDir = host.getAttribute('dir');
        if (hostDir === 'rtl' || hostDir === 'ltr') {
            return hostDir;
        }

        const closestDir = host.closest('[dir]')?.getAttribute('dir');
        if (closestDir === 'rtl' || closestDir === 'ltr') {
            return closestDir;
        }

        if (computedDirection === 'rtl' || computedDirection === 'ltr') {
            return computedDirection;
        }

        const documentDir = document.documentElement.getAttribute('dir');
        return documentDir === 'rtl' ? 'rtl' : 'ltr';
    }

    private createOverlay(direction: 'ltr' | 'rtl', origin: HTMLElement): OverlayRef {
        this.overlayRef?.dispose();
        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(origin)
            .withFlexibleDimensions(false)
            .withPush(false)
            .withPositions(this.getOverlayPositions(direction));

        return this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            disposeOnNavigation: true,
            hasBackdrop: false,
            direction
        });
    }

    private getOverlayPositions(_direction: 'ltr' | 'rtl'): ConnectedPosition[] {
        return [
            {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top'},
            {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'bottom'}
        ];
    }
}
