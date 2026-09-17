import {ApplicationRef, ChangeDetectionStrategy, Component, signal} from '@angular/core';
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

        <ims-select data-test="filtered" filter="on" [formControl]="filtered" [compareWith]="compareById">
            @for (bag of bags; track bag.id) {
                <ims-option [value]="bag" [disabled]="bag.id === 1">{{ bag.label }}</ims-option>
            }
        </ims-select>
    `
})
class SelectHost {
    readonly bags = BAGS;
    readonly clearable = new FormControl<Bag | null>(BAGS[1]);
    readonly plain = new FormControl<Bag | null>(BAGS[1]);
    readonly filtered = new FormControl<Bag | null>(null);

    readonly compareById = (first: Bag, second: Bag) => first?.id === second?.id;
}

@Component({
    imports: [ImsOption, ImsSelect],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ims-select multiple>
            @for (option of optionIds(); track option) {
                <ims-option [value]="option">Option {{ option }}</ims-option>
            }
        </ims-select>
    `
})
class MultipleSelectHost {
    readonly optionIds = signal<readonly number[]>([]);

    showOptions(count: number): void {
        this.optionIds.set(Array.from({length: count}, (_, index) => index + 1));
    }
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

    it('hands focus back to the trigger on Tab from the open panel, before the browser moves it', async () => {
        pressKey(trigger('plain'), {key: 'ArrowDown', altKey: true});
        await settle(fixture);

        const listbox = document.querySelector<HTMLElement>('.cdk-overlay-container .ims-select__listbox')!;
        const tab = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
        listbox.dispatchEvent(tab);

        // Checked synchronously: the browser's own Tab runs right after dispatch.
        expect(document.activeElement).toBe(trigger('plain'));
        expect(tab.defaultPrevented).toBe(false);
        expect(select('plain').open()).toBe(false);
    });

    it('marks the first enabled match active when the filter changes', async () => {
        pressKey(trigger('filtered'), {key: 'ArrowDown', altKey: true});
        await settle(fixture);

        const filterInput = document.querySelector<HTMLInputElement>('.cdk-overlay-container .ims-select__filter input')!;
        const typeFilter = async (query: string) => {
            filterInput.value = query;
            filterInput.dispatchEvent(new Event('input', {bubbles: true}));
            await settle(fixture);
        };

        // Documents and Receipts match, and Documents is disabled.
        await typeFilter('ts');
        expect(select('filtered').activeOption()?.value()).toEqual(BAGS[1]);

        await typeFilter('cl');
        expect(select('filtered').activeOption()?.value()).toEqual(BAGS[3]);

        await typeFilter('nothing matches');
        expect(select('filtered').activeOption()).toBeNull();
    });

    it('tabs through the toolbar before Tab leaves the panel', async () => {
        const multipleFixture = TestBed.createComponent(MultipleSelectHost);
        const multipleSelect: ImsSelect<number> = multipleFixture.debugElement
            .query(By.directive(ImsSelect)).componentInstance;
        const multipleTrigger = multipleFixture.nativeElement.querySelector('.ims-select__trigger') as HTMLButtonElement;
        multipleFixture.componentInstance.showOptions(10);
        await settle(multipleFixture);

        pressKey(multipleTrigger, {key: 'ArrowDown', altKey: true});
        await settle(multipleFixture);

        const listbox = document.querySelector<HTMLElement>('.cdk-overlay-container .ims-select__listbox')!;
        const buttons = [...document.querySelectorAll<HTMLButtonElement>(
            '.cdk-overlay-container .ims-selection-toolbar button:not(:disabled)'
        )];
        expect(buttons.length).toBeGreaterThan(1);

        const fromListbox = tabFrom(listbox);
        expect(fromListbox.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(buttons[0]);

        tabFrom(buttons[0], true);
        expect(document.activeElement).toBe(listbox);

        for (const button of buttons.slice(0, -1)) {
            tabFrom(button);
        }
        expect(document.activeElement).toBe(buttons.at(-1));
        expect(multipleSelect.open()).toBe(true);

        const pastLast = tabFrom(buttons.at(-1)!);
        expect(pastLast.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(multipleTrigger);
        expect(multipleSelect.open()).toBe(false);

        multipleFixture.destroy();
    });

    it('returns focus to the options with one active after switching the view', async () => {
        const multipleFixture = TestBed.createComponent(MultipleSelectHost);
        const multipleSelect: ImsSelect<number> = multipleFixture.debugElement
            .query(By.directive(ImsSelect)).componentInstance;
        multipleFixture.componentInstance.showOptions(10);
        await settle(multipleFixture);

        pressKey(multipleFixture.nativeElement.querySelector('.ims-select__trigger'), {key: 'ArrowDown', altKey: true});
        await settle(multipleFixture);

        const unselectedSegment = [...document.querySelectorAll<HTMLButtonElement>(
            '.cdk-overlay-container .ims-selection-toolbar__segment'
        )].find((button) => button.getAttribute('aria-label') === multipleSelect.effectiveLabels().showUnselected)!;
        unselectedSegment.focus();
        unselectedSegment.click();
        await settle(multipleFixture);

        expect(multipleSelect.viewMode()).toBe('unselected');
        expect(document.activeElement).toBe(document.querySelector('.cdk-overlay-container .ims-select__listbox'));
        expect(multipleSelect.activeOption()?.value()).toBe(1);

        multipleFixture.destroy();
    });

    it('shows the auto toolbar from 10 options, before the auto filter', async () => {
        const multipleFixture = TestBed.createComponent(MultipleSelectHost);
        const multipleSelect: ImsSelect<number> = multipleFixture.debugElement
            .query(By.directive(ImsSelect)).componentInstance;

        multipleFixture.componentInstance.showOptions(9);
        await settle(multipleFixture);
        expect(multipleSelect.showToolbar()).toBe(false);

        multipleFixture.componentInstance.showOptions(10);
        await settle(multipleFixture);
        expect(multipleSelect.showToolbar()).toBe(true);
        expect(multipleSelect.showFilter()).toBe(false);

        multipleFixture.destroy();
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

/** Presses Tab on an element and returns the event, to check whether the browser's own move was left to run. */
function tabFrom(target: HTMLElement, shiftKey = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key: 'Tab', shiftKey, bubbles: true, cancelable: true});
    target.dispatchEvent(event);
    return event;
}
