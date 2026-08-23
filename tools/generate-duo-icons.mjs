/**
 * Generates `src/app/components/ims-duo-icon/ims-duo-icon.generated.ts` from the SVG
 * files in `src/app/components/ims-duo-icon/icons`.
 *
 * The folder is the single source of truth. Each file's markup is copied in
 * verbatim, because `<ims-duo-icon>` injects it into the DOM unchanged — see that
 * folder's README for the required shape of the root element.
 *
 * Run via `npm run icons`; `prestart` / `prebuild` keep it in sync automatically.
 */
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';

const COMPONENT_DIR = resolve('src/app/components/ims-duo-icon');
const ICONS_DIR = join(COMPONENT_DIR, 'icons');
const OUTPUT_FILE = join(COMPONENT_DIR, 'ims-duo-icon.generated.ts');
const COMPONENT_STYLES = join(COMPONENT_DIR, 'ims-duo-icon.scss');
const COMPONENT_TYPES = join(COMPONENT_DIR, 'ims-duo-icon.types.ts');
const COMPONENT_SOURCE = join(COMPONENT_DIR, 'ims-duo-icon.ts');
const COLOR_TOKENS = resolve('src/styles/tokens/color-tokens.scss');

/** Attributes the component relies on; a file missing any of them renders wrong. */
const REQUIRED_ROOT_ATTRS = [
    'xmlns="http://www.w3.org/2000/svg"',
    'width="32"',
    'height="32"',
    'viewBox="0 0 32 32"',
    'fill="none"',
    'focusable="false"',
    'aria-hidden="true"'
];

