import { OverlayContainer } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators
} from '@angular/forms';
import { ImsErrorPopoverDirective } from './ims-error-popover.directive';

@Component({
    imports: [ReactiveFormsModule, ImsErrorPopoverDirective],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <form [formGroup]="form">
            <input id="name" ims-error-popover formControlName="name">
        </form>
        <div id="server" [ims-error-popover]="serverErrors"></div>
    `
})
class ErrorPopoverTestHost {
    readonly name = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
    });
    readonly form = new FormGroup({ name: this.name });
    readonly serverErrors = signal<ValidationErrors | null>(null);
}

describe('ImsErrorPopoverDirective', () => {
    let fixture: ComponentFixture<ErrorPopoverTestHost>;
    let host: ErrorPopoverTestHost;
    let overlayContainer: OverlayContainer;

    /**
     * Renders the current state.
     *
     * A visible popover holds an automatic-visibility timer, and waiting for the zone to fall
     * quiet would mean waiting for that timer to run out, so nothing here waits for it.
     */
    function render(): void {
        fixture.detectChanges();
    }

    /** Every message currently on screen, in the order the panels render them. */
    function visibleMessages(): string[] {
        return Array.from(
            overlayContainer.getContainerElement().querySelectorAll('.ims-error-popover__error')
        ).map((row) => row.textContent?.trim() ?? '');
    }

    function nameInput(): HTMLInputElement {
        return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#name')!;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ErrorPopoverTestHost]
        }).compileComponents();

        fixture = TestBed.createComponent(ErrorPopoverTestHost);
        host = fixture.componentInstance;
        overlayContainer = TestBed.inject(OverlayContainer);
        fixture.detectChanges();
        // The directive resolves a bare host control again after the first render.
        await fixture.whenStable();
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        overlayContainer.getContainerElement().remove();
    });

    it('says nothing about a control the user has not been at', () => {
        expect(host.name.invalid).toBe(true);
        expect(visibleMessages()).toEqual([]);
        expect(nameInput().getAttribute('aria-invalid')).toBeNull();
    });

    it('stays quiet under the pointer and under focus while the control is untouched', () => {
        const input = nameInput();
        input.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
        input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        render();

        expect(visibleMessages()).toEqual([]);
    });

    it('shows the standing error as soon as the control is touched', () => {
        host.name.markAsTouched();
        render();

        expect(visibleMessages()).toEqual(['This field is required.']);
        expect(nameInput().getAttribute('aria-invalid')).toBe('true');
    });

    it('shows errors of a value the user has changed', () => {
        host.name.markAsDirty();
        render();

        expect(visibleMessages()).toEqual(['This field is required.']);
    });

    it('shows errors of untouched fields once the form is submitted', () => {
        const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
        form.dispatchEvent(new Event('submit'));
        render();

        expect(host.name.touched).toBe(false);
        expect(visibleMessages()).toEqual(['This field is required.']);
    });

    it('falls silent again when the form is reset', () => {
        host.name.markAsTouched();
        render();
        expect(visibleMessages()).toEqual(['This field is required.']);

        host.form.reset();
        render();

        expect(visibleMessages()).toEqual([]);
        expect(nameInput().getAttribute('aria-invalid')).toBeNull();
    });

    it('still announces what the user has just done, whatever the control state', () => {
        const popover = fixture.debugElement
            .query(By.directive(ImsErrorPopoverDirective))
            .injector.get(ImsErrorPopoverDirective);

        popover.announceErrors({ imsPattern: { message: 'Digits only.' } });
        render();

        expect(visibleMessages()).toEqual(['Digits only.']);
        // An announcement describes a refused keystroke, not the state of the value.
        expect(nameInput().getAttribute('aria-invalid')).toBeNull();
    });

    it('shows signal errors as they arrive, with no control to have been visited', () => {
        host.serverErrors.set({ required: true });
        render();

        expect(visibleMessages()).toEqual(['This field is required.']);
    });
});
