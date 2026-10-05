import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SpecBuilderZone} from '../ui/spec-builder-zone';
import {SpecViewHeader} from './spec-view-header';

/**
 * PLACEHOLDER layout of a process page: the shared header over two panes side
 * by side. In the target environment, wrap the real process layout instead
 * and put one zone in each of its panes.
 */
@Component({
    selector: 'app-spec-view-process',
    standalone: true,
    imports: [SpecBuilderZone, SpecViewHeader],
    template: `
        <app-spec-view-header [title]="store.document().title"/>
        <div class="spec-view-process__panes">
            <app-spec-builder-zone class="spec-view-process__pane" zoneId="primary"/>
            <app-spec-builder-zone class="spec-view-process__pane" zoneId="secondary"/>
        </div>
    `,
    styles: `
        :host {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            block-size: 100%;
        }

        .spec-view-process__panes {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            padding: 1rem;
        }

        .spec-view-process__pane {
            border-radius: 0.75rem;
            background: var(--ims-background-panel);
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecViewProcess {
    protected readonly store = inject(SpecBuilderStore);
}
