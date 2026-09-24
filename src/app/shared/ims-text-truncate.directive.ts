import {ConnectedPosition, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {
    ChangeDetectionStrategy,
    Component,
    ComponentRef,
    booleanAttribute,
    Directive,
    ElementRef,
    OnDestroy,
    ViewContainerRef,
    computed,
    inject,
    input
} from '@angular/core';

/** Supported positions for the full-text tooltip relative to the host element. */
export type ImsTextTruncatePosition = 'center' | 'top' | 'bottom';

/** A native control: it shows a value of its own, and its box already clips. */
type NativeControlKind = 'input' | 'textarea' | 'select';

/**
 * Applies single-line CSS truncation and displays the full value in a lazy CDK
 * overlay only when the measured text overflows.
 *
 * By default the directive truncates and measures its host. Composite controls
 * can disable the host styles with `imsTextTruncateApplyStyles="false"` and
 * provide a descendant selector through `imsTextTruncateTarget`.
 *
 * A native `<input>` or `<textarea>` can be the host or the target. Its text is
 * the current `value`, and a host field keeps the box its own stylesheet gives
 * it: an input only gains `text-overflow: ellipsis`, and a textarea keeps its
 * wrapping and scrollbar, counting as truncated once its content outgrows its
 * rows. The tooltip opens below a field rather than over it, and editing closes
 * it. Only input types that display plain text are read, so a password never
 * reaches a tooltip.
 *
 * A `<select>` can be the host or the target as well. Its text is the selected
 * option, not the text of every option, and a host select keeps its own box too,
 * gaining only `text-overflow: ellipsis`. A customizable select such as
 * `select[ims-select]` is measured at the `<selectedcontent>` that shows its
 * value beside the chevron. A select the browser draws itself offers nothing to
 * measure, so there only `imsTextTruncateOverflow` reveals the tooltip. The
 * tooltip opens below the select and stays closed while its picker is open: a
 * press or a picked value closes it, and focus reveals it only when the focus
 * comes from the keyboard, because the select also takes focus back from its
 * picker after a pick by pointer.
 *
 * The tooltip is non-interactive by default and closes when the pointer leaves
 * the host. Enable `imsTextTruncateInteractive` when users must select or copy
 * the full text.
 */
@Directive({
    selector: '[imsTextTruncate]',
    standalone: true,
    host: {
        '[style.display]': 'boxStyles() ? display() : null',
        '[style.min-width]': 'boxStyles() ? "0" : null',
        '[style.max-width]': 'boxStyles() ? maxWidthCss() : null',
        '[style.overflow]': 'boxStyles() ? "hidden" : null',
        '[style.text-overflow]': 'applyStyles() && hostControl !== "textarea" ? "ellipsis" : null',
        '[style.white-space]': 'boxStyles() ? "nowrap" : null',
        '[attr.tabindex]': 'focusable() ? "0" : null',
        '(mouseenter)': 'showPopover()',
        '(focusin)': 'showPopoverOnFocus()',
        '(mousedown)': 'hidePopoverOnPress()',
        '(mouseleave)': 'hidePopover($event)',
        '(focusout)': 'hidePopoverImmediately()',
        '(keydown.escape)': 'hidePopoverImmediately()',
        '(input)': 'hidePopoverImmediately()'
    }
})
export class ImsTextTruncateDirective implements OnDestroy {
    /**
     * Full text rendered in the tooltip.
     *
     * When omitted or empty, text is read from the measured target element: the
     * `value` of an `<input>` or `<textarea>`, the selected option of a
     * `<select>`, the text content of anything else.
     */
    readonly text = input<string | null | undefined>(undefined, {alias: 'imsTextTruncate'});

    /**
     * CSS display value applied to the host when truncation styles are enabled.
     *
     * Ignored on an `<input>`, `<textarea>` or `<select>` host, which is already a
     * clipping box.
     */
    readonly display = input<string | null>('block', {alias: 'imsTruncateDisplay'});

    /** Adds `tabindex="0"` so a normally non-focusable host can reveal the tooltip by keyboard. */
    readonly focusable = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsTruncateFocusable',
        transform: booleanAttribute
    });

    /** Disables tooltip creation while preserving any configured truncation styles. */
    readonly popoverDisabled = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsTruncatePopoverDisabled',
        transform: booleanAttribute
    });

    /**
     * Maximum width applied to the truncated host. Numeric values are treated as pixels.
     *
     * Ignored on an `<input>`, `<textarea>` or `<select>` host, which its own
     * stylesheet sizes.
     */
    readonly maxWidth = input<string | number | null>('100%', {alias: 'imsTruncateMaxWidth'});

    /** Maximum tooltip width. Numeric values are treated as pixels. */
    readonly popoverMaxWidth = input<string | number>('min(36rem, calc(100vw - 24px))', {
        alias: 'imsTruncatePopoverMaxWidth'
    });

    /**
     * Tooltip placement.
     *
     * `center` overlays the host, `top` places it above, and `bottom` places it below.
     * Unset uses `center`, or `bottom` when the target is an `<input>`, `<textarea>`
     * or `<select>`, where a tooltip over the host would cover the value being
     * edited or picked.
     */
    readonly position = input<ImsTextTruncatePosition | null>(null, {
        alias: 'imsTextTruncatePosition'
    });

    /**
     * Element used for overflow measurement and inherited typography.
     *
     * Accepts a descendant CSS selector or a direct element reference. Defaults
     * to the directive host.
     */
    readonly target = input<string | HTMLElement | null>(null, {
        alias: 'imsTextTruncateTarget'
    });

    /**
     * Whether the directive applies its CSS truncation styles to the host.
     *
     * Disable this when the component already owns its truncation styles.
     */
    readonly applyStyles = input<boolean, boolean | string | null | undefined>(true, {
        alias: 'imsTextTruncateApplyStyles',
        transform: booleanAttribute
    });

    /** Whether focus entering the host may display the tooltip. */
    readonly showOnFocus = input<boolean, boolean | string | null | undefined>(true, {
        alias: 'imsTextTruncateShowOnFocus',
        transform: booleanAttribute
    });

    /**
     * Explicit overflow state supplied by a component.
     *
     * Use this when content is semantically abbreviated, such as a `+N` selected
     * values badge, even if the measured DOM node does not currently overflow.
     */
    readonly overflow = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsTextTruncateOverflow',
        transform: booleanAttribute
    });

    /**
     * Enables pointer interaction and text selection inside the tooltip.
     *
     * Interactive tooltips remain open while the pointer is over the host, the
     * tooltip, or the gap between them. The default non-interactive mode closes
     * on host leave.
     */
    readonly interactive = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsTextTruncateInteractive',
        transform: booleanAttribute
    });

    readonly maxWidthCss = computed(() => toCssLength(this.maxWidth()));

    /**
     * Whether the host takes the box styles text needs before it can clip.
     *
     * A native control never does: it clips on its own, `min-width: 0` would undo
     * the floor `.ims-input` sets, `display: block` would break a customizable
     * select's row of value and chevron apart, and `nowrap` or `overflow: hidden`
     * would take a textarea's wrapping and scrollbar away.
     */
    protected readonly boxStyles = computed(() => this.applyStyles() && !this.hostControl);

    private readonly popoverId = `ims-text-truncate-popover-${nextPopoverId++}`;
    private popoverVisible = false;

    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    protected readonly hostControl = getNativeControlKind(this.elementRef.nativeElement);
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private overlayRef: OverlayRef | null = null;
    private overlayPosition: ImsTextTruncatePosition | null = null;
    private popoverRef: ComponentRef<ImsTextTruncatePopover> | null = null;
    private documentMouseMoveListener: ((event: MouseEvent) => void) | null = null;

    showPopover(): void {
        if (this.popoverDisabled()) {
            return;
        }

        const hostElement = this.elementRef.nativeElement;
        const targetElement = this.resolveTargetElement(hostElement);
        // A select's picker opens where the tooltip does, and draws over it.
        if (!targetElement || isPickerOpen(targetElement)) {
            this.hidePopoverImmediately();
            return;
        }

        const textElement = getTextElement(targetElement);
        if (!this.overflow() && !isOverflowing(textElement)) {
            this.hidePopoverImmediately();
            return;
        }

        const text = this.resolveText(textElement);
        if (!text) {
            this.hidePopoverImmediately();
            return;
        }

        const targetControl = getNativeControlKind(targetElement);
        const overlayRef = this.ensureOverlayRef(
            hostElement,
            this.position() ?? (targetControl ? 'bottom' : 'center')
        );
        if (!overlayRef.hasAttached()) {
            this.popoverRef = overlayRef.attach(new ComponentPortal(
                ImsTextTruncatePopover,
                this.viewContainerRef
            ));
        }

        const popover = this.popoverRef?.instance;
        if (popover) {
            const hostStyles = targetElement.ownerDocument.defaultView?.getComputedStyle(targetElement);
            popover.id = this.popoverId;
            popover.text = text;
            popover.maxWidth = toCssLength(this.popoverMaxWidth()) ?? '';
            popover.font = hostStyles?.font ?? 'inherit';
            popover.lineHeight = hostStyles?.lineHeight ?? 'normal';
            popover.direction = hostStyles?.direction ?? 'inherit';
            // A typed value is text as typed: its runs of spaces and a textarea's line breaks are content.
            popover.whiteSpace = targetControl === 'input' || targetControl === 'textarea' ? 'pre-wrap' : 'normal';
            popover.interactive = this.interactive();
            this.popoverRef?.changeDetectorRef.detectChanges();
        }

        this.applyOverlayInteractivity(overlayRef);
        overlayRef.updatePosition();
        this.popoverVisible = true;
        this.connectDescription();
        if (this.interactive()) {
            this.listenForDocumentMouseMove();
        } else {
            this.stopListeningForDocumentMouseMove();
        }
    }

    showPopoverOnFocus(): void {
        if (!this.showOnFocus()) {
            return;
        }

        // A select takes focus back from its picker after a pick by pointer, and
        // its options hold focus while the picker is open. Only focus from the
        // keyboard, which the select then shows as visible, reveals the tooltip.
        const targetElement = this.resolveTargetElement(this.elementRef.nativeElement);
        if (targetElement instanceof HTMLSelectElement && !matchesSelector(targetElement, ':focus-visible')) {
            return;
        }

        this.showPopover();
    }

    /** A press on a select opens its picker where the tooltip is. */
    hidePopoverOnPress(): void {
        if (this.popoverVisible
            && this.resolveTargetElement(this.elementRef.nativeElement) instanceof HTMLSelectElement) {
            this.hidePopoverImmediately();
        }
    }

    hidePopover(event?: MouseEvent): void {
        if (this.interactive() && event && this.isPointerInsideVisibleRegion(event)) {
            return;
        }

        this.hidePopoverImmediately();
    }

    hidePopoverImmediately(): void {
        this.overlayRef?.detach();
        this.popoverRef = null;
        this.stopListeningForDocumentMouseMove();
        this.disconnectDescription();
        this.popoverVisible = false;
    }

    ngOnDestroy(): void {
        this.stopListeningForDocumentMouseMove();
        this.disconnectDescription();
        this.overlayRef?.dispose();
        this.overlayRef = null;
        this.overlayPosition = null;
        this.popoverRef = null;
    }

    private resolveText(textElement: HTMLElement): string {
        const inputText = this.text();
        return (inputText === undefined || inputText === null || inputText === ''
            ? readDisplayedText(textElement)
            : inputText
        ).trim();
    }

    private resolveTargetElement(hostElement: HTMLElement): HTMLElement | null {
        const target = this.target();
        if (target instanceof HTMLElement) {
            return target;
        }

        if (typeof target === 'string' && target) {
            return hostElement.querySelector<HTMLElement>(target);
        }

        return hostElement;
    }

    private ensureOverlayRef(hostElement: HTMLElement, position: ImsTextTruncatePosition): OverlayRef {
        if (this.overlayRef) {
            if (this.overlayPosition !== position) {
                this.overlayPosition = position;
                this.overlayRef.updatePositionStrategy(this.createPositionStrategy(hostElement, position));
            }

            return this.overlayRef;
        }

        const positionStrategy = this.createPositionStrategy(hostElement, position);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });
        this.overlayRef.hostElement.style.pointerEvents = 'none';
        this.overlayPosition = position;

        return this.overlayRef;
    }

    private applyOverlayInteractivity(overlayRef: OverlayRef): void {
        overlayRef.overlayElement.style.pointerEvents = this.interactive() ? 'auto' : 'none';
    }

    private createPositionStrategy(hostElement: HTMLElement, position: ImsTextTruncatePosition) {
        return this.overlay
            .position()
            .flexibleConnectedTo(hostElement)
            .withFlexibleDimensions(false)
            .withPush(true)
            .withViewportMargin(6)
            .withPositions(getOverlayPositions(position));
    }

    /**
     * Adds the open tooltip to the host's `aria-describedby`.
     *
     * The ID is added and removed on its own rather than bound, because a binding
     * owns the whole attribute and would erase references the host already
     * carries, such as a hint or an error popover. A native control is not
     * described at all: its value is already announced, a select's as its
     * selected option, and a tooltip repeating it would be read twice.
     */
    private connectDescription(): void {
        if (!this.hostControl) {
            addIdReference(this.elementRef.nativeElement, 'aria-describedby', this.popoverId);
        }
    }

    /** Removes only this tooltip's ID from the host's `aria-describedby`. */
    private disconnectDescription(): void {
        if (this.popoverVisible && !this.hostControl) {
            removeIdReference(this.elementRef.nativeElement, 'aria-describedby', this.popoverId);
        }
    }

    private listenForDocumentMouseMove(): void {
        if (this.documentMouseMoveListener) {
            return;
        }

        const document = this.elementRef.nativeElement.ownerDocument;
        const listener = (event: MouseEvent) => {
            if (!this.isPointerInsideVisibleRegion(event)) {
                this.hidePopoverImmediately();
            }
        };

        document.addEventListener('mousemove', listener, {passive: true});
        this.documentMouseMoveListener = listener;
    }

    private stopListeningForDocumentMouseMove(): void {
        if (!this.documentMouseMoveListener) {
            return;
        }

        this.elementRef.nativeElement.ownerDocument.removeEventListener(
            'mousemove',
            this.documentMouseMoveListener
        );
        this.documentMouseMoveListener = null;
    }

    private isPointerInsideVisibleRegion(event: MouseEvent): boolean {
        const hostRect = this.elementRef.nativeElement.getBoundingClientRect();
        const overlayRect = this.overlayRef?.overlayElement.getBoundingClientRect();

        return isPointInsideRect(event, hostRect)
            || isPointInsideRect(event, overlayRect)
            || isPointInsideRect(event, overlayRect && getGapRect(hostRect, overlayRect));
    }
}

