import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SpecBuilderZone} from '../ui/spec-builder-zone';
import {SpecViewHeader} from './spec-view-header';

/**
 * PLACEHOLDER layout of a tools page: the shared header over one content
 * area. In the target environment, wrap the real tools layout instead and put
 * the zone in its content slot.
 */
@Component({
    selector: 'app-spec-view-tools',
    standalone: true,
    imports: [SpecBuilderZone, SpecViewHeader],
    template: `
        <app-spec-view-header [title]="store.document().title"/>
        <app-spec-builder-zone class="spec-view-tools__content" zoneId="main"/>
    `,
    styles: `
        :host {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            block-size: 100%;
        }

        .spec-view-tools__content {
            margin: 1rem;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecViewTools {
    protected readonly store = inject(SpecBuilderStore);
}
