import {
    DestroyRef,
    Directive,
    ElementRef,
    Renderer2,
    afterNextRender,
    booleanAttribute,
    computed,
    effect,
    forwardRef,
    inject,
    signal,
    input
} from '@angular/core';
import {ReadonlyDirective} from '../../shared/readonly.directive';
// Imported from the types module rather than the barrel: this is a token and
// two interfaces, and reaching through the barrel would name the tooltip and
// popover directives in a file that uses neither.
import {IMS_TOOLTIP_DEFAULTS, ImsTooltipDefaults} from '../ims-tooltip/ims-tooltip.types';
import {IMS_BUTTON_ICON_PRESETS, ImsButtonIconPreset, ImsButtonIconPresetSeverity} from './ims-button-presets';

// How long the press ring stays on. The class carries a CSS animation that
// holds the ring solid for its first quarter and fades it out over the rest,
// so this has to match that animation's duration in ims-buttons.scss — drop
// it and the fade is cut off mid-way.
const ACTION_BLINK_MS = 450;

type ImsButtonType = 'button' | 'submit' | 'reset';
type ImsButtonActivationKey = 'Enter' | ' ';
/**
 * How loudly a button speaks: how much of its severity's hue it puts on
 * screen, from a soft tint to a solid fill. Says nothing about what kind of
 * action it is — that is {@link ImsButtonSeverity}.
 */
export type ImsButtonVariation = 'default' | 'primary' | 'secondary' | 'outline';

/**
 * Which voice a button speaks in.
 *
 * The same four values as `ImsSnackbarSeverity` and `ImsTooltipSeverity`, so
 * one word means the same thing wherever the application reports state.
 */
export type ImsButtonSeverity = 'info' | 'success' | 'warning' | 'danger';

// A button carries no tooltip of its own. A call site that wants one applies
// `imsTooltip` to the same element and imports it like any other directive.
//
// What the button does supply is defaults: each concrete directive below
// provides `IMS_TOOLTIP_DEFAULTS`, so a tooltip placed on a button picks up the
// button's tone without the template saying it twice, and a `delete` preset
// reads as danger on its own.
//
// Deliberately not a host directive, and this is the second attempt at it. A
// tooltip applied that way reads better at the call site, but then a template
// that also puts one on the element has two of them: two trigger instances, two
// overlays opening on one hover, and — back when the host directive was
// Material's, whose selector a template can also match — the element refused
// outright with NG0309. Contributing defaults instead leaves exactly one tooltip
// engine on the element, the one the template asked for, and costs a button
// with no tooltip a provider record and nothing else.
@Directive({
    host: {
        class: 'ims-button',
        '[class.ims-button--mounting]': 'justMounted()',
        '[class.ims-button--action-blink]': 'actionBlink()',
        '[class.ims-button--with-symbol]': 'normalizedIcon().length > 0',
        '[class.ims-button--success]': 'activeSeverity() === "success"',
        '[class.ims-button--warning]': 'activeSeverity() === "warning"',
        '[class.ims-button--danger]': 'activeSeverity() === "danger"',
        '[class.ims-button--neutral]': 'activeSeverity() === "neutral"',
        '[style.--ims-button-symbol-size]': 'iconSize()',
        '[class.ims-button--cta]': 'callToAction()',
        '[class.ims-readonly]': 'readonlyMode()',
        '[class.ims-button--disabled]': 'disabledInput()',
        '[class.ims-button--readonly]': 'readonlyMode()',
        '[attr.type]': 'type()',
        '[attr.aria-disabled]': 'interactionDisabled() ? "true" : null',
        '(click)': 'handleClick($event)',
        '(keydown)': 'trackActivationKey($event)',
        '(keyup)': 'releaseActivationKey($event)',
        '(blur)': 'clearActivationKey()'
    }
})
export abstract class ImsButtonBase {
    private readonly inheritedReadonly = ReadonlyDirective.injectSignal();
    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLButtonElement>>(ElementRef);
    private readonly renderer = inject(Renderer2);
    private symbolElement: HTMLElement | null = null;
    /** The `aria-label` this button wrote for itself and still holds, or null. */
    private ownLabel: string | null = null;
    private pressedActivationKey: ImsButtonActivationKey | null = null;
    private actionBlinkResetHandle: ReturnType<typeof setTimeout> | null = null;

