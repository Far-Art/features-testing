import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ImsButtonIcon} from '../../components/ims-button';
import {IMS_ICONS, IMS_ICON_NAMES, ImsIcon, ImsIconHover, ImsIconName, ImsIconTone} from '../../components/ims-icon';

@Component({
    selector: 'app-icons-demo',
    imports: [ImsIcon, ImsButtonIcon],
    templateUrl: './icons-demo.html',
    styleUrl: './icons-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconsDemo {
    readonly names = IMS_ICON_NAMES;
    readonly sizes = [18, 24, 32, 48] as const;
    readonly tones: readonly ImsIconTone[] = [
        'default',
        'muted',
        'accent',
        'success',
        'warning',
        'danger'
    ];
    readonly offsets = [0, 0.75, 1.5, 2.25, 3] as const;
    readonly hovers: readonly ImsIconHover[] = ['lift', 'register', 'flip', 'ink'];

    labelFor(name: ImsIconName): string {
        return IMS_ICONS[name].label;
    }
}
