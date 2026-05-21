export type Rgb01 = { r: number; g: number; b: number };

export interface ColorScaleOptions {
    stepSize?: number;          // default 50
    startStep?: number;         // default 50
    endStep?: number;           // default 950

    // Lightness range (OKLCH L, 0–1)
    startLightness?: number;    // default 0.97 — lightest shade
    endLightness?: number;      // default 0.12 — darkest shade
    lightnessGamma?: number;    // default 1.0; >1 expands highlights, <1 expands shadows

    // Hue control
    hueOffset?: number;         // shift all hues by N degrees from input color (default 0)
    hueDrift?: number;          // additional hue shift across light→dark in degrees (default 0)

    // Chroma (saturation) control
    chromaScale?: number;       // multiply input chroma by this factor (default 1.0)
    chromaMin?: number;         // minimum chroma floor (default 0.0)
    chromaMax?: number;         // maximum chroma cap (default 0.4)
    chromaAtEnds?: number;      // chroma multiplier at lightest/darkest ends, 0–2 (default 0.5)
    chromaPeak?: number;        // chroma multiplier at mid-scale position, 0–2 (default 1.0)

    prefix?: string;            // CSS variable prefix (default "--")
    noRootWrapper?: boolean;    // omit :root { } wrapper (default false)
    includeDebugComment?: boolean; // append L/C/h values as comments (default false)
}

/**
 * Generates CSS custom properties for a color palette scale.
 *
 *   --{name}-50 … --{name}-950   (or custom range/step)
 *
 * All options are independent and have a direct, predictable effect:
 *   - hueOffset shifts every shade's hue by a fixed amount
 *   - hueDrift linearly rotates hue from the light end to the dark end
 *   - chromaAtEnds / chromaPeak form a parabolic saturation curve along the scale
 */
