/** A single icon shown in the {@link ImsDock}. */
export interface ImsDockItem {
    /** Stable identity used for tracking and as the focus key. */
    id: string;
    /** Accessible label, also rendered as the hover/focus tooltip. */
    label: string;
    /** Glyph (emoji or short text) painted inside the icon. */
    icon: string;
    /** Optional router target; when set the item renders as a router link. */
    routerLink?: string;
    /** When true the item is dimmed and excluded from activation. */
    disabled?: boolean;
}
