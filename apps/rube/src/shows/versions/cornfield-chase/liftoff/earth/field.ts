import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR } from '../../../../../parts'
import { alpha, box, frame, hash, part, route, type Ctx, type Way } from '../kit'
import { DUST } from '../worlds'
import { cornWall, stalk, type Stalk } from './corn'

/**
 * Along the edge of the corn. The ball rolls the dirt track at an even pace
 * and the leaves that hang over it are where the piano's notes are: each one
 * it brushes springs up as it goes by, and on the strong notes the whole
 * stalk shivers and its tassel lets go of a little pollen. It is the only
 * keyboard on the farm.
 */

/** The notes, as measured. The strong ones (tassel and pollen) are marked. */
const NOTES: [number, boolean][] = [[26.645, true], [27.04, false], [28.108, false], [28.532, false], [28.955, true]]
export const ROW_NOTES = NOTES.map(([t]) => t)
/** Cells a second along the track. */
const PACE = 1.25

interface RowState {
  hits: { x: number; at: number; strong: boolean; h: number; seed: number }[]
  length: number
}

/** The leaf a ball brushes: long, hanging low from a stalk behind the track, its tip at the height of the ball's top. */
function brushed(p: p5, c: Ctx, x: number, h: number, seed: number, since: number, strong: boolean): void {
  const { k, ink, weight } = c
  // The stalk itself, shivering after a strong note.
  const shiver = since < 0 ? 0 : Math.exp(-since / 0.5) * Math.sin(since * 22) * (strong ? 0.07 : 0.025)
  const s: Stalk = { x: x - 0.28, foot: FLOOR - 0.02, h, seed, sway: shiver + Math.sin(c.t * 0.9 + seed) * 0.02, shake: strong && since >= 0 ? Math.exp(-since / 0.6) : 0 }
  stalk(p, k, ink, weight, s)
  // The low leaf, out over the track: it hangs with its tip at the ball's crown, and springs up when brushed.
  const spring = since < 0 ? 0 : Math.exp(-since / 0.35) * Math.cos(since * 16)
  const lift = since < 0 ? 0 : 0.55 * (1 - spring) * Math.exp(-since / 2.5) + 0.28 * spring
  const base: [number, number] = [x - 0.3, FLOOR - h * 0.24]
  const tip: [number, number] = [x + 0.16, -0.08 - lift * 1.1]
  const ctl: [number, number] = [x - 0.04, base[1] - 0.3 - lift * 0.45]
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.fill(DUST.leaf)
  p.beginShape()
  p.vertex(base[0] * k, base[1] * k)
  p.quadraticVertex(ctl[0] * k, (ctl[1] - 0.07) * k, tip[0] * k, tip[1] * k)
  p.quadraticVertex(ctl[0] * k, (ctl[1] + 0.07) * k, base[0] * k, (base[1] + 0.05) * k)
  p.endShape(p.CLOSE)
  // Pollen: a few grains let go from the tassel on a strong note, drifting down the wind.
  if (strong && since > 0 && since < 2.4) {
    const top = [s.x, s.foot - s.h]
    p.noStroke()
    for (let i = 0; i < 9; i++) {
      const u = since / 2.4
      const gx = top[0] + since * (0.3 + hash(seed, i) * 0.35) + Math.sin(since * 3 + i) * 0.04
      const gy = top[1] + since * (0.18 + hash(seed, i, 2) * 0.2)
      p.fill(alpha(p, DUST.corn, 0.9 * (1 - u)))
      p.circle(gx * k, gy * k, Math.max(1.5, 0.028 * k))
    }
  }
}

export const cornrow = part<RowState>(
  {
    name: 'cornrow',
    draw: (p, s, c) => {
      const { k, t, ink, weight } = c
      const f = frame(p, k)
      // The track runs along a bank above the field: behind it the corn is a sea of tassels out to the dust, below it
      // the bank's face goes down to the field road. Only the stalks that grow on the bank are drawn one by one.
      const x0 = Math.max(-0.5, f.x0 - 1)
      const x1 = Math.min(s.length + 1.5, f.x1 + 1)
      cornWall(p, k, ink, weight, { x0, x1, foot: 1 + FLOOR, h: 1.55, t, fill: DUST.husk, seed: 21, taper: [-0.5, s.length + 3] })
      solid(p, ink, weight, DUST.shade)
      p.beginShape()
      p.vertex(-0.9 * k, (1 + FLOOR + 0.02) * k)
      p.vertex(-0.5 * k, FLOOR * k)
      p.vertex((s.length + 0.5) * k, FLOOR * k)
      p.vertex((s.length + 0.5) * k, (1 + FLOOR + 0.02) * k)
      p.endShape(p.CLOSE)
      p.stroke(alpha(p, ink, 0.3))
      p.strokeWeight(Math.max(1, weight * 0.6))
      for (let i = Math.floor(x0 / 0.37); i < x1 / 0.37; i++) {
        const gx = i * 0.37 + hash(i, 13) * 0.2
        if (gx < -0.4 || gx > s.length + 0.4) continue
        const gy = FLOOR + 0.25 + hash(i, 14) * 0.6
        p.line(gx * k, gy * k, (gx + 0.1) * k, gy * k)
      }
      for (const h of s.hits) if (h.x > f.x0 - 1 && h.x < f.x1 + 1) brushed(p, c, h.x, h.h, h.seed, t - h.at, h.strong)
      // The track: two ruts in the dirt.
      outline(p, ink, weight)
      p.line(-0.5 * k, FLOOR * k, (s.length + 0.5) * k, FLOOR * k)
      p.stroke(alpha(p, ink, 0.35))
      for (let i = 0; i < s.length * 2.2; i++) {
        const x = -0.4 + i / 2.2 + hash(i, 8) * 0.2
        p.line(x * k, (FLOOR + 0.07) * k, (x + 0.12) * k, (FLOOR + 0.07) * k)
      }
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const hits = NOTES.map(([n, strong], i) => ({ x: -0.5 + PACE * at(n), at: at(n), strong, h: 2.0 + hash(i, 11) * 0.6, seed: i * 7 + 3 }))
    const length = Math.round(PACE * (slot.end - slot.begin))
    const end = PACE * (slot.end - slot.begin) - 0.5
    const ways: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: slot.end - slot.begin, p: [end, 0] },
    ]
    return {
      cells: box(-1, -3, length + 1, 1),
      exit: [end + 0.5, 0],
      lane: { segs: route(ways), fire: hits[0].at },
      state: { hits, length },
    }
  },
)

/** How long the track through the corn is for a slot: the next part starts where it ends. */
export const rowLength = (seconds: number): number => PACE * seconds
