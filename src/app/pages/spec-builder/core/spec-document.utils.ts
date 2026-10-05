import {SPEC_LABELS} from './spec-builder.labels';
import {
    SpecBlockDefinition,
    SpecBlockProperty,
    SpecBuilderConfig,
    SpecDocument,
    SpecItem,
    SpecListColumn,
    SpecListProperty,
    SpecListRow,
    SpecPage,
    SpecPropValue,
    SpecProps,
    SpecRect,
    SpecResizeMode,
    SpecSize,
    SpecViewDefinition
} from './spec-builder.types';
import {SPEC_MIN_ITEM_SIZE} from './spec-geometry.utils';

/**
 * Version of the saved file format. Raise it when the format changes, and
 * convert older files in {@link parseDocument}.
 *
 * - 1: one page, with `viewId`, `page` and `items` on the document.
 * - 2: `pages`, each with its own name, view, size and items. `title` was
 *   added later; a file without it reads as having no title. Block types
 *   renamed since are listed in {@link RENAMED_BLOCK_TYPES}.
 */
export const SPEC_SCHEMA_VERSION = 2;

/**
 * Block types that were renamed, by their old name. An item saved under an old
 * name opens as the block's current type.
 */
const RENAMED_BLOCK_TYPES: ReadonlyMap<string, string> = new Map([
    // The data grid was first called a table. The table block is a plain <table>, saved as `html-table`.
    ['table', 'grid']
]);

/** A CSS custom property name. Anything else in a token property is replaced by its default. */
const TOKEN_NAME = /^--[a-zA-Z0-9_-]+$/;

/** Smallest and largest page side, in CSS pixels, a file may set. */
const PAGE_SIDE_LIMITS = {min: 320, max: 8000};

/** Why a file could not be opened. */
export type SpecParseError = 'invalid' | 'version';

export type SpecParseResult =
    | {readonly document: SpecDocument; readonly error?: undefined}
    | {readonly document?: undefined; readonly error: SpecParseError};

/** A spec with one empty page. */
export function createDocument(config: SpecBuilderConfig): SpecDocument {
    return {
        schemaVersion: SPEC_SCHEMA_VERSION,
        name: SPEC_LABELS.untitled,
        title: '',
        pages: [createPage(config, [])]
    };
}

/**
 * An empty page to add after `pages`, numbered after them, in the first view
 * and the first page size of the configuration.
 */
export function createPage(config: SpecBuilderConfig, pages: readonly SpecPage[]): SpecPage {
    return {
        id: createPageId(pages),
        name: SPEC_LABELS.pageName(pages.length + 1),
        viewId: config.views[0].id,
        size: config.pagePresets[0].size,
        items: []
    };
}

/** An id no page of `pages` has: `page-1`, `page-2`, … */
export function createPageId(pages: readonly SpecPage[]): string {
    const taken = new Set(pages.map((page) => page.id));
    let number = pages.length + 1;
    while (taken.has(`page-${number}`)) {
        number++;
    }
    return `page-${number}`;
}

/** The document as the text of a `.spec.json` file. */
export function serializeDocument(document: SpecDocument): string {
    return JSON.stringify(document, null, 2);
}

/**
 * Reads the text of a `.spec.json` file.
 *
 * Anything a file may hold is checked here, so the rest of the builder can
 * trust a document: a bad value is replaced by a default rather than drawn.
 * Property values are kept as they are and checked when an item is drawn, by
 * {@link resolveProps}, so a property a block no longer has survives a save.
 */
export function parseDocument(text: string, config: SpecBuilderConfig): SpecParseResult {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return {error: 'invalid'};
    }

    if (!isRecord(data)) {
        return {error: 'invalid'};
    }

    // Version 1 held one page on the document itself: it becomes a spec with
    // that one page.
    if (data['schemaVersion'] === 1 && Array.isArray(data['items'])) {
        data = {...data, pages: [{id: 'page-1', name: SPEC_LABELS.pageName(1), viewId: data['viewId'], size: data['page'], items: data['items']}]};
    } else if (data['schemaVersion'] !== SPEC_SCHEMA_VERSION) {
        return {error: 'version'};
    }

    if (!isRecord(data) || !Array.isArray(data['pages'])) {
        return {error: 'invalid'};
    }

    const pages: SpecPage[] = [];
    for (const value of data['pages']) {
        if (isRecord(value)) {
            pages.push(readPage(value, pages, config));
        }
    }
    return {
        document: {
            schemaVersion: SPEC_SCHEMA_VERSION,
            name: readString(data['name'], SPEC_LABELS.untitled),
            title: readString(data['title'], ''),
            pages: pages.length > 0 ? pages : [createPage(config, [])]
        }
    };
}

