import {
    DestroyRef,
    Directive,
    ElementRef,
    Renderer2,
    afterNextRender,
    booleanAttribute,
    computed,
    effect,
    inject,
    signal,
    input
} from '@angular/core';
import {MatTooltip} from '@angular/material/tooltip';
import {
    ImsTooltipPosition,
    ImsTooltipSeverity,
    connectImsTooltip
} from '../ims-tooltip';
import {ReadonlyDirective} from '../../shared/readonly.directive';

// How long the press ring stays on. The class carries a CSS animation that
// holds the ring solid for its first quarter and fades it out over the rest,
// so this has to match that animation's duration in ims-buttons.scss — drop
// it and the fade is cut off mid-way.
const ACTION_BLINK_MS = 450;

/**
 * Reads the two forms of `ims-tooltip-when-disabled`.
 *
 * Bare — which reaches the transform as `''` — turns the behavior on and
 * nothing more. Any other text turns it on and becomes the message shown while
 * the button cannot respond. `false`, `null` and `undefined` turn it off.
 *
 * `'true'` and `'false'` are read as the booleans they spell, the way
 * `booleanAttribute` reads them everywhere else in this file. A transform
 * cannot tell a static attribute from a bound one, so those two words are the
 * only text this input will not carry as a message, however it is written.
 */
function normalizeTooltipWhenDisabled(
    value: string | boolean | null | undefined
): string | boolean {
    if (typeof value !== 'string') return booleanAttribute(value);

    const message = value.trim();
    if (message === '' || message === 'true') return true;
    if (message === 'false') return false;
    return message;
}

type ImsButtonType = 'button' | 'submit' | 'reset';
type ImsButtonActivationKey = 'Enter' | ' ';
export type ImsButtonVariation = 'default' | 'primary' | 'secondary' | 'outline' | 'danger';

@Directive({
    hostDirectives: [MatTooltip],
    host: {
        class: 'ims-button',
        '[class.ims-button--mounting]': 'justMounted()',
        '[class.ims-button--action-blink]': 'actionBlink()',
        '[class.ims-button--with-symbol]': 'normalizedIcon().length > 0',
        '[style.--ims-button-symbol-size]': 'iconSize()',
        '[class.ims-button--cta]': 'callToAction()',
        '[class.ims-readonly]': 'readonlyMode()',
        '[class.ims-button--disabled]': 'disabledInput()',
        '[class.ims-button--readonly]': 'readonlyMode()',
        '[attr.type]': 'type()',
        '[attr.aria-disabled]': 'interactionDisabled() ? "true" : null',
        '(click)': 'handleClick($event)',
        '(keydown)': 'trackActivationKey($event)',
        '(keyup)': 'releaseActivationKey($event)',
        '(blur)': 'clearActivationKey()'
    }
})
export abstract class ImsButtonBase {
    private readonly inheritedReadonly = ReadonlyDirective.injectSignal();
    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLButtonElement>>(ElementRef);
    private readonly renderer = inject(Renderer2);
    private symbolElement: HTMLElement | null = null;
    private pressedActivationKey: ImsButtonActivationKey | null = null;
    private actionBlinkResetHandle: ReturnType<typeof setTimeout> | null = null;

    /**
     * True for the first frame after the host is created. A freshly mounted
     * button can land under an already-stationary pointer (returning to a
     * route, content reflowing under the cursor) and pick up `:hover` with
     * no real mouse movement, which then animates back out a moment later.
     * Suppressing transitions for one frame keeps the initial state a snap
     * instead of a visible, unintended animation.
     */
    protected readonly justMounted = signal(true);
    protected readonly actionBlink = signal(false);

    constructor() {
        effect(() => this.syncIcon(this.normalizedIcon()));

        afterNextRender(() => {
            requestAnimationFrame(() => this.justMounted.set(false));
        });

        this.destroyRef.onDestroy(() => this.clearActionBlinkTimer());

        connectImsTooltip({
            message: this.effectiveTooltip,
            severity: this.tooltipSeverity,
            position: this.tooltipPosition,
            disabled: this.tooltipDisabled
        });
    }

    /** Native disabled state. Readonly also disables interaction through `interactionDisabled`. */
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    /** Defaults buttons to non-submit behavior; bind `type="submit"` when needed. */
    readonly type = input<ImsButtonType>('button');

