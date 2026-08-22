/**
 * Shared types for `<ims-duo-icon>`. They live apart from both the component and
 * the generated set because each needs the other's: the generated icons are
 * typed by `ImsDuoIconDefinition`, and a definition can name an `ImsDuoIconTone`.
 */

export type ImsDuoIconTone =
    | 'default'
    | 'muted'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger'
    | 'inverse';

export interface ImsDuoIconDefinition {
    /** Source filename without its extension. */
    readonly name: string;
    /** Human-readable name from the source `<title>`. Informational. */
    readonly label: string;
    /**
     * Tone this glyph carries when the call site does not set one, declared in
     * the source file as `data-tone`. Lets a semantic glyph like `warning` come
     * out in its own palette without every call site restating it. Omitted for
     * the great majority of icons, which take the default palette.
     */
    readonly tone?: ImsDuoIconTone;
    /** Complete `<svg>` markup, verbatim from the source file. */
    readonly source: string;
}
