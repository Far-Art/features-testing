import {Signal, Type} from '@angular/core';

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** A point in CSS pixels. */
export interface SpecPoint {
    readonly x: number;
    readonly y: number;
}

/** Width and height in CSS pixels. */
export interface SpecSize {
    readonly width: number;
    readonly height: number;
}

/**
 * Position and size of an item inside its zone, in CSS pixels at 100% zoom.
 *
 * `x` is measured from the zone's inline-start edge, not from the left, so the
 * same numbers describe the same layout in RTL and in LTR.
 */
export interface SpecRect extends SpecPoint, SpecSize {
}

// ---------------------------------------------------------------------------
// Document: everything that is saved to a file
// ---------------------------------------------------------------------------

/** One row of a list property, such as one field of a form: a text per column. */
export type SpecListRow = Readonly<Record<string, string>>;

/** Value of one block property. Plain JSON, so a document saves as it is. */
export type SpecPropValue = string | number | boolean | readonly SpecListRow[];

/** Property values of one item, keyed by the property name. */
export type SpecProps = Readonly<Record<string, SpecPropValue>>;

/** One component or shape placed on the page. */
export interface SpecItem {
    readonly id: string;
    /** `type` of the block that draws the item. See {@link SpecBlockDefinition}. */
    readonly blockType: string;
    /** `id` of the zone the item sits in. See {@link SpecZoneDefinition}. */
    readonly zoneId: string;
    readonly rect: SpecRect;
    readonly props: SpecProps;
    /** Free text for developers. It is part of the reference, not of the page. */
    readonly note: string;
    /** Keeps the item where it is and as big as it is: it cannot be moved or resized until unlocked. */
    readonly locked?: boolean;
}

/**
 * One page of a spec, such as the screen one business case shows: a balloon
 * loan on one page, a Shpitzer loan on the next. The order of `items` is the
 * paint order: the last one is on top.
 */
export interface SpecPage {
    readonly id: string;
    readonly name: string;
    /** `id` of the page layout. See {@link SpecViewDefinition}. */
    readonly viewId: string;
    /** Size of the page, as a browser viewport would give it. */
    readonly size: SpecSize;
    readonly items: readonly SpecItem[];
}

/** A spec: one or more pages, saved together in one file. */
export interface SpecDocument {
    readonly schemaVersion: number;
    readonly name: string;
    /** Name of the process or tool the spec describes. The shared header of every page shows it. */
    readonly title: string;
    /** Never empty. */
    readonly pages: readonly SpecPage[];
}

// ---------------------------------------------------------------------------
// Blocks: what the palette offers
// ---------------------------------------------------------------------------

/** Palette section a block is listed under. */
export type SpecBlockCategory = 'shapes' | 'actions' | 'fields' | 'choices' | 'layout';

/**
 * Which sides of an item the user can drag.
 *
 * A side that cannot be dragged follows the component's own size. A button is
 * `none`: the design system decides how big it is. A field is `width`: its
 * height is the field height. A shape is `both`.
 */
export type SpecResizeMode = 'none' | 'width' | 'both';

/** What a token property may be painted with. Only a fill may take a background token. */
export type SpecTokenUse = 'color' | 'fill';

interface SpecPropertyBase {
    /** Caption of the property in the inspector and in the reference. */
    readonly label: string;
    /** Help shown under a text field in the inspector, such as how to type a list. */
    readonly hint?: string;
}

export interface SpecTextProperty extends SpecPropertyBase {
    readonly kind: 'text';
    readonly defaultValue: string;
    /** Edited in a textarea. Used for lists, one entry per line. */
    readonly multiline?: boolean;
    /**
     * Marks the property as the element's label. A new item gets one of these
     * at random while random labels are on, and no label while they are off.
     */
    readonly labelSamples?: readonly string[];
}

export interface SpecNumberProperty extends SpecPropertyBase {
    readonly kind: 'number';
    readonly defaultValue: number;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
}

export interface SpecToggleProperty extends SpecPropertyBase {
    readonly kind: 'toggle';
    readonly defaultValue: boolean;
}

export interface SpecChoiceOption {
    readonly value: string;
    readonly label: string;
}

export interface SpecChoiceProperty extends SpecPropertyBase {
    readonly kind: 'choice';
    readonly defaultValue: string;
    readonly options: readonly SpecChoiceOption[];
}

/** A colour picked from the CSS tokens. The value is the token name, or `''` for none. */
export interface SpecTokenProperty extends SpecPropertyBase {
    readonly kind: 'token';
    readonly defaultValue: string;
    readonly use: SpecTokenUse;
}

/**
 * Values picked from the lines of another property, such as the selected
 * options of a select. The inspector offers one checkbox per line of that
 * property. The value keeps the picked lines one per line, in the order the
 * other property lists them, so it reads like a multi-line text property.
 */