    /**
     * Rendered size of a preset's pinned glyph. A bare number means px
     * (`icon-size="14"`); anything else is passed through as written, so any
     * CSS length works (`icon-size="1.25rem"`, `"1em"`, `"clamp(…)"`).
     *
     * Only reaches a glyph this class drew itself, which since the `icon`
     * input went away means an action preset and nothing else. A projected
     * `<ims-icon>` carries its own `size`, and that is the input to use there —
     * it writes `--ims-icon-size` inline and would win over this anyway.
     *
     * Unset defers to `--ims-button-symbol-size` in ims-buttons.scss, which is
     * where the house default lives and where each action preset sets its own
     * — so this is an override for the odd call site, not the place to restyle
     * a preset.
     *
     * A malformed length can't be caught here or by the compiler: CSS drops
     * the invalid value and the button falls back to that same preset size.
     */
    readonly iconSize = input<string | null, unknown>(null, {
        alias: 'icon-size',
        transform: (value): string | null => {
            if (value === null || value === undefined) return null;

            const raw = String(value).trim();
            if (raw === '') return null;

            // A unitless number is the one thing CSS can't use as a length, so
            // it's the one thing worth interpreting — px, matching ImsIcon's
            // `size`. Everything else is already a length; passing it through
            // untouched is what lets rem (the unit the presets are written in)
            // work here too.
            return /^-?\d*\.?\d+$/.test(raw) ? `${raw}px` : raw;
        }
    });

    /**
     * Marks this button as the way forward, adding a slow halo that pulses
     * outward until the button is engaged. Orthogonal to `variation`, which
     * says what kind of action this is — any variation can be the one being
     * called for, including an icon-only button.
     *
     * At most one per view. The halo works by being the only thing moving;
     * a second one turns both into noise.
     */
    readonly callToAction = input(false, {alias: 'call-to-action', transform: booleanAttribute});

    /**
     * Explanation shown on hover and on keyboard focus. Empty means none.
     *
     * Worth its place on an icon-only button, where the glyph is the whole
     * label, and on a button that is unavailable — see
     * {@link tooltipWhenDisabled} for what that second case costs.
     */
    readonly tooltip = input<string | null>(null, {alias: 'ims-tooltip'});

    /** Tone the tooltip is painted in. */
    readonly tooltipSeverity = input<ImsTooltipSeverity>(
        'info',
        {alias: 'ims-tooltip-severity'}
    );

    /** Preferred side. Unset defers to the configured application default. */
    readonly tooltipPosition = input<ImsTooltipPosition | null>(
        null,
        {alias: 'ims-tooltip-position'}
    );

    /** Suppresses the tooltip while keeping its message bound. */
    readonly tooltipDisabled = input(false, {
        alias: 'ims-tooltip-disabled',
        transform: booleanAttribute
    });

    /**
     * Keeps a disabled button focusable so its tooltip can say why the action
     * is unavailable — which is exactly when a user most wants to read it.
     *
     * A natively disabled button is not in the tab order, so its tooltip can
     * only ever be reached with a pointer: keyboard and screen-reader users
     * get nothing. Whether even the pointer works is left to the browser —
     * current Chrome dispatches `mouseenter` to a disabled control, other
     * engines have historically suppressed it.
     *
     * Nothing about the action changes: `handleClick` already swallows a
     * click while `interactionDisabled()` — before any listener or default
     * action sees it — `aria-disabled` already says the control is
     * unavailable, and the grayed-out look comes from `.ims-button--disabled`,
     * which ims-buttons.scss pairs with `:disabled` in every rule naming
     * either.
     *
     * What does change is that the button stays in the tab order. That is the
     * ARIA pattern for an unavailable control carrying an explanation, but it is
     * a real change to tab order — so it is opt-in, per button.
     *
     * Written bare it only turns the behavior on, and the button keeps saying
     * whatever `ims-tooltip` says. Give it text and that text replaces the
     * message for as long as the button cannot respond:
     *
     * ```html
     * <button
     *     ims-button
     *     ims-tooltip="Sends the policy to the insured"
     *     ims-tooltip-when-disabled="The insured has no address on file"
     *     [disabled]="!policy.hasAddress"
     * >Send</button>
     * ```
     *
     * Leaving `ims-tooltip` off entirely is the other half of that: a button
     * that says nothing until it is unavailable, and then says why.
     */
    readonly tooltipWhenDisabled = input<string | boolean, string | boolean | null | undefined>(
        false,
        {
            alias: 'ims-tooltip-when-disabled',
            transform: normalizeTooltipWhenDisabled
        }
    );

    protected readonly normalizedIcon = computed(() => this.resolveIcon().trim());

    /**
     * The symbol this button draws for itself. Empty for every button a call
     * site can spell directly; a specialized subclass overrides it to pin one.
     *
     * This is the whole of the internal icon mechanism, and it is deliberately
     * not reachable from a template. A button that wants a glyph projects an
     * `<ims-icon>`; a preset pins one here so a call site cannot drift from it.
     * Two ways to say the same thing meant a call site could say both, and the
     * projected one would then sit beside a glyph nobody asked for.
     *
     * A method rather than a field: the base's `normalizedIcon` computed is
     * built during base field initialization, before any subclass field
     * exists, but it only *calls* this at the first effect flush — by which
     * point the override is in place.
     */
    protected resolveIcon(): string {
        return '';
    }