    /**
     * True for the first frame after the host is created. A freshly mounted
     * button can land under an already-stationary pointer (returning to a
     * route, content reflowing under the cursor) and pick up `:hover` with
     * no real mouse movement, which then animates back out a moment later.
     * Suppressing transitions for one frame keeps the initial state a snap
     * instead of a visible, unintended animation.
     */
    protected readonly justMounted = signal(true);
    protected readonly actionBlink = signal(false);

    constructor() {
        // What the button supplies for itself: a glyph, and the name that
        // stands in for it. One effect for both, since they come from the same
        // preset and change together.
        effect(() => {
            this.syncIcon(this.normalizedIcon());
            this.syncLabel(this.resolveLabel());
        });

        afterNextRender(() => {
            requestAnimationFrame(() => this.justMounted.set(false));
        });

        this.destroyRef.onDestroy(() => this.clearActionBlinkTimer());
    }

    /** Native disabled state. Readonly also disables interaction through `interactionDisabled`. */
    readonly disabledInput = input<boolean, boolean | string | null | undefined>(false, {alias: 'disabled', transform: booleanAttribute});

    /** Defaults buttons to non-submit behavior; bind `type="submit"` when needed. */
    readonly type = input<ImsButtonType>('button');

    /**
     * Rendered size of a preset's pinned glyph. A bare number means px
     * (`icon-size="14"`); anything else is passed through as written, so any
     * CSS length works (`icon-size="1.25rem"`, `"1em"`, `"clamp(…)"`).
     *
     * Only reaches a glyph this class drew itself, which since the `icon`
     * input went away means a preset's and nothing else. A projected
     * `<ims-icon>` carries its own `size`, and that is the input to use there —
     * it writes `--ims-icon-size` inline and would win over this anyway.
     *
     * Unset defers to `--ims-button-symbol-size` in ims-buttons.scss, which is
     * where the house default lives and where a preset that needs another
     * sets its own, in the block its class keys — so this is an override for
     * the odd call site, not the place to restyle a preset.
     *
     * A malformed length can't be caught here or by the compiler: CSS drops
     * it where the glyph reads it, and the glyph falls back to the button's
     * own font size.
     */
    readonly iconSize = input<string | null, unknown>(null, {
        alias: 'icon-size',
        transform: (value): string | null => {
            if (value === null || value === undefined) return null;

            const raw = String(value).trim();
            if (raw === '') return null;

            // A unitless number is the one thing CSS can't use as a length, so
            // it's the one thing worth interpreting — px, matching ImsIcon's
            // `size`. Everything else is already a length; passing it through
            // untouched is what lets rem (the unit the presets are written in)
            // work here too.
            return /^-?\d*\.?\d+$/.test(raw) ? `${raw}px` : raw;
        }
    });

    /**
     * The tone this button is painted in — what kind of action it carries.
     * Orthogonal to `variation`, which says how loudly it says it: every
     * severity works at every variation, from a soft tint to a solid fill.
     *
     * `info` is the default and paints nothing of its own: it is the house
     * blue every button has always been, so a call site that has no state to
     * report writes nothing.
     *
     * A severity replaces the whole colour ramp the variation draws from, so
     * the ripple, the press ring, the focus halo and the call-to-action pulse
     * all follow it without a call site arranging anything.
     *
     * On an icon button with a preset, it depends on the preset. `edit` takes
     * it exactly the way a plain icon button does. `delete` ignores it: that
     * preset pins its severity for the same reason it pins its glyph — a
     * delete looks like a delete on every screen — so the input is accepted
     * there and does nothing. A preset can also pin `neutral`, which this input
     * does not offer.
     */
    readonly severity = input<ImsButtonSeverity>('info', {alias: 'ims-button-severity'});

