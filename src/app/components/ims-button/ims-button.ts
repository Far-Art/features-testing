import {
    Directive,
    ElementRef,
    HostBinding,
    HostListener,
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

type ImsButtonType = 'button' | 'submit' | 'reset';

@Directive()
export abstract class ImsButtonBase {
    private readonly inheritedReadonly = ReadonlyDirective.injectSignal();
    private readonly host = inject<ElementRef<HTMLButtonElement>>(ElementRef);
    private readonly renderer = inject(Renderer2);
    private symbolElement: HTMLElement | null = null;

    /**
     * True for the first frame after the host is created. A freshly mounted
     * button can land under an already-stationary pointer (returning to a
     * route, content reflowing under the cursor) and pick up `:hover` with
     * no real mouse movement, which then animates back out a moment later.
     * Suppressing transitions for one frame keeps the initial state a snap
     * instead of a visible, unintended animation.
     */
    private readonly justMounted = signal(true);

    constructor() {
        effect(() => this.syncIcon(this.normalizedIcon()));

        afterNextRender(() => {
            requestAnimationFrame(() => this.justMounted.set(false));
        });
    }

    @HostBinding('class.ims-button--mounting')
    protected get mountingClass(): boolean {
        return this.justMounted();
    }

    /** Native disabled state. Readonly also disables interaction through `interactionDisabled`. */
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    /** Defaults buttons to non-submit behavior; bind `type="submit"` when needed. */
    readonly type = input<ImsButtonType>('button');

    /** Optional decorative Material Symbols ligature rendered before the button label. */
    readonly icon = input<string | null>(null);

    private readonly normalizedIcon = computed(() => this.icon()?.trim() ?? '');

    /** Readonly state inherited from the nearest `ims-readonly` provider. */
    readonly readonlyMode = this.inheritedReadonly;

    /** True when the host button must not run user actions. */
    readonly interactionDisabled = computed(() => this.disabledInput() || this.readonlyMode());

    @HostBinding('class.ims-button')
    protected readonly buttonClass = true;

    @HostBinding('class.ims-button--with-symbol')
    protected get withSymbolClass(): boolean {
        return this.normalizedIcon().length > 0;
    }

    @HostBinding('class.ims-readonly')
    protected get readonlyClass(): boolean {
        return this.readonlyMode();
    }

    @HostBinding('class.ims-button--disabled')
    protected get disabledClass(): boolean {
        return this.disabledInput();
    }

    @HostBinding('class.ims-button--readonly')
    protected get readonlyButtonClass(): boolean {
        return this.readonlyMode();
    }

    @HostBinding('attr.type')
    protected get hostType(): ImsButtonType {
        return this.type();
    }

    @HostBinding('disabled')
    protected get hostDisabled(): boolean {
        return this.interactionDisabled();
    }

    @HostBinding('attr.aria-disabled')
    protected get ariaDisabled(): 'true' | null {
        return this.interactionDisabled() ? 'true' : null;
    }

    @HostListener('click', ['$event'])
    protected stopDisabledClick(event: MouseEvent): void {
        if (!this.interactionDisabled()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
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
}

@Directive({
    selector: 'button[ims-button]',
    standalone: true
})
export class ImsButton extends ImsButtonBase {
    @HostBinding('class.ims-button--default')
    protected readonly defaultButtonClass = true;
}

@Directive({
    selector: 'button[ims-button-dark]',
    standalone: true
})
export class ImsButtonDark extends ImsButtonBase {
    @HostBinding('class.ims-button--dark')
    protected readonly darkButtonClass = true;
}

@Directive({
    selector: 'button[ims-button-white]',
    standalone: true
})
export class ImsButtonWhite extends ImsButtonBase {
    @HostBinding('class.ims-button--white')
    protected readonly whiteButtonClass = true;
}

@Directive({
    selector: 'button[ims-button-danger]',
    standalone: true
})
export class ImsButtonDanger extends ImsButtonBase {
    @HostBinding('class.ims-button--danger')
    protected readonly dangerButtonClass = true;
}

/** Icon-only button. Give it an accessible name with `aria-label`, since there's no visible text. */
@Directive({
    selector: 'button[ims-button-icon]',
    standalone: true
})
export class ImsButtonIcon extends ImsButtonBase {
    @HostBinding('class.ims-button--default')
    protected readonly defaultButtonClass = true;

    @HostBinding('class.ims-button-icon')
    protected readonly iconButtonClass = true;
}
