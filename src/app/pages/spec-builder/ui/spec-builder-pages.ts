import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ImsButtonIcon} from '../../../components/ims-button';
import {ImsIcon} from '../../../components/ims-icon';
import {ImsTooltip} from '../../../components/ims-tooltip';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_LABELS} from '../core/spec-builder.labels';

/**
 * The pages of the spec as tabs above the canvas, such as one per business
 * case. A tab shows its page; the buttons add an empty page or a copy of the
 * page on screen. The page's name, layout and size are set in the inspector.
 */
@Component({
    selector: 'app-spec-builder-pages',
    standalone: true,
    imports: [ImsButtonIcon, ImsIcon, ImsTooltip],
    template: `
        <div class="spec-builder-pages__tabs" role="group" [attr.aria-label]="labels.label">
            @for (page of store.pages(); track page.id; let index = $index) {
                <button
                    type="button"
                    class="spec-builder-pages__tab"
                    [attr.aria-pressed]="page === store.page()"
                    [attr.title]="labels.itemCount(page.items.length)"
                    (click)="store.showPage(page.id)"
                >
                    <span class="spec-builder-pages__number">{{ index + 1 }}</span>
                    <span class="spec-builder-pages__name">{{ page.name || untitled(index) }}</span>
                </button>
            }
        </div>
        <button
            ims-button-icon
            [attr.aria-label]="labels.add"
            [imsTooltip]="labels.add"
            (click)="store.addPage()"
        >
            <ims-icon>add</ims-icon>
        </button>
        <button
            ims-button-icon
            [attr.aria-label]="labels.duplicate"
            [imsTooltip]="labels.duplicate"
            (click)="store.duplicatePage()"
        >
            <ims-icon>content_copy</ims-icon>
        </button>
    `,
    styleUrl: './spec-builder-pages.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBuilderPages {
    protected readonly labels = SPEC_LABELS.pages;
    protected readonly store = inject(SpecBuilderStore);

    /** The name a page without one is shown under. */
    protected untitled(index: number): string {
        return SPEC_LABELS.pageName(index + 1);
    }
}
