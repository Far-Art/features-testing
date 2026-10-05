# Spec Builder

A page where the spec team lays out the design system's components and simple
shapes on a page layout, takes screenshots of it for the spec document, and
hands developers a numbered reference. Routed at `/spec-builder`.

Everything lives in this folder, so it can be copied to the application it
ships to (Angular 18.2, CDK 18.2). The only files outside it are the route in
`src/app/app.routes.ts` and the nav link in `src/app/app.html`.

## Using it

**Pages**: a spec holds one or more pages, saved together in one file, for
example one page per business case: a balloon loan on one, a Shpitzer loan on
the next. The tabs above the canvas switch pages, and their buttons add an
empty page or copy the page on screen. With nothing selected, the inspector
edits the page's name, layout and size, and duplicates, reorders or deletes it.
Each page numbers its own items. Undo and redo go to the page they change.

**Process or tool name**: set once for the whole spec, in the "all pages"
panel the inspector shows with nothing selected. The shared header of every
page shows it, and the Markdown export names it under the spec's title.

**Forms**: the Form block (טופס) lays its fields out with
`ims-form-field-grid`, so labels and controls line up in columns as on a real
page. Its fields are a list in the inspector: each has a label, a type (text,
long text, select, date, checkbox, yes/no toggle or read-only value), a width,
whether it takes the whole row, and an example value. Columns and how spare
width is shared are settings of the form. The reference gives the full grid
template. Fields placed one by one do not line up with each other, because
each sizes its own label; use a form wherever labels should align.

**Select**: single or multiple, with the selected values checked off in a
list of its options (one at most while it is single), clearable,
the filter and multi-select toolbar modes, invalid, readonly and disabled.
"List open" draws the list open under the field, in every mode and in
screenshots. It is drawn inside the page with the select's own panel
classes, because the real list is a CDK overlay outside the page: not scaled
with it, and closed by the first click elsewhere. In preview mode the real
list still opens on a click.

**Text field**: besides its label, value and width, it takes the
`imsPattern` guard (a preset with optional min and max, or a regular
expression of your own), an `imsFormat` or `imsFormatCurrency` display, a
maximum length, and invalid, readonly and disabled states. The field carries
the real directives with `ngModel`: the example value, typed raw such as
`1234.5`, is shown formatted as at rest, and in preview mode typing is guarded,
refusals are explained by an `ims-error-popover`, and leaving the field
formats it. What is typed in preview is not saved; the example value is.

**Typing into a field while editing**: double-click a text field, or press
Enter on it, to type into it on the page, through its pattern and format.
The outline turns dashed while you type, and what you type becomes its
example value. Escape, or clicking elsewhere, ends it.

**Grid and table**: Grid (גריד) is the design system's `ims-grid`; its
"styled" appearance is defined in `src/styles/ims-grid-appearances.scss`.
Table (טבלה) is a plain HTML `<table>`, with its borders, border colour and
header fill as settings, since the design system has no table styles. Any of
its rows, the header row included, and any of its columns can be given a
background, a text colour and a weight, and a column an alignment. A row's
style wins over a column's. The reference writes the example table out with
those styles inline on its cells. Items saved
before the rename, under the type `table`, open as grids.

**Text**: the Text and Heading blocks draw a real `span`, `p` or `h1`–`h6`,
picked in the Tag setting, so the text takes the style the page's stylesheets
give that tag. Size, weight and colour override it only when chosen.

**Modes**, in the toolbar:

| Mode | What it is for |
| --- | --- |
| Edit | Add, move, resize and configure items. Components are `inert`, so a click selects instead of opening a list. |
| Preview | The page alone, with live components. Open a list or a datepicker to show it in a screenshot. |
| Inspect | Read-only, for developers. Click an item, or pick it in the list, to read its component, selector, settings, colour tokens, note and template. |

**Adding**: drag a block from the palette onto the page, or click it to add it
to the first zone. The block's corner lands where it is released. While
"random labels" in the palette is checked, which it is by default, a new field,
checkbox, radio group or toggle switch gets a random label from its block's
samples. Unchecked, new elements get no label.

**Locking**: the "lock position and size" checkbox in the inspector keeps an
item where it is. A locked item cannot be dragged, resized or nudged, and its
position fields are disabled. Its settings, note and deletion still work. A
lock mark shows on the item while editing, and in the elements list.

**Elements list**: while editing, the start column switches between Add, the
palette, and List: every element on the page, zone by zone in reading order,
with its badge number and its label or text. Click a row to select the element
and scroll it into view.

**Moving and resizing**: drag an item to move it, also into another zone of the
view. Drag a handle on its inline-end edge, block-end edge or corner to resize
it. While snapping is on, an item steps along the grid as it is dragged and
resized. Pick the grid step in the toolbar. A side a block cannot resize
follows the component's own size; the inspector says "according to content"
(לפי התוכן) for it.

