import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, type Ctx } from '../kit'
import { DOJO } from '../worlds'

/**
 * The training hall, drawn to fill the frame wherever the camera looks: paper screens lit from behind, lacquered
 * pillars, a dark beam and the floorboards. In the hall's own frame (x right, h up from the floor), placed at
 * `ox` and `fy` in the part's cells.
 */

/** The wall's heights: the skirting, the screens, their head rail, the plaster above, the beam, the ceiling. */
export const WALL = { skirt: 0.42, screen: 5.2, rail: 5.42, beam: 7.6, beamTop: 8.2 }
/** The pillars: one in the gap between the two pairs, and the rest on the same bay. */
const BAY = 5.5
const PILLAR0 = 3.92
const PILLAR_W = 0.24
/** Screens: three to a bay, each a frame with its lattice. */
const PANELS = 3

const PAPER = DOJO.screen
const PLASTER = mixHex(DOJO.screen, DOJO.wood, 0.16)
const LATTICE = mixHex(DOJO.woodDeep, DOJO.screen, 0.55)
/** The pillars' lacquer, aged and dulled toward the wash so they stand back behind the wooden men. */
const PILLAR = mixHex(mixHex(DOJO.lacquer, DOJO.wash, 0.38), DOJO.screen, 0.12)
const PILLAR_GOLD = mixHex(DOJO.gold, DOJO.wash, 0.35)

export function hall(p: p5, k: number, c: Ctx, ox: number, fy: number): void {
  const { ink, weight } = c
  const f = frame(p, k)
  const X = (x: number) => (x + ox) * k
  const Y = (h: number) => (fy - h) * k
  // What of the hall is in view, a little over.
  const x0 = f.x0 - ox - 1
  const x1 = f.x1 - ox + 1
  const hTop = fy - f.y0 + 1
  const hBot = fy - f.y1 - 1
  const band = (h0: number, h1: number, fill: string | p5.Color) => {
    const lo = Math.max(h0, hBot)
    const hi = Math.min(h1, hTop)
    if (hi <= lo) return
    p.noStroke()
    p.fill(fill as string)
    p.rect(X((x0 + x1) / 2), Y((lo + hi) / 2), (x1 - x0) * k, (hi - lo) * k)
  }

  // The ceiling's dark over the beam, and the plaster between the beam and the screens' head rail.
  band(WALL.beamTop, hTop + 1, DOJO.wash)
  band(WALL.rail, WALL.beam, PLASTER)
  // The screens' paper, lit from behind: warmest at the middle of their height.
  band(WALL.skirt, WALL.screen, PAPER)
  if (WALL.screen > hBot && WALL.skirt < hTop) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, Y(WALL.screen), 0, Y(WALL.skirt))
    g.addColorStop(0, 'rgba(255, 246, 222, 0)')
    g.addColorStop(0.45, 'rgba(255, 246, 222, 0.75)')
    g.addColorStop(1, 'rgba(255, 246, 222, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(X(x0), Y(WALL.screen), (x1 - x0) * k, (WALL.screen - WALL.skirt) * k)
    ctx.restore()
  }

  // Along the plaster, a brush-and-wash range of mountains: the kung fu picture's painted hall.
  if (WALL.beam > hBot && WALL.rail < hTop) frieze(p, X, Y, x0, x1)

  // The screens: each panel a frame of dark wood and a lattice, three to a bay between pillars.
  const first = Math.floor((x0 - PILLAR0) / BAY) - 1
  const last = Math.ceil((x1 - PILLAR0) / BAY) + 1
  const panelW = (BAY - PILLAR_W) / PANELS
  if (WALL.screen > hBot && WALL.skirt < hTop) {
    for (let b = first; b <= last; b++) {
      const bx = PILLAR0 + b * BAY + PILLAR_W / 2
      for (let i = 0; i < PANELS; i++) {
        const a = bx + i * panelW
        const e = a + panelW
        if (e < x0 || a > x1) continue
        // The lattice: a few bars down, more across.
        outline(p, LATTICE, weight * 0.4)
        const cols = 3
        for (let j = 1; j < cols; j++) {
          const x = a + (j / cols) * panelW
          p.line(X(x), Y(WALL.skirt + 0.06), X(x), Y(WALL.screen - 0.06))
        }
        for (let h = WALL.skirt + 0.62; h < WALL.screen - 0.2; h += 0.62) p.line(X(a + 0.04), Y(h), X(e - 0.04), Y(h))
        // The panel's frame.
        outline(p, DOJO.woodDeep, weight * 0.85)
        p.rect(X((a + e) / 2), Y((WALL.skirt + WALL.screen) / 2), (panelW - 0.06) * k, (WALL.screen - WALL.skirt - 0.04) * k)
      }
    }
  }

  // The head rail over the screens and the skirting under them.
  solid(p, ink, weight * 0.6, DOJO.woodDeep)
  p.rect(X((x0 + x1) / 2), Y((WALL.screen + WALL.rail) / 2), (x1 - x0) * k, (WALL.rail - WALL.screen) * k)
  p.rect(X((x0 + x1) / 2), Y(WALL.skirt / 2), (x1 - x0) * k, WALL.skirt * k)

  // The beam, and the rafters' square ends along its top.
  solid(p, ink, weight * 0.7, mixHex(DOJO.woodDeep, DOJO.wash, 0.35))
  p.rect(X((x0 + x1) / 2), Y((WALL.beam + WALL.beamTop) / 2), (x1 - x0) * k, (WALL.beamTop - WALL.beam) * k)
  if (WALL.beamTop + 0.4 > hBot && WALL.beamTop < hTop) {
    solid(p, ink, weight * 0.6, DOJO.woodDeep)
    for (let x = Math.floor(x0 / 0.9) * 0.9; x < x1; x += 0.9) p.rect(X(x + 0.45), Y(WALL.beamTop + 0.17), 0.36 * k, 0.34 * k)
  }

  // The pillars, lacquered, floor to beam.
  for (let b = first; b <= last; b++) {
    const px = PILLAR0 + b * BAY
    if (px + PILLAR_W < x0 || px - PILLAR_W > x1) continue
    solid(p, ink, weight * 0.45, PILLAR)
    p.rect(X(px), Y(WALL.beam / 2), PILLAR_W * k, WALL.beam * k)
    // A worn gold collar where it meets the beam, and a dark foot.
    solid(p, ink, weight * 0.4, PILLAR_GOLD)
    p.rect(X(px), Y(WALL.beam - 0.12), (PILLAR_W + 0.04) * k, 0.09 * k)
    solid(p, ink, weight * 0.4, DOJO.woodDeep)
    p.rect(X(px), Y(0.14), (PILLAR_W + 0.06) * k, 0.28 * k)
  }

  // The floor: its boards' edge, and the dark under the platform to the frame's foot.
  if (hBot < 0) {
    band(Math.min(-0.3, hBot), -0.3, mixHex(DOJO.woodDeep, DOJO.wash, 0.5))
    band(-0.3, 0, DOJO.wood)
    outline(p, ink, weight)
    p.line(X(x0), Y(0), X(x1), Y(0))
    outline(p, ink, weight * 0.5)
    p.line(X(x0), Y(-0.3), X(x1), Y(-0.3))
    // The boards' joints along the edge.
    for (let x = Math.floor(x0 / 1.3) * 1.3; x < x1; x += 1.3) p.line(X(x), Y(0), X(x), Y(-0.3))
  }
}

