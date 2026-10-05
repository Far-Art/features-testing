import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {ImsButton} from '../../../components/ims-button';
import {ImsCheckbox} from '../../../components/ims-checkbox';
import {ImsDialogService} from '../../../components/ims-dialog';
import {ImsFormField, ImsFormFieldHint, ImsFormFieldLabel} from '../../../components/ims-form-layout';
import {ImsIcon} from '../../../components/ims-icon';
import {ImsPanel, ImsPanelHeader} from '../../../components/ims-panel';
import {ImsOption, ImsSelect} from '../../../components/ims-select';
import {ImsInputDirective} from '../../../ims-input.directive';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_BUILDER_CONFIG} from '../core/spec-builder.tokens';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecBlockProperty, SpecChoiceOption, SpecListProperty, SpecListRow, SpecPropValue, SpecRect, SpecTokenUse} from '../core/spec-builder.types';
import {resizeModeOf, resolveProps, resolveZoneId, splitLines} from '../core/spec-document.utils';
import {SpecSurfaceService} from '../core/spec-surface.service';
import {SpecListEditor} from './spec-list-editor';
import {SpecTokenPicker} from './spec-token-picker';

let nextInspectorId = 0;

/** One property of the selected item, flattened for the template so every kind reads the same fields. */
interface PropertyField {
    readonly name: string;
    readonly id: string;
    readonly label: string;
    readonly hint: string;
    readonly kind: SpecBlockProperty['kind'];
    readonly value: SpecPropValue;
    /** The value as text, for text fields and the token picker. */
    readonly text: string;
    readonly multiline: boolean;
    readonly options: readonly SpecChoiceOption[];
    readonly min: number | null;
    readonly max: number | null;
    readonly step: number;
    readonly use: SpecTokenUse;
    /** The property of a list, which the list editor reads its columns from. */
    readonly list: SpecListProperty | null;
    readonly rows: readonly SpecListRow[];
    /** The lines a selection property picks from, each with whether it is picked. */
    readonly choices: readonly SelectionChoice[];
    /** True when a selection property may pick several lines. */
    readonly pickMany: boolean;
}

interface SelectionChoice {
    readonly value: string;
    readonly picked: boolean;
}

/**
 * Edits the selected item: its position and size, its zone, the settings its
 * block declares, and a note for developers. With nothing selected it edits
 * the page itself.
 *
 * Every field commits as it is typed in. The store merges the keystrokes of
 * one field into one undo step.
 */
@Component({
    selector: 'app-spec-builder-inspector',
    standalone: true,
    imports: [
        ImsButton,
        ImsCheckbox,
        ImsFormField,
        ImsFormFieldHint,
        ImsFormFieldLabel,
        ImsIcon,
        ImsInputDirective,
        ImsOption,
        ImsPanel,
        ImsPanelHeader,
        ImsSelect,
        SpecListEditor,
        SpecTokenPicker
    ],
    templateUrl: './spec-builder-inspector.html',
    styleUrl: './spec-builder-inspector.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'complementary',
        '[attr.aria-label]': 'labels.label'
    }
})
export class SpecBuilderInspector {
    protected readonly labels = SPEC_LABELS.inspector;
    protected readonly config = inject(SPEC_BUILDER_CONFIG);
    protected readonly store = inject(SpecBuilderStore);
    /** Prefix of the ids that tie each label to its field. */
    protected readonly idPrefix = `spec-inspector-${nextInspectorId++}`;
    private readonly surface = inject(SpecSurfaceService);
    private readonly dialog = inject(ImsDialogService);