**Width**: the text field, select, autocomplete, button, checkbox, radio group
and toggle switch have a Width setting. "Free" makes the item as wide as its
edge handle drags it, and the control fills it. Otherwise the width follows
the content, or one of the design system's `field-*` sizes for fields. The
datepicker keeps its own width. Switching to free starts from the width the
item is drawn at.

**Keyboard**, while the canvas or an item has focus:

| Keys | Action |
| --- | --- |
| Tab / Shift+Tab | Next / previous item, which selects it |
| Arrows | Move 1 px; with Shift, one grid step |
| Delete or Backspace | Delete the item |
| Ctrl+D | Duplicate the item |
| Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y | Undo, redo |
| Ctrl + `+` / `-` / `0`, Ctrl + wheel | Zoom in, out, 100% |
| Escape | Clear the selection |

The keys belong to the canvas only, so typing in the inspector never moves or
deletes an item. Every change can be undone. A run of nudges, one resize, or
the keystrokes typed into one field undo as one step.

**Zoom**: Fit keeps the whole page visible as the window changes. The steps
are Chrome's, 25% to 500%. The zoom only changes how the page is drawn, never
the positions saved.

**Saving**: Save downloads `<name>.spec.json` with every page, and Open reads
one back; Open can be undone. Files from the one-page format, and drafts saved
in it, open as a spec with one page. The page in progress is also kept in the browser and comes back
after a reload. A file is checked as it is opened. A block this builder does
not know is drawn as a red "unknown block" frame and kept, not dropped.

**Screenshots**: the camera button shares the current tab with itself and
cuts the page out of one frame. Editing aids are hidden for the frame, and
number badges stay if numbering is on.

- The first screenshot asks to share the tab. Choose this tab. The share is
  kept for the next screenshots until you stop it, from the toolbar or from
  the browser's bar.
- The image is what is on screen. Take it at 100% for real size. If part of
  the page is scrolled away, the builder says so; press Fit and take it again.
- The timer button waits 3 seconds, so you can open a list or a popup in
  preview mode first.
- The result can be copied to the clipboard or downloaded as a PNG.
- Needs Chrome or Edge, on https or localhost. Elsewhere, use preview mode and
  DevTools' "Capture node screenshot" on the page element (`[data-spec-page]`).

**Developer reference**: number badges, shown with the numbering toggle and
always in inspect mode, follow reading order: zone by zone, then top to bottom,
then from the inline start. The Markdown export, from the toolbar or the
inspect panel, covers every page: a heading, a summary table and one section
per item for each. Each section has
the item's settings, every colour token with its current value, the note, and
a template to paste.

## Folder map

| Path | Purpose |
| --- | --- |
| `spec-builder.ts` | Page shell. Provides every service, restores the draft, and runs the one effect, the draft autosave. |
| `spec-builder.config.ts` | **The file an environment edits**: blocks, views, page sizes, grid steps, zoom steps, token prefixes, draft key, exit URL. |
| `core/spec-builder.types.ts` | Document model, block and view definitions, `defineSpecBlock`. |
| `core/spec-builder.labels.ts` | Every string of the builder's own interface. Blocks and views carry their own captions. |
| `core/spec-builder.store.ts` | The document with undo history, selection, mode, and view options. |
| `core/spec-*.utils.ts` | Pure functions: document parsing and checking, geometry, numbering, Markdown. |
| `core/spec-*.service.ts` | Zoom, the link to the drawn page (`surface`), colour tokens, files, reference, screenshots. |
| `core/spec-tab-capture.engine.ts` | The screenshot engine: tab capture. |
| `ui/` | Toolbar, palette, elements list, page tabs, canvas, zone, item frame, inspector, reference panel, token picker, resize directive. |
| `views/` | **Placeholders** of the process and tools layouts and their shared header. |
| `blocks/` | One file per palette entry: a small wrapper component and its definition. |

## Adding a block

1. Create `blocks/spec-block-<name>.ts` with a wrapper component. Give it
   one `input.required` per setting, and keep every other member `protected`.
2. Below it, declare the block with `defineSpecBlock`. `properties` must name
   each input of the wrapper, and the build fails on a typo or a missing one.
3. Add it to `SPEC_BLOCKS` in `blocks/index.ts`.

```ts
@Component({
    selector: 'app-spec-block-badge',
    standalone: true,
    template: `<span class="badge" [style.background]="fillCss()">{{ text() }}</span>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockBadge {
    readonly text = input.required<string>();
    readonly fill = input.required<string>();

    protected readonly fillCss = computed(() => tokenColor(this.fill()));
}

