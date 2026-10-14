import {CDK_ACCORDION, CdkAccordionItem} from '@angular/cdk/accordion';
import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    DoCheck,
    ElementRef,
    forwardRef,
    inject,
    input,
    signal
} from '@angular/core';
import {ImsGridCellV2} from '../ims-grid-v2/ims-grid-cell-v2';
import {IMS_GRID_CONTEXT_V2, IMS_GRID_ROW_CONTEXT_V2} from '../ims-grid-v2/ims-grid-v2.tokens';
import {ImsExpansionPanelHeaderV2} from './ims-expansion-panel-header-v2';
import {
    IMS_EXPANSION_PANEL_V2,
    ImsExpansionPanelContextV2,
    ImsExpansionPanelSeverityV2,
    ImsExpansionPanelVariationV2
} from './ims-expansion-panel-v2.tokens';

/**
 * A box whose body opens and closes under an always-visible header.
 *
 * ```html
 * <ims-expansion-panel-v2>
 *     <ims-expansion-panel-header-v2><h3>פרטי פוליסה</h3></ims-expansion-panel-header-v2>
 *     <ims-expansion-panel-body-v2>מספר פוליסה 41-220-8873.</ims-expansion-panel-body-v2>
 * </ims-expansion-panel-v2>
 * ```
 *
 * The state is `CdkAccordionItem`'s: `expanded` (two-way bindable), `disabled`,
 * `open()`, `close()`, `toggle()`, and the `opened`, `closed` and
 * `expandedChange` outputs. Inside an `ims-accordion-v2`, opening one panel closes
 * the others unless the accordion is `multi`.
 *
 * In an `ims-grid-v2`, an `ims-grid-row-v2` takes the header's place and the panel
 * becomes a group of rows in the grid; on a `tbody`, the first `tr` is the
 * header and every later one is the body. Written inside an `ims-grid-row-v2`
 * instead, the panel is that row's content: its header holds the row's cells
 * and its body holds nested rows, all on the grid's columns. See the README.
 *
 * Presentation comes from the global src/styles/ims-expansion-panel-v2.scss.
 */