    protected readonly item = this.store.selectedItem;
    protected readonly block = computed(() => {
        const item = this.item();
        return item ? this.store.blockFor(item.blockType) : undefined;
    });
    protected readonly title = computed(() => {
        const item = this.item();
        if (!item) {
            return '';
        }
        const label = this.block()?.label ?? SPEC_LABELS.canvas.missingBlock(item.blockType);
        return SPEC_LABELS.canvas.item(label, this.store.numbers().get(item.id) ?? 0);
    });
    private readonly resizeMode = computed(() => {
        const item = this.item();
        const block = this.block();
        return item && block ? resizeModeOf(block, resolveProps(item.props, block)) : 'both';
    });
    protected readonly widthFollowsContent = computed(() => this.resizeMode() === 'none');
    protected readonly heightFollowsContent = computed(() => this.resizeMode() !== 'both');
    protected readonly zones = computed(() => this.store.view().zones);
    protected readonly zoneId = computed(() => {
        const item = this.item();
        return item ? resolveZoneId(this.store.view(), item.zoneId) : '';
    });
    protected readonly fields = computed<readonly PropertyField[]>(() => {
        const item = this.item();
        const block = this.block();
        if (!item || !block) {
            return [];
        }

        const values = resolveProps(item.props, block);
        return Object.entries(block.properties).map(([name, property]) => {
            const value = values[name];
            const selection = property.kind === 'selection' ? readSelection(property.optionsFrom, property.multipleFrom, values) : null;
            return {
                name,
                id: `${this.idPrefix}-prop-${name}`,
                label: property.label,
                hint: property.hint ?? '',
                kind: property.kind,
                value,
                text: String(value),
                multiline: property.kind === 'text' && property.multiline === true,
                options: property.kind === 'choice' ? property.options : [],
                min: property.kind === 'number' ? property.min ?? null : null,
                max: property.kind === 'number' ? property.max ?? null : null,
                step: property.kind === 'number' ? property.step ?? 1 : 1,
                use: property.kind === 'token' ? property.use : 'color',
                list: property.kind === 'list' ? property : null,
                rows: Array.isArray(value) ? value : [],
                choices: selection ? selection.options.map((option) => ({value: option, picked: selection.isPicked(String(value), option)})) : [],
                pickMany: selection?.multiple ?? false
            };
        });
    });
    /**
     * The settings as the inspector lays them out: one row per setting, with
     * a run of checkboxes kept together in one row, so a list of states reads
     * as one block instead of a divider after each.
     */
    protected readonly settingGroups = computed(() => {
        const groups: PropertyField[][] = [];
        for (const field of this.fields()) {
            const last = groups[groups.length - 1];
            if (field.kind === 'toggle' && last?.[0].kind === 'toggle') {
                last.push(field);
            } else {
                groups.push([field]);
            }
        }
        return groups;
    });
    /** Index of the page preset the page size matches, as the select's value; empty for another size. */
    protected readonly pagePreset = computed(() => {
        const page = this.store.page().size;
        const index = this.config.pagePresets.findIndex((preset) => preset.size.width === page.width && preset.size.height === page.height);
        return index < 0 ? '' : String(index);
    });

    protected setRect(side: keyof SpecRect, event: Event): void {
        const item = this.item();
        const value = (event.target as HTMLInputElement).valueAsNumber;
        if (item && Number.isFinite(value)) {
            this.store.updateRect(item.id, {...item.rect, [side]: Math.max(0, Math.round(value))}, `rect:${item.id}:${side}`);
        }
    }

    protected setZone(zoneId: unknown): void {
        const item = this.item();
        if (item && typeof zoneId === 'string' && zoneId !== this.zoneId()) {
            const origin = this.surface.fitInZone(zoneId, item.rect, this.surface.itemSize(item.id), 1);
            this.store.moveItem(item.id, zoneId, origin);
        }
    }

    protected setProp(name: string, value: unknown): void {
        const item = this.item();
        const block = this.block();
        if (!item || !block || !isPropValue(value)) {
            return;
        }

        // A width that stops following the content starts at the width the
        // item is drawn at, so the item does not jump to a stale stored width.
        const before = resizeModeOf(block, resolveProps(item.props, block));
        const after = resizeModeOf(block, resolveProps({...item.props, [name]: value}, block));
        const rect = before === 'none' && after !== 'none'
            ? {...item.rect, width: this.surface.itemSize(item.id).width || item.rect.width}
            : undefined;
        this.store.updateProp(item.id, name, value, rect);
    }

