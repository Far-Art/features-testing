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

@Directive({
    selector: '[imsTextTruncate]',
    standalone: true,
    host: {
        '[style.display]': 'display()',
        '[style.min-width]': '"0"',
        '[style.max-width]': 'maxWidthCss()',
        '[style.overflow]': '"hidden"',
        '[style.text-overflow]': '"ellipsis"',
        '[style.white-space]': '"nowrap"',
        '[attr.aria-describedby]': 'popoverVisible ? popoverId : null',
        '[attr.tabindex]': 'focusable() ? "0" : null',
        '(mouseenter)': 'showPopover()',
        '(focusin)': 'showPopover()',
        '(mouseleave)': 'hidePopover()',
        '(focusout)': 'hidePopover()',
        '(keydown.escape)': 'hidePopover()'
    }
})
export class ImsTextTruncateDirective implements OnDestroy {
    readonly text = input<string | null | undefined>(undefined, {alias: 'imsTextTruncate'});
    readonly display = input<string | null>('block', {alias: 'imsTruncateDisplay'});
    readonly focusable = input(false, {
        alias: 'imsTruncateFocusable',
        transform: booleanAttribute
    });
    readonly popoverDisabled = input(false, {
        alias: 'imsTruncatePopoverDisabled',
        transform: booleanAttribute
    });
    readonly maxWidth = input<string | number | null>('100%', {alias: 'imsTruncateMaxWidth'});
    readonly popoverMaxWidth = input<string | number>('min(36rem, calc(100vw - 24px))', {
        alias: 'imsTruncatePopoverMaxWidth'
    });

    readonly maxWidthCss = computed(() => toCssLength(this.maxWidth()));

    protected readonly popoverId = `ims-text-truncate-popover-${nextPopoverId++}`;
    protected popoverVisible = false;

    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private overlayRef: OverlayRef | null = null;
    private popoverRef: ComponentRef<ImsTextTruncatePopover> | null = null;

    showPopover(): void {
        if (this.popoverDisabled()) {
            return;
        }

        const hostElement = this.elementRef.nativeElement;
        if (!isOverflowing(hostElement)) {
            this.hidePopover();
            return;
        }

        const text = this.resolveText(hostElement);
        if (!text) {
            this.hidePopover();
            return;
        }

        const overlayRef = this.ensureOverlayRef(hostElement);
        if (!overlayRef.hasAttached()) {
            this.popoverRef = overlayRef.attach(new ComponentPortal(
                ImsTextTruncatePopover,
                this.viewContainerRef
            ));
        }

        const popover = this.popoverRef?.instance;
        if (popover) {
            const hostStyles = hostElement.ownerDocument.defaultView?.getComputedStyle(hostElement);
            popover.id = this.popoverId;
            popover.text = text;
            popover.maxWidth = toCssLength(this.popoverMaxWidth()) ?? '';
            popover.font = hostStyles?.font ?? 'inherit';
            popover.lineHeight = hostStyles?.lineHeight ?? 'normal';
            popover.direction = hostStyles?.direction ?? 'inherit';
            this.popoverRef?.changeDetectorRef.detectChanges();
        }

        overlayRef.updatePosition();
        this.popoverVisible = true;
    }

    hidePopover(): void {
        this.overlayRef?.detach();
        this.popoverRef = null;
        this.popoverVisible = false;
    }

    ngOnDestroy(): void {
        this.overlayRef?.dispose();
        this.overlayRef = null;
        this.popoverRef = null;
    }

    private resolveText(hostElement: HTMLElement): string {
        const inputText = this.text();
        return (inputText === undefined || inputText === null || inputText === ''
            ? hostElement.textContent
            : inputText
        )?.trim() ?? '';
    }

    private ensureOverlayRef(hostElement: HTMLElement): OverlayRef {
        if (this.overlayRef) {
            return this.overlayRef;
        }

        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(hostElement)
            .withFlexibleDimensions(false)
            .withPush(true)
            .withViewportMargin(6)
            .withPositions(getOverlayPositions());

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false
        });

        return this.overlayRef;
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
        '[style.white-space]': '"normal"',
        '[style.overflow-wrap]': '"anywhere"',
        '[style.pointer-events]': '"none"',
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
}

let nextPopoverId = 0;

function isOverflowing(element: HTMLElement): boolean {
    return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
}

function toCssLength(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return typeof value === 'number' ? `${value}px` : value;
}

function getOverlayPositions(): ConnectedPosition[] {
    return [
        {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6},
        {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6},
        {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6},
        {originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6}
    ];
}
