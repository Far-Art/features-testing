import {listLabels, resizeModeOf, resolveProps, resolveZoneId} from './spec-document.utils';
import {SPEC_LABELS} from './spec-builder.labels';
import {
    SpecBlockDefinition,
    SpecBlockProperty,
    SpecDocument,
    SpecItem,
    SpecPage,
    SpecPropValue,
    SpecReferenceEntry,
    SpecReferenceSetting,
    SpecViewDefinition
} from './spec-builder.types';

const labels = SPEC_LABELS.reference;

/**
 * The number each item carries in the reference, in reading order: zone by
 * zone in the order the view lists them, then top to bottom, then from the
 * inline start. The badges, the inspect panel and the Markdown all use this.
 */
export function numberItems(items: readonly SpecItem[], view: SpecViewDefinition): ReadonlyMap<string, number> {
    const zoneOrder = new Map(view.zones.map((zone, index) => [zone.id, index]));
    const zoneIndex = (item: SpecItem) => zoneOrder.get(resolveZoneId(view, item.zoneId)) ?? 0;

    // A copy, because sort() sorts in place and toSorted() is ES2023.
    const ordered = [...items].sort((first, second) =>
        zoneIndex(first) - zoneIndex(second) || first.rect.y - second.rect.y || first.rect.x - second.rect.x
    );
    return new Map(ordered.map((item, index) => [item.id, index + 1]));
}

/** One page of the reference: the page, its layout, and its entries in number order. */
export interface SpecPageReference {
    readonly page: SpecPage;
    readonly view: SpecViewDefinition;
    readonly entries: readonly SpecReferenceEntry[];
}

/** Everything the reference says about each item of a page, ordered by number. */
export function buildReference(
    page: SpecPage,
    view: SpecViewDefinition,
    blockFor: (type: string) => SpecBlockDefinition | undefined,
    numbers: ReadonlyMap<string, number> = numberItems(page.items, view)
): SpecReferenceEntry[] {
    const entries = page.items.map((item): SpecReferenceEntry => {
        const block = blockFor(item.blockType);
        const zoneId = resolveZoneId(view, item.zoneId);
        const props: Record<string, SpecPropValue> = block ? resolveProps(item.props, block) : {};

        return {
            number: numbers.get(item.id) ?? 0,
            itemId: item.id,
            blockLabel: block?.label ?? SPEC_LABELS.canvas.missingBlock(item.blockType),
            selector: block?.reference.selector ?? '',
            zoneLabel: view.zones.find((zone) => zone.id === zoneId)?.label ?? zoneId,
            rect: item.rect,
            resize: resizeModeOf(block, props),
            settings: block ? Object.entries(block.properties).map(([name, property]) => describeSetting(property, props[name])) : [],
            snippet: block?.reference.snippet?.(props) ?? '',
            snippetLanguage: block?.reference.language ?? 'html',
            note: item.note.trim()
        };
    });

    return entries.sort((first, second) => first.number - second.number);
}

/** "x, y" of an entry. */
export function describePosition(entry: SpecReferenceEntry): string {
    return `${Math.round(entry.rect.x)}, ${Math.round(entry.rect.y)}`;
}

/** "width × height" of an entry, naming the sides that follow the content. */
export function describeSize(entry: SpecReferenceEntry): string {
    switch (entry.resize) {
        case 'none':
            return labels.hugAxis;
        case 'width':
            return `${Math.round(entry.rect.width)} × ${labels.hugAxis}`;
        case 'both':
            return `${Math.round(entry.rect.width)} × ${Math.round(entry.rect.height)}`;
    }
}

/**
 * The reference as a Markdown document. Each page has a heading, a summary
 * table, then one section per item with its settings, note and template.
 * Items are numbered within their page, as the badges are.
 *
 * @param resolveToken Current value of a colour token, shown beside its name.
 */
export function renderMarkdown(
    document: SpecDocument,
    pages: readonly SpecPageReference[],
    resolveToken: (name: string) => string
): string {
    const lines: string[] = [`# ${document.name}`];
    if (document.title) {
        lines.push('', `${labels.title}: ${document.title}`);
    }
    pages.forEach((page, index) => lines.push('', ...renderPage(page, index + 1, resolveToken)));
    return lines.join('\n') + '\n';
}

