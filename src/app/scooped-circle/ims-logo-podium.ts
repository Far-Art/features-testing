import {ChangeDetectionStrategy, Component, computed, Input, signal} from '@angular/core';


type GradStop = { offset: number; color: string; opacity?: number };

@Component({
    selector: 'ims-logo-podium',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './ims-logo-podium.scss',
    templateUrl: './ims-logo-podium.html'
})
export class ImsLogoPodiumComponent {
    protected rSig = signal(180);
    protected seamSig = signal(42);
    protected rfSig = signal(22);
    protected _stops = signal<GradStop[]>([]);
    protected w = computed(() => 3 * this.rSig());
    protected h = computed(() => 2 * this.rSig());
    protected seamY = computed(() => this.seamSig());
    // ---------- path ----------
    /** One closed shape: flat seam -> left concave fillet -> lower circle arc -> right concave fillet -> close */
    protected pathD = computed(() => {
        const R = this.rSig();
        const cx = R, cy = R;

        const lineY = this.seamSig();     // top flat
        const rf = this.rfSig();          // scoop radius (concave)
        const cfY = lineY + rf;           // fillet centers lie rf below the seam

        // feasibility
        const dy = cfY - cy;
        const sq = (R + rf) * (R + rf) - dy * dy;
        if (sq <= 0) {
            // fallback: plain semicircle + seam
            const dx = Math.sqrt(Math.max(0, R * R - (lineY - cy) * (lineY - cy)));
            const xL = cx - dx, xR = cx + dx;
            return `M ${xL} ${lineY} A ${R} ${R} 0 0 1 ${xR} ${lineY} L ${xL} ${lineY} Z`;
        }

        const dx = Math.sqrt(sq);
        const cfxL = cx - dx, cfxR = cx + dx;

        // seam intersections (directly above fillet centers)
        const ixL = cfxL, ixR = cfxR, iy = lineY;

        // tangency points on the circle
        const d = R + rf;
        const leftX = cx + (R / d) * (cfxL - cx);
        const leftY = cy + (R / d) * (cfY - cy);
        const rightX = cx + (R / d) * (cfxR - cx);
        const rightY = cy + (R / d) * (cfY - cy);

        // arc flags for the bottom arc
        const ang = (x: number, y: number) => Math.atan2(y - cy, x - cx);
        const norm = (t: number) => t < 0 ? t + 2 * Math.PI : t;
        const aL = norm(ang(leftX, leftY));
        const aR = norm(ang(rightX, rightY));
        const span = aR - aL >= 0 ? aR - aL : aR - aL + 2 * Math.PI;
        const largeArc = span > Math.PI ? 1 : 0;
        const sweep = 1;

        return [
            `M ${ixL} ${iy}`,
            `A ${rf} ${rf} 0 0 1 ${leftX} ${leftY + 1}`,                   // left scoop
            `A ${R} ${R} 0 ${largeArc} ${sweep} ${rightX} ${rightY + 1}`,  // bottom arc
            `A ${rf} ${rf} 0 0 1 ${ixR} ${iy}`,                            // right scoop
            `L ${ixL} ${iy}`,                                              // flat top
            'Z'
        ].join(' ');
    });

    // ---------- geometry (px) ----------
    /** Circle radius */
    @Input() set circleRadius(v: number) { this.rSig.set(Math.max(2, v)); }

    /** Distance from the top of the circle down to the flat seam (0..R) */
    @Input() set seamFromTop(v: number) { this.seamSig.set(Math.max(0, v)); }

    /** Fillet (scoop) radius */
    @Input() set filletRadius(v: number) { this.rfSig.set(Math.max(0, v)); }

    protected _fill = signal('#000');

    // ---------- paint ----------
    @Input() set fill(v: string) { this._fill.set(v); }

    // gradient (optional)
    @Input() set gradientStops(v: GradStop[] | null) { this._stops.set(v ?? []); }

    protected _gradId = signal('scoopGrad');

    @Input() set gradId(v: string) { this._gradId.set(v || 'scoopGrad'); }

}
