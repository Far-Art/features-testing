/** The shape of the knob, in px. */
export interface ImsProcessToolbarKnobShape {
    /** Radius of the knob's circle. */
    readonly radius: number;
    /** How far the circle's centre sits above the panel's edge; negative puts it below, so only a cap rises. */
    readonly lift: number;
    /** Radius of the concave fillet that joins the circle to the edge on each side. */
    readonly filletRadius: number;
}

/**
 * The knob's paths, and the box the toggle covers. Path coordinates run from the knob's
 * centre line in x and from the centre line of the panel's 1px edge in y, up negative.
 */
export interface ImsProcessToolbarKnob {
    /** Width in px of the knob's footprint on the edge. */
    readonly width: number;
    /** Height in px from above the knob's stroke down to the inner side of the edge. */
    readonly height: number;
    /** Closed silhouette. It runs down past the edge line, so none of the line shows under the knob. */
    readonly fillPath: string;
    /** Open outline (fillet, arc, fillet). It runs on along the edge line past each end, so the two overlap. */
    readonly outlinePath: string;
}

/** Half the 1px edge line, which the paths are centred on. */
const EDGE_HALF = 0.5;

/** Room above the outline for half the stroke and its anti-aliasing. */
const STROKE_ROOM = 1;

/** How far below the edge's centre line the fill reaches: past the line and its anti-aliasing. */
const FILL_DEPTH = 1;

/** How far the outline runs on along the edge past each fillet. */
const OUTLINE_OVERLAP = 2;

/**
 * Builds the knob that rises out of the process toolbar's top edge.
 *
 * A circle of `radius` sits with its centre `lift` px above the edge. On each side a
 * concave fillet joins it to the edge: the fillet's centre lies `filletRadius` above the
 * edge, so it touches the edge, and `radius + filletRadius` from the circle's centre, so it
 * touches the circle. Both joins are tangent, so the outline leaves the flat edge, rises
 * into the circle and comes back down without a corner — the knob grows out of the plane.
 */
export function processToolbarKnob({radius, lift, filletRadius}: ImsProcessToolbarKnobShape): ImsProcessToolbarKnob {
    // Vertical distance from the circle's centre down to a fillet's centre.
    const centerDrop = lift - filletRadius;
    const filletX = Math.sqrt((radius + filletRadius) ** 2 - centerDrop ** 2);

    // A fillet meets the circle on the line between their centres.
    const ratio = radius / (radius + filletRadius);
    const tangentX = filletX * ratio;
    const tangentY = -lift + centerDrop * ratio;

    // The arc over the top is the long way round when the fillets meet the circle below
    // its centre, which is when the centre sits higher above the edge than a fillet's.
    const largeArc = lift > filletRadius ? 1 : 0;

    const arcs = [
        `A ${round(filletRadius)} ${round(filletRadius)} 0 0 0 ${round(-tangentX)} ${round(tangentY)}`,
        `A ${round(radius)} ${round(radius)} 0 ${largeArc} 1 ${round(tangentX)} ${round(tangentY)}`,
        `A ${round(filletRadius)} ${round(filletRadius)} 0 0 0 ${round(filletX)} 0`
    ].join(' ');

    return {
        // Even, so a box centred on a whole pixel has whole-pixel edges too.
        width: 2 * Math.ceil(filletX),
        height: lift + radius + STROKE_ROOM + EDGE_HALF,
        fillPath:
            `M ${round(-filletX)} ${FILL_DEPTH} L ${round(-filletX)} 0 ${arcs} ` +
            `L ${round(filletX)} ${FILL_DEPTH} Z`,
        outlinePath:
            `M ${round(-filletX - OUTLINE_OVERLAP)} 0 L ${round(-filletX)} 0 ${arcs} ` +
            `L ${round(filletX + OUTLINE_OVERLAP)} 0`
    };
}

/** Three decimals keep the path short without moving anything by a visible amount. */
function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}