export interface SpecSelectionProperty extends SpecPropertyBase {
    readonly kind: 'selection';
    readonly defaultValue: string;
    /** Name of the multi-line text property whose lines are offered. */
    readonly optionsFrom: string;
    /** Name of the toggle property that allows several values. Without it, or while it is off, one value at most is picked. */
    readonly multipleFrom?: string;
}

/** A column of a list property that holds free text. */
export interface SpecListTextColumn {
    readonly kind: 'text';
    readonly label: string;
    readonly defaultValue: string;
    /**
     * Marks the column as the rows' labels. A new item keeps the labels of
     * its default rows while random labels are on, and has none while they are off.
     */
    readonly isLabel?: boolean;
}

/** A column of a list property that holds one of a few values. */
export interface SpecListChoiceColumn {
    readonly kind: 'choice';
    readonly label: string;
    readonly defaultValue: string;
    readonly options: readonly SpecChoiceOption[];
}

/** A column of a list property that holds a colour token name, or `''` for none. */
export interface SpecListTokenColumn {
    readonly kind: 'token';
    readonly label: string;
    readonly defaultValue: string;
    readonly use: SpecTokenUse;
}

export type SpecListColumn = SpecListTextColumn | SpecListChoiceColumn | SpecListTokenColumn;

/**
 * A list of rows with the same columns, such as the fields of a form. The
 * inspector edits it as a list of small cards that can be added, reordered
 * and removed.
 */
export interface SpecListProperty extends SpecPropertyBase {
    readonly kind: 'list';
    readonly defaultValue: readonly SpecListRow[];
    /** The columns of a row in the order the inspector shows them, keyed by the name a row stores them under. */
    readonly columns: Readonly<Record<string, SpecListColumn>>;
    /** What one row is called, such as "שדה", for its caption and the button that adds one. */
    readonly rowLabel: string;
    /** Most rows a list may hold. */
    readonly maxRows: number;
}

/** One editable setting of a block, and the editor the inspector shows for it. */
export type SpecBlockProperty =
    | SpecTextProperty
    | SpecNumberProperty
    | SpecToggleProperty
    | SpecChoiceProperty
    | SpecTokenProperty
    | SpecSelectionProperty
    | SpecListProperty;

/** What a developer needs to find and write the real component. */
export interface SpecBlockReference {
    /** Selector to search the code base for, such as `button[ims-button]`. Empty for a plain shape. */
    readonly selector: string;
    /** Template a developer can paste, built from the item's property values. */
    readonly snippet?: (props: SpecProps) => string;
    /** Language of the snippet, for highlighting in the Markdown export. */
    readonly language?: 'html' | 'css';
}

/**
 * One palette entry: what it is called, the component that draws it, and the
 * settings a spec author can change.
 *
 * Write definitions with {@link defineSpecBlock}, which checks the property
 * names against the component.
 */
export interface SpecBlockDefinition {
    /** Stable name saved in documents. Renaming it orphans the items already saved. */
    readonly type: string;
    readonly label: string;
    readonly category: SpecBlockCategory;
    /** Material Symbols name shown beside the label in the palette. */
    readonly icon: string;
    /** Wrapper component. It gets one input per entry of `properties`. */
    readonly component: Type<unknown>;
    /**
     * Which sides can be dragged. A function decides from the item's property
     * values, for a block whose width is either free or set by a size class.
     * Read it with `resizeModeOf`.
     */
    readonly resize: SpecResizeMode | ((props: SpecProps) => SpecResizeMode);
    /** Size a new item starts with, on the sides that can be dragged. */
    readonly defaultSize: SpecSize;
    /** Settings in the order the inspector lists them, keyed by the wrapper's input name. */
    readonly properties: Readonly<Record<string, SpecBlockProperty>>;
    readonly reference: SpecBlockReference;
    /**
     * Name of the text property that typing into the component's own field
     * sets, such as a text field's example value. While editing, a
     * double-click or Enter on such an item lets the user type into the
     * field, through whatever directives it carries.
     */
    readonly typedProperty?: string;
}

/**
 * Names of a wrapper component's inputs.
 *
 * Reads every public signal as an input, which holds as long as a wrapper keeps
 * its other signals `protected`, as template-only members are in this code base.
 */
export type SpecBlockInputName<C> = {
    [K in keyof C]: C[K] extends Signal<unknown> ? K : never
}[keyof C] & string;

/** A {@link SpecBlockDefinition} as it is written, with its properties tied to the wrapper's inputs. */
export interface SpecBlockSource<C> extends Omit<SpecBlockDefinition, 'component' | 'properties'> {
    readonly component: Type<C>;
    readonly properties: Readonly<Record<SpecBlockInputName<C>, SpecBlockProperty>>;
}

