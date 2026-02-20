import {Directive, inject, OnInit, TemplateRef, ViewContainerRef} from '@angular/core';


@Directive({
    selector: '[imsInput]',
    standalone: true
})
export class ImsInput implements OnInit {
    private templateRef: TemplateRef<HTMLInputElement | HTMLTextAreaElement> = inject(TemplateRef);
    private viewContainer: ViewContainerRef = inject(ViewContainerRef);

    ngOnInit() {
        const view = this.viewContainer.createEmbeddedView(this.templateRef);
        const inputNode = view.rootNodes[0];

        if (inputNode?.tagName !== 'INPUT' && inputNode?.tagName !== 'TEXTAREA') {
            throw new Error('imsInput directive can only be used on input or textarea elements');
        }

        const div = document.createElement('div');
        div.classList.add('ims-input-container');
        div.appendChild(inputNode);
        this.viewContainer.element.nativeElement.parentNode.insertBefore(div, this.viewContainer.element.nativeElement);
    }
}
