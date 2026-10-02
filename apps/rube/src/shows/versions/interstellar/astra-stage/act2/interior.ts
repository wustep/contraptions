import type { Pt } from '../../../../../parts'
import { frame, scenery, smooth } from '../kit'
import { board, cut, PAINT, thread, treeFlat } from '../stagecraft';
import { RIM_R } from './station'

export interface InteriorState { axis: Pt; lights: number }

/** End-on inhabited plywood wheel. The land is continuous, including above the actors. */
export const interior = scenery<InteriorState>({
  name: 'interior',
  draw: (p, s, { k, t }) => {
    const f = frame(p, k)
    const [ax, ay] = s.axis
    const r = RIM_R
    p.noStroke()
    p.fill(PAINT.night)
    p.rect(f.cx * k, f.cy * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    p.push()
    p.translate(ax * k, ay * k)
    // Coral architecture around the wheel: visible fly rails, knees and footings.
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const x = side * (23.8 + j * 3.1)
        board(p, k, x - 0.8, -30, 1.6, 56, j % 2 ? PAINT.clay : PAINT.coral, 0.45)
        cut(p, k, [[x - 1, 18], [x + 1, 16], [x + 1, 26], [x - 1, 26]], PAINT.coral, 0.35)
        board(p, k, x - 0.18, -7, 0.36, 1.2, PAINT.cream, 0.08)
      }
      thread(p, k, [side * 22.6, -27], [side * 22.6, 20])
      board(p, k, side * 22.6 - 0.65, 15.3, 1.3, 2.2, PAINT.apricot, 0.18)
      thread(p, k, [side * 22.6, 17.5], [side * 20.5, 17.5])
    }
    board(p, k, -34, 23.8, 68, 1.8, PAINT.coral, 0.45)
    board(p, k, -30, 22.7, 60, 0.8, PAINT.clay, 0.25)
    // Concentric laminated rings. Center is an unbroken blue open volume.
    for (const [radius, color, dx, dy] of [[22.2, PAINT.shadow, 0.45, 0.65], [22.1, PAINT.coral, 0, 0], [21.45, PAINT.wood, 0, 0], [21.05, PAINT.cream, 0, 0], [20.15, PAINT.apricot, 0, 0], [19.82, PAINT.blue, 0, 0]] as [number, string, number, number][]) {
      p.fill(color); p.circle(dx * k, dy * k, radius * 2 * k)
    }
    // Wide radial land panels, mitred at their joints. No scenery-colored spheres.
    const annulus = (a0: number, a1: number, outer: number, inner: number, color: string) => {
      const pts: Pt[] = []
      for (let j = 0; j <= 8; j++) { const a = a0 + (a1 - a0) * j / 8; pts.push([Math.cos(a) * outer, Math.sin(a) * outer]) }
      for (let j = 8; j >= 0; j--) { const a = a0 + (a1 - a0) * j / 8; pts.push([Math.cos(a) * inner, Math.sin(a) * inner]) }
      cut(p, k, pts, color, 0.035)
    }
    for (let i = 0; i < 64; i++) {
      const a = i * Math.PI * 2 / 64
      const da = Math.PI * 2 / 64
      annulus(a + 0.005, a + da - 0.005, 20.65, 19.8, i % 4 === 0 ? PAINT.cream : PAINT.apricot)
      // Active foreground sets occupy bottom/right and the far-side reunion house.
      const reserved = (a > -0.01 && a < 1.9) || Math.abs(a - Math.PI * 1.18) < 0.19
      if (reserved) continue
      annulus(a + 0.012, a + da - 0.012, 19.8, 18.85, i % 5 < 3 ? PAINT.green : PAINT.coral)
      p.push(); p.rotate(a + da * 0.5 - Math.PI / 2); p.translate(0, r * k)
      if (i % 5 < 2) {
        for (let j = 0; j < 4; j++) board(p, k, -0.7 + j * 0.36, -1.15, 0.13, 0.92, PAINT.apricot, 0.025)
      } else if (i % 5 === 2) {
        treeFlat(p, k, 0, -0.25, 1.7)
      } else {
        board(p, k, -0.55, -1.0, 1.1, 0.85, PAINT.cream, 0.07)
        cut(p, k, [[-0.69, -1], [0, -1.62], [0.69, -1]], PAINT.clay)
        board(p, k, -0.14, -0.62, 0.28, 0.47, PAINT.blue, 0.02)
      }
      p.pop()
    }
    // Four open lattice spokes and four tension ties. All visibly terminate in the wheel.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      p.push(); p.rotate(a)
      if (i % 2 === 0) {
        board(p, k, 1.1, -0.21, 18.4, 0.12, PAINT.cream, 0.05)
        board(p, k, 1.1, 0.15, 18.4, 0.12, PAINT.cream, 0.05)
        for (let x = 1.5; x < 19; x += 1.1) thread(p, k, [x, -0.1], [x + 0.7, 0.15])
        board(p, k, 18.4, -0.6, 1.3, 1.2, PAINT.cream, 0.16)
      } else thread(p, k, [1.4, 0], [19.9, 0])
      p.pop()
    }
    // The stationary bearing carries the hub's working mechanisms in front.
    p.fill(PAINT.clay); p.circle(0, 0, 3.8 * k)
    p.fill(PAINT.wood); p.circle(0, 0, 3.3 * k)
    p.fill(PAINT.cream); p.circle(0, 0, 2.3 * k)
    board(p, k, -1.65, -0.24, 3.3, 0.48, PAINT.shadow, 0.05)
    board(p, k, -0.16, -0.75, 0.32, 1.5, PAINT.apricot, 0.06)
    p.pop()
    // Lighting is a dimmer on a constructed set, synchronized to the existing accent.
    const dark = 1 - smooth(t, s.lights - 0.1, s.lights + 0.6)
    if (dark > 0) {
      p.fill(23, 40, 78, 170 * dark)
      p.rect(f.cx * k, f.cy * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    }
  },
})
