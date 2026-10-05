import {CdkDragHandle} from '@angular/cdk/drag-drop';
import {NgComponentOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input} from '@angular/core';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecItem, SpecPropValue} from '../core/spec-builder.types';
import {resizeModeOf, resolveProps} from '../core/spec-document.utils';
import {SpecResizeEdge, resizeToPoint} from '../core/spec-geometry.utils';
import {SpecSurfaceService} from '../core/spec-surface.service';
import {ImsIcon} from '../../../components/ims-icon';
import {SpecPointerDrag} from './spec-pointer-drag.directive';

/**
 * The frame around one item on the page: places it, draws its component, and
 * carries everything the editor adds on top.
 *
 * While editing, the component is `inert`, so a click selects the item
 * instead of opening a list; a transparent layer above it is the drag handle
 * and the keyboard focus. In preview the component is live and the layer is
 * gone. A block with a `typedProperty` can also be typed in while editing:
 * a double-click or Enter makes its component live until the focus leaves
 * it or Escape is pressed, and what is typed is stored in that property.
 * Typing goes through the field's own directives, such as a pattern guard.
 *
 * A side the block can resize takes the item's stored size. A side it cannot
 * is `max-content`, so the component keeps its own size wherever the item
 * stands, even at the zone's edge.
 */
@Component({
    selector: 'app-spec-builder-item',
    standalone: true,
    imports: [NgComponentOutlet, CdkDragHandle, ImsIcon, SpecPointerDrag],
    template: `
        <div class="spec-builder-item__content" [attr.inert]="store.mode() === 'preview' || typing() ? null : ''">
            @if (block(); as definition) {
                <ng-container *ngComponentOutlet="definition.component; inputs: props()"/>
            } @else {
                <div class="spec-builder-item__missing">{{ name() }}</div>
            }
        </div>

        @if (store.mode() !== 'preview' && !typing()) {
            <div
                class="spec-builder-item__grab"
                cdkDragHandle
                tabindex="0"
                role="button"
                [attr.aria-label]="name()"
                [attr.aria-pressed]="selected()"
                [attr.title]="canType() ? typeHint : null"
                (pointerdown)="select()"
                (focus)="select()"
                (dblclick)="startTyping()"
                (keydown.enter)="startTyping()"
            ></div>
        }

        @if (selected() && store.editing() && !item().locked) {
            @for (edge of resizeEdges(); track edge) {
                <div
                    class="spec-builder-item__handle"
                    aria-hidden="true"
                    appSpecPointerDrag
                    [class.spec-builder-item__handle--inline-end]="edge === 'inline-end'"
                    [class.spec-builder-item__handle--block-end]="edge === 'block-end'"
                    [class.spec-builder-item__handle--corner]="edge === 'corner'"
                    (dragStarted)="startResize()"
                    (dragMoved)="resize(edge, $event)"
                ></div>
            }
        }

        @if (item().locked && store.editing()) {
            <span class="spec-builder-item__lock" [attr.title]="lockedLabel">
                <ims-icon>lock</ims-icon>
            </span>
        }

        @if (store.badgesVisible() && number()) {
            <span class="spec-builder-item__badge" aria-hidden="true">{{ number() }}</span>
        }
    `,
    styleUrl: './spec-builder-item.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'spec-builder-item',
        '[class.spec-builder-item--editing]': 'store.editing()',
        '[class.spec-builder-item--inspecting]': 'store.mode() === "inspect"',
        '[class.spec-builder-item--selected]': 'selected() && !store.capturing()',
        '[class.spec-builder-item--locked]': '!!item().locked',
        '[class.spec-builder-item--typing]': 'typing()',
        '(input)': 'storeTyped($event)',
        '(focusout)': 'stopTypingOnLeave($event)',
        '(keydown.escape)': 'stopTyping()',
        '[attr.data-spec-item]': 'item().id',
        '[style.inset-inline-start.px]': 'item().rect.x',
        '[style.inset-block-start.px]': 'item().rect.y',
        '[style.inline-size]': 'inlineSize()',
        '[style.block-size]': 'blockSize()'
    }
})
export class SpecBuilderItem {
    readonly item = input.required<SpecItem>();
    /** The zone the item is drawn in, which differs from its own after a view switch. See `resolveZoneId`. */
    readonly zoneId = input.required<string>();

