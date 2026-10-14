import {ApplicationRef, ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CdkVirtualScrollViewport, ScrollingModule} from '@angular/cdk/scrolling';
import {ImsGridV2, ImsGridCellV2, ImsGridRowV2} from '../ims-grid-v2';
import {ImsTableDirective} from './ims-table.directive';
import {ImsTableRowDirective} from './ims-table-row.directive';

@Component({
    imports: [ImsTableDirective, ImsTableRowDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button id="before" type="button">Before</button>
        <table ims-table class="ims-table" [interactive]="interactive()" [zebra]="zebra()">
            <thead>
                <tr><th>Name</th><th>Action</th></tr>
            </thead>
            <tbody>
                @for (row of rows; track row) {
                    <tr
                        ims-table-row
                        [attr.data-row]="row"
                        [attr.aria-selected]="row === selected()"
                        (rowClick)="clicks.push(row + ':' + $event.type)"
                        (rowDblclick)="dblclicks.push(row + ':' + $event.type)"
                    >
                        <td class="name">{{ row }}</td>
                        <td>
                            <button type="button" class="action">Open</button>
                            @if (row === extraControlRow()) {
                                <a href="#extra" class="extra">More</a>
                            }
                        </td>
                    </tr>
                }
            </tbody>
        </table>
        <button id="after" type="button">After</button>
    `
})
class NativeTableHost {
    readonly interactive = signal(true);
    readonly zebra = signal(false);
    readonly rows = ['a', 'b', 'c', 'd'];
    readonly selected = signal<string | null>(null);
    readonly extraControlRow = signal<string | null>(null);
    readonly clicks: string[] = [];
    readonly dblclicks: string[] = [];
}

@Component({
    imports: [ImsGridV2, ImsGridCellV2, ImsGridRowV2, ImsTableDirective, ImsTableRowDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ims-grid-v2 id="table" ims-table [interactive]="interactive()">
            <ims-grid-header-v2>
                <ims-grid-cell-v2>Name</ims-grid-cell-v2>
                <ims-grid-cell-v2>Value</ims-grid-cell-v2>
            </ims-grid-header-v2>
            @for (row of rows; track row) {
                <ims-grid-row-v2 ims-table-row [attr.data-row]="row" (rowClick)="clicks.push(row)">
                    <ims-grid-cell-v2>{{ row }}</ims-grid-cell-v2>
                    <ims-grid-cell-v2>
                        @if (row === 'a') {
                            <ims-grid-row-v2 data-row="nested">
                                <ims-grid-cell-v2 class="nested-cell">nested</ims-grid-cell-v2>
                            </ims-grid-row-v2>
                        }
                    </ims-grid-cell-v2>
                </ims-grid-row-v2>
            }
            <ims-grid-footer-v2>
                <ims-grid-cell-v2>Total</ims-grid-cell-v2>
                <ims-grid-cell-v2>3</ims-grid-cell-v2>
            </ims-grid-footer-v2>
        </ims-grid-v2>

        <ims-grid-v2 id="layout">
            <ims-grid-row-v2>
                <ims-grid-cell-v2>Layout</ims-grid-cell-v2>
            </ims-grid-row-v2>
        </ims-grid-v2>

        <ims-grid-v2 id="gapped" columnGap="8">
            <ims-grid-row-v2>
                <ims-grid-cell-v2>Gapped</ims-grid-cell-v2>
            </ims-grid-row-v2>
        </ims-grid-v2>

        <ims-grid-v2 id="fixed" ims-table>
            <ims-grid-header-v2>
                <ims-grid-cell-v2 width="5rem">Id</ims-grid-cell-v2>
                <ims-grid-cell-v2 width="8rem">Premium</ims-grid-cell-v2>
            </ims-grid-header-v2>
        </ims-grid-v2>

        <ims-grid-v2 id="fixed-layout">
            <ims-grid-header-v2>
                <ims-grid-cell-v2 width="5rem">Id</ims-grid-cell-v2>
                <ims-grid-cell-v2 width="8rem">Premium</ims-grid-cell-v2>
            </ims-grid-header-v2>
        </ims-grid-v2>
    `
})
class GridTableHost {
    readonly interactive = signal(false);
    readonly rows = ['a', 'b', 'c'];
    readonly clicks: string[] = [];
}

@Component({
    imports: [ImsGridV2, ImsGridCellV2, ImsGridRowV2, ImsTableDirective, ImsTableRowDirective, ScrollingModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ims-grid-v2 ims-table interactive>
            <ims-grid-header-v2>
                <ims-grid-cell-v2 width="5rem">#</ims-grid-cell-v2>
            </ims-grid-header-v2>
            <cdk-virtual-scroll-viewport itemSize="32" minBufferPx="0" maxBufferPx="0">
                <ims-grid-row-v2 [ims-table-row]="i" *cdkVirtualFor="let item of items; let i = index" [attr.data-row]="item">
                    <ims-grid-cell-v2>{{ item }}</ims-grid-cell-v2>
                </ims-grid-row-v2>
            </cdk-virtual-scroll-viewport>
            <ims-grid-footer-v2>
                <ims-grid-cell-v2>Total</ims-grid-cell-v2>
            </ims-grid-footer-v2>
        </ims-grid-v2>
    `
})
class VirtualTableHost {
    readonly items = Array.from({length: 100}, (_, index) => index);
}

describe('ImsTableDirective', () => {
    beforeAll(() => {
        // jsdom has no ResizeObserver; the virtual viewport only needs one to construct.
        globalThis.ResizeObserver ??= class {
            observe = () => undefined;
            unobserve = () => undefined;
            disconnect = () => undefined;
        } as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
        document.getSelection()?.removeAllRanges();
    });

    describe('on a native table', () => {
        let fixture: ComponentFixture<NativeTableHost>;
        let host: NativeTableHost;

        beforeEach(async () => {
            await TestBed.configureTestingModule({imports: [NativeTableHost]}).compileComponents();
            fixture = TestBed.createComponent(NativeTableHost);
            host = fixture.componentInstance;
        });

        afterEach(() => fixture.destroy());

        it('adds ims-table-new beside the legacy ims-table class without replacing it', async () => {
            await settle(fixture);

            expect(table(fixture).classList).toContain('ims-table-new');
            expect(table(fixture).classList).toContain('ims-table');
        });

        it('marks a zebra table only while zebra is on', async () => {
            await settle(fixture);
            expect(table(fixture).classList).not.toContain('ims-table-new--zebra');

            fixture.componentInstance.zebra.set(true);
            await settle(fixture);
            expect(table(fixture).classList).toContain('ims-table-new--zebra');
        });

        it('leaves a non-interactive table unfocusable, with its native role, and silent', async () => {
            host.interactive.set(false);
            await settle(fixture);

            expect(table(fixture).getAttribute('role')).toBeNull();
            expect(rows(fixture).map((row) => row.getAttribute('tabindex'))).toEqual([null, null, null, null]);

            cell(fixture, 'a').click();
            expect(host.clicks).toEqual([]);
        });

        it('makes an interactive table a grid with its first row as the only tab stop', async () => {
            await settle(fixture);

            expect(table(fixture).getAttribute('role')).toBe('grid');
            expect(rows(fixture).map((row) => row.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
        });

        it('starts the tab stop on the selected row', async () => {
            host.selected.set('c');
            await settle(fixture);

            expect(rows(fixture).map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
        });

        it('moves focus with the arrow keys, Home and End, and stops at either end', async () => {
            await settle(fixture);
            row(fixture, 'a').focus();

            pressKey('ArrowDown');
            expect(focusedRow()).toBe('b');

            pressKey('End');
            expect(focusedRow()).toBe('d');

            const pastEnd = pressKey('ArrowDown');
            expect(focusedRow()).toBe('d');
            expect(pastEnd.defaultPrevented).toBe(true);

            pressKey('Home');
            expect(focusedRow()).toBe('a');

            pressKey('ArrowUp');
            expect(focusedRow()).toBe('a');
        });

        it('moves the tab stop to the row that has focus', async () => {
            await settle(fixture);
            row(fixture, 'a').focus();

            pressKey('ArrowDown');
            pressKey('ArrowDown');

            expect(rows(fixture).map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
        });

        it('emits rowClick for Space and rowDblclick for Enter, but not for a held key', async () => {
            await settle(fixture);
            row(fixture, 'b').focus();

            const space = pressKey(' ');
            pressKey('Enter');
            pressKey('Enter', {repeat: true});

            expect(space.defaultPrevented).toBe(true);
            expect(host.clicks).toEqual(['b:keydown']);
            expect(host.dblclicks).toEqual(['b:keydown']);
        });

        it('leaves keys pressed in a control inside the row to that control', async () => {
            await settle(fixture);
            const action = actionButton(fixture, 'a');
            action.focus();

            const arrow = pressKey('ArrowDown');
            pressKey(' ');

            expect(document.activeElement).toBe(action);
            expect(arrow.defaultPrevented).toBe(false);
            expect(host.clicks).toEqual([]);
        });

        it('emits rowClick for a click on the row, not for one on a control inside it', async () => {
            await settle(fixture);

            cell(fixture, 'a').click();
            actionButton(fixture, 'b').click();

            expect(host.clicks).toEqual(['a:click']);
        });

        it('does not emit rowClick when a click ends a drag that selected cell text', async () => {
            await settle(fixture);
            const range = document.createRange();
            range.selectNodeContents(cell(fixture, 'c'));
            document.getSelection()?.addRange(range);

            cell(fixture, 'c').click();

            expect(host.clicks).toEqual([]);
        });

        it('emits rowDblclick and keeps the second press from selecting a word', async () => {
            await settle(fixture);
            const secondPress = new MouseEvent('mousedown', {bubbles: true, cancelable: true, detail: 2});
            const pressOnControl = new MouseEvent('mousedown', {bubbles: true, cancelable: true, detail: 2});

            cell(fixture, 'b').dispatchEvent(secondPress);
            actionButton(fixture, 'b').dispatchEvent(pressOnControl);
            cell(fixture, 'b').dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true}));
            actionButton(fixture, 'c').dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true}));

            expect(secondPress.defaultPrevented).toBe(true);
            expect(pressOnControl.defaultPrevented).toBe(false);
            expect(host.dblclicks).toEqual(['b:dblclick']);
        });

        it('keeps only the tab stop row\'s controls in the tab order', async () => {
            await settle(fixture);

            expect(actionTabIndexes(fixture)).toEqual([null, '-1', '-1', '-1']);

            row(fixture, 'c').focus();

            expect(actionTabIndexes(fixture)).toEqual(['-1', '-1', null, '-1']);
        });

        it('takes a control added to another row later out of the tab order', async () => {
            await settle(fixture);

            host.extraControlRow.set('b');
            await settle(fixture);

            expect(row(fixture, 'b').querySelector('.extra')?.getAttribute('tabindex')).toBe('-1');
        });

        it('puts everything back when the table stops being interactive', async () => {
            await settle(fixture);

            host.interactive.set(false);
            await settle(fixture);

            expect(rows(fixture).map((row) => row.getAttribute('tabindex'))).toEqual([null, null, null, null]);
            expect(actionTabIndexes(fixture)).toEqual([null, null, null, null]);
            expect(table(fixture).querySelector('[data-ims-table-tabindex]')).toBeNull();
        });
    });

    describe('on an ims-grid-v2', () => {
        let fixture: ComponentFixture<GridTableHost>;
        let host: GridTableHost;

        beforeEach(async () => {
            await TestBed.configureTestingModule({imports: [GridTableHost]}).compileComponents();
            fixture = TestBed.createComponent(GridTableHost);
            host = fixture.componentInstance;
        });

        afterEach(() => fixture.destroy());

        it('gives a table grid table roles and a layout grid none', async () => {
            await settle(fixture);
            const grid = gridById(fixture, 'table');
            const layout = gridById(fixture, 'layout');

            expect(grid.getAttribute('role')).toBe('table');
            expect(grid.querySelector('ims-grid-header-v2')?.getAttribute('role')).toBe('row');
            expect(grid.querySelector('ims-grid-header-v2 ims-grid-cell-v2')?.getAttribute('role')).toBe('columnheader');
            expect(gridRow(fixture, 'b').getAttribute('role')).toBe('row');
            expect(gridRow(fixture, 'b').querySelector('ims-grid-cell-v2')?.getAttribute('role')).toBe('cell');

            expect(layout.getAttribute('role')).toBeNull();
            expect(layout.querySelector('ims-grid-row-v2')?.getAttribute('role')).toBeNull();
            expect(layout.querySelector('ims-grid-cell-v2')?.getAttribute('role')).toBeNull();
        });

        it('switches to grid roles when interactive', async () => {
            host.interactive.set(true);
            await settle(fixture);

            expect(gridById(fixture, 'table').getAttribute('role')).toBe('grid');
            expect(gridRow(fixture, 'b').querySelector('ims-grid-cell-v2')?.getAttribute('role')).toBe('gridcell');
        });

        it('leaves the column gutter to the stylesheet unless columnGap is set', async () => {
            await settle(fixture);

            expect(gridById(fixture, 'layout').style.getPropertyValue('--ims-grid-v2-column-gap')).toBe('');
            expect(gridById(fixture, 'gapped').style.getPropertyValue('--ims-grid-v2-column-gap')).toBe('8px');
        });

        it('fills leftover width with the end rail only on a table whose columns cannot grow', async () => {
            await settle(fixture);
            const template = (id: string) => gridById(fixture, id).style.getPropertyValue('--ims-grid-v2-template');

            expect(template('fixed')).toMatch(/minmax\(var\(--ims-grid-v2-offset-end\), 1fr\)$/);
            expect(template('fixed-layout')).toMatch(/ var\(--ims-grid-v2-offset-end\)$/);
            expect(template('table')).toMatch(/ var\(--ims-grid-v2-offset-end\)$/);
        });

        it('navigates grid rows with the keyboard', async () => {
            host.interactive.set(true);
            await settle(fixture);
            gridRow(fixture, 'a').focus();

            pressKey('ArrowDown');

            expect(focusedRow()).toBe('b');
        });

        it('gives the footer row semantics and keeps it off the keyboard path', async () => {
            host.interactive.set(true);
            await settle(fixture);
            const footer = gridById(fixture, 'table').querySelector('ims-grid-footer-v2') as HTMLElement;

            expect(footer.getAttribute('role')).toBe('row');
            expect(footer.querySelector('ims-grid-cell-v2')?.getAttribute('role')).toBe('gridcell');
            expect(footer.hasAttribute('tabindex')).toBe(false);

            gridRow(fixture, 'a').focus();
            pressKey('End');

            expect(focusedRow()).toBe('c');
        });

        it('gives a click in a nested row to that row, not to its parent', async () => {
            host.interactive.set(true);
            await settle(fixture);

            (fixture.nativeElement.querySelector('.nested-cell') as HTMLElement).click();
            (gridRow(fixture, 'b').querySelector('ims-grid-cell-v2') as HTMLElement).click();

            expect(host.clicks).toEqual(['b']);
        });
    });

    describe('with a virtual viewport', () => {
        let fixture: ComponentFixture<VirtualTableHost>;
        let scrollOffset: number;

        beforeEach(async () => {
            scrollOffset = 0;
            // jsdom lays nothing out: the viewport's height and scroll position are supplied here.
            vi.spyOn(CdkVirtualScrollViewport.prototype, 'getViewportSize').mockReturnValue(96);
            vi.spyOn(CdkVirtualScrollViewport.prototype, 'measureScrollOffset').mockImplementation(() => scrollOffset);
            vi.spyOn(CdkVirtualScrollViewport.prototype, 'scrollToIndex').mockImplementation((index: number) => {
                scrollOffset = index * 32;
            });

            await TestBed.configureTestingModule({imports: [VirtualTableHost]}).compileComponents();
            fixture = TestBed.createComponent(VirtualTableHost);
            await settle(fixture);
        });

        afterEach(() => {
            fixture.destroy();
            vi.restoreAllMocks();
        });

        it('renders a window of the rows and says where each sits in the whole list', () => {
            const grid = fixture.nativeElement.querySelector('ims-grid-v2') as HTMLElement;
            const rendered = Array.from(grid.querySelectorAll<HTMLElement>('ims-grid-row-v2'));

            expect(rendered.map((row) => row.dataset['row'])).toEqual(['0', '1', '2']);
            expect(grid.getAttribute('aria-rowcount')).toBe('102');
            expect(rendered.map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4']);
            expect(grid.querySelector('ims-grid-footer-v2')?.getAttribute('aria-rowindex')).toBe('102');
        });

        it('marks rows by the parity of their bound item index', () => {
            const rendered = Array.from(
                (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ims-grid-row-v2')
            );

            expect(rendered.map((row) => row.classList.contains('ims-table-new__row--alternate'))).toEqual([false, true, false]);
        });

        it('scrolls to a row outside the rendered window and focuses it once rendered', async () => {
            gridRow(fixture, '0').focus();

            pressKey('End');
            await settle(fixture);

            expect(CdkVirtualScrollViewport.prototype.scrollToIndex).toHaveBeenCalledWith(99);
            expect(focusedRow()).toBe('99');
            expect(document.activeElement?.getAttribute('aria-rowindex')).toBe('101');
            expect(document.activeElement?.getAttribute('tabindex')).toBe('0');
        });

        it('keeps the active row by index when its element is reused for another item', async () => {
            gridRow(fixture, '0').focus();
            pressKey('End');
            await settle(fixture);

            pressKey('Home');
            await settle(fixture);

            expect(focusedRow()).toBe('0');
            const grid = fixture.nativeElement.querySelector('ims-grid-v2') as HTMLElement;
            expect(grid.querySelectorAll('ims-grid-row-v2[tabindex="0"]').length).toBe(1);
        });
    });
});

/** Runs change detection and render hooks until the fixture settles, the way the browser would. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    await fixture.whenStable();
    fixture.detectChanges();
}

function pressKey(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...init});
    (document.activeElement ?? document.body).dispatchEvent(event);
    return event;
}

function focusedRow(): string | undefined {
    return (document.activeElement as HTMLElement | null)?.dataset['row'];
}

function table(fixture: ComponentFixture<unknown>): HTMLTableElement {
    return fixture.nativeElement.querySelector('table');
}

function rows(fixture: ComponentFixture<unknown>): HTMLElement[] {
    return Array.from(table(fixture).querySelectorAll<HTMLElement>('tbody > tr'));
}

function row(fixture: ComponentFixture<unknown>, name: string): HTMLElement {
    return table(fixture).querySelector(`tr[data-row="${name}"]`) as HTMLElement;
}

function cell(fixture: ComponentFixture<unknown>, name: string): HTMLElement {
    return row(fixture, name).querySelector('.name') as HTMLElement;
}

function actionButton(fixture: ComponentFixture<unknown>, name: string): HTMLButtonElement {
    return row(fixture, name).querySelector('.action') as HTMLButtonElement;
}

function actionTabIndexes(fixture: ComponentFixture<unknown>): (string | null)[] {
    return rows(fixture).map((row) => row.querySelector('.action')?.getAttribute('tabindex') ?? null);
}

function gridById(fixture: ComponentFixture<unknown>, id: string): HTMLElement {
    return fixture.nativeElement.querySelector(`ims-grid-v2#${id}`);
}

function gridRow(fixture: ComponentFixture<unknown>, name: string): HTMLElement {
    return fixture.nativeElement.querySelector(`ims-grid-row-v2[data-row="${name}"]`);
}
