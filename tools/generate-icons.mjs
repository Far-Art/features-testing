/**
 * Generates `src/app/components/ims-icon/ims-icon.generated.ts` from the SVG
 * files in `src/assets/icons`.
 *
 * The folder is the single source of truth. Each file's markup is copied in
 * verbatim, because `<ims-icon>` injects it into the DOM unchanged — see that
 * folder's README for the required shape of the root element.
 *
 * Run via `npm run icons`; `prestart` / `prebuild` keep it in sync automatically.
 */
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';

const ICONS_DIR = resolve('src/assets/icons');
const COMPONENT_DIR = resolve('src/app/components/ims-icon');
const OUTPUT_FILE = join(COMPONENT_DIR, 'ims-icon.generated.ts');
const COMPONENT_STYLES = join(COMPONENT_DIR, 'ims-icon.scss');
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

    const base = styles.match(/\.ims-svg-icon\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
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
        tint: read('--icon-tint'),
        contour: read('--icon-contour'),
        strokeWidth: read('--icon-stroke-width'),
        offset: read('--icon-offset')
    };
}

function readIcon(file, defaults) {
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

    const tintLayers = (source.match(/class="tint"/g) ?? []).length;
    if (tintLayers !== 1) fail(`expected exactly one class="tint" layer, found ${tintLayers}.`);

    // Fallbacks only affect the standalone render, so a mismatch is a warning
    // rather than a build failure — but it means the file lies about the theme.
    const checkFallback = (token, expected) => {
        if (expected == null) return;
        const pattern = new RegExp(String.raw`var\(${token},\s*([^)]*)\)`, 'g');
        for (const [, found] of source.matchAll(pattern)) {
            if (found.trim() !== expected) {
                warn(`${token} fallback is ${found.trim()}, but ims-icon.scss ships ${expected}.`);
            }
        }
    };
    checkFallback('--icon-tint', defaults.tint);
    checkFallback('--icon-contour', defaults.contour);
    checkFallback('--icon-stroke-width', defaults.strokeWidth);

    const translate = source.match(/class="tint"[^>]*transform="translate\(([^)]*)\)"/)?.[1];
    if (!translate) {
        warn('the tint layer has no translate attribute; it will sit in register standalone.');
    } else {
        const [x, y] = translate.trim().split(/\s+/);
        if (x !== y) warn(`tint offset ${x}/${y} is not equal on both axes.`);
        else if (defaults.offset != null && x !== defaults.offset) {
            warn(`tint offset is ${x}, but ims-icon.scss ships ${defaults.offset}.`);
        }
    }

    return {name, label: label ?? name, source};
}

const files = readdirSync(ICONS_DIR).filter((file) => file.endsWith('.svg')).sort();
if (files.length === 0) throw new Error(`No .svg files found in ${ICONS_DIR}.`);

const defaults = readShippedDefaults();
const icons = files.map((file) => readIcon(file, defaults)).filter(Boolean);

for (const warning of warnings) console.warn(`  warn  ${warning}`);
if (errors.length) {
    for (const error of errors) console.error(`  FAIL  ${error}`);
    console.error(`\nims-icon: ${errors.length} icon(s) do not match the spec in ${ICONS_DIR}/README.md.`);
    process.exit(1);
}

const entries = icons
    .map((icon) => `    '${icon.name}': {\n        label: '${icon.label}',\n        source: \`${icon.source}\`\n    }`)
    .join(',\n');

writeFileSync(
    OUTPUT_FILE,
    `// AUTO-GENERATED by tools/generate-icons.mjs — do not edit by hand.
// Source: src/assets/icons/*.svg. Regenerate with \`npm run icons\`.

export interface ImsIconDefinition {
    /** Human-readable name, used when an instance opts into \`label="true"\`. */
    readonly label: string;
    /** Complete \`<svg>\` markup, verbatim from the source file. */
    readonly source: string;
}

export const IMS_ICONS = {
${entries}
} as const satisfies Record<string, ImsIconDefinition>;

/** Every icon available to \`<ims-icon>\`. A typo here is a compile error. */
export type ImsIconName = keyof typeof IMS_ICONS;

export const IMS_ICON_NAMES = Object.keys(IMS_ICONS) as readonly ImsIconName[];
`,
    'utf8'
);

const suffix = warnings.length ? ` (${warnings.length} warning(s))` : '';
console.log(`ims-icon: generated ${icons.length} icons -> ${OUTPUT_FILE}${suffix}`);
