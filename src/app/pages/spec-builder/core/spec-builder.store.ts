import {Injectable, computed, inject, signal} from '@angular/core';
import {SPEC_BUILDER_CONFIG} from './spec-builder.tokens';
import {SPEC_LABELS} from './spec-builder.labels';
import {
    SpecBlockDefinition,
    SpecBuilderMode,
    SpecDocument,
    SpecItem,
    SpecPage,
    SpecPoint,
    SpecPropValue,
    SpecRect,
    SpecSize,
    SpecViewDefinition
} from './spec-builder.types';
import {createDocument, createItemId, createPage, createPageId, findView, groupItemsByZone, initialProps} from './spec-document.utils';
import {sameRect} from './spec-geometry.utils';
import {numberItems} from './spec-reference.utils';

/** Undo steps kept. Older ones are dropped. */
const HISTORY_LIMIT = 100;

/**
 * Changes with the same merge key, each less than this many milliseconds after
 * the previous one, are undone together: a run of arrow-key nudges, or the
 * keystrokes typed into one field.
 */
const MERGE_WINDOW_MS = 1500;

interface SpecHistory {
    readonly past: readonly SpecDocument[];
    readonly present: SpecDocument;
    readonly future: readonly SpecDocument[];
}

/**
 * The state of one builder: the spec with its undo history, the page on
 * screen, the selected item, and how the canvas is shown.
 *
 * The spec is immutable. Every change goes through one of the methods below,
 * which commit a new spec, so undo and redo are a matter of swapping specs.
 * Item commands act on the page on screen. Provided by the builder page, so
 * each builder has its own.
 */
@Injectable()
export class SpecBuilderStore {
    private readonly config = inject(SPEC_BUILDER_CONFIG);
    private readonly blocks = new Map(this.config.blocks.map((block) => [block.type, block]));
    private readonly history = signal<SpecHistory>({past: [], present: createDocument(this.config), future: []});
    private readonly activePageId = signal('');
    private readonly selection = signal<string | null>(null);
    private readonly currentMode = signal<SpecBuilderMode>('edit');
    private readonly typingId = signal<string | null>(null);
    private lastChange: {readonly key: string; readonly time: number} | null = null;

    /** Draws a grid on the zones while editing. */
    readonly showGrid = signal(true);
    /** Snaps moved and resized items to the grid. */
    readonly snapToGrid = signal(true);
    /** Grid step in CSS pixels: the snapping step, the drawn grid, and a Shift + arrow nudge. */
    readonly gridSize = signal(this.config.gridSize);
    /** Shows each item's reference number on the page. */
    readonly showNumbers = signal(false);
    /** Gives each new item a random label; off, new items have none. */
    readonly randomLabels = signal(true);
    /** True while a screenshot is taken: everything that is not part of the page is hidden. */
    readonly capturing = signal(false);

    /** The whole spec, every page of it. */
    readonly document = computed(() => this.history().present);
    readonly pages = computed(() => this.document().pages);
    /** The page on screen. Falls back to the first page when an undo removed the one that was. */
    readonly page = computed(() => this.pages().find((page) => page.id === this.activePageId()) ?? this.pages()[0]);
    readonly canUndo = computed(() => this.history().past.length > 0);
    readonly canRedo = computed(() => this.history().future.length > 0);
    readonly view = computed(() => this.viewOf(this.page()));
    readonly mode = this.currentMode.asReadonly();
    readonly selectedItemId = this.selection.asReadonly();
    /** The item whose field is being typed in while editing, or null. See `SpecBlockDefinition.typedProperty`. */
    readonly typingItemId = computed(() => this.editing() ? this.typingId() : null);
    readonly selectedItem = computed(() => this.page().items.find((item) => item.id === this.selection()) ?? null);
    readonly itemsByZone = computed(() => groupItemsByZone(this.page().items, this.view()));
    readonly numbers = computed(() => numberItems(this.page().items, this.view()));
    /** Grid step moves and resizes snap to; 1 means whole pixels. */
    readonly snapStep = computed(() => this.snapToGrid() ? this.gridSize() : 1);
    /** True while the editing aids are shown: selection, handles, zone outlines and the grid. */
    readonly editing = computed(() => this.currentMode() === 'edit' && !this.capturing());
    readonly badgesVisible = computed(() => this.showNumbers() || this.currentMode() === 'inspect');

    blockFor(type: string): SpecBlockDefinition | undefined {
        return this.blocks.get(type);
    }

    /** The view a page is laid out in. */
    viewOf(page: SpecPage): SpecViewDefinition {
        return findView(this.config.views, page.viewId);
    }

    // -----------------------------------------------------------------------
    // The spec
    // -----------------------------------------------------------------------

    /** Starts over from `document` with no undo history, as when the builder opens. */
    reset(document: SpecDocument): void {
        this.history.set({past: [], present: document, future: []});
        this.showPage(document.pages[0].id);
        this.lastChange = null;
    }

