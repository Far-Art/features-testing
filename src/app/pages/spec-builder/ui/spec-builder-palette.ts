import {CdkDrag, CdkDragDrop, CdkDragMove, CdkDragPreview, CdkDropList} from '@angular/cdk/drag-drop';
import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {ImsCheckbox} from '../../../components/ims-checkbox';
import {ImsIcon} from '../../../components/ims-icon';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_BUILDER_CONFIG} from '../core/spec-builder.tokens';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecBlockCategory, SpecBlockDefinition} from '../core/spec-builder.types';
import {SpecSurfaceService} from '../core/spec-surface.service';

/** Offset of each item added by click from the previous one, so a stack of them stays visible. */
const CASCADE_STEP = 16;
/** Items added by click before the cascade starts over at the corner. */
const CASCADE_LENGTH = 8;

interface PaletteSection {
    readonly category: SpecBlockCategory;
    readonly label: string;
    readonly blocks: readonly SpecBlockDefinition[];
}

/**
 * The blocks that can be added, by category.
 *
 * Each category is a CDK drop list holding its blocks as drags, with sorting
 * off: a block dropped outside the list is added where it was dropped, with
 * its corner under the pointer. A click adds it to the first zone instead,
 * which is also the way in from the keyboard.
 */
@Component({
    selector: 'app-spec-builder-palette',
    standalone: true,
    imports: [CdkDropList, CdkDrag, CdkDragPreview, ImsCheckbox, ImsIcon],
    template: `
        <h2 class="spec-builder-palette__title">{{ labels.title }}</h2>
        <p class="spec-builder-palette__hint">{{ labels.hint }}</p>
        <ims-checkbox [checked]="store.randomLabels()" (checkedChange)="store.randomLabels.set($event)">
            {{ labels.randomLabels }}
        </ims-checkbox>

        @for (section of sections(); track section.category) {
            <section class="spec-builder-palette__section">
                <h3 class="spec-builder-palette__heading">{{ section.label }}</h3>
                <div class="spec-builder-palette__list" cdkDropList cdkDropListSortingDisabled (cdkDropListDropped)="drop($event)">
                    @for (block of section.blocks; track block.type) {
                        <button
                            type="button"
                            class="spec-builder-palette__entry"
                            cdkDrag
                            [cdkDragData]="block"
                            (cdkDragMoved)="trackDropZone($event)"
                            (click)="add(block)"
                        >
                            <ims-icon class="spec-builder-palette__icon">{{ block.icon }}</ims-icon>
                            <span>{{ block.label }}</span>

                            <div *cdkDragPreview class="spec-builder-palette__preview">
                                <ims-icon class="spec-builder-palette__icon">{{ block.icon }}</ims-icon>
                                <span>{{ block.label }}</span>
                            </div>
                        </button>
                    }
                </div>
            </section>
        }
    `,
    styleUrl: './spec-builder-palette.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBuilderPalette {
    protected readonly labels = SPEC_LABELS.palette;
    private readonly config = inject(SPEC_BUILDER_CONFIG);
    protected readonly store = inject(SpecBuilderStore);
    private readonly surface = inject(SpecSurfaceService);

    /** Categories in the order the labels list them, each with its blocks; empty ones are left out. */
    protected readonly sections = computed<readonly PaletteSection[]>(() =>
        (Object.keys(this.labels.categories) as SpecBlockCategory[])
            .map((category) => ({
                category,
                label: this.labels.categories[category],
                blocks: this.config.blocks.filter((block) => block.category === category)
            }))
            .filter((section) => section.blocks.length > 0)
    );

    /** Adds a block to the first zone, a little below and inside the previous one added there. */
    protected add(block: SpecBlockDefinition): void {
        const zoneId = this.store.view().zones[0].id;
        const offset = CASCADE_STEP * (1 + ((this.store.itemsByZone().get(zoneId)?.length ?? 0) % CASCADE_LENGTH));
        const origin = this.surface.fitInZone(zoneId, {x: offset, y: offset}, block.defaultSize, this.store.snapStep());
        this.store.addItem(block.type, zoneId, origin);
    }

    protected trackDropZone(event: CdkDragMove): void {
        this.surface.dropZoneId.set(this.surface.zoneAt(event.pointerPosition));
    }

    protected drop(event: CdkDragDrop<unknown, unknown, SpecBlockDefinition>): void {
        this.surface.dropZoneId.set(null);
        const zoneId = this.surface.zoneAt(event.dropPoint);
        if (event.isPointerOverContainer || !zoneId) {
            return;
        }

        const block = event.item.data;
        const origin = this.surface.toZonePoint(zoneId, event.dropPoint);
        this.store.addItem(block.type, zoneId, this.surface.fitInZone(zoneId, origin, block.defaultSize, this.store.snapStep()));
    }
}
