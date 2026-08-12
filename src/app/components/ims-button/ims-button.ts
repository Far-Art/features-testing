import {
    Directive,
    HostBinding,
    HostListener,
    booleanAttribute,
    computed,
    input
} from '@angular/core';
import {ReadonlyDirective} from '../../shared/readonly.directive';

type ImsButtonType = 'button' | 'submit' | 'reset';

@Directive()
export abstract class ImsButtonBase {
    private readonly inheritedReadonly = ReadonlyDirective.injectSignal();

    /** Native disabled state. Readonly also disables interaction through `interactionDisabled`. */
    readonly disabledInput = input(false, {alias: 'disabled', transform: booleanAttribute});

    /** Defaults buttons to non-submit behavior; bind `type="submit"` when needed. */
    readonly type = input<ImsButtonType>('button');

    /** Readonly state inherited from the nearest `ims-readonly` provider. */
    readonly readonlyMode = this.inheritedReadonly;

    /** True when the host button must not run user actions. */
    readonly interactionDisabled = computed(() => this.disabledInput() || this.readonlyMode());

    @HostBinding('class.ims-button')
    protected readonly buttonClass = true;

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