    protected readonly store = inject(SpecBuilderStore);
    protected readonly lockedLabel = SPEC_LABELS.canvas.locked;
    protected readonly typeHint = SPEC_LABELS.canvas.typeHint;
    private readonly surface = inject(SpecSurfaceService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    /** Counts resize drags, so each one is undone on its own. */
    private resizeCount = 0;

    protected readonly block = computed(() => this.store.blockFor(this.item().blockType));
    protected readonly props = computed<Record<string, SpecPropValue>>(() => {
        const block = this.block();
        return block ? resolveProps(this.item().props, block) : {};
    });
    protected readonly selected = computed(() => this.store.selectedItemId() === this.item().id);
    protected readonly canType = computed(() => this.store.editing() && !!this.block()?.typedProperty);
    protected readonly typing = computed(() => this.store.typingItemId() === this.item().id);
    protected readonly number = computed(() => this.store.numbers().get(this.item().id) ?? 0);
    protected readonly name = computed(() => {
        const block = this.block();
        return block ? SPEC_LABELS.canvas.item(block.label, this.number()) : SPEC_LABELS.canvas.missingBlock(this.item().blockType);
    });
    private readonly resizeMode = computed(() => resizeModeOf(this.block(), this.props()));
    protected readonly resizeEdges = computed<readonly SpecResizeEdge[]>(() => {
        switch (this.resizeMode()) {
            case 'both':
                return ['inline-end', 'block-end', 'corner'];
            case 'width':
                return ['inline-end'];
            case 'none':
                return [];
        }
    });
    protected readonly inlineSize = computed(() => this.resizeMode() === 'none' ? 'max-content' : `${this.item().rect.width}px`);
    protected readonly blockSize = computed(() => this.resizeMode() === 'both' ? `${this.item().rect.height}px` : null);

    protected select(): void {
        this.store.select(this.item().id);
    }

    /** Makes the component live and puts the focus in its field. */
    protected startTyping(): void {
        if (!this.canType()) {
            return;
        }

        this.store.typeInto(this.item().id);
        afterNextRender(() => {
            const field = this.host.nativeElement.querySelector<HTMLInputElement | HTMLTextAreaElement>('.spec-builder-item__content :is(input, textarea)');
            field?.focus();
            field?.select();
        }, {injector: this.injector});
    }

    /** Stores what is typed into the field, as the field holds it while focused: raw, before any display format. */
    protected storeTyped(event: Event): void {
        const property = this.block()?.typedProperty;
        const field = event.target;
        if (this.typing() && property && (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
            this.store.updateProp(this.item().id, property, field.value);
        }
    }

    /**
     * Stops typing when the focus leaves the component for somewhere outside
     * the item. Only a focus leaving the component counts: starting to type
     * removes the focused drag layer, and that loss of focus must not stop it.
     */
    protected stopTypingOnLeave(event: FocusEvent): void {
        const left = event.target;
        const next = event.relatedTarget;
        const fromComponent = left instanceof Element && left.closest('.spec-builder-item__content') !== null;
        if (this.typing() && fromComponent && !(next instanceof Node && this.host.nativeElement.contains(next))) {
            this.store.typeInto(null);
        }
    }

    /** Stops typing and gives the focus back to the item, so the keyboard keeps working on it. */
    protected stopTyping(): void {
        if (!this.typing()) {
            return;
        }

        this.store.typeInto(null);
        afterNextRender(() => this.surface.focusItem(this.item().id), {injector: this.injector});
    }

    protected startResize(): void {
        this.resizeCount++;
    }

    /** Moves the dragged edge to the pointer. Every step is committed, so the inspector follows live. */
    protected resize(edge: SpecResizeEdge, event: PointerEvent): void {
        const item = this.item();
        const zoneId = this.zoneId();
        const point = this.surface.toZonePoint(zoneId, {x: event.clientX, y: event.clientY});
        const rect = resizeToPoint(item.rect, edge, point, this.surface.zoneSize(zoneId), this.store.snapStep());
        this.store.updateRect(item.id, rect, `resize:${item.id}:${this.resizeCount}`);
    }
}
