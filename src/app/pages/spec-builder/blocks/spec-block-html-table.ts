import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {SpecChoiceOption, SpecListProperty, SpecListRow, SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {splitLines, validValue} from '../core/spec-document.utils';
import {escapeHtml} from '../core/spec-reference.utils';
import {FONT_WEIGHT_OPTIONS, splitCells, tokenColor} from './spec-block-options';

type TableBorders = 'none' | 'rows' | 'all';

/** The `row` of a row style that styles the header row. */
const HEADER_ROW = 'header';

/** Most body rows and columns a style can name. */
const MAX_STYLED_ROWS = 30;
const MAX_STYLED_COLUMNS = 12;

/** `1`, `2`, … `count`, for a choice of row or column. */
function numberOptions(count: number, label: (number: number) => string): SpecChoiceOption[] {
    return Array.from({length: count}, (_value, index) => ({value: String(index + 1), label: label(index + 1)}));
}

/** A weight setting that leaves the cell's own weight. */
const WEIGHT_OPTIONS: readonly SpecChoiceOption[] = [{value: '', label: 'ללא שינוי'}, ...FONT_WEIGHT_OPTIONS];

const ROW_STYLES: SpecListProperty = {
    kind: 'list',
    label: 'עיצוב שורות',
    hint: 'צבע רקע, צבע טקסט ומשקל לשורה. עיצוב של שורה גובר על עיצוב של עמודה.',
    rowLabel: 'עיצוב שורה',
    maxRows: MAX_STYLED_ROWS + 1,
    defaultValue: [],
    columns: {
        row: {
            kind: 'choice',
            label: 'שורה',
            defaultValue: '1',
            options: [{value: HEADER_ROW, label: 'שורת הכותרות'}, ...numberOptions(MAX_STYLED_ROWS, (number) => `שורה ${number}`)]
        },
        weight: {kind: 'choice', label: 'משקל', defaultValue: '', options: WEIGHT_OPTIONS},
        fill: {kind: 'token', label: 'רקע', defaultValue: '', use: 'fill'},
        color: {kind: 'token', label: 'צבע טקסט', defaultValue: '', use: 'color'}
    }
};

const COLUMN_STYLES: SpecListProperty = {
    kind: 'list',
    label: 'עיצוב עמודות',
    hint: 'צבע רקע, צבע טקסט, משקל ויישור לעמודה, גם בשורת הכותרות.',
    rowLabel: 'עיצוב עמודה',
    maxRows: MAX_STYLED_COLUMNS,
    defaultValue: [],
    columns: {
        column: {kind: 'choice', label: 'עמודה', defaultValue: '1', options: numberOptions(MAX_STYLED_COLUMNS, (number) => `עמודה ${number}`)},
        align: {
            kind: 'choice',
            label: 'יישור',
            defaultValue: '',
            options: [
                {value: '', label: 'ללא שינוי'},
                {value: 'start', label: 'לתחילת השורה'},
                {value: 'center', label: 'למרכז'},
                {value: 'end', label: 'לסוף השורה'}
            ]
        },
        weight: {kind: 'choice', label: 'משקל', defaultValue: '', options: WEIGHT_OPTIONS},
        fill: {kind: 'token', label: 'רקע', defaultValue: '', use: 'fill'},
        color: {kind: 'token', label: 'צבע טקסט', defaultValue: '', use: 'color'}
    }
};

/** One cell, with the style its row and column give it. */
interface TableCell {
    readonly text: string;
    readonly style: Readonly<Record<string, string>>;
}

/** The table as drawn: the header cells, and the cells of each body row. */
interface TableModel {
    readonly header: readonly TableCell[];
    readonly body: readonly (readonly TableCell[])[];
}

/**
 * A plain HTML `<table>`: a header row and example rows, typed as
 * comma-separated lines. The design system has no table styles, so the
 * borders and colours are settings, drawn with tokens, and any row or column
 * can be given a background, a text colour, a weight and, for a column, an
 * alignment. The data grid is the grid block.
 */
@Component({
    selector: 'app-spec-block-html-table',
    standalone: true,
    template: `
        <table
            class="spec-block-html-table"
            [class.spec-block-html-table--rows]="borders() === 'rows'"
            [class.spec-block-html-table--all]="borders() === 'all'"
            [style.--spec-table-border]="borderCss()"
            [style.--spec-table-header-fill]="headerFillCss()"
        >
            @if (header()) {
                <thead>
                    <tr>
                        @for (cell of table().header; track $index) {
                            <th scope="col" [style]="cell.style">{{ cell.text }}</th>
                        }
                    </tr>
                </thead>
            }
            <tbody>
                @for (row of table().body; track $index) {
                    <tr>
                        @for (cell of row; track $index) {
                            <td [style]="cell.style">{{ cell.text }}</td>
                        }
                    </tr>
                }
            </tbody>
        </table>
    `,
    styles: `
        :host {
            display: block;
        }

        .spec-block-html-table {
            inline-size: 100%;
            border-collapse: collapse;
        }

        .spec-block-html-table th,
        .spec-block-html-table td {
            padding: 0.4rem 0.75rem;
            text-align: start;
        }

        .spec-block-html-table th {
            background: var(--spec-table-header-fill);
            font-weight: var(--ims-font-weight-semibold);
        }

        .spec-block-html-table--rows tr {
            border-block-end: 1px solid var(--spec-table-border);
        }

        .spec-block-html-table--all th,
        .spec-block-html-table--all td {
            border: 1px solid var(--spec-table-border);
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockHtmlTable {
    readonly columns = input.required<string>();
    readonly rows = input.required<string>();
    readonly header = input.required<boolean>();
    readonly borders = input.required<TableBorders>();
    readonly borderColor = input.required<string>();
    readonly headerFill = input.required<string>();
    readonly rowStyles = input.required<readonly SpecListRow[]>();
    readonly columnStyles = input.required<readonly SpecListRow[]>();

    protected readonly borderCss = computed(() => tokenColor(this.borderColor()));
    protected readonly headerFillCss = computed(() => tokenColor(this.headerFill()));
    protected readonly table = computed(() => buildTable(this.columns(), this.rows(), this.rowStyles(), this.columnStyles()));
}

export const HTML_TABLE_BLOCK = defineSpecBlock({
    type: 'html-table',
    label: 'טבלה',
    category: 'layout',
    icon: 'table',
    component: SpecBlockHtmlTable,
    resize: 'width',
    defaultSize: {width: 480, height: 120},
    properties: {
        columns: {kind: 'text', label: 'כותרות (מופרדות בפסיק)', defaultValue: 'מסמך, תאריך, סטטוס'},
        rows: {
            kind: 'text',
            label: 'שורות לדוגמה (תאים מופרדים בפסיק)',
            defaultValue: 'תעודת זהות, 01/03/2026, התקבל\nתלוש שכר, 15/03/2026, חסר',
            multiline: true,
            hint: 'שורה אחת בכל שורת טקסט'
        },
        header: {kind: 'toggle', label: 'שורת כותרות', defaultValue: true},
        borders: {
            kind: 'choice',
            label: 'קווים',
            defaultValue: 'rows',
            options: [
                {value: 'none', label: 'ללא'},
                {value: 'rows', label: 'בין השורות'},
                {value: 'all', label: 'סביב כל תא'}
            ]
        },
        borderColor: {kind: 'token', label: 'צבע הקווים', defaultValue: '--ims-color-border-subtle', use: 'color'},
        headerFill: {kind: 'token', label: 'רקע הכותרות', defaultValue: '', use: 'fill'},
        rowStyles: ROW_STYLES,
        columnStyles: COLUMN_STYLES
    },
    reference: {
        selector: 'table',
        snippet: (props: SpecProps) => {
            const table = buildTable(
                String(props['columns']),
                String(props['rows']),
                validValue(ROW_STYLES, props['rowStyles']) as readonly SpecListRow[],
                validValue(COLUMN_STYLES, props['columnStyles']) as readonly SpecListRow[]
            );
            const head = props['header']
                ? ['    <thead>', '        <tr>', ...table.header.map((cell) => `            ${cellSnippet('th', cell)}`), '        </tr>', '    </thead>']
                : [];
            const body = table.body.flatMap((row) => ['        <tr>', ...row.map((cell) => `            ${cellSnippet('td', cell)}`), '        </tr>']);
            return ['<table>', ...head, '    <tbody>', ...body, '    </tbody>', '</table>'].join('\n');
        }
    }
});

/**
 * The cells of the table with their styles. A row's style wins over a
 * column's where both set the same thing; the header row is styled as the
 * row `header`, and by the column styles like any other row.
 */
function buildTable(columns: string, rows: string, rowStyles: readonly SpecListRow[], columnStyles: readonly SpecListRow[]): TableModel {
    const rowStyle = new Map(rowStyles.map((style) => [style['row'], style]));
    const columnStyle = new Map(columnStyles.map((style) => [style['column'], style]));
    const cell = (text: string, row: string, column: number): TableCell => ({
        text,
        style: cellStyle(columnStyle.get(String(column + 1)), rowStyle.get(row))
    });

    return {
        header: splitCells(columns).map((text, column) => cell(text, HEADER_ROW, column)),
        body: splitLines(rows).map((line, row) => splitCells(line).map((text, column) => cell(text, String(row + 1), column)))
    };
}

/** The CSS declarations a column style and a row style give one cell; the row's are applied last. */
function cellStyle(column: SpecListRow | undefined, row: SpecListRow | undefined): Record<string, string> {
    const style: Record<string, string> = {};
    for (const part of [column, row]) {
        if (!part) {
            continue;
        }
        if (part['fill']) {
            style['background'] = tokenColor(part['fill']);
        }
        if (part['color']) {
            style['color'] = tokenColor(part['color']);
        }
        if (part['weight']) {
            style['font-weight'] = `var(--ims-font-weight-${part['weight']})`;
        }
        if (part['align']) {
            style['text-align'] = part['align'];
        }
    }
    return style;
}

/** `<th>text</th>`, with the cell's style inline when it has one. */
function cellSnippet(tag: 'th' | 'td', cell: TableCell): string {
    const declarations = Object.entries(cell.style).map(([name, value]) => `${name}: ${value}`).join('; ');
    const style = declarations ? ` style="${escapeHtml(declarations)}"` : '';
    const scope = tag === 'th' ? ' scope="col"' : '';
    return `<${tag}${scope}${style}>${escapeHtml(cell.text)}</${tag}>`;
}
