import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImsTextTruncateDirective } from './ims-text-truncate.directive';

@Component({
    imports: [ImsTextTruncateDirective],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div id="target" imsTextTruncate>Very long clipped text</div>
        <div id="custom" [imsTextTruncate]="'Custom popover text'">Rendered text</div>
        <div
            id="wrapper"
            [imsTextTruncate]="'Full selected value'"
            imsTextTruncateTarget=".measured-value"
            [imsTextTruncateApplyStyles]="false"
            [imsTextTruncateShowOnFocus]="false"
        >
            <span class="measured-value">Clipped value</span>
        </div>
        <div
            id="known-overflow"
            [imsTextTruncate]="'All selected values'"
            [imsTextTruncateApplyStyles]="false"
            [imsTextTruncateOverflow]="true"
        >
            Visible selection
        </div>
        <div
            id="interactive"
            [imsTextTruncate]="'Selectable tooltip text'"
            [imsTextTruncateOverflow]="true"
            [imsTextTruncateInteractive]="true"
        >
            Interactive selection
        </div>
    `
})
class TestHost {
}

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
        expect(popover.style.pointerEvents).toBe('none');
        expect(popover.style.userSelect).toBe('none');

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

    it('can measure a child without changing the hover host styles', () => {
        const wrapper = fixture.nativeElement.querySelector('#wrapper') as HTMLElement;
        const measuredValue = wrapper.querySelector('.measured-value') as HTMLElement;
        setElementSize(measuredValue, {
            clientWidth: 80,
            scrollWidth: 200,
            clientHeight: 20,
            scrollHeight: 20
        });

        expect(wrapper.style.display).toBe('');
        expect(wrapper.style.overflow).toBe('');

        wrapper.dispatchEvent(new FocusEvent('focusin'));
        fixture.detectChanges();
        expect(document.querySelector('.ims-text-truncate-popover')).toBeNull();

        wrapper.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();
        expect(document.querySelector('.ims-text-truncate-popover')?.textContent)
            .toBe('Full selected value');
    });

    it('can use a known overflow state supplied by a component', () => {
        const knownOverflow = fixture.nativeElement.querySelector('#known-overflow') as HTMLElement;
        setElementSize(knownOverflow, {
            clientWidth: 200,
            scrollWidth: 200,
            clientHeight: 20,
            scrollHeight: 20
        });

        knownOverflow.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(document.querySelector('.ims-text-truncate-popover')?.textContent)
            .toBe('All selected values');
    });

    it('keeps an interactive popover open while the pointer is over selectable text', () => {
        const interactive = fixture.nativeElement.querySelector('#interactive') as HTMLElement;

        interactive.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        const popover = document.querySelector('.ims-text-truncate-popover') as HTMLElement;
        const overlayPane = popover.parentElement as HTMLElement;
        vi.spyOn(overlayPane, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 40, 160, 40));

        expect(overlayPane.style.pointerEvents).toBe('auto');
        expect(popover.style.pointerEvents).toBe('auto');
        expect(popover.style.userSelect).toBe('text');

        interactive.dispatchEvent(new MouseEvent('mouseleave', {
            clientX: 80,
            clientY: 60
        }));
        fixture.detectChanges();
        expect(document.querySelector('.ims-text-truncate-popover')).toBeTruthy();

        document.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 400,
            clientY: 400
        }));
        fixture.detectChanges();
        expect(document.querySelector('.ims-text-truncate-popover')).toBeNull();
    });
});

function setElementSize(element: HTMLElement, size: Pick<HTMLElement, 'clientWidth' | 'scrollWidth' | 'clientHeight' | 'scrollHeight'>): void {
    Object.defineProperties(element, {
        clientWidth: { configurable: true, value: size.clientWidth },
        scrollWidth: { configurable: true, value: size.scrollWidth },
        clientHeight: { configurable: true, value: size.clientHeight },
        scrollHeight: { configurable: true, value: size.scrollHeight }
    });
}