function renderPage({page, view, entries}: SpecPageReference, pageNumber: number, resolveToken: (name: string) => string): string[] {
    const lines: string[] = [
        `## ${pageNumber}. ${page.name}`,
        '',
        `${labels.view}: ${view.label} · ${labels.page}: ${page.size.width} × ${page.size.height}`,
        ''
    ];

    if (entries.length === 0) {
        lines.push(labels.empty);
        return lines;
    }

    lines.push(
        `| ${labels.number} | ${labels.component} | ${labels.selector} | ${labels.zone} | ${labels.position} | ${labels.size} |`,
        '| --- | --- | --- | --- | --- | --- |'
    );
    for (const entry of entries) {
        const selector = entry.selector ? `\`${entry.selector}\`` : labels.none;
        lines.push(`| ${entry.number} | ${entry.blockLabel} | ${selector} | ${entry.zoneLabel} | ${describePosition(entry)} | ${describeSize(entry)} |`);
    }

    for (const entry of entries) {
        lines.push('', `### ${pageNumber}.${entry.number} ${entry.blockLabel}`, '');
        if (entry.selector) {
            lines.push(`- ${labels.selector}: \`${entry.selector}\``);
        }
        lines.push(`- ${labels.zone}: ${entry.zoneLabel} · ${labels.position}: ${describePosition(entry)} · ${labels.size}: ${describeSize(entry)}`);

        if (entry.settings.length > 0) {
            lines.push(`- ${labels.settings}:`);
            for (const setting of entry.settings) {
                lines.push(`  - ${setting.label}: ${describeSettingValue(setting, resolveToken)}`);
            }
        }

        if (entry.note) {
            lines.push(`- ${labels.note}: ${entry.note.replace(/\n+/g, ' ')}`);
        }

        if (entry.snippet) {
            lines.push('', '```' + entry.snippetLanguage, entry.snippet, '```');
        }
    }

    return lines;
}

/** A setting as Markdown text, with a token's current value beside its name. */
function describeSettingValue(setting: SpecReferenceSetting, resolveToken: (name: string) => string): string {
    if (!setting.token) {
        return setting.value;
    }

    const value = resolveToken(setting.token);
    return value ? `\`${setting.token}\` (${value})` : `\`${setting.token}\``;
}

function describeSetting(property: SpecBlockProperty, value: SpecPropValue): SpecReferenceSetting {
    switch (property.kind) {
        case 'toggle':
            return {label: property.label, value: value ? '✓' : '✗', token: null};
        case 'choice':
            return {label: property.label, value: property.options.find((option) => option.value === value)?.label ?? String(value), token: null};
        case 'token':
            return {label: property.label, value: value ? String(value) : labels.noToken, token: value ? String(value) : null};
        case 'text':
        case 'selection':
            return {label: property.label, value: String(value).replace(/\n+/g, ' · ') || labels.none, token: null};
        case 'number':
            return {label: property.label, value: String(value), token: null};
        case 'list': {
            const rows = Array.isArray(value) ? value : [];
            return {label: property.label, value: `${rows.length}: ${listLabels(property, rows).join(' · ')}`, token: null};
        }
    }
}

// ---------------------------------------------------------------------------
// Template snippets: helpers for a block's `reference.snippet`
// ---------------------------------------------------------------------------

/** `text` safe to put in an HTML template, as content or inside a double-quoted attribute. */
export function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * ` name="value"`, or nothing when `value` is empty or equals `omitWhen`:
 * a developer leaves out an attribute that only restates the default.
 */
export function htmlAttribute(name: string, value: SpecPropValue, omitWhen: SpecPropValue = ''): string {
    return value === '' || value === omitWhen ? '' : ` ${name}="${escapeHtml(String(value))}"`;
}

/** ` name` for a boolean attribute that is on, nothing when it is off. */
export function htmlFlag(name: string, on: SpecPropValue): string {
    return on === true ? ` ${name}` : '';
}
