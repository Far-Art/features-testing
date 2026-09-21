import {ChangeDetectionStrategy, Component, Directive, input} from '@angular/core';
import {ImsIcon} from '../ims-icon';

/**
 * The banded top row of an `ims-panel`.
 *
 * Takes the panel's severity without being told it: the panel declares the
 * colour slots on its own host, and this header is a DOM descendant, so the
 * values inherit. Nothing is injected and nothing is bound.
 *
 * The row holds whatever the caller projects — a title, a title and an icon, or
 * real controls:
 *
 * ```html
 * <ims-panel-header icon="payments">פרטי תשלום</ims-panel-header>
 *
 * <ims-panel-header>
 *     <ims-checkbox>כלול חיובים שבוטלו</ims-checkbox>
 *     <ims-select placeholder="שנה">…</ims-select>
 *     <button ims-button-icon imsPanelHeaderActions aria-label="אפשרויות">
 *         <ims-icon>more_vert</ims-icon>
 *     </button>
 * </ims-panel-header>
 * ```
 *
 * It carries no `role`, unlike `ims-dialog-title`. A dialog title is always
 * text; this row is meant to hold checkboxes, selects and buttons, and an ARIA
 * heading must not contain focusable content. Project an `h2` or `h3` when the
 * header is a heading — that is better markup than a role would have been.
 */
@Component({
    selector: 'ims-panel-header',
    standalone: true,
    imports: [ImsIcon],
    template: `
        @if (icon(); as glyph) {
            <ims-icon class="ims-panel-header__icon">{{ glyph }}</ims-icon>
        }
        <div class="ims-panel-header__content"><ng-content/></div>
        <div class="ims-panel-header__actions">
            <ng-content select="[imsPanelHeaderActions]"/>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ims-panel-header'
    }
})
export class ImsPanelHeader {
    /**
     * Optional Material Symbols ligature rendered before the projected content.
     *
     * Decorative: the glyph repeats what the header already says, so it stays
     * `aria-hidden` the way every `ims-icon` without a `label` does. An icon
     * that must carry meaning on its own goes in the projected content as an
     * `<ims-icon label="…">` instead.
     *
     * @defaultValue `null`
     */
    readonly icon = input<string | null>(null);
}

/**
 * Marks a projected element as a trailing action of an `ims-panel-header`,
 * pinning it to the far end of the row.
 *
 * The directive is intentionally behavior-free; projection and styling are
 * implemented by `ImsPanelHeader`.
 */
@Directive({
    selector: '[imsPanelHeaderActions]',
    standalone: true
})
export class ImsPanelHeaderActions {
}