export function generateColorScale(hex: string, name: string, options: ColorScaleOptions = {}): string {
    // ── helpers ──────────────────────────────────────────────────────────────
    type Oklab = { L: number; a: number; b: number };
    type Oklch = { L: number; C: number; h: number };

    const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

    const hexToRgb01 = (hx: string): Rgb01 => {
        const h = hx.replace('#', '').trim();
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        if (full.length !== 6) throw new Error(`Invalid hex color: ${hx}`);
        const n = parseInt(full, 16);
        return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
    };

    const rgb01ToHex = ({ r, g, b }: Rgb01): string => {
        const ch = (v: number) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
        return '#' + ch(r) + ch(g) + ch(b);
    };

    const srgbToLinear = (u: number) => u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
    const linearToSrgb = (u: number) => u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;

    const srgbToOklab = ({ r, g, b }: Rgb01): Oklab => {
        const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
        const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
        const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
        const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
        return {
            L:  0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            a:  1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            b:  0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
        };
    };

    const oklabToSrgb = ({ L, a, b }: Oklab): Rgb01 => {
        const l = L + 0.3963377774 * a + 0.2158037573 * b;
        const m = L - 0.1055613458 * a - 0.0638541728 * b;
        const s = L - 0.0894841775 * a - 1.2914855480 * b;
        const Rl = l * l * l, Ml = m * m * m, Sl = s * s * s;
        return {
            r: linearToSrgb( 4.0767416621 * Rl - 3.3077115913 * Ml + 0.2309699292 * Sl),
            g: linearToSrgb(-1.2684380046 * Rl + 2.6097574011 * Ml - 0.3413193965 * Sl),
            b: linearToSrgb(-0.0041960863 * Rl - 0.7034186147 * Ml + 1.7076147010 * Sl),
        };
    };

    const oklabToOklch = ({ L, a, b }: Oklab): Oklch => {
        let h = Math.atan2(b, a) * (180 / Math.PI);
        if (h < 0) h += 360;
        return { L, C: Math.sqrt(a * a + b * b), h };
    };

    const oklchToOklab = ({ L, C, h }: Oklch): Oklab => {
        const hr = h * (Math.PI / 180);
        return { L, a: C * Math.cos(hr), b: C * Math.sin(hr) };
    };

    const inGamut = ({ r, g, b }: Rgb01) => r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;

    /** Binary-search chroma compression to bring (L, C, h) into sRGB gamut. */
    const gamutMap = ({ L, C, h }: Oklch): Rgb01 => {
        const direct = oklabToSrgb(oklchToOklab({ L, C, h }));
        if (inGamut(direct)) return direct;

        let lo = 0, hi = C;
        for (let i = 0; i < 28; i++) {
            const mid = (lo + hi) / 2;
            const rgb = oklabToSrgb(oklchToOklab({ L, C: mid, h }));
            if (inGamut(rgb)) lo = mid; else hi = mid;
        }
        const rgb = oklabToSrgb(oklchToOklab({ L, C: lo, h }));
        return { r: clamp(rgb.r, 0, 1), g: clamp(rgb.g, 0, 1), b: clamp(rgb.b, 0, 1) };
    };

    // ── options ───────────────────────────────────────────────────────────────
    const stepSize  = Math.max(1, Math.floor(options.stepSize  ?? 50));
    const startStep = Math.floor(options.startStep ?? 50);
    const endStep   = Math.floor(options.endStep   ?? 950);

    const Lstart = clamp(options.startLightness ?? 0.97, 0, 1);
    const Lend   = clamp(options.endLightness   ?? 0.12, 0, 1);
    const gamma  = clamp(options.lightnessGamma ?? 1.0, 0.1, 10);

    const hueOffset = options.hueOffset ?? 0;
    const hueDrift  = options.hueDrift  ?? 0;

    const chromaScale = Math.max(0, options.chromaScale ?? 1.0);
    const chromaMin   = clamp(options.chromaMin ?? 0.0,  0, 1);
    const chromaMax   = clamp(options.chromaMax ?? 0.4,  0, 1);
    const chromaAtEnds = clamp(options.chromaAtEnds ?? 0.5, 0, 2);
    const chromaPeak   = clamp(options.chromaPeak   ?? 1.0, 0, 2);

    const prefix = options.prefix ?? '--';
    const debug  = options.includeDebugComment ?? false;

    // ── input color ───────────────────────────────────────────────────────────
    const inOklch  = oklabToOklch(srgbToOklab(hexToRgb01(hex)));
    const baseHue  = inOklch.h;
    const baseC    = inOklch.C * chromaScale;

    const totalSteps = Math.round((endStep - startStep) / stepSize);

    // ── generate ──────────────────────────────────────────────────────────────
    const lines: string[] = [];

    for (let i = 0; i <= totalSteps; i++) {
        const step = startStep + i * stepSize;

        // t ∈ [0, 1]: 0 = lightest shade, 1 = darkest shade
        const t = totalSteps === 0 ? 0 : i / totalSteps;

        // Lightness: power curve from Lstart to Lend
        const L = clamp(Lstart + (Lend - Lstart) * Math.pow(t, gamma), 0, 1);

        // Hue: base + fixed offset + linear drift
        const h = ((baseHue + hueOffset + hueDrift * t) % 360 + 360) % 360;

        // Chroma: parabolic bell — chromaAtEnds at t=0,1 and chromaPeak at t=0.5
        const bell = chromaAtEnds + (chromaPeak - chromaAtEnds) * 4 * t * (1 - t);
        const C = clamp(baseC * bell, chromaMin, chromaMax);

        const rgb    = gamutMap({ L, C, h });
        const outHex = rgb01ToHex(rgb);

        if (debug) {
            lines.push(`${prefix}${name}-${step}: ${outHex}; /* L=${L.toFixed(3)} C=${C.toFixed(3)} h=${h.toFixed(1)} t=${t.toFixed(3)} */`);
        } else {
            lines.push(`${prefix}${name}-${step}: ${outHex};`);
        }
    }

    return options.noRootWrapper ? lines.join('\n') : `:root {\n  ${lines.join('\n  ')}\n}`;
}


const css = generateColorScale('#00005F', 'ims-primary', {
    chromaScale: 1,
    hueOffset: 0,
    hueDrift: 20,
    chromaAtEnds: 0.4,
    chromaPeak: 1.2,
});

console.log(css);