/** The view a document names, or the first view when the configuration has no such view. */
export function findView(views: readonly SpecViewDefinition[], viewId: string): SpecViewDefinition {
    return views.find((view) => view.id === viewId) ?? views[0];
}

/**
 * The zone an item is drawn in. An item whose zone the view lacks, after the
 * view was switched, is drawn in the view's first zone. Its own `zoneId` is
 * kept, so switching back puts it where it was.
 */
export function resolveZoneId(view: SpecViewDefinition, zoneId: string): string {
    return view.zones.some((zone) => zone.id === zoneId) ? zoneId : view.zones[0].id;
}

/** The items of each zone of the view, in paint order. Every zone has an entry. */
export function groupItemsByZone(items: readonly SpecItem[], view: SpecViewDefinition): ReadonlyMap<string, readonly SpecItem[]> {
    const groups = new Map<string, SpecItem[]>(view.zones.map((zone) => [zone.id, []]));
    for (const item of items) {
        groups.get(resolveZoneId(view, item.zoneId))?.push(item);
    }
    return groups;
}

/** The property values a new item of `block` starts with. */
export function defaultProps(block: SpecBlockDefinition): SpecProps {
    return Object.fromEntries(Object.entries(block.properties).map(([name, property]) => [name, property.defaultValue]));
}

/**
 * The property values a new item starts with. Each label property gets a
 * random sample while `randomLabels` is on, and is left empty while it is off.
 * The label column of a list keeps its default labels while it is on, and is
 * emptied while it is off.
 */
export function initialProps(block: SpecBlockDefinition, randomLabels: boolean): SpecProps {
    const props: Record<string, SpecPropValue> = {...defaultProps(block)};
    for (const [name, property] of Object.entries(block.properties)) {
        if (property.kind === 'text' && property.labelSamples) {
            const samples = property.labelSamples;
            props[name] = randomLabels && samples.length > 0 ? samples[Math.floor(Math.random() * samples.length)] : '';
        } else if (property.kind === 'list' && !randomLabels) {
            const labelColumns = Object.keys(property.columns).filter((column) => isLabelColumn(property, column));
            props[name] = property.defaultValue.map((row) => ({...row, ...Object.fromEntries(labelColumns.map((column) => [column, '']))}));
        }
    }
    return props;
}

/**
 * The values an item's component is drawn with: one per property the block
 * declares, each one valid for its kind. A missing or invalid value falls back
 * to the default, and a value the block does not declare is left out, so the
 * component never gets an input it does not have.
 */
export function resolveProps(props: SpecProps, block: SpecBlockDefinition): Record<string, SpecPropValue> {
    const resolved: Record<string, SpecPropValue> = {};
    for (const [name, property] of Object.entries(block.properties)) {
        resolved[name] = validValue(property, props[name]);
    }
    return resolved;
}

/**
 * Which sides of an item can be dragged. A missing block keeps the size it was
 * saved with, so both of its sides can.
 *
 * @param props The item's property values, resolved with {@link resolveProps}.
 */
export function resizeModeOf(block: SpecBlockDefinition | undefined, props: SpecProps): SpecResizeMode {
    if (!block) {
        return 'both';
    }
    return typeof block.resize === 'function' ? block.resize(props) : block.resize;
}

/** `value` when it is valid for `property`, its default otherwise. */
export function validValue(property: SpecBlockProperty, value: unknown): SpecPropValue {
    switch (property.kind) {
        case 'text':
        case 'selection':
            return typeof value === 'string' ? value : property.defaultValue;
        case 'number':
            return typeof value === 'number' && Number.isFinite(value)
                ? Math.min(Math.max(value, property.min ?? -Infinity), property.max ?? Infinity)
                : property.defaultValue;
        case 'toggle':
            return typeof value === 'boolean' ? value : property.defaultValue;
        case 'choice':
            return property.options.some((option) => option.value === value) ? value as string : property.defaultValue;
        case 'token':
            return isTokenValue(value) ? value : property.defaultValue;
        case 'list':
            return Array.isArray(value) ? value.slice(0, property.maxRows).map((row: unknown) => validRow(property, row)) : property.defaultValue;
    }
}

/** A row of a list property with every column it declares, each one valid for its kind. */
export function validRow(property: SpecListProperty, row: unknown): SpecListRow {
    const values = isRecord(row) ? row : {};
    const valid: Record<string, string> = {};
    for (const [name, column] of Object.entries(property.columns)) {
        valid[name] = validCell(column, values[name]);
    }
    return valid;
}