    /** Readonly state inherited from the nearest `ims-readonly` provider. */
    readonly readonlyMode = this.inheritedReadonly;

    /** True when the host button must not run user actions. */
    readonly interactionDisabled = computed(() => this.disabledInput() || this.readonlyMode());

    /**
     * Whether {@link tooltipWhenDisabled} is on, in either of its two forms.
     */
    private readonly tooltipSurvivesDisabled = computed(
        () => this.tooltipWhenDisabled() !== false
    );

    /**
     * The native `disabled` attribute, which is not the same question as
     * {@link interactionDisabled} once a tooltip has to survive the disabling.
     */
    protected readonly nativeDisabled = computed(
        () => this.interactionDisabled() && !this.tooltipSurvivesDisabled()
    );

    /**
     * The message the tooltip actually shows.
     *
     * Keyed to {@link interactionDisabled} rather than the `disabled` input,
     * so a readonly button explains itself the same way a disabled one does —
     * from the reader's side the two are one state, "this will not respond".
     */
    private readonly effectiveTooltip = computed(() => {
        const whenDisabled = this.tooltipWhenDisabled();
        return typeof whenDisabled === 'string' && this.interactionDisabled()
            ? whenDisabled
            : this.tooltip();
    });

    protected handleClick(event: MouseEvent): void {
        if (this.interactionDisabled()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        // Pointer-generated clicks complete on release. Keyboard-generated
        // clicks have detail 0 and are handled on keyup instead.
        if (event.detail > 0) this.triggerActionBlink();
    }

    protected trackActivationKey(event: KeyboardEvent): void {
        if (event.repeat || this.interactionDisabled() || !this.isActivationKey(event.key)) return;
        this.pressedActivationKey = event.key;
    }

    protected releaseActivationKey(event: KeyboardEvent): void {
        if (event.key !== this.pressedActivationKey) return;

        this.pressedActivationKey = null;
        if (!this.interactionDisabled()) this.triggerActionBlink();
    }

    protected clearActivationKey(): void {
        this.pressedActivationKey = null;
    }

    private syncIcon(symbol: string): void {
        const host = this.host.nativeElement;

        if (!symbol) {
            if (this.symbolElement) {
                this.renderer.removeChild(host, this.symbolElement);
                this.symbolElement = null;
            }
            return;
        }

        if (!this.symbolElement) {
            this.symbolElement = this.renderer.createElement('span') as HTMLElement;
            this.renderer.addClass(this.symbolElement, 'ims-icon');
            this.renderer.addClass(this.symbolElement, 'ims-button__symbol');
            this.renderer.setAttribute(this.symbolElement, 'aria-hidden', 'true');
            this.renderer.insertBefore(host, this.symbolElement, host.firstChild);
        }

        this.renderer.setProperty(this.symbolElement, 'textContent', symbol);
    }

    private triggerActionBlink(): void {
        this.clearActionBlinkTimer();
        this.actionBlink.set(true);
        this.actionBlinkResetHandle = setTimeout(() => {
            this.actionBlink.set(false);
            this.actionBlinkResetHandle = null;
        }, ACTION_BLINK_MS);
    }

    private clearActionBlinkTimer(): void {
        if (this.actionBlinkResetHandle === null) return;
        clearTimeout(this.actionBlinkResetHandle);
        this.actionBlinkResetHandle = null;
    }

    private isActivationKey(key: string): key is ImsButtonActivationKey {
        return key === 'Enter' || key === ' ';
    }
}

@Directive({
    selector: 'button[ims-button]',
    standalone: true,
    host: {
        '[class.ims-button--default]': 'variation() === "default"',
        '[class.ims-button--dark]': 'variation() === "primary"',
        '[class.ims-button--white]': 'variation() === "secondary"',
        '[class.ims-button--outline]': 'variation() === "outline"',
        '[class.ims-button--danger]': 'variation() === "danger"',
        '[disabled]': 'nativeDisabled()'
    }
})
export class ImsButton extends ImsButtonBase {
    readonly variation = input<ImsButtonVariation>('default', {alias: 'ims-button-variation'});
}

/** Icon-only button. Give it an accessible name with `aria-label`, since there's no visible text. */
@Directive({
    selector: 'button[ims-button-icon]',
    standalone: true,
    host: {
        class: 'ims-button--default ims-button-icon',
        '[disabled]': 'nativeDisabled()'
    }
})
export class ImsButtonIcon extends ImsButtonBase {}
