import { Component, Input, ChangeDetectionStrategy, signal, computed } from '@angular/core';

type GradStop = { offset: number; color: string; opacity?: number };

@Component({
  selector: 'scooped-circle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
        [attr.viewBox]="'-' + w() / 6 + ' 0 ' + w() + ' ' + h()"
        [style.width.%]="100" [style.height.%]="100"
        xmlns="http://www.w3.org/2000/svg">

      @if (stopsSig().length) {
        <defs>
          <linearGradient [attr.id]="gradIdSig()" gradientUnits="userSpaceOnUse"
                          [attr.x1]="0" [attr.y1]="seamY()" [attr.x2]="0" [attr.y2]="h()">
            @for (s of stopsSig(); track $index) {
              <stop [attr.offset]="s.offset + '%'"
                    [attr.stop-color]="s.color"
                    [attr.stop-opacity]="s.opacity ?? 1" />
            }
          </linearGradient>
        </defs>
      }

      <path
          [attr.d]="pathD()"
          [attr.fill]="stopsSig().length ? 'url(#' + gradIdSig() + ')' : fillSig()" />
      
      <circle 
          [attr.cx]="rSig()" 
          [attr.cy]="rSig() - 0.3" 
          [attr.r]="rSig()"
          [attr.fill]="stopsSig().length ? 'url(#' + gradIdSig() + ')' : fillSig()" />
    </svg>
  `
})
export class ScoopedCircleComponent {
  // ---------- geometry (px) ----------
  /** Circle radius */
  @Input() set circleRadius(v: number) { this.rSig.set(Math.max(2, v)); }
  /** Distance from the top of the circle down to the flat seam (0..R) */
  @Input() set seamFromTop(v: number) { this.seamSig.set(Math.max(0, v)); }
  /** Fillet (scoop) radius */
  @Input() set filletRadius(v: number) { this.rfSig.set(Math.max(0, v)); }

  protected rSig = signal(180);
  protected seamSig = signal(42);  // visually similar to your image
  protected rfSig = signal(22);

  // ---------- paint ----------
  @Input() set fill(v: string) { this._fill.set(v); }

  protected _fill = signal('#000');

  // gradient (optional)
  @Input() set gradientStops(v: GradStop[] | null) { this._stops.set(v ?? []); }
  @Input() set gradId(v: string) { this._gradId.set(v || 'scoopGrad'); }

  protected _stops = signal<GradStop[]>([]);
  protected _gradId = signal('scoopGrad');

  // ---------- public read handles used in template ----------
  protected w = computed(() => 3 * this.rSig());
  protected h = computed(() => 2 * this.rSig());
  protected seamY = computed(() => this.seamSig());

  protected fillSig = () => this._fill();
  protected stopsSig = () => this._stops();
  protected gradIdSig = () => this._gradId();

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
    const leftX  = cx + (R / d) * (cfxL - cx);
    const leftY  = cy + (R / d) * (cfY  - cy);
    const rightX = cx + (R / d) * (cfxR - cx);
    const rightY  = cy + (R / d) * (cfY  - cy);

    // arc flags for the bottom arc
    const ang = (x:number,y:number)=>Math.atan2(y-cy, x-cx);
    const norm = (t:number)=> t<0 ? t + 2*Math.PI : t;
    const aL = norm(ang(leftX,leftY));
    const aR = norm(ang(rightX,rightY));
    const span = aR - aL >= 0 ? aR - aL : aR - aL + 2*Math.PI;
    const largeArc = span > Math.PI ? 1 : 0;
    const sweep = 1;

    return [
      `M ${ixL} ${iy}`,
      `A ${rf} ${rf} 0 0 1 ${leftX} ${leftY}`,                   // left scoop
      `A ${R} ${R} 0 ${largeArc} ${sweep} ${rightX} ${rightY}`,  // bottom arc
      `A ${rf} ${rf} 0 0 1 ${ixR} ${iy}`,                        // right scoop
      `L ${ixL} ${iy}`,                                          // flat top
      'Z'
    ].join(' ');
  });
}
