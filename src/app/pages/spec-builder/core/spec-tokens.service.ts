import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';
import {SPEC_BUILDER_CONFIG} from './spec-builder.tokens';
import {SpecToken, SpecTokenGroup, SpecTokenSource, SpecTokenUse} from './spec-builder.types';

/** A token ending in a number is one step of a colour ramp, such as `primary-500`. */
const RAMP_STEP = /^(.+)-(\d+)$/;

/**
 * The colour tokens the application defines, for shapes and text to be
 * painted with.
 *
 * The tokens are read from the loaded stylesheets rather than listed here, so
 * the picker offers exactly what the application has, in whichever
 * environment the builder runs. Which custom properties count as tokens is set
 * by `tokenSources` in the configuration.
 */
@Injectable()
export class SpecTokensService {
    private readonly config = inject(SPEC_BUILDER_CONFIG);
    private readonly document = inject(DOCUMENT);

    /** Every token, grouped: background treatments first, then semantic colours, then the palette ramps. */
    readonly groups: readonly SpecTokenGroup[] = groupTokens(this.readTokens());

    /** The groups a property may pick from. A colour cannot take a background token, which may be a gradient. */
    groupsFor(use: SpecTokenUse): readonly SpecTokenGroup[] {
        return use === 'fill' ? this.groups : this.groups.filter((group) => group.tokens.every((token) => token.kind === 'color'));
    }

    /** A token's current value, with the tokens it refers to resolved, such as `#EAEEFB`. Empty when unknown. */
    resolve(name: string): string {
        return name ? getComputedStyle(this.document.documentElement).getPropertyValue(name).trim() : '';
    }

    /**
     * Collects the custom properties declared on `:root` or `html` in every
     * stylesheet the page can read. Sheets from another origin, such as a
     * web-font service, cannot be read and are skipped.
     */
    private readTokens(): SpecToken[] {
        const found = new Map<string, SpecToken>();
        const visit = (rules: CSSRuleList) => {
            for (const rule of Array.from(rules)) {
                if (rule instanceof CSSStyleRule && isRootSelector(rule.selectorText)) {
                    for (const name of Array.from(rule.style)) {
                        const source = this.sourceOf(name);
                        if (source && !found.has(name)) {
                            found.set(name, {name, label: name.slice(source.prefix.length), kind: source.kind});
                        }
                    }
                } else if (rule instanceof CSSGroupingRule) {
                    // @media, @supports and @layer blocks.
                    visit(rule.cssRules);
                }
            }
        };

        for (const sheet of Array.from(this.document.styleSheets)) {
            let rules: CSSRuleList;
            try {
                rules = sheet.cssRules;
            } catch {
                continue;
            }
            visit(rules);
        }
        return [...found.values()];
    }

    private sourceOf(name: string): SpecTokenSource | undefined {
        return this.config.tokenSources.find((source) => name.startsWith(source.prefix));
    }
}

function isRootSelector(selectorText: string): boolean {
    return selectorText.split(',').some((selector) => {
        const trimmed = selector.trim();
        return trimmed === ':root' || trimmed === 'html';
    });
}

/**
 * Sorts tokens into groups that read well in a picker.
 *
 * - Background tokens form one group, first, since they are the fills the
 *   style guide asks for.
 * - Semantic colours are grouped by their first word, keeping `on-` with the
 *   word after it: `surface`, `on-surface`, `border`, `status`, …
 * - Ramp steps are grouped by ramp and sorted by step. A ramp's base token,
 *   such as `primary`, leads its ramp.
 *
 * Groups keep the order their first token was declared in.
 */
function groupTokens(tokens: readonly SpecToken[]): SpecTokenGroup[] {
    const rampNames = new Set(tokens.map((token) => RAMP_STEP.exec(token.label)?.[1]).filter((name): name is string => !!name));
    const groups = new Map<string, SpecToken[]>();
    const add = (id: string, token: SpecToken) => {
        const group = groups.get(id);
        if (group) {
            group.push(token);
        } else {
            groups.set(id, [token]);
        }
    };

    for (const token of tokens) {
        if (token.kind === 'background') {
            add('background', token);
        } else if (RAMP_STEP.test(token.label) || rampNames.has(token.label)) {
            add(`ramp:${RAMP_STEP.exec(token.label)?.[1] ?? token.label}`, token);
        } else {
            const words = token.label.split('-');
            add(words[0] === 'on' && words.length > 1 ? `on-${words[1]}` : words[0], token);
        }
    }

    const rampStep = (token: SpecToken) => Number(RAMP_STEP.exec(token.label)?.[2] ?? 0);
    const ordered = [...groups.entries()].sort(([first], [second]) => groupRank(first) - groupRank(second));
    return ordered.map(([id, members]) => ({
        id: id.replace('ramp:', ''),
        tokens: id.startsWith('ramp:') ? [...members].sort((first, second) => rampStep(first) - rampStep(second)) : members
    }));
}

/** Background first, semantic colours next, palette ramps last. A stable sort keeps declaration order within each. */
function groupRank(id: string): number {
    if (id === 'background') {
        return 0;
    }
    return id.startsWith('ramp:') ? 2 : 1;
}
