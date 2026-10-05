import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ImsGrid, ImsGridCell, ImsGridRow} from '../../../components/ims-grid';
import {ImsGridAppearance} from '../../../components/ims-grid/ims-grid.tokens';
import {SpecProps, defineSpecBlock} from '../core/spec-builder.types';
import {splitLines} from '../core/spec-document.utils';
import {escapeHtml, htmlAttribute} from '../core/spec-reference.utils';
import {splitCells} from './spec-block-options';

/**
 * `ims-grid`, the design system's data grid: a header row and example rows,
 * typed as comma-separated lines. A plain `<table>` is the table block.
 */
@Component({
    selector: 'app-spec-block-grid',
    standalone: true,
    imports: [ImsGrid, ImsGridCell, ImsGridRow],
    template: `
        <ims-grid columnGap="1rem" [appearance]="appearance()">
            <ims-grid-header>
                @for (column of header(); track $index) {
                    <ims-grid-cell>{{ column }}</ims-grid-cell>
                }
            </ims-grid-header>
            @for (row of body(); track $index) {
                <ims-grid-row>
                    @for (cell of row; track $index) {
                        <ims-grid-cell>{{ cell }}</ims-grid-cell>
                    }
                </ims-grid-row>
            }
        </ims-grid>
    `,
    styles: `
        :host {
            display: block;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpecBlockGrid {
    readonly columns = input.required<string>();
    readonly rows = input.required<string>();
    readonly appearance = input.required<ImsGridAppearance>();

    protected readonly header = computed(() => splitCells(this.columns()));
    protected readonly body = computed(() => splitLines(this.rows()).map(splitCells));
}

export const GRID_BLOCK = defineSpecBlock({
    type: 'grid',
    label: 'גריד',
    category: 'layout',
    icon: 'table_chart',
    component: SpecBlockGrid,
    resize: 'width',
    defaultSize: {width: 480, height: 120},
    properties: {
        columns: {kind: 'text', label: 'כותרות (מופרדות בפסיק)', defaultValue: 'שם לקוח, מספר פוליסה, תוקף'},
        rows: {
            kind: 'text',
            label: 'שורות לדוגמה (תאים מופרדים בפסיק)',
            defaultValue: 'נועה כהן, 45872196, 31/12/2026\nדוד לוי, 39001244, 30/06/2027',
            multiline: true,
            hint: 'שורה אחת בכל שורת טקסט'
        },
        appearance: {
            kind: 'choice',
            label: 'מראה',
            defaultValue: 'default',
            options: [
                {value: 'default', label: 'רגיל'},
                {value: 'styled', label: 'מעוצב'}
            ]
        }
    },
    reference: {
        selector: 'ims-grid',
        snippet: (props: SpecProps) => {
            const columns = splitCells(String(props['columns']));
            const headerCells = columns.map((column) => `        <ims-grid-cell>${escapeHtml(column)}</ims-grid-cell>`).join('\n');
            const rowCells = columns.map((_column, index) => `            <ims-grid-cell>{{ row.column${index + 1} }}</ims-grid-cell>`).join('\n');
            return `<ims-grid columnGap="1rem"${htmlAttribute('appearance', props['appearance'], 'default')}>\n`
                + `    <ims-grid-header>\n${headerCells}\n    </ims-grid-header>\n`
                + `    @for (row of rows; track row.id) {\n        <ims-grid-row>\n${rowCells}\n        </ims-grid-row>\n    }\n`
                + '</ims-grid>';
        }
    }
});
