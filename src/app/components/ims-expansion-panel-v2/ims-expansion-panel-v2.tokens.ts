import {InjectionToken, Signal} from '@angular/core';

/**
 * How the panel is painted. `default` is the house-blue header band over a
 * light toggle; `secondary` is a white header over a dark one.
 */
export type ImsExpansionPanelVariationV2 = 'default' | 'secondary';

/**
 * Which voice a panel speaks in. The same five words as `ImsPanelSeverity`,
 * painted with the same colours, so an expansion panel and an `ims-panel` of
 * one severity look alike: `neutral`, the default, is the soft house-blue band
 * over a grey body, and `info` is the stronger blue a call site asks for.
 */
export type ImsExpansionPanelSeverityV2 = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** What the header, the body and the toggle need from the panel they sit in. */
export interface ImsExpansionPanelContextV2 {
    /** Whether the body is showing. A signal, so the OnPush views that show it follow it. */
    readonly isExpanded: Signal<boolean>;
    /** Whether the panel ignores the toggle. A signal, for the same reason. */
    readonly isDisabled: Signal<boolean>;
    /** The panel's variation, which picks the toggle's when the toggle names none. */
    readonly variation: Signal<ImsExpansionPanelVariationV2>;
    /** Whether every toggle of the panel is left out, wherever it is placed. */
    readonly hideToggle: Signal<boolean>;
    /** Whether the panel's content needs attention, which turns every toggle of the panel danger red. */
    readonly invalid: Signal<boolean>;
    /**
     * Whether the panel is the content of an `ims-grid-row-v2`. Its header then
     * holds the row's cells, and the toggle goes in one of them.
     */
    readonly isInGridRow: boolean;
    /** The id of the element the toggle shows and hides, for `aria-controls`. */
    readonly bodyId: string;
    /** The id the header gives its title area, which names the body region. */
    readonly headerId: string;
    /**
     * Whether the panel is a `tbody`. A table panel renders no region of its
     * own, so its `ims-expansion-panel-body-v2` carries `bodyId` instead.
     */
    readonly isTableBody: boolean;

    /** Opens a closed panel and closes an open one, unless it is disabled. */
    toggle(): void;
}

/**
 * Connects the header, the body and the toggle to their nearest panel, without
 * any of them importing the panel class.
 */
export const IMS_EXPANSION_PANEL_V2 = new InjectionToken<ImsExpansionPanelContextV2>('IMS_EXPANSION_PANEL_V2');
