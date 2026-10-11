import {computed, DestroyRef, Directive, ElementRef, inject, input, numberAttribute, output} from '@angular/core';
import {IMS_TABLE_CONTEXT, ImsTableRowRef} from './ims-table.tokens';


/** Elements that own a row's click: a click on one acts on that control, not on the row. */
const INTERACTIVE_CONTENT = [
    'a[href]',
    'area[href]',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    'summary',
    'iframe',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="radiogroup"]',
    '[role="switch"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="tab"]',
    '[role="combobox"]',
    '[role="listbox"]',
    '[role="textbox"]',
    '[role="slider"]',
    '[role="spinbutton"]'
].join(', ');

/** Every element that is a row, so a click inside a nested row is that row's, not its parent's. */
export const IMS_TABLE_ROW_ELEMENTS = 'tr, ims-grid-row, ims-grid-header, ims-grid-footer';

/** Elements the browser puts in the tab order unless told otherwise. */
const TABBABLE_CONTENT = [
    'a[href]',
    'area[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'iframe',
    'summary',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]'
].join(', ');

/** Where a control taken out of the tab order keeps the `tabindex` it had, empty when it had none. */
const SAVED_TABINDEX = 'data-ims-table-tabindex';

/** What triggered a row output: a pointer click, or Space/Enter on the focused row. */
export type ImsTableRowTrigger = MouseEvent | KeyboardEvent;

@Directive({
    selector: 'tr[ims-table-row], ims-grid-row[ims-table-row]',
    standalone: true,
    exportAs: 'imsTableRow',
    host: {
        'class': 'ims-table-new__row',
        '[class.ims-table-new__row--interactive]': 'interactive()',
        '[class.ims-table-new__row--alternate]': 'alternate()',
        '(click)': 'onClick($event)',
        '(dblclick)': 'onDblclick($event)',
        '(mousedown)': 'onMousedown($event)',
        '(keydown)': 'onKeydown($event)',
        '(focusin)': 'onFocusin()'
    }
})
/**
 * A row of an `ims-table`. In an `interactive` table it takes part in keyboard
 * navigation and emits `rowClick` and `rowDblclick`.
 *
 * Native `click` and `dblclick` are not enough for a row: Enter and Space on a
 * focused row fire neither, a click on a button or input in a cell bubbles up
 * to the row, a drag that selects cell text ends in a click, and a click in a
 * nested row reaches its parent too. These outputs filter all four, and the
 * keyboard reaches them the same way the pointer does.
 *
 * A double-click emits `rowClick` twice and then `rowDblclick`, in the order
 * the browser fires them. `rowClick` is not delayed to wait for a possible
 * second click — that would slow every single click — so it should select,
 * which is harmless twice, rather than toggle.
 *
 * Inside a virtual viewport, bind the item's index to the attribute itself —
 * `[ims-table-row]="i"` with `let i = index` from `*cdkVirtualFor` — so the
 * table knows which item each recycled row element is showing.
 */
export class ImsTableRowDirective implements ImsTableRowRef {
    /**
     * The item index this row shows in a virtual viewport. Unbound, as the bare
     * `ims-table-row` attribute leaves it, outside one.
     */
    readonly index = input<number | null, number | string | null | undefined>(null, {
        alias: 'ims-table-row',
        transform: toRowIndex
    });
    /** Primary click on the row, or Space while the row has focus. */
    readonly rowClick = output<ImsTableRowTrigger>();
    /** Double-click on the row, or Enter while the row has focus. */
    readonly rowDblclick = output<ImsTableRowTrigger>();

    readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly table = inject(IMS_TABLE_CONTEXT, {optional: true});
    /** Whether the owning table is interactive. A row outside any table never is. */
    readonly interactive = computed(() => this.table?.interactive() ?? false);
    /**
     * Whether the bound item index is odd: the second, fourth, sixth item. A
     * zebra table stripes a virtual viewport's rows by this, since a row's
     * place among the rendered elements changes as the window scrolls.
     */
    readonly alternate = computed(() => {
        const index = this.index();
        return index !== null && index % 2 === 1;
    });
    private contentTabbable = true;

    constructor() {
        const table = this.table;
        if (!table) {
            return;
        }

        table.registerRow(this);
        inject(DestroyRef).onDestroy(() => table.unregisterRow(this));
    }

    setTabIndex(tabIndex: number | null): void {
        const value = tabIndex === null ? null : String(tabIndex);
        if (this.element.getAttribute('tabindex') === value) {
            return;
        }

        if (value === null) {
            this.element.removeAttribute('tabindex');
        } else {
            this.element.setAttribute('tabindex', value);
        }
    }

