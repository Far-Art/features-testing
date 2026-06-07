import {Directive, input} from '@angular/core';

@Directive({
    selector: '[imsFormFieldLabel]',
    standalone: true
})
export class ImsFormFieldLabel {
}

@Directive({
    selector: '[imsFormFieldControl]',
    standalone: true,
    host: {
        '[style.--ims-form-control-width]': 'width()'
    }
})
export class ImsFormFieldControl {
    readonly width = input<string | null>(null, {alias: 'imsFormFieldControlWidth'});
}