export const BADGE_BLOCK = defineSpecBlock({
    type: 'badge',                    // saved in files: never rename it
    label: 'תג',
    category: 'layout',
    icon: 'label',                    // Material Symbols name
    component: SpecBlockBadge,
    resize: 'none',                   // 'none' | 'width' | 'both'
    defaultSize: {width: 80, height: 24},
    properties: {
        text: {kind: 'text', label: 'טקסט', defaultValue: 'חדש'},
        fill: {kind: 'token', label: 'מילוי', defaultValue: '--ims-color-status-info-subtle', use: 'fill'}
    },
    reference: {
        selector: 'span.badge',
        snippet: (props) => `<span class="badge">${escapeHtml(String(props['text']))}</span>`
    }
});
```

Give a `text` property `labelSamples` when it is the element's label: new
items then get a random sample, or no label while random labels are off.

`resize` may also be a function of the item's property values. Use
`widthResize` from `blocks/spec-block-options.ts` for a block with a `width`
choice, so the width can be dragged only while it is free.

Property kinds are `text` (with `multiline` for lists, one per line),
`number`, `toggle`, `choice`, `token`, `selection`, and `list`. A `selection`
picks lines of another property (`optionsFrom`), one at most unless the toggle
named by `multipleFrom` is on, and is edited as checkboxes. A block whose
component has a field of its own can name the property typing into it sets
with `typedProperty`. A `list` holds rows with the
same columns, each a `text`, a `choice` or a colour `token`, and the inspector edits it as cards
that can be added, reordered and removed; see the fields of
`blocks/spec-block-form.ts`. Mark a list's label column with `isLabel`, so
random labels apply to it. A `token` property holds a CSS
custom property name, or `''` for none. Use `use: 'fill'` only for a value
painted with `background`, since background tokens may be gradients.

Wrap components rather than placing them raw. A wrapper can project text, pass
an attribute directive such as `button[ims-button]`, and declare `ims-option`s
inside `ims-select`, where the select can see them.

## Views and the shared header

A view is a layout component that places one `<app-spec-builder-zone
zoneId="…">` per zone it declares in `views/index.ts`. Zones take whatever size
the layout gives them, and items are positioned from each zone's inline-start
top corner.

In the target environment:

- Replace `views/spec-view-header.ts` with the real shared header, or point
  both views at the real header component. Bind its title to
  `store.document().title`, as the views bind the placeholder's `title`.
- Make the tools and process views wrap the real prebuilt layouts, putting a
  zone in each content slot. Keep the zone ids, because they are saved in
  files.
- An item whose zone the current view lacks is drawn in the view's first zone
  and keeps its own zone id, so switching views loses nothing.

## Screenshot engine

The engine is the abstract `SpecScreenshotEngine`, provided in
`spec-builder.ts`. To capture differently, for example with a DOM-to-image
library that needs no permission prompt, write a subclass and change that one
provider. The engine gets the page and its scroll area. It runs after the
builder has hidden its editing aids.

## Porting to the Angular 18.2 application

- Copy this folder. Fix the relative imports of the design-system components
  (`../../components/...`), `ims-input.directive.ts` and the snackbar and
  dialog services, if their paths differ.
- Requires `@angular/cdk` 18.2 or later: items are moved with `cdkDrag` and
  `cdkDragScale`, which arrived in CDK 18.2.
- The builder covers the whole window (`position: fixed`, `z-index: 100`),
  under CDK overlays. To embed it in a layout instead, change `:host` in
  `spec-builder.scss` to `position: relative` and give its parent a definite
  height.
- Check `exitUrl`, `draftStorageKey` and the token prefixes in
  `spec-builder.config.ts`.
- Two components the builder imports use newer syntax in this repository:
  `ims-select.ts` (`findLastIndex`, `focusVisible`) and `ims-popover-panel.ts`
  (`@else if (…; as …)`). The target application's own versions are used
  there, so only these copies are affected.

## Rules for changes

- Angular 18.2 APIs only. No `linkedSignal`, `afterRenderEffect`,
  `afterEveryRender` or `resource`, and no ES2023 methods such as `toSorted`
  or `findLast`. Write `standalone: true` and `ChangeDetectionStrategy.OnPush`
  explicitly, since Angular 18 defaults to neither.
- Keep the single `effect`, the draft autosave in `spec-builder.ts`, which
  writes no signal. Derive state with `computed`, and change it in methods.
- Order class members as fields first (inputs, outputs, injected services,
  state, computed), then the constructor, then methods.
- Change the document only through `SpecBuilderStore`. Convert screen points
  only through `SpecSurfaceService`, which is the one place that knows about
  zoom, scrolling and reading direction.
- Style with `--ims-*` tokens only, and write full class names. Keep transforms
  and transitions out of animations, because the target machines have no GPU.
  Editing aids divide their sizes by `--spec-zoom` so they keep one size on
  screen.

## Known limits

- Tab capture needs Chrome or Edge and a secure context.
- Lists and popups opened from the page render in the CDK overlay container,
  so they are not scaled by the zoom. Capture them at 100%.
- Not in this version: multiple selection, grouping, alignment guides, a layers
  panel, nested containers, and a named list of saved specs.
