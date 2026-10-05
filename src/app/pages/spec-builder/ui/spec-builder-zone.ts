import {CdkDrag, CdkDragEnd, CdkDragMove, DragRef, Point} from '@angular/cdk/drag-drop';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    OnInit,
    afterNextRender,
    computed,
    inject,
    input
} from '@angular/core';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SpecItem} from '../core/spec-builder.types';
import {SpecSurfaceService} from '../core/spec-surface.service';
import {SpecZoomService} from '../core/spec-zoom.service';
import {SpecBuilderItem} from './spec-builder-item';

/**
 * An area of a view that holds items. A view places one per zone it
 * declares:
 *
 * ```html
 * <app-spec-builder-zone zoneId="main"/>
 * ```
 *
 * The zone draws its items and moves them: each item is a CDK drag, scaled
 * to the zoom and kept inside the page. A drag that ends over another zone
 * moves the item there.
 *
 * It takes the size its layout gives it, and positions its items from its
 * inline-start top corner.
 */
@Component({
    selector: 'app-spec-builder-zone',
    standalone: true,
    imports: [CdkDrag, SpecBuilderItem],
    template: `
        @for (item of items(); track item.id) {
            <app-spec-builder-item
                cdkDrag
                cdkDragBoundary="[data-spec-page]"
                [cdkDragScale]="zoom()"
                [cdkDragConstrainPosition]="snapWhileDragging"
                [cdkDragDisabled]="!store.editing() || !!item.locked || store.typingItemId() === item.id"
                [item]="item"
                [zoneId]="zoneId()"
                (cdkDragStarted)="store.select(item.id)"
                (cdkDragMoved)="trackDropZone($event)"
                (cdkDragEnded)="endDrag(item, $event)"
            />
        }
        @if (store.editing()) {
            <span class="spec-builder-zone__label" aria-hidden="true">{{ label() }}</span>
        }
    `,
    styleUrl: './spec-builder-zone.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'spec-builder-zone',
        '[class.spec-builder-zone--editing]': 'store.editing()',
        '[class.spec-builder-zone--grid]': 'store.editing() && store.showGrid()',
        '[class.spec-builder-zone--drop-target]': 'surface.dropZoneId() === zoneId()',
        '[style.--spec-grid-size]': 'store.gridSize() + "px"'
    }
})
export class SpecBuilderZone implements OnInit {
    /** `id` of the zone in the view's definition. */
    readonly zoneId = input.required<string>();

    protected readonly store = inject(SpecBuilderStore);
    protected readonly surface = inject(SpecSurfaceService);
    protected readonly zoom = inject(SpecZoomService).zoom;
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);

    /**
     * Keeps an item on the grid while it is dragged, so snapping shows as it
     * happens rather than only on release. CDK calls it with the pointer and
     * expects the item's top-left corner back, in viewport pixels.
     */
    protected readonly snapWhileDragging = (pointer: Point, _drag: DragRef, initial: DOMRect, pickup: Point): Point => {
        const corner = {x: pointer.x - pickup.x, y: pointer.y - pickup.y};
        const step = this.store.snapStep();
        if (step <= 1) {
            return corner;
        }
        return this.surface.snapDraggedCorner(this.surface.zoneAt(pointer) ?? this.zoneId(), corner, initial.width, step);
    };

    protected readonly items = computed(() => this.store.itemsByZone().get(this.zoneId()) ?? []);
    protected readonly label = computed(() => this.store.view().zones.find((zone) => zone.id === this.zoneId())?.label ?? '');

    ngOnInit(): void {
        // In ngOnInit rather than the constructor: the zone id is an input.
        this.destroyRef.onDestroy(this.surface.registerZone(this.zoneId(), this.host));
    }

    protected trackDropZone(event: CdkDragMove): void {
        // Not event.pointerPosition: with a position constraint, CDK reports
        // the item's corner there instead of the pointer.
        const pointer = 'touches' in event.event ? event.event.touches[0] : event.event;
        if (pointer) {
            this.surface.dropZoneId.set(this.surface.zoneAt({x: pointer.clientX, y: pointer.clientY}));
        }
    }

    /**
     * Commits a move. CDK has moved the item with a transform; the item's
     * drawn rect is read into page coordinates of the zone under the pointer,
     * the transform is dropped, and the store places the item there.
     */
    protected endDrag(item: SpecItem, event: CdkDragEnd): void {
        this.surface.dropZoneId.set(null);

        const element = event.source.element.nativeElement;
        const drawn = element.getBoundingClientRect();
        event.source.reset();

        const zoneId = this.surface.zoneAt(event.dropPoint) ?? this.zoneId();
        const origin = this.surface.toZoneOrigin(zoneId, drawn);
        const size = {width: element.offsetWidth, height: element.offsetHeight};
        this.store.moveItem(item.id, zoneId, this.surface.fitInZone(zoneId, origin, size, this.store.snapStep()));

        // An item moved to another zone is drawn anew there, and the element
        // that had the focus is gone. Gives it back, for the arrow keys.
        afterNextRender(() => this.surface.focusItem(item.id), {injector: this.injector});
    }
}
