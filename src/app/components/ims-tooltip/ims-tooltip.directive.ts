import {Directive, booleanAttribute, computed, effect, inject, input} from '@angular/core';
import {ImsOverlayTrigger, addIdReference, removeIdReference} from './ims-overlay-trigger';
import {ImsTooltipService} from './ims-tooltip.service';
import {ImsTooltipPosition, ImsTooltipSeverity} from './ims-tooltip.types';

/**
 * Hover and focus tooltip, painted in one of the four house severities.
 *
 * Text only, and deliberately so: it never takes the pointer, it is announced as
 * the host's description, and it leaves when the pointer does. Anything the user
 * has to reach into is a different widget — see `ImsPopover`, which shares this
 * one's core but almost none of its behavior.
 *
 * ```html
 * <span imsTooltip="Rounded to the nearest agora">…</span>
 * <span imsTooltip="Past its renewal date" imsTooltipSeverity="danger">…</span>
 * ```
 *
 * On a button, the tone can come from the button itself. Every `ims-button`
 * flavor contributes its severity as a default, and the `delete` preset
 * contributes `danger` outright, so the common case says it once:
 *
 * ```html
 * <button ims-button-icon ims-button-icon-preset="delete" imsTooltip="Locked policies cannot be deleted"></button>
 * ```
 *
 * The button owns no overlay of its own — it only provides
 * `IMS_TOOLTIP_DEFAULTS`. That is what lets a template put this directive on a
 * button freely: there is exactly one tooltip engine on the element, the one the
 * template asked for.
 *
 * An empty or whitespace-only message is inert, so a bound message that has not
 * arrived yet costs nothing.
 */
@Directive({
    selector: '[imsTooltip]',
    standalone: true
})
export class ImsTooltip extends ImsOverlayTrigger {
    private readonly tooltips = inject(ImsTooltipService);

    /** Text shown in the tooltip. Empty or whitespace-only means no tooltip. */
    readonly message = input<string | null>(null, {alias: 'imsTooltip'});

    /**
     * Tone the tooltip is painted in.
     *
     * Unset defers to the host's own default — a delete button's `danger`, say —
     * and then to `IMS_TOOLTIP_CONFIG`. Setting it here is the override for the
     * call site whose tone does not follow from what it sits on.
     */
    readonly severity = input<ImsTooltipSeverity | null>(null, {alias: 'imsTooltipSeverity'});

    /** Preferred side of the host. Unset defers to the host default, then the configuration. */
    readonly position = input<ImsTooltipPosition | null>(null, {alias: 'imsTooltipPosition'});

    /** Suppresses the tooltip while keeping its message bound. */
    readonly disabled = input<boolean, boolean | string | null | undefined>(false, {
        alias: 'imsTooltipDisabled',
        transform: booleanAttribute
    });

    private readonly text = computed(() => this.message()?.trim() ?? '');

    constructor() {
        super();

        // Keeps an open tooltip honest. A message that changes, a severity that
        // follows a button's own, or a `disabled` that flips while the pointer
        // is still resting on the host all have to reach the panel — it is
        // shared, so nothing else would push them there.
        //
        // `allowSignalWrites` because showing the panel sets its signals.
        // Angular 18, which this ships to, requires the flag; later versions
        // allow the write and ignore it.
        effect(
            () => {
                const open = this.canOpen();
                // Read unconditionally so the effect re-runs on either change
                // even while the tooltip is closed.
                const severity = this.resolveSeverity(this.severity());
                const position = this.resolvePosition(this.position());

                if (!this.tooltips.isShowing(this)) return;

                if (!open) {
                    this.closeNow();
                    return;
                }

                this.showPanel(severity, position);
            },
            {allowSignalWrites: true}
        );
    }

    protected canOpen(): boolean {
        return !this.disabled() && this.text().length > 0;
    }

    protected openSurface(): void {
        this.showPanel(this.resolveSeverity(this.severity()), this.resolvePosition(this.position()));
        addIdReference(this.hostElement, 'aria-describedby', this.surfaceId);
    }

    protected closeSurface(): void {
        removeIdReference(this.hostElement, 'aria-describedby', this.surfaceId);
        this.tooltips.hide(this);
    }

    private showPanel(severity: ImsTooltipSeverity, position: ImsTooltipPosition): void {
        this.tooltips.show(this, this.hostElement, {
            id: this.surfaceId,
            message: this.text(),
            severity,
            positions: this.connectedPositions(position),
            direction: this.directionality.value,
            viewportMargin: this.viewportMargin
        });
    }
}
