import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {ImsIcon} from '../../../components/ims-icon';
import {SPEC_LABELS} from '../core/spec-builder.labels';

/**
 * PLACEHOLDER for the header the process and tools pages share.
 *
 * The real header exists only in the target environment. Replace this
 * component's template with it, or point both views at the real header
 * component instead. Keep the height the real header has, so specs show the
 * room that is actually left for content.
 *
 * `title` is the process or tool name, which the spec sets once for all of
 * its pages. Bind it to the real header's title the same way.
 */
@Component({
    selector: 'app-spec-view-header',
    standalone: true,
    imports: [ImsIcon],
    template: `
        <ims-icon class="spec-view-header__logo">apps</ims-icon>
        @if (title()) {
            <span class="spec-view-header__title">{{ title() }}</span>
        } @else {
            <span class="spec-view-header__title spec-view-header__title--empty">{{ noTitle }}</span>
        }
        <span class="spec-view-header__note">ממלא מקום, יוחלף בכותרת האמיתית</span>
    `,
    styles: `
        :host {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-sizing: border-box;
            block-size: 3.5rem;
            padding-inline: 1.25rem;
            background: var(--ims-color-surface-inverse);
            color: var(--ims-color-on-surface-inverse);
        }

        .spec-view-header__logo {
            --ims-icon-size: 1.5rem;
        }

        .spec-view-header__title {
            font-size: 1rem;
            font-weight: var(--ims-font-weight-bold);
        }

        .spec-view-header__title--empty {
            color: var(--ims-color-on-surface-inverse-muted);
            font-weight: var(--ims-font-weight-regular);
        }

        .spec-view-header__note {
            margin-inline-start: auto;
            padding: 0.15rem 0.6rem;
            border: 1px dashed var(--ims-color-on-surface-inverse-muted);
            border-radius: 0.375rem;
            color: var(--ims-color-on-surface-inverse-muted);
            font-size: 0.75rem;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecViewHeader {
    readonly title = input.required<string>();

    protected readonly noTitle = SPEC_LABELS.header.noTitle;
}
