import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../../components/ims-button';
import {
    IMS_DUO_ICON_ALL,
    ImsDuoIcon,
    ImsDuoIconDefinition,
    ImsDuoIconTone,
    imsDuoIconAdd,
    imsDuoIconFloppyDisk,
    imsDuoIconMultiSelect,
    imsDuoIconSearch,
    imsDuoIconUser
} from '../../components/ims-duo-icon';

@Component({
    selector: 'app-icons-demo',
    imports: [ImsDuoIcon, ImsButtonIcon, ImsButton],
    templateUrl: './icons-demo.html',
    styleUrl: './icons-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconsDemo {
    // A gallery is the one case that really does want every glyph.
    readonly icons: readonly ImsDuoIconDefinition[] = IMS_DUO_ICON_ALL;

    readonly add = imsDuoIconAdd;
    readonly floppyDisk = imsDuoIconFloppyDisk;
    readonly multiSelect = imsDuoIconMultiSelect;
    readonly search = imsDuoIconSearch;
    readonly user = imsDuoIconUser;

    readonly sizes = [18, 24, 32, 48] as const;
    readonly offsets = [0, 0.75, 1.5, 2.25, 3] as const;
    readonly tones: readonly ImsDuoIconTone[] = [
        'default',
        'muted',
        'accent',
        'success',
        'warning',
        'danger'
    ];
}
