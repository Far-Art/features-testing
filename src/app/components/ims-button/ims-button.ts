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

const ACTION_BLINK_MS = 110;

type ImsButtonType = 'button' | 'submit' | 'reset';
type ImsButtonActivationKey = 'Enter' | ' ';

@Directive({
    host: {
        class: 'ims-button',
        '[class.ims-button--mounting]': 'justMounted()',
        '[class.ims-button--action-blink]': 'actionBlink()',
        '[class.ims-button--with-symbol]': 'normalizedIcon().length > 0',
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

    protected readonly normalizedIcon = computed(() => this.icon()?.trim() ?? '');

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
        class: 'ims-button--default',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButton extends ImsButtonBase {}

@Directive({
    selector: 'button[ims-button-dark]',
    standalone: true,
    host: {
        class: 'ims-button--dark',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonDark extends ImsButtonBase {}

@Directive({
    selector: 'button[ims-button-white]',
    standalone: true,
    host: {
        class: 'ims-button--white',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonWhite extends ImsButtonBase {}

@Directive({
    selector: 'button[ims-button-danger]',
    standalone: true,
    host: {
        class: 'ims-button--danger',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonDanger extends ImsButtonBase {}

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
