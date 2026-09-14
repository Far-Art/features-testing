import {ApplicationRef, ChangeDetectionStrategy, Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {By} from '@angular/platform-browser';
import {ImsOption} from './ims-option';
import {ImsSelect} from './ims-select';

interface Bag {
    readonly id: number;
    readonly label: string;
}

const BAGS: readonly Bag[] = [
    {id: 1, label: 'Documents'},
    {id: 2, label: 'Receipts'},
    {id: 3, label: 'Policies'},
    {id: 4, label: 'Claims'}
];

@Component({
    imports: [ImsOption, ImsSelect, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ims-select data-test="clearable" clearable [formControl]="clearable" [compareWith]="compareById">
            @for (bag of bags; track bag.id) {
                <ims-option [value]="bag">{{ bag.label }}</ims-option>
            }
        </ims-select>

        <ims-select data-test="plain" [formControl]="plain" [compareWith]="compareById">
            @for (bag of bags; track bag.id) {
                <ims-option [value]="bag">{{ bag.label }}</ims-option>
            }
        </ims-select>
    `
})
class SelectHost {
    readonly bags = BAGS;
    readonly clearable = new FormControl<Bag | null>(BAGS[1]);
    readonly plain = new FormControl<Bag | null>(BAGS[1]);

    readonly compareById = (first: Bag, second: Bag) => first?.id === second?.id;
}

describe('ImsSelect', () => {
    let fixture: ComponentFixture<SelectHost>;

    beforeAll(() => {
        // jsdom has no ResizeObserver; trigger measurement only needs one to construct.
        globalThis.ResizeObserver ??= class {
            observe(): void {}
            unobserve(): void {}
            disconnect(): void {}
        } as unknown as typeof ResizeObserver;
        // Nor does it scroll elements, which the active option is kept in view with.
        Element.prototype.scrollTo ??= () => undefined;
        Element.prototype.scrollIntoView ??= () => undefined;
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectHost]
        }).compileComponents();

        fixture = TestBed.createComponent(SelectHost);
        await settle(fixture);
    });

    afterEach(() => {
        fixture.destroy();
        document.querySelectorAll('.cdk-overlay-container').forEach((element) => element.remove());
    });

    it('clears a clearable single select with its clear button', async () => {
        const clearButton = hostElement('clearable').querySelector<HTMLButtonElement>('.ims-select__clear');
        expect(clearButton).not.toBeNull();

        clearButton!.click();
        await settle(fixture);

        expect(fixture.componentInstance.clearable.value).toBeNull();
        expect(hostElement('clearable').querySelector('.ims-select__clear')).toBeNull();
    });

    it('clears a clearable single select with Delete on the closed trigger', async () => {
        pressKey(trigger('clearable'), {key: 'Delete'});
        await settle(fixture);

        expect(fixture.componentInstance.clearable.value).toBeNull();
    });

    it('offers no clear action unless the select is clearable', async () => {
        expect(hostElement('plain').querySelector('.ims-select__clear')).toBeNull();

        pressKey(trigger('plain'), {key: 'Delete'});
        await settle(fixture);

        expect(fixture.componentInstance.plain.value).toEqual(BAGS[1]);
    });

    it('opens with Alt+ArrowDown without changing the value', async () => {
        pressKey(trigger('plain'), {key: 'ArrowDown', altKey: true});
        await settle(fixture);

        expect(select('plain').open()).toBe(true);
        expect(fixture.componentInstance.plain.value).toEqual(BAGS[1]);
    });

    it('stops at the last option instead of wrapping on a closed ArrowDown', async () => {
        fixture.componentInstance.plain.setValue(BAGS[3]);
        await settle(fixture);

        pressKey(trigger('plain'), {key: 'ArrowDown'});
        await settle(fixture);

        expect(fixture.componentInstance.plain.value).toEqual(BAGS[3]);
        expect(select('plain').open()).toBe(false);
    });

    function hostElement(name: string): HTMLElement {
        return fixture.debugElement.query(By.css(`[data-test="${name}"]`)).nativeElement;
    }

    function select(name: string): ImsSelect<Bag> {
        return fixture.debugElement.query(By.css(`[data-test="${name}"]`)).componentInstance;
    }

    function trigger(name: string): HTMLButtonElement {
        return hostElement(name).querySelector<HTMLButtonElement>('.ims-select__trigger')!;
    }
});

/** Waits out timers, then runs change detection everywhere, overlays included. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    await fixture.whenStable();
    fixture.detectChanges();
}

function pressKey(target: HTMLElement, init: KeyboardEventInit): void {
    target.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, ...init}));
}