/** `value` when it is valid for a column of a list property, the column's default otherwise. */
function validCell(column: SpecListColumn, value: unknown): string {
    switch (column.kind) {
        case 'choice':
            return column.options.some((option) => option.value === value) ? value as string : column.defaultValue;
        case 'token':
            return isTokenValue(value) ? value : column.defaultValue;
        case 'text':
            return typeof value === 'string' ? value : column.defaultValue;
    }
}

/** A row of a list property with every column at its default. */
export function defaultRow(property: SpecListProperty): SpecListRow {
    return validRow(property, {});
}

/** The labels of a list's rows, such as the labels of a form's fields, without empty ones. */
export function listLabels(property: SpecListProperty, rows: readonly SpecListRow[]): string[] {
    const labelColumn = Object.keys(property.columns).find((column) => isLabelColumn(property, column));
    return labelColumn ? rows.map((row) => row[labelColumn].trim()).filter((label) => label.length > 0) : [];
}

function isLabelColumn(property: SpecListProperty, name: string): boolean {
    const column = property.columns[name];
    return column.kind === 'text' && column.isLabel === true;
}

/** True for `''`, which means no colour, and for a CSS custom property name. */
export function isTokenValue(value: unknown): value is string {
    return typeof value === 'string' && (value === '' || TOKEN_NAME.test(value));
}

/** An id no item of `items` has: `item-1`, `item-2`, … */
export function createItemId(items: readonly SpecItem[]): string {
    const taken = new Set(items.map((item) => item.id));
    let number = items.length + 1;
    while (taken.has(`item-${number}`)) {
        number++;
    }
    return `item-${number}`;
}

/** The lines of a multi-line text property, without blank ones. */
export function splitLines(text: string): string[] {
    return text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
}

function readItems(values: unknown[]): SpecItem[] {
    const items: SpecItem[] = [];
    for (const value of values) {
        if (!isRecord(value) || typeof value['blockType'] !== 'string' || typeof value['zoneId'] !== 'string') {
            continue;
        }

        const id = readString(value['id'], '');
        items.push({
            // A missing or repeated id gets a new one: ids key the selection
            // and the list rendering, so two items must never share one.
            id: id && !items.some((item) => item.id === id) ? id : createItemId(items),
            blockType: RENAMED_BLOCK_TYPES.get(value['blockType']) ?? value['blockType'],
            zoneId: value['zoneId'],
            rect: readRect(value['rect']),
            props: readProps(value['props']),
            note: readString(value['note'], ''),
            locked: value['locked'] === true
        });
    }
    return items;
}

function readRect(value: unknown): SpecRect {
    const rect = isRecord(value) ? value : {};
    return {
        x: Math.max(0, readNumber(rect['x'], 0)),
        y: Math.max(0, readNumber(rect['y'], 0)),
        width: Math.max(SPEC_MIN_ITEM_SIZE, readNumber(rect['width'], 120)),
        height: Math.max(SPEC_MIN_ITEM_SIZE, readNumber(rect['height'], 40))
    };
}

function readProps(value: unknown): SpecProps {
    if (!isRecord(value)) {
        return {};
    }

    const props: Record<string, SpecPropValue> = {};
    for (const [name, propValue] of Object.entries(value)) {
        if (typeof propValue === 'string' || typeof propValue === 'boolean' || (typeof propValue === 'number' && Number.isFinite(propValue))) {
            props[name] = propValue;
        } else if (Array.isArray(propValue)) {
            props[name] = propValue.filter(isRecord).map(readRow);
        }
    }
    return props;
}

/** The text values of one row of a list property. Its columns are checked when the item is drawn, as other values are. */
function readRow(value: Record<string, unknown>): SpecListRow {
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

/** One page of a file. A missing or repeated id gets a new one, as item ids do. */
function readPage(value: Record<string, unknown>, before: readonly SpecPage[], config: SpecBuilderConfig): SpecPage {
    const empty = createPage(config, before);
    const id = readString(value['id'], '');
    return {
        id: id && !before.some((page) => page.id === id) ? id : empty.id,
        name: readString(value['name'], empty.name),
        viewId: readString(value['viewId'], empty.viewId),
        size: readSize(value['size'], empty.size),
        items: Array.isArray(value['items']) ? readItems(value['items']) : []
    };
}

function readSize(value: unknown, fallback: SpecSize): SpecSize {
    if (!isRecord(value)) {
        return fallback;
    }

    const side = (side: unknown, sideFallback: number) =>
        Math.round(Math.min(Math.max(readNumber(side, sideFallback), PAGE_SIDE_LIMITS.min), PAGE_SIDE_LIMITS.max));
    return {width: side(value['width'], fallback.width), height: side(value['height'], fallback.height)};
}

function readString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
