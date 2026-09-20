import {ApplicationRef, ChangeDetectionStrategy, Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {By} from '@angular/platform-browser';
import {ImsAutocomplete} from './ims-autocomplete';
import {ImsAutocompleteAsync} from './ims-autocomplete-async';
import {ImsAutocompleteOption, ImsAutocompleteOptionsLoader} from './ims-autocomplete.types';

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

const OPTIONS: readonly ImsAutocompleteOption<Bag>[] = BAGS.map((bag) => ({value: bag, label: bag.label}));

function filterOptions(query: string): readonly ImsAutocompleteOption<Bag>[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return OPTIONS.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery));
}

@Component({
    imports: [ImsAutocomplete, ImsAutocompleteAsync, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ims-autocomplete
            data-test="single"
            [options]="options"
            [formControl]="single"
            [compareWith]="compareById"
        />

        <ims-autocomplete-async
            data-test="async-multi"
            multiple
            [loadOptions]="loadImmediately"
            [formControl]="asyncMulti"
            [compareWith]="compareById"
        />

        <ims-autocomplete-async
            data-test="async-strict"
            strict
            [loadDebounceMs]="20"
            [loadOptions]="loadSlowly"
            [formControl]="asyncStrict"
            [compareWith]="compareById"
        />

        <ims-autocomplete-async
            data-test="async-free"
            [loadOptions]="loadAndRecord"
            [formControl]="asyncFree"
            [compareWith]="compareById"
        />

        <ims-autocomplete data-test="strings" strict [options]="colors" [formControl]="color" />
        <ims-autocomplete data-test="strings-multi" multiple [options]="colors" [formControl]="colorList" />
        <ims-autocomplete-async data-test="strings-async" [loadOptions]="loadColors" [formControl]="asyncColor" />
    `
})
class AutocompleteHost {
    readonly options = OPTIONS;
    readonly single = new FormControl<Bag | string | null>(null);
    readonly asyncMulti = new FormControl<readonly Bag[]>([], {nonNullable: true});
    readonly asyncStrict = new FormControl<Bag | string | null>(null);
    readonly asyncFree = new FormControl<Bag | string | null>(null);
    readonly recordedQueries: string[] = [];

    readonly compareById = (first: Bag, second: Bag) => first?.id === second?.id;

    readonly loadImmediately: ImsAutocompleteOptionsLoader<Bag> = (query) => filterOptions(query);

    readonly loadSlowly: ImsAutocompleteOptionsLoader<Bag> = (query) =>
        new Promise((resolve) => setTimeout(() => resolve(filterOptions(query)), 10));

    readonly loadAndRecord: ImsAutocompleteOptionsLoader<Bag> = (query) => {
        this.recordedQueries.push(query);
        return filterOptions(query);
    };

    readonly colors: readonly string[] = ['Red', 'Green', 'Blue'];
    readonly color = new FormControl<string | null>(null);
    readonly colorList = new FormControl<readonly string[]>([], {nonNullable: true});
    readonly asyncColor = new FormControl<string | null>(null);
    readonly loadColors = (query: string) => Promise.resolve(
        this.colors.filter((color) => color.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    );
}

describe('ImsAutocomplete', () => {
    let fixture: ComponentFixture<AutocompleteHost>;

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
            imports: [AutocompleteHost]
        }).compileComponents();

        fixture = TestBed.createComponent(AutocompleteHost);
        await settle(fixture);
    });

    afterEach(() => {
        fixture.destroy();
        document.querySelectorAll('.cdk-overlay-container').forEach((element) => element.remove());
    });

    it('keeps a single panel closed after an option is picked with the mouse', async () => {
        const component = autocomplete<ImsAutocomplete<Bag>>(fixture, 'single');
        const input = hostElement(fixture, 'single').querySelector('input')!;

        input.focus();
        await settle(fixture);
        expect(component.open()).toBe(true);

        const option = overlayOptions().find((element) => element.textContent?.trim() === 'Receipts')!;
        pressWithMouse(option);
        await settle(fixture);

        expect(fixture.componentInstance.single.value).toEqual(BAGS[1]);
        expect(component.open()).toBe(false);
    });

    it('labels selected values that the current async results no longer include', async () => {
        const component = autocomplete<ImsAutocompleteAsync<Bag>>(fixture, 'async-multi');

        component.openPanel();
        await settle(fixture);
        component.selectOption(OPTIONS[0]);
        component.selectOption(OPTIONS[1]);
        await settle(fixture);

        component.query.set('Claims');
        await settle(fixture);

        expect(component.sourceOptions().map((option) => option.label)).toEqual(['Claims']);
        expect(component.selectedLabels()).toEqual(['Documents', 'Receipts']);
    });

    it('marks a multi trigger touched when focus leaves it without opening', async () => {
        const trigger = hostElement(fixture, 'async-multi')
            .querySelector<HTMLButtonElement>('.ims-autocomplete__trigger')!;

        trigger.focus();
        trigger.blur();
        await settle(fixture);

        expect(fixture.componentInstance.asyncMulti.touched).toBe(true);
    });

    it('waits for results matching the typed text before a strict async commit', async () => {
        const component = autocomplete<ImsAutocompleteAsync<Bag>>(fixture, 'async-strict');
        const input = hostElement(fixture, 'async-strict').querySelector('input')!;

        input.focus();
        typeInto(input, 'Doc');
        await settle(fixture, 60);
        await settle(fixture, 60);
        expect(component.sourceOptions().map((option) => option.label)).toEqual(['Documents']);

        // Leave before the results for the new text arrive.
        typeInto(input, 'Claims');
        input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
        await settle(fixture, 60);
        await settle(fixture, 60);

        expect(fixture.componentInstance.asyncStrict.value).toEqual(BAGS[3]);
        expect(input.value).toBe('Claims');
    });

    it('calls the async loader only while options are needed, and reuses loaded results', async () => {
        const component = autocomplete<ImsAutocompleteAsync<Bag>>(fixture, 'async-free');
        const host = fixture.componentInstance;

        host.asyncFree.setValue('free text');
        await settle(fixture, 10);
        expect(host.recordedQueries).toEqual([]);

        component.openPanel();
        await settle(fixture, 10);
        expect(host.recordedQueries).toEqual(['free text']);

        component.closePanel(false);
        await settle(fixture, 10);
        component.openPanel();
        await settle(fixture, 10);
        expect(host.recordedQueries).toEqual(['free text']);
    });

    it('sizes the menu with hidden copies of the longest options, whatever the query', async () => {
        const component = autocomplete<ImsAutocomplete<Bag>>(fixture, 'single');
        const input = hostElement(fixture, 'single').querySelector('input')!;

        input.focus();
        typeInto(input, 'Cla');
        await settle(fixture);

        const sizer = document.querySelector('.cdk-overlay-container .ims-autocomplete__sizer')!;
        const sizerLabels = Array.from(sizer.children, (row) => row.textContent?.trim());
        expect(overlayOptions().map((option) => option.textContent?.trim())).toEqual(['Claims']);
        expect(sizerLabels).toEqual(['Documents', 'Receipts', 'Policies', 'Claims']);
        expect(component.sizingLabels()).toEqual(sizerLabels);
        expect(sizer.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses each string option as both value and label, and marks the chosen one selected', async () => {
        const component = autocomplete<ImsAutocomplete<string>>(fixture, 'strings');
        const input = hostElement(fixture, 'strings').querySelector('input')!;

        input.focus();
        typeInto(input, 'green');
        input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
        await settle(fixture);

        expect(fixture.componentInstance.color.value).toBe('Green');
        expect(input.value).toBe('Green');

        component.openPanel();
        await settle(fixture);
        const selected = overlayOptions().filter((option) => option.getAttribute('aria-selected') === 'true');
        expect(selected.map((option) => option.textContent?.trim())).toEqual(['Green']);
    });

    it('writes the chosen strings in multiple mode', async () => {
        const component = autocomplete<ImsAutocomplete<string>>(fixture, 'strings-multi');

        component.openPanel();
        await settle(fixture);
        component.selectOption(component.sourceOptions()[2]);
        component.selectOption(component.sourceOptions()[0]);
        await settle(fixture);

        expect(fixture.componentInstance.colorList.value).toEqual(['Blue', 'Red']);
        expect(component.selectedLabels()).toEqual(['Blue', 'Red']);
    });

    it('takes string options from an async loader', async () => {
        const component = autocomplete<ImsAutocompleteAsync<string>>(fixture, 'strings-async');

        component.openPanel();
        await settle(fixture);
        await settle(fixture);
        expect(component.sourceOptions()).toEqual([
            {value: 'Red', label: 'Red'},
            {value: 'Green', label: 'Green'},
            {value: 'Blue', label: 'Blue'}
        ]);

        pressWithMouse(overlayOptions().find((option) => option.textContent?.trim() === 'Blue')!);
        await settle(fixture);

        expect(fixture.componentInstance.asyncColor.value).toBe('Blue');
    });
});

/** Waits out timers, then runs change detection everywhere, overlays included. */
async function settle(fixture: ComponentFixture<unknown>, milliseconds = 0): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    await fixture.whenStable();
    fixture.detectChanges();
}

function hostElement(fixture: ComponentFixture<unknown>, name: string): HTMLElement {
    return fixture.debugElement.query(By.css(`[data-test="${name}"]`)).nativeElement;
}

function autocomplete<C>(fixture: ComponentFixture<unknown>, name: string): C {
    return fixture.debugElement.query(By.css(`[data-test="${name}"]`)).componentInstance as C;
}

/** Listed options only: the menu also holds hidden, role-less copies of the longest ones. */
function overlayOptions(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="option"]'));
}

function typeInto(input: HTMLInputElement, text: string): void {
    input.value = text;
    input.dispatchEvent(new Event('input', {bubbles: true}));
}

/**
 * Presses an element the way a browser does. jsdom performs no default action
 * for a synthetic mousedown, so the focus move a real press makes onto a
 * focusable target is replayed here unless the page prevented it.
 */
function pressWithMouse(element: HTMLElement): void {
    const mousedown = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
    element.dispatchEvent(mousedown);
    if (!mousedown.defaultPrevented) {
        element.focus();
    }

    element.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true}));
    element.click();
}
