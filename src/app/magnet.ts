import {Directive, ElementRef, HostListener, inject} from '@angular/core';


@Directive({
    selector: '[imsMagnet]'
})
export class Magnet {
    private el = inject<ElementRef<HTMLElement>>(ElementRef);

    @HostListener('mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        const target = this.getTargetElement();
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.07;
        const deltaY = (e.clientY - centerY) * 0.17;
        target.style.transition = 'transform 0ms linear';
        target.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    @HostListener('mouseleave')
    onMouseLeave() {
        const target = this.getTargetElement();
        target.style.transition = 'transform 200ms ease-out';
        target.style.transform = 'translate(0, 0)';
    }

    private getTargetElement(): HTMLElement {
        const parent = this.el.nativeElement.parentElement;
        return parent?.classList.contains('ims-input-container') ? parent : this.el.nativeElement;
    }
}