    /**
     * The severity the button is painted in and a tooltip on it inherits:
     * `ims-button-severity`, unless a preset pins one — see
     * {@link resolveSeverity}.
     */
    protected readonly activeSeverity = computed(() => this.resolveSeverity());

    /**
     * What a tooltip placed on this button inherits when its own inputs are
     * unset.
     *
     * A button already states what kind of action it carries, so a tooltip on
     * one should not have to state it again — `imsTooltipSeverity` becomes the
     * override for the odd call site rather than the thing every call site
     * writes.
     *
     * A signal, not a value, because `ims-button-severity` is bindable and an
     * open tooltip follows it. Placement is left out: where a tooltip goes is a
     * property of the layout around the button, not of the button.
     *
     * `neutral` hands on no severity. A tooltip has no neutral of its own, and
     * guessing one would put a tone on it that the button never had, so the
     * application default applies instead.
     */
    readonly tooltipDefaults = computed<ImsTooltipDefaults>(() => {
        const severity = this.activeSeverity();
        return severity === 'neutral' ? {} : {severity};
    });

    /**
     * Marks this button as the way forward, adding a slow halo that pulses
     * outward until the button is engaged. Orthogonal to `variation`, which
     * says what kind of action this is — any variation can be the one being
     * called for, including an icon-only button.
     *
     * At most one per view. The halo works by being the only thing moving;
     * a second one turns both into noise.
     */
    readonly callToAction = input<boolean, boolean | string | null | undefined>(false, {alias: 'call-to-action', transform: booleanAttribute});

    protected readonly normalizedIcon = computed(() => this.resolveIcon().trim());

    /**
     * The symbol this button draws for itself. Empty unless a preset pins one:
     * `ImsButtonIcon` overrides this with its preset's glyph.
     *
     * This is the whole of the internal icon mechanism, and no template can
     * name a glyph through it. A button that wants a glyph projects an
     * `<ims-icon>`; a preset pins one here so a call site cannot drift from it.
     * A free glyph here as well meant two ways to say the same thing, so a call
     * site could say both, and the projected one would then sit beside a glyph
     * nobody asked for. A preset names an affordance rather than a glyph, and
     * projecting an icon into one is the same mistake.
     *
     * A method rather than a field: the base's `normalizedIcon` computed is
     * built during base field initialization, before any subclass field
     * exists, but it only *calls* this at the first effect flush — by which
     * point the override is in place.
     */
    protected resolveIcon(): string {
        return '';
    }

    /**
     * The accessible name this button gives itself, and {@link resolveIcon}'s
     * other half: the glyph drawn there is `aria-hidden`, so whatever pins one
     * has to name the button too. Empty unless a preset pins one.
     *
     * A default and nothing more. A name the call site writes, in either
     * spelling, always wins — see {@link syncLabel}.
     */
    protected resolveLabel(): string {
        return '';
    }

    /**
     * The severity in force. `ims-button-severity` here; `ImsButtonIcon`
     * returns its preset's pinned one instead, when the preset has one, which
     * is the only way `neutral` ever arrives.
     */
    protected resolveSeverity(): ImsButtonIconPresetSeverity {
        return this.severity();
    }

    /** Readonly state inherited from the nearest `ims-readonly` provider. */
    readonly readonlyMode = this.inheritedReadonly;

    /** True when the host button must not run user actions. */
    readonly interactionDisabled = computed(() => this.disabledInput() || this.readonlyMode());

