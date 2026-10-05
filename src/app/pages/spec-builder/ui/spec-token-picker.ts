import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {ImsIcon} from '../../../components/ims-icon';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecTokenUse} from '../core/spec-builder.types';
import {SpecTokensService} from '../core/spec-tokens.service';

let nextPickerId = 0;

/**
 * Picks a colour token. The value is the token name, such as
 * `--ims-color-border`, or `''` for no colour.
 *
 * A button shows the current colour; pressing it unfolds the swatches below,
 * grouped as {@link SpecTokensService} groups them. Unfolded in place rather
 * than in an overlay, so the panel scrolls with the inspector around it.
 */
@Component({
    selector: 'app-spec-token-picker',
    standalone: true,
    imports: [ImsIcon],
    templateUrl: './spec-token-picker.html',
    styleUrl: './spec-token-picker.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecTokenPicker {
    readonly value = input.required<string>();
    readonly use = input.required<SpecTokenUse>();
    /** Id given to the button, for a label's `for`. */
    readonly inputId = input.required<string>();
    readonly valueChange = output<string>();

    protected readonly labels = SPEC_LABELS.tokenPicker;
    protected readonly panelId = `spec-token-picker-${nextPickerId++}`;
    protected readonly open = signal(false);
    private readonly tokens = inject(SpecTokensService);

    protected readonly groups = computed(() => this.tokens.groupsFor(this.use()));
    protected readonly swatch = computed(() => this.value() ? `var(${this.value()})` : null);
    protected readonly caption = computed(() => this.value() || this.labels.none);

    protected toggle(): void {
        this.open.update((open) => !open);
    }

    protected pick(name: string): void {
        this.valueChange.emit(name);
    }

    /** CSS that paints a swatch of the token. */
    protected paint(name: string): string {
        return `var(${name})`;
    }
}