    /** Replaces the spec, such as with an opened file. Undo brings the previous one back. */
    load(document: SpecDocument): void {
        this.commit(document);
        this.showPage(document.pages[0].id);
    }

    newDocument(): void {
        this.load(createDocument(this.config));
    }

    rename(name: string): void {
        this.commit({...this.document(), name}, 'rename');
    }

    /** Names the process or tool the spec describes, which the header of every page shows. */
    setTitle(title: string): void {
        if (title !== this.document().title) {
            this.commit({...this.document(), title}, 'title');
        }
    }

    // -----------------------------------------------------------------------
    // Pages
    // -----------------------------------------------------------------------

    /** Puts a page on screen. The selection belongs to the page that was, so it is cleared. */
    showPage(pageId: string): void {
        this.activePageId.set(pageId);
        this.select(null);
    }

    /** Adds an empty page after the last one, in the layout and size of the page on screen, and shows it. */
    addPage(): void {
        const pages = this.pages();
        const current = this.page();
        const page: SpecPage = {...createPage(this.config, pages), viewId: current.viewId, size: current.size};
        this.commit({...this.document(), pages: [...pages, page]});
        this.showPage(page.id);
    }

    /** Adds a copy of the page on screen right after it, and shows the copy: a start for a case that differs a little. */
    duplicatePage(): void {
        const pages = this.pages();
        const current = this.page();
        const copy: SpecPage = {...current, id: createPageId(pages), name: SPEC_LABELS.pageCopyName(current.name)};
        const index = pages.indexOf(current);
        this.commit({...this.document(), pages: [...pages.slice(0, index + 1), copy, ...pages.slice(index + 1)]});
        this.showPage(copy.id);
    }

    /** Deletes the page on screen, unless it is the only one, and shows its neighbour. */
    removePage(): void {
        const pages = this.pages();
        if (pages.length < 2) {
            return;
        }

        const index = pages.indexOf(this.page());
        const remaining = pages.filter((_page, position) => position !== index);
        this.commit({...this.document(), pages: remaining});
        this.showPage(remaining[Math.min(index, remaining.length - 1)].id);
    }

    /** Moves the page on screen one place earlier (-1) or later (1) in the spec. */
    movePage(offset: -1 | 1): void {
        const pages = [...this.pages()];
        const index = pages.indexOf(this.page());
        const target = index + offset;
        if (target < 0 || target >= pages.length) {
            return;
        }

        [pages[index], pages[target]] = [pages[target], pages[index]];
        this.commit({...this.document(), pages});
    }

    renamePage(name: string): void {
        this.changePage((page) => page.name === name ? page : {...page, name}, `page-name:${this.page().id}`);
    }

    setView(viewId: string): void {
        this.changePage((page) => page.viewId === viewId ? page : {...page, viewId});
    }

    setPageSize(size: SpecSize): void {
        this.changePage((page) => ({...page, size}), `page-size:${this.page().id}`);
    }

    // -----------------------------------------------------------------------
    // Items of the page on screen
    // -----------------------------------------------------------------------

    /** Adds an item of `blockType` with its corner at `origin`, selects it, and returns its id. */
    addItem(blockType: string, zoneId: string, origin: SpecPoint): string | null {
        const block = this.blocks.get(blockType);
        if (!block) {
            return null;
        }

        const page = this.page();
        const item: SpecItem = {
            id: createItemId(page.items),
            blockType,
            zoneId,
            rect: {x: origin.x, y: origin.y, width: block.defaultSize.width, height: block.defaultSize.height},
            props: initialProps(block, this.randomLabels()),
            note: ''
        };
        this.changePage(() => ({...page, items: [...page.items, item]}));
        this.selection.set(item.id);
        return item.id;
    }

    /** Moves or resizes an item. A locked item stays as it is. */
    updateRect(id: string, rect: SpecRect, mergeKey?: string): void {
        this.changeItem(id, (item) => item.locked || sameRect(item.rect, rect) ? item : {...item, rect}, mergeKey);
    }

    /** Puts an item in `zoneId` with its corner at `origin`. Its size is kept, and a locked item stays where it is. */
    moveItem(id: string, zoneId: string, origin: SpecPoint, mergeKey?: string): void {
        this.changeItem(id, (item) => {
            const rect = {...item.rect, x: origin.x, y: origin.y};
            return item.locked || (item.zoneId === zoneId && sameRect(item.rect, rect)) ? item : {...item, zoneId, rect};
        }, mergeKey);
    }

    /** Locks an item's position and size, or unlocks them. */
    setLocked(id: string, locked: boolean): void {
        this.changeItem(id, (item) => !!item.locked === locked ? item : {...item, locked});
    }

    /**
     * Sets one property. `rect` replaces the item's rect in the same step, for
     * a property that changes which sides can be dragged.
     */
    updateProp(id: string, name: string, value: SpecPropValue, rect?: SpecRect): void {
        this.changeItem(id, (item) => item.props[name] === value
            ? item
            : {...item, props: {...item.props, [name]: value}, rect: rect && !item.locked ? rect : item.rect}, `prop:${id}:${name}`);
    }