    protected handleClick(event: MouseEvent): void {
        if (this.interactionDisabled()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        // Pointer-generated clicks complete on release. Keyboard-generated
        // clicks have detail 0 and are handled on keyup instead.
        if (event.detail > 0) this.triggerActionBlink();
    }

    protected trackActivationKey(event: KeyboardEvent): void {
        if (event.repeat || this.interactionDisabled() || !this.isActivationKey(event.key)) return;
        this.pressedActivationKey = event.key;
    }

    protected releaseActivationKey(event: KeyboardEvent): void {
        if (event.key !== this.pressedActivationKey) return;

        this.pressedActivationKey = null;
        if (!this.interactionDisabled()) this.triggerActionBlink();
    }

    protected clearActivationKey(): void {
        this.pressedActivationKey = null;
    }

    private syncIcon(symbol: string): void {
        const host = this.host.nativeElement;

        if (!symbol) {
            if (this.symbolElement) {
                this.renderer.removeChild(host, this.symbolElement);
                this.symbolElement = null;
            }
            return;
        }

        if (!this.symbolElement) {
            this.symbolElement = this.renderer.createElement('span') as HTMLElement;
            this.renderer.addClass(this.symbolElement, 'ims-icon');
            this.renderer.addClass(this.symbolElement, 'ims-button__symbol');
            this.renderer.setAttribute(this.symbolElement, 'aria-hidden', 'true');
            this.renderer.insertBefore(host, this.symbolElement, host.firstChild);
        }

        this.renderer.setProperty(this.symbolElement, 'textContent', symbol);
    }

    // Imperative rather than a host binding, for the call site's sake. A host
    // `[attr.aria-label]` writes on its first pass even when it has nothing to
    // say, and writing null removes the attribute — taking a static
    // `aria-label="…"` from the template with it. It also runs after the
    // template's own bindings, so it would overwrite a bound
    // `[attr.aria-label]="…"`, which is how focus mode names its trigger.
    //
    // So this only ever touches a name it wrote itself: an attribute that is
    // missing, or still holds the value last written here. Anything else came
    // from the call site and is left alone. That test holds whichever order
    // this runs in against the template's bindings — before them, the
    // template's write lands on top; after them, the name already here is not
    // ours.
    private syncLabel(label: string): void {
        // Nothing to add and nothing of ours to take back: a labelled button,
        // and every icon button without a preset, stops here without touching
        // the DOM.
        if (!label && this.ownLabel === null) return;

        const host = this.host.nativeElement;
        const current = host.getAttribute('aria-label');

        if (current !== null && current !== this.ownLabel) {
            // The call site's. Forget ours, so a later name that happens to
            // match it is never taken for one written here.
            this.ownLabel = null;
            return;
        }

        if (label) {
            this.renderer.setAttribute(host, 'aria-label', label);
        } else if (current !== null) {
            this.renderer.removeAttribute(host, 'aria-label');
        }
        this.ownLabel = label || null;
    }

    private triggerActionBlink(): void {
        this.clearActionBlinkTimer();
        this.actionBlink.set(true);
        this.actionBlinkResetHandle = setTimeout(() => {
            this.actionBlink.set(false);
            this.actionBlinkResetHandle = null;
        }, ACTION_BLINK_MS);
    }

    private clearActionBlinkTimer(): void {
        if (this.actionBlinkResetHandle === null) return;
        clearTimeout(this.actionBlinkResetHandle);
        this.actionBlinkResetHandle = null;
    }

    private isActivationKey(key: string): key is ImsButtonActivationKey {
        return key === 'Enter' || key === ' ';
    }
}

@Directive({
    selector: 'button[ims-button]',
    standalone: true,
    // On each concrete directive rather than on the base: `providers` is the
    // one piece of directive metadata Angular does not carry down to a subclass
    // that declares a decorator of its own, unlike the host bindings above.
    providers: [{provide: IMS_TOOLTIP_DEFAULTS, useExisting: forwardRef(() => ImsButton)}],
    host: {
        '[class.ims-button--default]': 'variation() === "default"',
        '[class.ims-button--primary]': 'variation() === "primary"',
        '[class.ims-button--secondary]': 'variation() === "secondary"',
        '[class.ims-button--outline]': 'variation() === "outline"',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButton extends ImsButtonBase {
    readonly variation = input<ImsButtonVariation>('default', {alias: 'ims-button-variation'});
}

/**
 * Icon-only button. There's no visible text, so give it an accessible name with `aria-label` —
 * or a {@link ImsButtonIcon.preset}, which brings a glyph and a name of its own.
 *
 * With a severity other than `info`, the glyph takes that severity's vivid status colour
 * rather than the darker tone a label would, since the glyph is all the colour it has.
 */
@Directive({
    selector: 'button[ims-button-icon]',
    standalone: true,
    providers: [{provide: IMS_TOOLTIP_DEFAULTS, useExisting: forwardRef(() => ImsButtonIcon)}],
    host: {
        // --default on every icon button, a preset's included: a preset that
        // pins a severity is painted from that severity's ramp like any icon
        // button, and its own block in ims-buttons.scss restyles only what
        // departs from one.
        class: 'ims-button--default ims-button-icon',
        // The preset's own class, straight from its spec, so adding a preset
        // never means adding a binding here. A map binding only adds and
        // removes the classes it names itself, so the static ones above and a
        // call site's own `class` are left alone.
        '[class]': 'presetClass()',
        '[disabled]': 'interactionDisabled()'
    }
})
export class ImsButtonIcon extends ImsButtonBase {
    /**
     * A named affordance this button stands for, so it looks and reads the
     * same on every screen:
     * `<button ims-button-icon ims-button-icon-preset="delete">`.
     *
     * Bound as `ims-button-icon-preset`, named the way `ims-button-variation`
     * and `ims-button-severity` are. A bare `preset="…"` is no binding at all,
     * just an attribute the button ignores.
     *
     * A preset pins the glyph, which the button then draws itself — so project
     * nothing into a preset button, or the projected icon sits beside the
     * pinned one. It brings a default accessible name too, which the call
     * site's own `aria-label`, in either spelling, always replaces. It may pin
     * a severity: `delete` is danger on every screen, so `ims-button-severity`
     * does nothing there and a tooltip on it inherits danger. `edit` pins none
     * and takes a severity like any icon button. And it may put a class on the
     * button, the hook its block in ims-buttons.scss keys to — where anything
     * else it departs in is said, a glyph size of its own included.
     *
     * Bindable: `[ims-button-icon-preset]="row.locked ? null : 'delete'"` swaps
     * the glyph, the name, the severity and the class together, and with the
     * class, whatever its block sets.
     *
     * The presets, and how to add one, are in ims-button-presets.ts.
     */
    readonly preset = input<ImsButtonIconPreset | null>(null, {alias: 'ims-button-icon-preset'});

    /** The spec of the preset in force — see {@link resolvePreset} — or null. */
    private readonly presetSpec = computed(() => {
        const preset = this.resolvePreset();
        return preset === null ? null : IMS_BUTTON_ICON_PRESETS[preset];
    });

    /** The preset's own class, or null for none. */
    protected readonly presetClass = computed(() => this.presetSpec()?.class ?? null);

    /**
     * The preset this button stands for: the input. A method so the deprecated
     * `ims-button-edit` and `ims-button-delete` can pin theirs — see
     * ims-button-actions.ts.
     */
    protected resolvePreset(): ImsButtonIconPreset | null {
        return this.preset();
    }

    protected override resolveIcon(): string {
        return this.presetSpec()?.icon ?? '';
    }

    protected override resolveLabel(): string {
        return this.presetSpec()?.label ?? '';
    }

    protected override resolveSeverity(): ImsButtonIconPresetSeverity {
        return this.presetSpec()?.severity ?? this.severity();
    }
}
