import {ChangeDetectionStrategy, Component, input, ViewEncapsulation} from '@angular/core';

export type ImsFormControlGroupLayout = 'stacked' | 'inline';

@Component({
    selector: 'ims-form-control-group',
    standalone: true,
    template: '<ng-content/>',
    styleUrl: './ims-form-control-group.scss',
    host: {
        '[attr.layout]': 'layout()'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImsFormControlGroup {
    readonly layout = input<ImsFormControlGroupLayout>('stacked');
}
