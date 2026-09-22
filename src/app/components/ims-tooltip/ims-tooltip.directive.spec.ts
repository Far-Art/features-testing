import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ImsTooltip} from './ims-tooltip.directive';

@Component({
    imports: [ImsTooltip],
    template: `
        <button id="host" imsTooltip="Rounded to the nearest agora">₪12.34</button>
        <button id="elsewhere">Elsewhere</button>
    `
})
class TestHost {
}

describe('ImsTooltip', () => {
    let fixture: ComponentFixture<TestHost>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({imports: [TestHost]}).compileComponents();

        fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        document.querySelectorAll('.cdk-overlay-container').forEach((element) => element.remove());
    });

    function element(id: string): HTMLElement {
        return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`)!;
    }

    /** The bubble on screen, if any. One fading out is not counted. */
    function shownTooltip(): HTMLElement | null {
        return document.querySelector<HTMLElement>('.ims-tooltip:not(.ims-tooltip--leaving)');
    }

    it('opens on keyboard focus and describes the host', () => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
        element('host').focus();

        const tooltip = shownTooltip();
        expect(tooltip?.textContent?.trim()).toBe('Rounded to the nearest agora');
        expect(element('host').getAttribute('aria-describedby')).toBe(tooltip?.id);
    });

    it('stays closed on focus that follows a mouse press', () => {
        // The focus a dialog hands back to its opener when the user clicks one
        // of its actions: moved by script, with the pointer somewhere else.
        // `buttons` and `detail` make this a real press; the CDK counts one
        // without them as a screen reader's, which is keyboard input.
        element('elsewhere').dispatchEvent(
            new MouseEvent('mousedown', {bubbles: true, buttons: 1, detail: 1})
        );
        element('host').focus();

        expect(shownTooltip()).toBeNull();
        expect(element('host').hasAttribute('aria-describedby')).toBe(false);
    });

    it('stays closed on focus moved by script before any input', () => {
        element('host').focus();

        expect(shownTooltip()).toBeNull();
    });
});
