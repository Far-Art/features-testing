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
import {ReadonlyDirective} from '../../shared/readonly.directive';

// How long the press ring stays on. The class carries a CSS animation that
// holds the ring solid for its first quarter and fades it out over the rest,
// so this has to match that animation's duration in ims-buttons.scss — drop
// it and the fade is cut off mid-way.
const ACTION_BLINK_MS = 450;

type ImsButtonType = 'button' | 'submit' | 'reset';
type ImsButtonActivationKey = 'Enter' | ' ';
export type ImsButtonVariation = 'default' | 'primary' | 'secondary' | 'outline' | 'danger';

@Directive({
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
    }

    /** Native disabled state. Readonly also disables interaction through `interactionDisabled`. */
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    /** Defaults buttons to non-submit behavior; bind `type="submit"` when needed. */
    readonly type = input<ImsButtonType>('button');

    /** Optional decorative Material Symbols ligature rendered before the button label. */
    readonly icon = input<string | null>(null);

    /**
     * Rendered size of that symbol. A bare number means px (`icon-size="14"`);
     * anything else is passed through as written, so any CSS length works
     * (`icon-size="1.25rem"`, `"1em"`, `"clamp(…)"`).
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

    protected readonly normalizedIcon = computed(() => this.resolveIcon(this.icon()?.trim() ?? ''));

    /**
     * Last say over the rendered symbol. A specialized subclass pins its own
     * glyph here, so a call site cannot drift from the preset.
     *
     * A method rather than a field: the base's `normalizedIcon` computed is
     * built during base field initialization, before any subclass field
     * exists, but it only *calls* this at the first effect flush — by which
     * point the override is in place.
     */
    protected resolveIcon(requested: string): string {
        return requested;
    }

    /** Readonly state inherited from the nearest `ims-readonly` provider. */
    readonly readonlyMode = this.inheritedReadonly;

    /** True when the host button must not run user actions. */
    readonly interactionDisabled = computed(() => this.disabledInput() || this.readonlyMode());

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
        '[disabled]': 'interactionDisabled()'
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
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonIcon extends ImsButtonBase {}
