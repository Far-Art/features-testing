import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ImsTextTruncateDirective} from './ims-text-truncate.directive';

@Component({
    imports: [ImsTextTruncateDirective],
    template: `
        <div id="target" imsTextTruncate>Very long clipped text</div>
        <div id="custom" [imsTextTruncate]="'Custom popover text'">Rendered text</div>
    `
})
class TestHost {}

describe('ImsTextTruncateDirective', () => {
    let fixture: ComponentFixture<TestHost>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TestHost]
        }).compileComponents();

        fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        document.querySelectorAll('.ims-text-truncate-popover').forEach((element) => element.remove());
        document.querySelectorAll('.cdk-overlay-container').forEach((element) => element.remove());
    });

    it('applies single-line truncation styles to the host', () => {
        const target = fixture.nativeElement.querySelector('#target') as HTMLElement;

        expect(target.style.display).toBe('block');
        expect(target.style.minWidth).toBe('0px');
        expect(target.style.maxWidth).toBe('100%');
        expect(target.style.overflow).toBe('hidden');
        expect(target.style.textOverflow).toBe('ellipsis');
        expect(target.style.whiteSpace).toBe('nowrap');
    });

    it('shows the full text in a popover only when the host overflows', () => {
        const target = fixture.nativeElement.querySelector('#target') as HTMLElement;
        setElementSize(target, {
            clientWidth: 80,
            scrollWidth: 200,
            clientHeight: 20,
            scrollHeight: 20
        });

        target.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        const popover = document.querySelector('.ims-text-truncate-popover') as HTMLElement;
        expect(popover).toBeTruthy();
        expect(popover.textContent).toBe('Very long clipped text');

        target.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();

        expect(document.querySelector('.ims-text-truncate-popover')).toBeNull();
    });

    it('does not show the popover when the host fits', () => {
        const target = fixture.nativeElement.querySelector('#target') as HTMLElement;
        setElementSize(target, {
            clientWidth: 200,
            scrollWidth: 200,
            clientHeight: 20,
            scrollHeight: 20
        });

        target.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(document.querySelector('.ims-text-truncate-popover')).toBeNull();
    });

    it('uses an explicit popover text value when provided', () => {
        const custom = fixture.nativeElement.querySelector('#custom') as HTMLElement;
        setElementSize(custom, {
            clientWidth: 80,
            scrollWidth: 200,
            clientHeight: 20,
            scrollHeight: 20
        });

        custom.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(document.querySelector('.ims-text-truncate-popover')?.textContent)
            .toBe('Custom popover text');
    });
});

function setElementSize(
    element: HTMLElement,
    size: Pick<HTMLElement, 'clientWidth' | 'scrollWidth' | 'clientHeight' | 'scrollHeight'>
): void {
    Object.defineProperties(element, {
        clientWidth: {configurable: true, value: size.clientWidth},
        scrollWidth: {configurable: true, value: size.scrollWidth},
        clientHeight: {configurable: true, value: size.clientHeight},
        scrollHeight: {configurable: true, value: size.scrollHeight}
    });
}