@Component({
    selector: 'ims-text-truncate-popover',
    standalone: true,
    template: '{{ text }}',
    host: {
        class: 'ims-text-truncate-popover',
        role: 'tooltip',
        '[id]': 'id',
        '[style.box-sizing]': '"border-box"',
        '[style.padding]': '"0.375rem 0.5rem"',
        '[style.border-radius]': '"4px"',
        '[style.background]': '"#1f2937"',
        '[style.color]': '"#ffffff"',
        '[style.box-shadow]': '"0 8px 24px rgba(15, 23, 42, 0.18)"',
        '[style.white-space]': 'whiteSpace',
        '[style.overflow-wrap]': '"anywhere"',
        // A textarea's value can be taller than the viewport; the tooltip scrolls instead of leaving it.
        '[style.max-height]': '"calc(100vh - 12px)"',
        '[style.overflow-y]': '"auto"',
        '[style.pointer-events]': 'interactive ? "auto" : "none"',
        '[style.user-select]': 'interactive ? "text" : "none"',
        '[style.cursor]': 'interactive ? "text" : null',
        '[style.max-width]': 'maxWidth',
        '[style.font]': 'font',
        '[style.line-height]': 'lineHeight',
        '[style.direction]': 'direction'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
class ImsTextTruncatePopover {
    id = '';
    text = '';
    maxWidth = '';
    font = 'inherit';
    lineHeight = 'normal';
    direction = 'inherit';
    whiteSpace = 'normal';
    interactive = false;
}

let nextPopoverId = 0;

/** Input types that display their value as plain text. */
const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set(['text', 'search', 'email', 'url', 'tel']);

function getNativeControlKind(element: HTMLElement): NativeControlKind | null {
    if (element instanceof HTMLInputElement) {
        return 'input';
    }

    if (element instanceof HTMLTextAreaElement) {
        return 'textarea';
    }

    return element instanceof HTMLSelectElement ? 'select' : null;
}

/**
 * Text an element currently shows.
 *
 * A control shows its `value`: `textContent` is empty on an input and only the
 * initial value on a textarea. An input whose type does not display plain text,
 * a password above all, yields nothing. A select shows its selected option,
 * while its `textContent` runs every option together.
 */
function readDisplayedText(element: HTMLElement): string {
    if (element instanceof HTMLTextAreaElement) {
        return element.value;
    }

    if (element instanceof HTMLInputElement) {
        return TEXT_INPUT_TYPES.has(element.type) ? element.value : '';
    }

    if (element instanceof HTMLSelectElement) {
        return element.selectedOptions[0]?.label ?? '';
    }

    return element.textContent ?? '';
}

/**
 * The element whose box holds the text a target shows.
 *
 * A customizable select (`appearance: base-select`) renders its value in the
 * `<selectedcontent>` inside its button, which ImsSelectDirective adds, and that
 * element is the one that clips: the select's own box never overflows. Any
 * other select draws its value where the page cannot measure it, and its
 * `<selectedcontent>`, if it has one, gets no box.
 */
function getTextElement(target: HTMLElement): HTMLElement {
    if (target instanceof HTMLSelectElement) {
        const selectedContent = target.querySelector<HTMLElement>('selectedcontent');
        if (selectedContent && selectedContent.getClientRects().length > 0) {
            return selectedContent;
        }
    }

    return target;
}

/** Whether the element is a select with its picker open. */
function isPickerOpen(element: HTMLElement): boolean {
    return element instanceof HTMLSelectElement && matchesSelector(element, ':open');
}

/** `element.matches()` for a selector the browser may not support, which then matches nothing. */
function matchesSelector(element: Element, selector: string): boolean {
    try {
        return element.matches(selector);
    } catch {
        return false;
    }
}

function isOverflowing(element: HTMLElement): boolean {
    return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
}

function toCssLength(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return typeof value === 'number' ? `${value}px` : value;
}

function isPointInsideRect(event: MouseEvent, rect: DOMRect | undefined): boolean {
    if (!rect) {
        return false;
    }

    return event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
}

/**
 * The strip between a host and a tooltip placed above or below it.
 *
 * The pointer crosses it on the way to an interactive tooltip, so it belongs to
 * the region that keeps the tooltip open.
 */
function getGapRect(hostRect: DOMRect, overlayRect: DOMRect): DOMRect | undefined {
    const left = Math.max(hostRect.left, overlayRect.left);
    const right = Math.min(hostRect.right, overlayRect.right);
    if (right <= left) {
        return undefined;
    }

    if (overlayRect.top >= hostRect.bottom) {
        return new DOMRect(left, hostRect.bottom, right - left, overlayRect.top - hostRect.bottom);
    }

    if (overlayRect.bottom <= hostRect.top) {
        return new DOMRect(left, overlayRect.bottom, right - left, hostRect.top - overlayRect.bottom);
    }

    return undefined;
}

/** Adds one ID to an ARIA reference list, keeping the IDs already there. */
function addIdReference(element: HTMLElement, attribute: string, id: string): void {
    const ids = new Set((element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean));
    ids.add(id);
    element.setAttribute(attribute, [...ids].join(' '));
}

/** Removes one owned ID while preserving every other ARIA reference. */
function removeIdReference(element: HTMLElement, attribute: string, id: string): void {
    const ids = (element.getAttribute(attribute) ?? '')
        .split(/\s+/)
        .filter((value) => value && value !== id);
    if (ids.length > 0) {
        element.setAttribute(attribute, ids.join(' '));
    } else {
        element.removeAttribute(attribute);
    }
}

function getOverlayPositions(position: ImsTextTruncatePosition): ConnectedPosition[] {
    const centeredPosition: ConnectedPosition = {
        originX: 'center',
        originY: 'center',
        overlayX: 'center',
        overlayY: 'center'
    };
    const topPosition: ConnectedPosition = {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
        offsetY: -6
    };
    const bottomPosition: ConnectedPosition = {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
        offsetY: 6
    };

    if (position === 'top') {
        return [topPosition, centeredPosition, bottomPosition];
    }

    if (position === 'bottom') {
        return [bottomPosition, centeredPosition, topPosition];
    }

    return [centeredPosition, topPosition, bottomPosition];
}
