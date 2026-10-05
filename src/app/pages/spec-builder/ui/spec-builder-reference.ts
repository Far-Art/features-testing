import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../../../components/ims-button';
import {ImsIcon} from '../../../components/ims-icon';
import {ImsPanel, ImsPanelHeader, ImsPanelHeaderActions} from '../../../components/ims-panel';
import {ImsTooltip} from '../../../components/ims-tooltip';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecReferenceService} from '../core/spec-reference.service';
import {describePosition, describeSize} from '../core/spec-reference.utils';

/**
 * The inspect-mode panel: what a developer needs to build the page. Lists the
 * items by number, and shows the selected one's component, selector,
 * settings, colour tokens, note and template.
 */
@Component({
    selector: 'app-spec-builder-reference',
    standalone: true,
    imports: [ImsButton, ImsButtonIcon, ImsIcon, ImsPanel, ImsPanelHeader, ImsPanelHeaderActions, ImsTooltip],
    templateUrl: './spec-builder-reference.html',
    styleUrl: './spec-builder-reference.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'complementary',
        '[attr.aria-label]': 'labels.label'
    }
})
export class SpecBuilderReference {
    protected readonly labels = SPEC_LABELS.reference;
    protected readonly store = inject(SpecBuilderStore);
    protected readonly reference = inject(SpecReferenceService);

    protected readonly entry = computed(() => this.reference.entries().find((entry) => entry.itemId === this.store.selectedItemId()) ?? null);
    protected readonly position = computed(() => {
        const entry = this.entry();
        return entry ? describePosition(entry) : '';
    });
    protected readonly size = computed(() => {
        const entry = this.entry();
        return entry ? describeSize(entry) : '';
    });
    /** The selected item's settings, each token with its current value. */
    protected readonly settings = computed(() =>
        (this.entry()?.settings ?? []).map((setting) => ({
            ...setting,
            swatch: setting.token ? `var(${setting.token})` : null,
            resolved: setting.token ? this.reference.resolveToken(setting.token) : ''
        }))
    );
}