/** The tones the component actually implements, read from the type union. */
function readTones() {
    const types = readFileSync(COMPONENT_TYPES, 'utf8');
    const union = types.match(/export type ImsDuoIconTone =([^;]+);/)?.[1] ?? '';
    return [...union.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
}

const errors = [];
const warnings = [];

/**
 * Resolves the shipped defaults out of the component stylesheet, following one
 * level of `var(--ims-color-*)` indirection into the token ramps. The SVG
 * fallbacks are supposed to mirror these — that is what a designer sees opening
 * a file directly — and nothing else checks it.
 */
function readShippedDefaults() {
    const styles = readFileSync(COMPONENT_STYLES, 'utf8');
    const tokens = readFileSync(COLOR_TOKENS, 'utf8');

    const base = styles.match(/\.ims-duo-icon\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const ramp = new Map(
        [...tokens.matchAll(/(--ims-color-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{3,8});/g)]
            .map((m) => [m[1], m[2].toUpperCase()])
    );

    const read = (name) => {
        const raw = base.match(new RegExp(String.raw`${name}:\s*([^;]+);`))?.[1].trim();
        if (!raw) return null;
        const ref = raw.match(/^var\((--ims-color-[a-z0-9-]+)\)$/)?.[1];
        return ref ? ramp.get(ref) ?? null : raw;
    };

    return {
        tint: read('--ims-duo-icon-tint'),
        contour: read('--ims-duo-icon-contour'),
        strokeWidth: read('--ims-duo-icon-stroke-width'),
        offset: read('--ims-duo-icon-offset')
    };
}

function readIcon(file, defaults, tones) {
    const name = basename(file, '.svg');
    const source = readFileSync(join(ICONS_DIR, file), 'utf8').trim();
    const fail = (message) => errors.push(`${file}: ${message}`);
    const warn = (message) => warnings.push(`${file}: ${message}`);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail('name must be kebab-case.');
    if (source.includes('`') || source.includes('${')) {
        fail('contains a backtick or ${, which cannot be embedded verbatim.');
    }

    const root = source.match(/<svg\b[^>]*>/)?.[0];
    if (!root) {
        fail('no <svg> root element.');
        return null;
    }
    const missing = REQUIRED_ROOT_ATTRS.filter((attr) => !root.includes(attr));
    if (missing.length) fail(`root element is missing ${missing.join(', ')}.`);

    const label = source.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim();
    if (!label) fail('needs a <title> holding the sentence-case label.');
    if (label?.includes("'")) fail('label contains an apostrophe; quote it manually.');

    // Optional: a glyph whose meaning implies a palette can declare it once here
    // instead of every call site restating `tone="warning"`.
    const tone = root.match(/data-tone="([^"]*)"/)?.[1];
    if (tone !== undefined && !tones.includes(tone)) {
        fail(`data-tone="${tone}" is not a tone (${tones.join(', ')}).`);
    }

    const tintLayers = (source.match(/class="tint"/g) ?? []).length;
    if (tintLayers !== 1) fail(`expected exactly one class="tint" layer, found ${tintLayers}.`);

    // Fallbacks only affect the standalone render, so a mismatch is a warning
    // rather than a build failure — but it means the file lies about the theme.
    const checkFallback = (token, expected) => {
        if (expected == null) return;
        const pattern = new RegExp(String.raw`var\(${token},\s*([^)]*)\)`, 'g');
        for (const [, found] of source.matchAll(pattern)) {
            if (found.trim() !== expected) {
                warn(`${token} fallback is ${found.trim()}, but ims-duo-icon.scss ships ${expected}.`);
            }
        }
    };
    checkFallback('--ims-duo-icon-tint', defaults.tint);
    checkFallback('--ims-duo-icon-contour', defaults.contour);
    checkFallback('--ims-duo-icon-stroke-width', defaults.strokeWidth);

    const translate = source.match(/class="tint"[^>]*transform="translate\(([^)]*)\)"/)?.[1];
    if (!translate) {
        warn('the tint layer has no translate attribute; it will sit in register standalone.');
    } else {
        const [x, y] = translate.trim().split(/\s+/);
        if (x !== y) warn(`tint offset ${x}/${y} is not equal on both axes.`);
        else if (defaults.offset != null && x !== defaults.offset) {
            warn(`tint offset is ${x}, but ims-duo-icon.scss ships ${defaults.offset}.`);
        }
    }

    return {name, label: label ?? name, tone, source};
}

const files = readdirSync(ICONS_DIR).filter((file) => file.endsWith('.svg')).sort();
if (files.length === 0) throw new Error(`No .svg files found in ${ICONS_DIR}.`);

const defaults = readShippedDefaults();

// The component scales the contour per size from its own copy of the resting
// weight. If that drifts from the stylesheet, every rendered icon silently
// disagrees with what the source files fall back to.
const declaredBase = readFileSync(COMPONENT_SOURCE, 'utf8')
    .match(/const BASE_STROKE_WIDTH = ([\d.]+);/)?.[1];
if (declaredBase !== defaults.strokeWidth) {
    errors.push(
        `ims-duo-icon.ts BASE_STROKE_WIDTH is ${declaredBase}, but ims-duo-icon.scss ` +
            `ships --ims-duo-icon-stroke-width: ${defaults.strokeWidth}.`
    );
}

const tones = readTones();
const icons = files.map((file) => readIcon(file, defaults, tones)).filter(Boolean);

for (const warning of warnings) console.warn(`  warn  ${warning}`);
if (errors.length) {
    for (const error of errors) console.error(`  FAIL  ${error}`);
    console.error(`\nims-duo-icon: ${errors.length} icon(s) do not match the spec in ${ICONS_DIR}/README.md.`);
    process.exit(1);
}

const toConstName = (name) =>
    'imsDuoIcon' + name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');

// One top-level const per icon, so a bundler can drop the ones nobody imports.
// A single lookup object would be indivisible: reaching into it by a dynamic
// name forces every glyph into the bundle.
const declarations = icons
    .map(
        (icon) => `export const ${toConstName(icon.name)}: ImsDuoIconDefinition = {
    name: '${icon.name}',
    label: '${icon.label}',${icon.tone ? `\n    tone: '${icon.tone}',` : ''}
    source: \`${icon.source}\`
};`
    )
    .join('\n\n');

const allEntries = icons.map((icon) => `    ${toConstName(icon.name)}`).join(',\n');

writeFileSync(
    OUTPUT_FILE,
    `// AUTO-GENERATED by tools/generate-duo-icons.mjs — do not edit by hand.
// Source: src/app/components/ims-duo-icon/icons/*.svg. Regenerate with \`npm run icons\`.

import {ImsDuoIconDefinition} from './ims-duo-icon.types';

${declarations}

/**
 * Every icon, for galleries that genuinely need the whole set.
 * Importing this defeats tree-shaking by design — import the individual
 * \`imsDuoIcon*\` consts instead unless you really do want all of them.
 */
export const IMS_DUO_ICON_ALL: readonly ImsDuoIconDefinition[] = [
${allEntries}
];
`,
    'utf8'
);

const suffix = warnings.length ? ` (${warnings.length} warning(s))` : '';
console.log(`ims-duo-icon: generated ${icons.length} icons -> ${OUTPUT_FILE}${suffix}`);
