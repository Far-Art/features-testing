import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../../../components/ims-button';
import {ImsIcon} from '../../../components/ims-icon';
import {ImsOption, ImsSelect} from '../../../components/ims-select';
import {ImsTooltip} from '../../../components/ims-tooltip';
import {ImsInputDirective} from '../../../ims-input.directive';
import {SpecTokenPicker} from './spec-token-picker';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecListColumn, SpecListProperty, SpecListRow} from '../core/spec-builder.types';
import {defaultRow} from '../core/spec-document.utils';

/** One column of a list property, flattened for the template. */
interface ColumnField {
    readonly name: string;
    readonly column: SpecListColumn;
    /** A text or colour column takes the whole width of a row card; choices sit two to a line. */
    readonly wide: boolean;
}

/**
 * Edits a list property, such as the fields of a form: one small card per
 * row, with the row's columns and buttons that reorder or remove it, and a
 * button that adds a row at the end.
 *
 * Emits the whole new list on every change; the owner commits it.
 */
@Component({
    selector: 'app-spec-list-editor',
    standalone: true,
    imports: [ImsButton, ImsButtonIcon, ImsIcon, ImsInputDirective, ImsOption, ImsSelect, ImsTooltip, SpecTokenPicker],
    template: `
        <ol class="spec-list-editor__rows">
            @for (row of rows(); track $index; let index = $index, first = $first, last = $last) {
                <li class="spec-list-editor__row">
                    <div class="spec-list-editor__row-header">
                        <span class="spec-list-editor__row-title">{{ labels.row(property().rowLabel, index + 1) }}</span>
                        <button
                            ims-button-icon
                            [disabled]="first"
                            [attr.aria-label]="labels.moveEarlier"
                            [imsTooltip]="labels.moveEarlier"
                            (click)="move(index, -1)"
                        >
                            <ims-icon>arrow_upward</ims-icon>
                        </button>
                        <button
                            ims-button-icon
                            [disabled]="last"
                            [attr.aria-label]="labels.moveLater"
                            [imsTooltip]="labels.moveLater"
                            (click)="move(index, 1)"
                        >
                            <ims-icon>arrow_downward</ims-icon>
                        </button>
                        <button
                            ims-button-icon
                            [attr.aria-label]="labels.remove"
                            [imsTooltip]="labels.remove"
                            (click)="remove(index)"
                        >
                            <ims-icon>delete</ims-icon>
                        </button>
                    </div>

                    <div class="spec-list-editor__cells">
                        @for (field of columns(); track field.name) {
                            @let id = inputId() + '-' + index + '-' + field.name;
                            <div class="spec-list-editor__cell" [class.spec-list-editor__cell--wide]="field.wide">
                                <label class="spec-list-editor__caption" [for]="id">{{ field.column.label }}</label>
                                @if (field.column.kind === 'token') {
                                    <app-spec-token-picker
                                        [inputId]="id"
                                        [value]="row[field.name]"
                                        [use]="field.column.use"
                                        (valueChange)="setCell(index, field.name, $event)"
                                    />
                                } @else if (field.column.kind === 'choice') {
                                    <ims-select
                                        class="field-stretch"
                                        [id]="id"
                                        [value]="row[field.name]"
                                        (valueChange)="setCell(index, field.name, $event)"
                                    >
                                        @for (option of field.column.options; track option.value) {
                                            <ims-option [value]="option.value" [selectionText]="option.label">{{ option.label }}</ims-option>
                                        }
                                    </ims-select>
                                } @else {
                                    <input
                                        imsInput
                                        class="field-stretch"
                                        type="text"
                                        [id]="id"
                                        [value]="row[field.name]"
                                        (input)="setCellText(index, field.name, $event)"
                                    >
                                }
                            </div>
                        }
                    </div>
                </li>
            } @empty {
                <li class="spec-list-editor__empty">{{ labels.empty }}</li>
            }
        </ol>

        <button
            ims-button
            ims-button-variation="secondary"
            [disabled]="rows().length >= property().maxRows"
            (click)="add()"
        >
            <ims-icon class="ims-button__symbol">add</ims-icon>
            {{ labels.add(property().rowLabel) }}
        </button>
    `,
    styleUrl: './spec-list-editor.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecListEditor {
    readonly property = input.required<SpecListProperty>();
    readonly rows = input.required<readonly SpecListRow[]>();
    /** Prefix of the ids that tie each caption to its control. */
    readonly inputId = input.required<string>();
    readonly rowsChange = output<SpecListRow[]>();

    protected readonly labels = SPEC_LABELS.listEditor;
    protected readonly columns = computed<readonly ColumnField[]>(() =>
        Object.entries(this.property().columns).map(([name, column]) => ({name, column, wide: column.kind !== 'choice'}))
    );

    protected setCell(index: number, name: string, value: unknown): void {
        if (typeof value === 'string') {
            this.rowsChange.emit(this.rows().map((row, position) => position === index ? {...row, [name]: value} : row));
        }
    }

    protected setCellText(index: number, name: string, event: Event): void {
        this.setCell(index, name, (event.target as HTMLInputElement).value);
    }

    protected add(): void {
        this.rowsChange.emit([...this.rows(), defaultRow(this.property())]);
    }

    protected move(index: number, offset: -1 | 1): void {
        const rows = [...this.rows()];
        const target = index + offset;
        if (target >= 0 && target < rows.length) {
            [rows[index], rows[target]] = [rows[target], rows[index]];
            this.rowsChange.emit(rows);
        }
    }

    protected remove(index: number): void {
        this.rowsChange.emit(this.rows().filter((_row, position) => position !== index));
    }
}
