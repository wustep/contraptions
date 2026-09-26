import type p5 from 'p5'
import { FLOOR, mixHex, type Pt, type Seg } from '../../../../../parts'
import { box, part, smooth, type PartShot } from '../kit'
import { SEAM } from '../music'
import { G } from '../physics'
import { CASTLE, drawCastle } from './castle'
import { WASTES } from '../worlds'
import { laneThrough, TURNIP_TO_WALK } from './hills'
import { drawFog, drawPlume, drawTurnipAt } from './hills-land'
import {
  ABOARD_KEYS, castleAt, CATCH, CLIMB, DROP, HILLTOP, LAST, LATCH, onCastle, ROAR, SETTLE, sophieAboard, TAKEOFF,
  TURNIP_LANDINGS, W, WIDE,
} from './walk-plan'

/**
 * The castle walking (121.15 → 151.998): the castle builder's. The castle comes up out of the fog over the hill she
 * stands on, a footfall on every downbeat of the waltz, steam from its knees and dust from its feet; its body
 * passes over her and a great foot swings over her head. On bar 66 its stair drops out of the porch, section after
 * section, and swings; on bar 68 she jumps for its foot as it comes by, and climbs, a hop a beat, tread to tread,
 * onto the porch. On bar 71 Calcifer roars: fire out of the chimney, two bursts of black smoke, and the castle
 * lurches and lengthens its stride; Turnip Head, who hopped after it, falls behind. Big strides across the wastes
 * into the dusk (131.4, 133.7, 135.9 the loudest), the stair wound up; night comes, the windows light one by one.
 * It slows, and on the waltz's last note (148.8) it sits down on its folded legs. In the stop the door's latch
 * lifts, a crack of firelight; on the pickup (151.5) it swings wide, and on the flow's first note she is over the
 * threshold, walking in.
 *
 * The frame's origin is the hills part's exit (`HILLTOP` plus half a cell); everything is worked out in the
 * wastes' own cells (`walk-plan.ts`) and moved.
 */

/** This part's origin in the wastes' cells. */
const O: Pt = [HILLTOP[0] + 0.5, HILLTOP[1]]
const w = (p: Pt): Pt => [p[0] - O[0], p[1] - O[1]]

/** The first and last footfall it strikes (bars 65 → 88). */
const FEET = Array.from({ length: 24 }, (_, i) => W(65 + i))

export const walk = part<null>(
  {
    name: 'walk',
    draw: (p, _s, c) => {
      const T = SEAM.walk + c.t
      const { k } = c
      p.push()
      p.translate(-O[0] * k, -O[1] * k)
      const cs = castleAt(T)
      if ((cs.pose.haze ?? 0) < 0.985) {
        p.push()
        p.translate(cs.at[0] * k, cs.at[1] * k)
        drawCastle(p, k, c.weight, c.ink, cs.pose)
        p.pop()
        if ((cs.pose.haze ?? 0) < 0.4) drawLantern(p, k, c.weight, c.ink, T)
        drawPlume(p, k, T)
      }
      drawFog(p, k, T)
      if (T >= TURNIP_TO_WALK) drawTurnipAt(p, k, c.weight, c.ink, T)
      p.pop()
    },
  },
  (slot) => {
    const start: Pt = [-0.5, 0]
    const onPlate = w(sophieAboard(CATCH))
    const T = CATCH - TAKEOFF
    const segs: Seg[] = [
      { from: start, to: start, dur: TAKEOFF - slot.begin },
      { from: start, to: onPlate, dur: T, arc: (G * T * T) / 8 },
      ...laneThrough(sophieAboard, ABOARD_KEYS, CATCH, slot.end, O),
    ]
    const end = w(sophieAboard(slot.end))
    return {
      cells: box(-52 - O[0], -36 - O[1], 132 - O[0], 8 - O[1], 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: CATCH - slot.begin },
      state: null,
    }
  },
  (slot): PartShot[] => {
    const door = (T: number, dx: number, dy: number): Pt => {
      const [x, y] = onCastle(T, CASTLE.door)
      return w([x + dx, y - FLOOR + dy])
    }
    // Where the camera waits for the great strides: the castle crosses it on the loudest.
    const mid = castleAt(W(76)).at
    const cross = w([mid[0] - 1.5, mid[1] - 10.2])
    return [
      // The castle over her on the hill, its stair dropping; in on her as she jumps for it and climbs.
      { t: DROP, cells: 27, hold: w([HILLTOP[0] - 1.6, -8.0]) },
      { t: 123.5, cells: 15, hold: w([HILLTOP[0] + 0.5, -4.6]) },
      { t: CATCH, cells: 10.5, hold: w([HILLTOP[0] + 1.1, -2.9]) },
      // Close on her up the stair and on the porch: the roar (128.0, 128.37) throws the castle forward under her.
      { t: CLIMB[2] + 0.2, cells: 8.5, off: [0.9, -1.1] },
      { t: CLIMB[6], cells: 6.8, off: [0.8, -0.7] },
      { t: ROAR[0], cells: 6.4, off: [0.9, -0.6] },
      { t: 129.1, cells: 8, off: [1.2, -1.0] },
      // Out wide for the three great strides (131.43, 133.72, 135.94): locked off, the castle striding across the
      // frame past the thorn tree, a silhouette on the dusk, the smoke of the roar still hanging over it.
      { t: 130.9, cells: 33, hold: cross },
      { t: 136.3, cells: 33, hold: cross },
      // Night comes: back in on her, riding the porch against the lit door as the windows light; out a little to
      // watch it slow and sit; in on the door.
      { t: 138.7, cells: 19, off: [2.0, -3.4] },
      { t: 140.4, cells: 9, off: [0.9, -1.2] },
      { t: 143.2, cells: 9.5, off: [1.0, -1.3] },
      // Out again to watch it walk on into the dark, its windows lit, and slow, and sit.
      { t: 145.6, cells: 19, off: [2.6, -4.6] },
      { t: LAST, cells: 20, off: [2.4, -5.0] },
      { t: SETTLE + 0.1, cells: 15, hold: door(SETTLE + 0.1, 0.4, -2.6) },
      { t: LATCH, cells: 6.4, hold: door(LATCH, 0.1, -0.95) },
      { t: slot.end, cells: 4, off: [0.9, -0.7] },
    ]
  },
)

