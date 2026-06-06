import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ImsLongPressDirective} from './ims-long-press.directive';

@Component({
    imports: [ImsLongPressDirective],
    template: `
        <input id="other" />
        <button
            id="release"
            type="button"
            imsLongPress="500"
            (click)="recordReleaseClick()"
        >
            Release activation
        </button>
        <button
            id="timeout"
            type="button"
            imsLongPress="500"
            imsLongPressActivation="timeout"
            (click)="recordTimeoutClick()"
        >
            Timeout activation
        </button>
    `
})
class TestHost {
    releaseClicks = 0;
    timeoutClicks = 0;

    recordReleaseClick(): void {
        this.releaseClicks++;
    }

    recordTimeoutClick(): void {
        this.timeoutClicks++;
    }
}

describe('ImsLongPressDirective', () => {
    let fixture: ComponentFixture<TestHost>;
    let frameCallbacks: FrameRequestCallback[];
    let releaseButton: HTMLButtonElement;
    let timeoutButton: HTMLButtonElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TestHost]
        }).compileComponents();

        frameCallbacks = [];
        spyOn(window, 'requestAnimationFrame').and.callFake((callback) => {
            frameCallbacks.push(callback);
            return frameCallbacks.length;
        });
        spyOn(window, 'cancelAnimationFrame');

        fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        releaseButton = fixture.nativeElement.querySelector('#release');
        timeoutButton = fixture.nativeElement.querySelector('#timeout');

        [releaseButton, timeoutButton].forEach((button) => {
            spyOn(button, 'getBoundingClientRect').and.returnValue(
                new DOMRect(0, 0, 100, 40)
            );
        });
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('suppresses a normal click without a completed hold', () => {
        releaseButton.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

        expect(fixture.componentInstance.releaseClicks).toBe(0);
    });

    it('allows one click after holding and releasing inside the host', () => {
        startPointerHold(releaseButton);
        completeHold();
        releasePointer(releaseButton);
        releaseButton.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

        expect(fixture.componentInstance.releaseClicks).toBe(1);
    });

    it('continues the hold when another focused element blurs', () => {
        const otherInput = fixture.nativeElement.querySelector('#other') as HTMLInputElement;
        otherInput.focus();

        startPointerHold(releaseButton);
        otherInput.blur();
        completeHold();
        releasePointer(releaseButton);
        releaseButton.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

        expect(fixture.componentInstance.releaseClicks).toBe(1);
    });

    it('does not treat readiness alone as permission to click', () => {
        startPointerHold(releaseButton);
        completeHold();
        releaseButton.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

        expect(fixture.componentInstance.releaseClicks).toBe(0);
    });

    it('activates on timeout and suppresses the trailing native click', () => {
        startPointerHold(timeoutButton);
        completeHold();
        releasePointer(timeoutButton);
        timeoutButton.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

        expect(fixture.componentInstance.timeoutClicks).toBe(1);
    });

    it('supports keyboard hold activation', () => {
        releaseButton.dispatchEvent(new KeyboardEvent('keydown', {
            key: ' ',
            bubbles: true,
            cancelable: true
        }));
        completeHold();
        releaseButton.dispatchEvent(new KeyboardEvent('keyup', {
            key: ' ',
            bubbles: true,
            cancelable: true
        }));

        expect(fixture.componentInstance.releaseClicks).toBe(1);
    });

    function completeHold(): void {
        const callback = frameCallbacks.at(-1);
        expect(callback).toBeDefined();
        callback!(performance.now() + 500);
    }
});

function startPointerHold(button: HTMLButtonElement): void {
    button.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 50,
        clientY: 20,
        bubbles: true,
        cancelable: true
    }));
}

function releasePointer(button: HTMLButtonElement): void {
    button.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 50,
        clientY: 20,
        bubbles: true,
        cancelable: true
    }));
}