    updateNote(id: string, note: string): void {
        this.changeItem(id, (item) => item.note === note ? item : {...item, note}, `note:${id}`);
    }

    /** Adds a copy of an item one grid step down and in, right above it, and selects the copy. */
    duplicate(id: string): void {
        const page = this.page();
        const index = page.items.findIndex((item) => item.id === id);
        if (index < 0) {
            return;
        }

        const original = page.items[index];
        const step = this.gridSize();
        // The copy is unlocked, so it can be moved off the original.
        const copy: SpecItem = {
            ...original,
            id: createItemId(page.items),
            rect: {...original.rect, x: original.rect.x + step, y: original.rect.y + step},
            locked: false
        };
        const items = [...page.items];
        items.splice(index + 1, 0, copy);
        this.changePage(() => ({...page, items}));
        this.selection.set(copy.id);
    }

    remove(id: string): void {
        this.changePage((page) => page.items.some((item) => item.id === id) ? {...page, items: page.items.filter((item) => item.id !== id)} : page);
        if (this.selection() === id) {
            this.select(null);
        }
    }

    /** Paints an item above every other one. */
    bringToFront(id: string): void {
        this.reorder(id, (items, item) => [...items, item]);
    }

    /** Paints an item below every other one, such as a panel behind the fields placed on it. */
    sendToBack(id: string): void {
        this.reorder(id, (items, item) => [item, ...items]);
    }

    select(id: string | null): void {
        this.selection.set(id);
        if (id !== this.typingId()) {
            this.typingId.set(null);
        }
    }

    /** Starts typing into an item's field, which also selects it, or stops typing with null. */
    typeInto(id: string | null): void {
        if (id !== null) {
            this.selection.set(id);
        }
        this.typingId.set(id);
    }

    setMode(mode: SpecBuilderMode): void {
        this.currentMode.set(mode);
        this.typingId.set(null);
        if (mode === 'preview') {
            this.selection.set(null);
        }
    }

    // -----------------------------------------------------------------------
    // Undo
    // -----------------------------------------------------------------------

    undo(): void {
        const {past, present, future} = this.history();
        if (past.length > 0) {
            const previous = past[past.length - 1];
            this.history.set({past: past.slice(0, -1), present: previous, future: [present, ...future]});
            this.showChangedPage(present, previous);
            this.lastChange = null;
        }
    }

    redo(): void {
        const {past, present, future} = this.history();
        if (future.length > 0) {
            const next = future[0];
            this.history.set({past: [...past, present], present: next, future: future.slice(1)});
            this.showChangedPage(present, next);
            this.lastChange = null;
        }
    }

    /**
     * Makes `next` the current spec and records the previous one for undo.
     * Successive changes with the same `mergeKey` replace one another instead,
     * so they are undone as one. See {@link MERGE_WINDOW_MS}.
     */
    private commit(next: SpecDocument, mergeKey?: string): void {
        const now = Date.now();
        const last = this.lastChange;
        const merge = mergeKey !== undefined && last?.key === mergeKey && now - last.time < MERGE_WINDOW_MS;
        this.lastChange = mergeKey === undefined ? null : {key: mergeKey, time: now};

        this.history.update(({past, present}) => ({
            past: merge ? past : [...past, present].slice(-HISTORY_LIMIT),
            present: next,
            future: []
        }));
    }

    /** Commits the page `change` returns for the page on screen, unless it returns the page unchanged. */
    private changePage(change: (page: SpecPage) => SpecPage, mergeKey?: string): void {
        const document = this.document();
        const page = this.page();
        const changed = change(page);
        if (changed !== page) {
            this.commit({...document, pages: document.pages.map((candidate) => candidate === page ? changed : candidate)}, mergeKey);
        }
    }

    /** Commits the item `change` returns, unless it returns the item unchanged. */
    private changeItem(id: string, change: (item: SpecItem) => SpecItem, mergeKey?: string): void {
        this.changePage((page) => {
            const index = page.items.findIndex((item) => item.id === id);
            if (index < 0) {
                return page;
            }

            const item = page.items[index];
            const changed = change(item);
            if (changed === item) {
                return page;
            }

            const items = [...page.items];
            items[index] = changed;
            return {...page, items};
        }, mergeKey);
    }

    private reorder(id: string, place: (others: SpecItem[], item: SpecItem) => SpecItem[]): void {
        this.changePage((page) => {
            const item = page.items.find((candidate) => candidate.id === id);
            return item ? {...page, items: place(page.items.filter((candidate) => candidate !== item), item)} : page;
        });
    }

    /**
     * After an undo or a redo, shows the page it changed, so the change is
     * never made out of sight. A page is unchanged when it is the same object.
     */
    private showChangedPage(before: SpecDocument, after: SpecDocument): void {
        const changed = after.pages.find((page) => !before.pages.includes(page));
        if (changed && changed.id !== this.page().id) {
            this.showPage(changed.id);
        }
    }
}