/**
 * Every strike of this part, in show seconds: every footfall from bar 65 to 88, the stair's drop, her jump onto it
 * and her climb, the roar, Turnip Head's landings behind it, the belly on the ground, the latch and the door.
 */
export const WALK_HITS: number[] = [...new Set([...FEET, DROP, TAKEOFF, CATCH, ...CLIMB, ...ROAR, ...TURNIP_LANDINGS.filter((t) => t > SEAM.walk), SETTLE, LATCH, WIDE])].sort((a, b) => a - b)

/**
 * The porch lantern: a small square brass lantern hung from the left end of the hood over the door, right over where
 * she rides. Lit as the dusk comes on, it washes the iron behind her and the planks under her warm, so at night she
 * reads as a small figure against its light, never lost on the grey iron. (Square, and two cells over her head: never
 * a round bright thing near her.)
 */
function drawLantern(p: p5, k: number, weight: number, ink: string, T: number): void {
  const [dx, dy] = CASTLE.door
  const hook = onCastle(T, [dx - 0.9, dy - 2.62])
  const sway = 0.05 * Math.sin(T * 2.3) * (1 - smooth(T, SETTLE, SETTLE + 1.5))
  const lx = hook[0] + sway
  const ly = hook[1] + 0.42
  const lit = smooth(T, 136.4, 139.6)
  const X = (v: number) => v * k
  p.push()
  // The light on the hull and the porch, soft and wide, behind everything that stands on the porch.
  if (lit > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(X(lx), X(ly + 0.6), 0, X(lx), X(ly + 0.6), X(2.6))
    g.addColorStop(0, `rgba(255, 214, 150, ${0.42 * lit})`)
    g.addColorStop(0.45, `rgba(255, 200, 130, ${0.16 * lit})`)
    g.addColorStop(1, 'rgba(255, 190, 120, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(lx - 2.7), X(ly - 2.1), X(5.4), X(4.8))
  }
  // Its chain, and the lantern: a brass cap, four glass panes lit from within, a brass foot.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.line(X(hook[0]), X(hook[1]), X(lx), X(ly - 0.14))
  p.rectMode(p.CENTER)
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(WASTES.ironDark, WASTES.window, 0.85 * lit))
  p.rect(X(lx), X(ly), X(0.15), X(0.2), X(0.02))
  p.fill(WASTES.brass)
  p.triangle(X(lx - 0.11), X(ly - 0.1), X(lx + 0.11), X(ly - 0.1), X(lx), X(ly - 0.2))
  p.rect(X(lx), X(ly + 0.12), X(0.17), X(0.04))
  if (lit > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(X(lx), X(ly), 0, X(lx), X(ly), X(0.45))
    g.addColorStop(0, `rgba(255, 227, 163, ${0.4 * lit})`)
    g.addColorStop(1, 'rgba(255, 227, 163, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(lx - 0.45), X(ly - 0.45), X(0.9), X(0.9))
  }
  p.pop()
}
