/**
 * Handle on one opening of an {@link ImsDropdownPanelTrigger}.
 *
 * Component content injects it, and template content receives it as the
 * template's implicit context:
 *
 * ```ts
 * private readonly panel = inject(ImsDropdownPanelRef<PolicyFilter>);
 *
 * apply(): void {
 *     this.panel.close(this.form.getRawValue());
 * }
 * ```
 *
 * A new ref is issued every time the panel opens, and each one answers only
 * while its own opening lasts. Content that keeps a ref past its close — in a
 * pending subscription, say — cannot close the panel the next time it opens.
 *
 * @typeParam R - Result the trigger's `imsDropdownPanelClosed` emits.
 */
export class ImsDropdownPanelRef<R = unknown> {
    /** @internal Created by the trigger, not by application code. */
    constructor(
        private readonly onClose: (result: R | undefined) => void,
        private readonly onReposition: () => void
    ) {}

    /**
     * Closes the panel and hands focus back to the trigger.
     *
     * @param result Value `imsDropdownPanelClosed` emits. Without one, it emits
     * `undefined`, the same as a dismissal.
     */
    close(result?: R): void {
        this.onClose(result);
    }

    /**
     * Re-runs placement against the trigger.
     *
     * The panel already follows its own size changes. Call this when something
     * the panel cannot observe moved the trigger, such as a layout change around
     * it.
     */
    updatePosition(): void {
        this.onReposition();
    }
}
