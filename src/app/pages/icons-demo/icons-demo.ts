import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../../components/ims-button';
import {
    IMS_ICON_ALL,
    ImsIcon,
    ImsIconDefinition,
    ImsIconHover,
    ImsIconTone,
    imsIconAdd,
    imsIconFloppyDisk,
    imsIconMultiSelect,
    imsIconSearch,
    imsIconUser
} from '../../components/ims-icon';

@Component({
    selector: 'app-icons-demo',
    imports: [ImsIcon, ImsButtonIcon, ImsButton],
    templateUrl: './icons-demo.html',
    styleUrl: './icons-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconsDemo {
    // A gallery is the one case that really does want every glyph.
    readonly icons: readonly ImsIconDefinition[] = IMS_ICON_ALL;

    readonly add = imsIconAdd;
    readonly floppyDisk = imsIconFloppyDisk;
    readonly multiSelect = imsIconMultiSelect;
    readonly search = imsIconSearch;
    readonly user = imsIconUser;

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
}