/**
 * The frieze: two ranges of peaks in wash, the far one paler, as a brush would lay them; a few mists between.
 * Drawn from the hall's x, so it is the same wall wherever the camera finds it.
 */
function frieze(p: p5, X: (x: number) => number, Y: (h: number) => number, x0: number, x1: number): void {
  const base = WALL.rail + 0.18
  const ridge = (x: number, seed: number, amp: number) => {
    // Peaks every so often, each a soft cone, summed.
    let h = 0
    for (let i = Math.floor(x / 1.7) - 2; i <= Math.floor(x / 1.7) + 2; i++) {
      const cx = i * 1.7 + hash(i, seed) * 1.1
      const tall = amp * (0.45 + hash(i, seed + 1))
      const wide = 0.7 + hash(i, seed + 2) * 0.6
      const d = Math.abs(x - cx) / wide
      h = Math.max(h, tall * Math.max(0, 1 - d * d * (0.7 + 0.3 * d)))
    }
    return h
  }
  for (const [seed, amp, a, lift] of [[11, 1.35, 0.16, 0.25], [23, 0.95, 0.32, 0]] as const) {
    p.noStroke()
    p.fill(alpha(p, DOJO.wash, a))
    p.beginShape()
    p.vertex(X(x0), Y(base))
    for (let x = x0; x <= x1 + 0.1; x += 0.08) p.vertex(X(x), Y(base + lift + ridge(x, seed, amp)))
    p.vertex(X(x1), Y(base))
    p.endShape(p.CLOSE)
  }
}