@Component({
    selector: 'ims-expansion-panel-v2, tbody[ims-expansion-panel-v2]',
    exportAs: 'imsExpansionPanelV2',
    standalone: true,
    template: `
        @if (isTableBody) {
            <ng-content select="tr"/>
        } @else {
            <ng-content select="ims-expansion-panel-header-v2, ims-grid-row-v2"/>
            <div
                class="ims-expansion-panel-v2__region"
                [id]="bodyId"
                [attr.role]="regionRole()"
                [attr.aria-labelledby]="regionLabelledBy()"
            >
                <div class="ims-expansion-panel-v2__region-content" [attr.role]="regionContentRole()">
                    <ng-content/>
                </div>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        // Restated from CdkAccordionItem, since providers are not inherited: a
        // panel nested in this one's body belongs to no accordion, rather than
        // joining the one this panel is in.
        {provide: CDK_ACCORDION, useValue: undefined},
        {provide: IMS_EXPANSION_PANEL_V2, useExisting: forwardRef(() => ImsExpansionPanelV2)}
    ],
    host: {
        class: 'ims-expansion-panel-v2',
        '[class.ims-expansion-panel-v2--expanded]': 'isExpanded()',
        '[class.ims-expansion-panel-v2--disabled]': 'isDisabled()',
        '[class.ims-expansion-panel-v2--grid-row]': 'isGridRow()',
        '[class.ims-expansion-panel-v2--in-grid-row]': 'isInGridRow',
        '[class.ims-expansion-panel-v2--secondary]': 'variation() === "secondary"',
        '[class.ims-expansion-panel-v2--info]': 'severity() === "info"',
        '[class.ims-expansion-panel-v2--success]': 'severity() === "success"',
        '[class.ims-expansion-panel-v2--warning]': 'severity() === "warning"',
        '[class.ims-expansion-panel-v2--danger]': 'severity() === "danger"',
        '[class.ims-expansion-panel-v2--invalid]': 'invalid()'
    }
})
export class ImsExpansionPanelV2 extends CdkAccordionItem implements ImsExpansionPanelContextV2, DoCheck {
    private readonly expandedState = signal(false);
    /** The same value as `expanded`, as a signal, so the OnPush views that show it follow it. */
    readonly isExpanded = this.expandedState.asReadonly();
    private readonly disabledState = signal(false);
    /** The same value as `disabled`, as a signal, so the OnPush views that show it follow it. */
    readonly isDisabled = this.disabledState.asReadonly();
    /**
     * `default` paints the header in the house-blue band with a light toggle;
     * `secondary` paints it white with a dark one. The toggle follows unless
     * it names a variation of its own.
     *
     * @defaultValue `'default'`
     */
    readonly variation = input<ImsExpansionPanelVariationV2>('default');
    /**
     * The tone the panel is painted in: its frame, body, header band and header
     * text, in the colours `ims-panel` gives the same severity. A light toggle
     * hovers and presses in it too. A `secondary` panel keeps its white header
     * and takes the rest.
     *
     * `neutral` is the default and binds no class of its own, as on `ims-panel`.
     *
     * @defaultValue `'neutral'`
     */
    readonly severity = input<ImsExpansionPanelSeverityV2>('neutral');
    /**
     * Whether the panel's content needs attention: a field inside it that does
     * not validate, say, which nobody sees while the panel is closed. The
     * header's text and the toggle turn danger red, the toggle over any
     * severity of its own; the panel keeps its severity — frame, band, body —
     * so it still reads as the panel it is.
     *
     * Colour does not reach a screen reader, so say it in the toggle's
     * `expandLabel` too.
     *
     * @defaultValue `false`
     */
    readonly invalid = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});
    /**
     * Hides the panel's toggle, rather than greying it out as `disabled` does:
     * the one in its header, and an `ims-expansion-panel-toggle-v2` placed in a
     * cell of the row that heads it in a grid or a table. The toggle keeps its
     * space, so the header's title or the row's height stay as they are. For a
     * row with nothing to show, bind it together with `disabled`, so Enter on
     * the row or an accordion's `openAll()` cannot open it either.
     *
     * Only the button goes. The panel still opens from `expanded`, `open()`,
     * `toggle()` and its accordion, unless it is also disabled.
     *
     * @defaultValue `false`
     */
    readonly hideToggle = input<boolean, boolean | string | null | undefined>(false, {transform: booleanAttribute});
    /** Whether the panel is a `tbody`, whose rows are its header and its body. */
    readonly isTableBody = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'TBODY';
    /**
     * Whether the panel is the content of an `ims-grid-row-v2`: written in the
     * row rather than in one of its cells. Its header then holds the row's
     * cells and its body nested rows, on the grid's columns, and its toggle
     * goes in a cell like any other control.
     *
     * Read from the injector, which follows the template, rather than from
     * the DOM: the panel is projected into the row, so at construction it has
     * no parent element yet.
     */
    readonly isInGridRow =
        inject(IMS_GRID_ROW_CONTEXT_V2, {optional: true}) !== null && inject(ImsGridCellV2, {optional: true}) === null;
    readonly bodyId = `${this.id}-body`;
    readonly headerId = `${this.id}-header`;

    private readonly grid = inject(IMS_GRID_CONTEXT_V2, {optional: true});
    private readonly header = contentChild(ImsExpansionPanelHeaderV2, {descendants: false});
    /** An `ims-grid-row-v2` written directly in the panel, standing in for the header. */
    private readonly gridRow = contentChild(IMS_GRID_ROW_CONTEXT_V2, {descendants: false});
    /** Whether an `ims-grid-row-v2` heads the panel, making it a group of rows in its grid. */
    protected readonly isGridRow = computed(() => this.gridRow() !== undefined);
    /** The semantics of the table the panel's row is in, or `null` outside one. */
    private readonly tableSemantics = computed(() => (this.isGridRow() ? this.grid?.semantics() ?? null : null));
    /**
     * A table holds rows, not regions: under a grid row of an `ims-table`, the
     * body is one more row, with one cell across the whole grid. Inside a row
     * of one, the body holds rows of its own and takes no role at all.
     */
    protected readonly regionRole = computed(() => {
        if (this.isGridRow()) {
            return this.tableSemantics() ? 'row' : null;
        }

        return this.isInGridRow && this.grid?.semantics() ? null : 'region';
    });
    protected readonly regionContentRole = computed(() => {
        switch (this.tableSemantics()) {
            case 'grid':
                return 'gridcell';
            case 'table':
                return 'cell';
            default:
                return null;
        }
    });
    /** The header's title area names the region; without a header it stays unnamed. */
    protected readonly regionLabelledBy = computed(() =>
        this.regionRole() === 'region' && this.header() ? this.headerId : null
    );

    /**
     * Mirrors every write into `isExpanded`. Overridden rather than watched
     * through `expandedChange`, so the signal changes in the same call as the
     * state: from the input, from `open()`/`close()`/`toggle()`, and from an
     * accordion closing this panel or running `openAll()`/`closeAll()`.
     */
    override get expanded(): boolean {
        return super.expanded;
    }

    override set expanded(expanded: boolean) {
        super.expanded = expanded;
        this.expandedState.set(super.expanded);
    }

    /**
     * Mirrors `disabled` into `isDisabled`.
     *
     * Not by an override, as `expanded` is: CDK 18 declares `disabled` as a
     * plain field and later versions as an accessor, and TypeScript accepts an
     * accessor override of only one of the two. This runs on every check of
     * the view that declares the panel, so it catches a bound change and a
     * programmatic one alike, at the cost of one comparison.
     */
    ngDoCheck(): void {
        this.disabledState.set(this.disabled);
    }
}
