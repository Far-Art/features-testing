import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {ImsIcon} from '../../../components/ims-icon';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecBlockDefinition, SpecItem, SpecReferenceEntry} from '../core/spec-builder.types';
import {resolveProps} from '../core/spec-document.utils';
import {SpecReferenceService} from '../core/spec-reference.service';
import {SpecSurfaceService} from '../core/spec-surface.service';

/** Properties whose text names an item best in a list, in the order they are tried. */
const CAPTION_PROPERTIES = ['label', 'title', 'text', 'name'];

interface ElementRow {
    readonly entry: SpecReferenceEntry;
    readonly icon: string;
    /** What the item says, such as a field's label, so two items of one block can be told apart. */
    readonly caption: string;
    readonly locked: boolean;
}

interface ElementGroup {
    readonly zoneLabel: string;
    readonly rows: readonly ElementRow[];
}

/**
 * Every item on the page as a list, zone by zone in reading order, with the
 * numbers the badges show. Picking a row selects the item and scrolls it into
 * view. The list keeps the focus, so Tab and Enter walk it from the keyboard.
 */
@Component({
    selector: 'app-spec-builder-elements',
    standalone: true,
    imports: [ImsIcon],
    template: `
        @for (group of groups(); track group.zoneLabel) {
            <section class="spec-builder-elements__group">
                @if (showZones()) {
                    <h3 class="spec-builder-elements__zone">{{ group.zoneLabel }}</h3>
                }
                <ul class="spec-builder-elements__list">
                    @for (row of group.rows; track row.entry.itemId) {
                        <li>
                            <button
                                type="button"
                                class="spec-builder-elements__row"
                                [attr.aria-pressed]="row.entry.itemId === store.selectedItemId()"
                                (click)="reveal(row.entry.itemId)"
                            >
                                <span class="spec-builder-elements__number">{{ row.entry.number }}</span>
                                <ims-icon class="spec-builder-elements__icon">{{ row.icon }}</ims-icon>
                                <span class="spec-builder-elements__text">
                                    <span class="spec-builder-elements__block">{{ row.entry.blockLabel }}</span>
                                    @if (row.caption) {
                                        <span class="spec-builder-elements__caption">{{ row.caption }}</span>
                                    }
                                </span>
                                @if (row.locked) {
                                    <ims-icon class="spec-builder-elements__lock" [label]="labels.locked">lock</ims-icon>
                                }
                            </button>
                        </li>
                    }
                </ul>
            </section>
        } @empty {
            <p class="spec-builder-elements__empty">{{ labels.empty }}</p>
        }
    `,
    styleUrl: './spec-builder-elements.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBuilderElements {
    protected readonly labels = SPEC_LABELS.elements;
    protected readonly store = inject(SpecBuilderStore);
    private readonly reference = inject(SpecReferenceService);
    private readonly surface = inject(SpecSurfaceService);

    /** Zone headings only help when the view has more than one zone. */
    protected readonly showZones = computed(() => this.store.view().zones.length > 1);
    protected readonly groups = computed<readonly ElementGroup[]>(() => {
        const items = new Map(this.store.page().items.map((item) => [item.id, item]));
        const groups: {zoneLabel: string; rows: ElementRow[]}[] = [];
        for (const entry of this.reference.entries()) {
            const item = items.get(entry.itemId);
            const block = item ? this.store.blockFor(item.blockType) : undefined;
            const row: ElementRow = {
                entry,
                icon: block?.icon ?? 'help',
                caption: item && block ? captionOf(item, block) : '',
                locked: !!item?.locked
            };
            const last = groups[groups.length - 1];
            if (last?.zoneLabel === entry.zoneLabel) {
                last.rows.push(row);
            } else {
                groups.push({zoneLabel: entry.zoneLabel, rows: [row]});
            }
        }
        return groups;
    });

    /** Selects an item and scrolls the canvas so it is in view. */
    protected reveal(itemId: string): void {
        this.store.select(itemId);
        this.surface.itemElement(itemId)?.scrollIntoView({block: 'nearest', inline: 'nearest'});
    }
}

/** The first caption property with text, with the block's defaults filled in. */
function captionOf(item: SpecItem, block: SpecBlockDefinition): string {
    const props = resolveProps(item.props, block);
    for (const name of CAPTION_PROPERTIES) {
        const value = props[name];
        if (typeof value === 'string' && value.trim()) {
            return value.trim().split('\n')[0];
        }
    }
    return '';
}