    protected setTextProp(name: string, event: Event): void {
        this.setProp(name, (event.target as HTMLInputElement | HTMLTextAreaElement).value);
    }

    /**
     * Picks or unpicks one line of a selection property. A single selection
     * holds the line just picked, or nothing; a multiple one keeps the picked
     * lines in the order the options list them.
     */
    protected pick(field: PropertyField, value: string, picked: boolean): void {
        const lines = field.pickMany
            ? field.choices.filter((choice) => choice.value === value ? picked : choice.picked).map((choice) => choice.value)
            : picked ? [value] : [];
        this.setProp(field.name, lines.join('\n'));
    }

    protected setNumberProp(field: PropertyField, event: Event): void {
        const value = (event.target as HTMLInputElement).valueAsNumber;
        if (Number.isFinite(value)) {
            this.setProp(field.name, Math.min(Math.max(value, field.min ?? -Infinity), field.max ?? Infinity));
        }
    }

    protected setNote(event: Event): void {
        const item = this.item();
        if (item) {
            this.store.updateNote(item.id, (event.target as HTMLTextAreaElement).value);
        }
    }

    protected setView(viewId: unknown): void {
        if (typeof viewId === 'string') {
            this.store.setView(viewId);
        }
    }

    protected setPagePreset(index: unknown): void {
        const preset = this.config.pagePresets[Number(index)];
        if (typeof index === 'string' && preset) {
            this.store.setPageSize(preset.size);
        }
    }

    protected setPageSide(side: 'width' | 'height', event: Event): void {
        const value = (event.target as HTMLInputElement).valueAsNumber;
        if (Number.isFinite(value) && value >= 320) {
            this.store.setPageSize({...this.store.page().size, [side]: Math.round(value)});
        }
    }

    protected setTitle(event: Event): void {
        this.store.setTitle((event.target as HTMLInputElement).value);
    }

    protected renamePage(event: Event): void {
        this.store.renamePage((event.target as HTMLInputElement).value);
    }

    /** Deletes the page on screen, after a confirmation when it has items. */
    protected removePage(): void {
        const page = this.store.page();
        if (page.items.length === 0) {
            this.store.removePage();
            return;
        }

        this.dialog
            .warning(SPEC_LABELS.files.deletePageMessage)
            .title(SPEC_LABELS.files.deletePageTitle(page.name))
            .asConfirmation('yes_no')
            .open()
            .closed.subscribe((confirmed) => {
                if (confirmed) {
                    this.store.removePage();
                }
            });
    }

    protected setLocked(locked: boolean): void {
        const item = this.item();
        if (item) {
            this.store.setLocked(item.id, locked);
        }
    }

    protected duplicate(): void {
        const item = this.item();
        if (item) {
            this.store.duplicate(item.id);
        }
    }

    protected bringToFront(): void {
        const item = this.item();
        if (item) {
            this.store.bringToFront(item.id);
        }
    }

    protected sendToBack(): void {
        const item = this.item();
        if (item) {
            this.store.sendToBack(item.id);
        }
    }

    protected remove(): void {
        const item = this.item();
        if (item) {
            this.store.remove(item.id);
        }
    }
}

/** True for a value a property can hold. */
function isPropValue(value: unknown): value is SpecPropValue {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value);
}

/**
 * The options a selection property offers and whether it may pick several,
 * read from the properties it names. A single selection counts only its first
 * picked line, as a single select shows only that one.
 */
function readSelection(optionsFrom: string, multipleFrom: string | undefined, values: Record<string, SpecPropValue>) {
    const options = splitLines(String(values[optionsFrom] ?? ''));
    const multiple = multipleFrom !== undefined && values[multipleFrom] === true;
    return {
        options,
        multiple,
        isPicked: (text: string, option: string) => {
            const picked = splitLines(text);
            return multiple ? picked.includes(option) : picked[0] === option;
        }
    };
}