/**
 * Declares a block and checks it against its wrapper component.
 *
 * `properties` must name every input of the wrapper and nothing else. A typo,
 * or an input added without a property, fails the build instead of throwing
 * NG0303 or NG0950 when the item is first drawn.
 */
export function defineSpecBlock<C>(source: SpecBlockSource<C>): SpecBlockDefinition {
    return source;
}

// ---------------------------------------------------------------------------
// Views: the page layouts a spec can use
// ---------------------------------------------------------------------------

/** An area of a view that holds items. */
export interface SpecZoneDefinition {
    /** Stable name saved in documents. */
    readonly id: string;
    readonly label: string;
}

/**
 * A page layout, such as the tools page or the process page.
 *
 * The component draws the layout and places one `<app-spec-builder-zone>` per
 * entry of `zones`, with the matching `zoneId`.
 */
export interface SpecViewDefinition {
    /** Stable name saved in documents. */
    readonly id: string;
    readonly label: string;
    readonly component: Type<unknown>;
    readonly zones: readonly SpecZoneDefinition[];
}

// ---------------------------------------------------------------------------
// Configuration: what an environment sets up
// ---------------------------------------------------------------------------

/** A page size offered in the page settings. */
export interface SpecPagePreset {
    readonly label: string;
    readonly size: SpecSize;
}

/** Which CSS custom properties are offered as colours. */
export interface SpecTokenSource {
    /** Start of the property name, such as `--ims-color-`. */
    readonly prefix: string;
    readonly kind: SpecTokenKind;
}

/** Everything that differs between the environments the builder runs in. */
export interface SpecBuilderConfig {
    readonly blocks: readonly SpecBlockDefinition[];
    /** The first view is the one a new document starts with. */
    readonly views: readonly SpecViewDefinition[];
    /** The first preset is the size a new document starts with. */
    readonly pagePresets: readonly SpecPagePreset[];
    /** Grid step, in CSS pixels, a builder starts with: the snapping step and a Shift + arrow nudge. */
    readonly gridSize: number;
    /** Grid steps offered in the toolbar, ascending. */
    readonly gridSizes: readonly number[];
    /** Zoom levels in percent, ascending. */
    readonly zoomSteps: readonly number[];
    readonly tokenSources: readonly SpecTokenSource[];
    /** `localStorage` key of the page in progress. */
    readonly draftStorageKey: string;
    /** Where the exit button leads. */
    readonly exitUrl: string;
}

// ---------------------------------------------------------------------------
// Editor state
// ---------------------------------------------------------------------------

/**
 * What the builder is being used for.
 *
 * - `edit`: place, move and configure items.
 * - `preview`: the page alone, with live components.
 * - `inspect`: read-only; a developer clicks an item to read its settings.
 */
export type SpecBuilderMode = 'edit' | 'preview' | 'inspect';

// ---------------------------------------------------------------------------
// Colour tokens
// ---------------------------------------------------------------------------

/** `color` is valid wherever CSS takes a colour. `background` may be a gradient, so it only fills. */
export type SpecTokenKind = 'color' | 'background';

export interface SpecToken {
    /** Custom property name, such as `--ims-color-border`. */
    readonly name: string;
    /** The name without the prefix every token of its source shares. */
    readonly label: string;
    readonly kind: SpecTokenKind;
}

/** Tokens that belong together, such as one colour ramp. */
export interface SpecTokenGroup {
    readonly id: string;
    readonly tokens: readonly SpecToken[];
}

// ---------------------------------------------------------------------------
// Developer reference
// ---------------------------------------------------------------------------

/** One setting of an item, as shown to a developer. */
export interface SpecReferenceSetting {
    readonly label: string;
    readonly value: string;
    /** Token name when the setting is a colour token, so it can be shown with a swatch. */
    readonly token: string | null;
}

/** Everything the reference says about one item. */
export interface SpecReferenceEntry {
    /** The number on the item's badge. */
    readonly number: number;
    readonly itemId: string;
    readonly blockLabel: string;
    readonly selector: string;
    readonly zoneLabel: string;
    readonly rect: SpecRect;
    readonly resize: SpecResizeMode;
    readonly settings: readonly SpecReferenceSetting[];
    readonly snippet: string;
    readonly snippetLanguage: 'html' | 'css';
    readonly note: string;
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/** What to take a picture of. */
export interface SpecCaptureRequest {
    /** The page being specified. */
    readonly page: HTMLElement;
    /** The scrolling area the page is shown in. Only what it shows can be captured. */
    readonly viewport: HTMLElement;
}

export interface SpecCapture {
    readonly image: Blob;
    /** False when part of the page was scrolled out of view and is missing from the image. */
    readonly complete: boolean;
}