    /**
     * Only the tab stop row keeps its controls in the tab order. Otherwise Tab
     * would visit a button in every row on its way through the table, and the
     * table would be as many tab stops as it has rows. A control taken out is
     * still clickable, and clicking it makes its row the tab stop.
     */
    setContentTabbable(tabbable: boolean): void {
        if (this.contentTabbable === tabbable) {
            return;
        }

        this.contentTabbable = tabbable;
        if (!tabbable) {
            this.refreshContentTabbable();
            return;
        }

        for (const element of this.ownContent(`[${SAVED_TABINDEX}]`)) {
            restoreTabIndex(element);
        }
    }

    refreshContentTabbable(): void {
        if (this.contentTabbable) {
            return;
        }

        for (const element of this.ownContent(TABBABLE_CONTENT)) {
            removeFromTabOrder(element);
        }
    }

    protected onClick(event: MouseEvent): void {
        if (!this.interactive() || event.button !== 0 || !this.isRowTarget(event) || this.hasTextSelection()) {
            return;
        }

        this.rowClick.emit(event);
    }

    protected onDblclick(event: MouseEvent): void {
        if (!this.interactive() || event.button !== 0 || !this.isRowTarget(event)) {
            return;
        }

        this.rowDblclick.emit(event);
    }

    /**
     * The second press of a double-click would select the word under the
     * pointer. Cancelling it keeps the row from flashing a highlight, while a
     * drag from a single press still selects text for copying.
     */
    protected onMousedown(event: MouseEvent): void {
        if (this.interactive() && event.detail > 1 && this.isRowTarget(event)) {
            event.preventDefault();
        }
    }

    protected onKeydown(event: KeyboardEvent): void {
        // A key pressed in a control inside the row belongs to that control: the
        // arrows move the caret in an input, Space toggles a checkbox.
        if (!this.interactive() || event.target !== this.element || event.altKey || event.metaKey || event.isComposing) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (event.repeat) {
                return;
            }

            if (event.key === 'Enter') {
                this.rowDblclick.emit(event);
            } else {
                this.rowClick.emit(event);
            }
            return;
        }

        if (this.table?.navigate(this, event)) {
            event.preventDefault();
        }
    }

    /** Focus anywhere in the row, including a control in a cell, makes it the row Tab returns to. */
    protected onFocusin(): void {
        if (this.interactive()) {
            this.table?.activateRow(this);
        }
    }

    /** Whether the event happened on this row itself rather than in a control or a nested row inside it. */
    private isRowTarget(event: Event): boolean {
        const target = event.target;
        if (!(target instanceof Element) || target.closest(IMS_TABLE_ROW_ELEMENTS) !== this.element) {
            return false;
        }

        const control = target.closest(INTERACTIVE_CONTENT);
        return !control || control === this.element || !this.element.contains(control);
    }

    /** Elements matching `selector` whose nearest row is this one, not a row nested inside it. */
    private ownContent(selector: string): HTMLElement[] {
        return Array.from(this.element.querySelectorAll<HTMLElement>(selector)).filter(
            (element) => element.closest(IMS_TABLE_ROW_ELEMENTS) === this.element
        );
    }

    /** Whether a text selection reaches into the row, as one does after a drag that selects cell text. */
    private hasTextSelection(): boolean {
        const selection = this.element.ownerDocument.getSelection();
        if (!selection || selection.isCollapsed) {
            return false;
        }

        for (let index = 0; index < selection.rangeCount; index += 1) {
            if (selection.getRangeAt(index).intersectsNode(this.element)) {
                return true;
            }
        }

        return false;
    }
}

/** A non-negative whole number, or `null` for the bare attribute and anything else. */
function toRowIndex(value: number | string | null | undefined): number | null {
    const index = numberAttribute(value, Number.NaN);
    return Number.isInteger(index) && index >= 0 ? index : null;
}

function removeFromTabOrder(element: HTMLElement): void {
    const tabIndex = element.getAttribute('tabindex');
    if (element.hasAttribute(SAVED_TABINDEX) || tabIndex === '-1') {
        return;
    }

    element.setAttribute(SAVED_TABINDEX, tabIndex ?? '');
    element.setAttribute('tabindex', '-1');
}

function restoreTabIndex(element: HTMLElement): void {
    const saved = element.getAttribute(SAVED_TABINDEX);
    if (saved === null) {
        return;
    }

    if (saved === '') {
        element.removeAttribute('tabindex');
    } else {
        element.setAttribute('tabindex', saved);
    }
    element.removeAttribute(SAVED_TABINDEX);
}
