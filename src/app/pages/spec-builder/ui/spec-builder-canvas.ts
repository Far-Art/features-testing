import {NgComponentOutlet} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    inject,
    viewChild
} from '@angular/core';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {resolveZoneId} from '../core/spec-document.utils';
import {SpecSurfaceService} from '../core/spec-surface.service';
import {SpecZoomService} from '../core/spec-zoom.service';

/** Wheel distance that zooms one step. A mouse wheel notch is about 100, a trackpad pinch much less. */
const WHEEL_STEP = 80;

/**
 * The scrolling area the page is drawn in, at the current zoom.
 *
 * The page is drawn at its real size and scaled with a transform from its
 * top-left corner. A sizer around it takes the scaled size, so the scroll
 * area is right at any zoom, and centres the page when it is smaller than the
 * area.
 *
 * The keyboard shortcuts live here and act only while the canvas or an item
 * has focus, so typing in the inspector never moves or deletes an item.
 */
@Component({
    selector: 'app-spec-builder-canvas',
    standalone: true,
    imports: [NgComponentOutlet],
    template: `
        <div
            #viewport
            class="spec-builder-canvas__viewport"
            tabindex="0"
            role="region"
            [attr.aria-label]="labels.label"
            (keydown)="onKeydown($event)"
            (wheel)="onWheel($event)"
            (pointerdown)="onPointerDown($event)"
        >
            <div class="spec-builder-canvas__sizer" [style.width.px]="scaledSize().width" [style.height.px]="scaledSize().height">
                <div
                    #artboard
                    class="spec-builder-canvas__page"
                    data-spec-page
                    [style.width.px]="page().width"
                    [style.height.px]="page().height"
                    [style.transform]="transform()"
                    [style.--spec-zoom]="zoom.zoom()"
                >
                    <ng-container *ngComponentOutlet="store.view().component"/>
                </div>
            </div>
        </div>
    `,
    styleUrl: './spec-builder-canvas.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBuilderCanvas {
    protected readonly store = inject(SpecBuilderStore);
    protected readonly zoom = inject(SpecZoomService);
    protected readonly labels = SPEC_LABELS.canvas;
    private readonly surface = inject(SpecSurfaceService);
    private readonly injector = inject(Injector);
    private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
    private readonly pageElement = viewChild.required<ElementRef<HTMLElement>>('artboard');
    /** Wheel distance gathered toward the next zoom step. */
    private wheelDistance = 0;

    protected readonly page = computed(() => this.store.page().size);
    protected readonly scaledSize = computed(() => ({
        width: Math.round(this.page().width * this.zoom.zoom()),
        height: Math.round(this.page().height * this.zoom.zoom())
    }));
    protected readonly transform = computed(() => `scale(${this.zoom.zoom()})`);

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const viewport = this.viewport().nativeElement;
            destroyRef.onDestroy(this.surface.registerCanvas(this.pageElement().nativeElement, viewport));

            // Measured once now, since a resize observer never reports in a
            // hidden tab, then again whenever the area changes size.
            this.measureRoom();
            const view = viewport.ownerDocument.defaultView;
            if (view?.ResizeObserver) {
                const observer = new view.ResizeObserver(() => this.measureRoom());
                observer.observe(viewport);
                destroyRef.onDestroy(() => observer.disconnect());
            }
        });
    }

    /** Focuses the canvas, so the keyboard shortcuts apply. */
    focus(): void {
        this.viewport().nativeElement.focus({preventScroll: true});
    }

    protected onKeydown(event: KeyboardEvent): void {
        if (isTextEntry(event.target)) {
            return;
        }

        const command = event.ctrlKey || event.metaKey;
        if (command && this.handleZoomKey(event.key)) {
            event.preventDefault();
            return;
        }

        if (this.store.mode() !== 'edit') {
            return;
        }

        if (command && this.handleCommandKey(event.key.toLowerCase(), event.shiftKey)) {
            event.preventDefault();
        } else if (!command && this.handleItemKey(event.key, event.shiftKey)) {
            event.preventDefault();
        }
    }

    /** Ctrl + wheel zooms, as in a browser; a plain wheel scrolls. */
    protected onWheel(event: WheelEvent): void {
        if (!event.ctrlKey && !event.metaKey) {
            return;
        }

        event.preventDefault();
        this.wheelDistance += event.deltaY;
        if (Math.abs(this.wheelDistance) >= WHEEL_STEP) {
            if (this.wheelDistance < 0) {
                this.zoom.zoomIn();
            } else {
                this.zoom.zoomOut();
            }
            this.wheelDistance = 0;
        }
    }

    /** A press outside every item clears the selection. */
    protected onPointerDown(event: PointerEvent): void {
        const target = event.target instanceof Element ? event.target : null;
        if (this.store.mode() !== 'preview' && !target?.closest('[data-spec-item]')) {
            this.store.select(null);
        }
    }

    private handleZoomKey(key: string): boolean {
        if (key === '=' || key === '+') {
            this.zoom.zoomIn();
        } else if (key === '-') {
            this.zoom.zoomOut();
        } else if (key === '0') {
            this.zoom.reset();
        } else {
            return false;
        }
        return true;
    }

    private handleCommandKey(key: string, shift: boolean): boolean {
        const selected = this.store.selectedItemId();
        if (key === 'z') {
            if (shift) {
                this.store.redo();
            } else {
                this.store.undo();
            }
        } else if (key === 'y') {
            this.store.redo();
        } else if (key === 'd' && selected) {
            this.store.duplicate(selected);
            this.focusSelectedItem();
        } else {
            return false;
        }
        return true;
    }

    private handleItemKey(key: string, shift: boolean): boolean {
        const item = this.store.selectedItem();
        if (key === 'Escape') {
            this.store.select(null);
            this.focus();
            return true;
        }
        if (!item) {
            return false;
        }

        if (key === 'Delete' || key === 'Backspace') {
            this.store.remove(item.id);
            this.focus();
            return true;
        }

        if (item.locked) {
            // Arrow keys would move the item; a locked item keeps its place.
            return key.startsWith('Arrow');
        }

        const step = shift ? this.store.gridSize() : 1;
        const zoneId = resolveZoneId(this.store.view(), item.zoneId);
        // Arrows move on the screen: in a right-to-left zone, left is toward the inline end.
        const inlineSign = this.surface.isRtl(zoneId) ? -1 : 1;
        const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step * inlineSign, 0],
            ArrowRight: [step * inlineSign, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step]
        };
        const move = moves[key];
        if (!move) {
            return false;
        }

        const origin = {x: item.rect.x + move[0], y: item.rect.y + move[1]};
        const placed = this.surface.fitInZone(zoneId, origin, this.surface.itemSize(item.id), 1);
        this.store.moveItem(item.id, zoneId, placed, `nudge:${item.id}`);
        return true;
    }

    /** Keeps keyboard focus on the item the keys act on, such as a fresh copy, once it is drawn. */
    private focusSelectedItem(): void {
        const id = this.store.selectedItemId();
        if (id) {
            afterNextRender(() => this.surface.focusItem(id), {injector: this.injector});
        }
    }

    private measureRoom(): void {
        const viewport = this.viewport().nativeElement;
        const style = getComputedStyle(viewport);
        this.zoom.setRoom({
            width: viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            height: viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
        });
    }
}

/** True for an element that takes typed text, where the keys belong to the text. */
function isTextEntry(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select'));
}
