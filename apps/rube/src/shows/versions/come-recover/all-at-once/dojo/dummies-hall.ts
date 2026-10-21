import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, type Ctx } from '../kit'
import { DOJO } from '../worlds'

/**
 * The training hall, drawn to fill the frame wherever the camera looks: paper screens lit from behind, lacquered
 * pillars, a dark beam and the floorboards. In the hall's own frame (x right, h up from the floor), placed at
 * `ox` and `fy` in the part's cells.
 *
 * It is an afternoon hall, as a kung fu picture's training hall is: the sun is low outside, so the paper glows and
 * the bamboo in the yard throws its shadow on it, the beam and the plaster under it stand back in shade, and
 * shafts of sun come in under the beam and slant down through the hall to the floor, dust turning in them. Between
 * the pillars the hall keeps its things where the wooden men leave room: a rack of weapons by the first pillar, a
 * scroll hung past the last man, and incense burning by the first, its smoke going up into the sun.
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
/** The floor: old boards, waxed, and the dark of the platform's front under them. */
const BOARDS = mixHex(DOJO.wood, DOJO.woodDeep, 0.35)
const UNDER = mixHex(DOJO.woodDeep, DOJO.wash, 0.5)
/** Steel, bronze and silk: the rack's blades, the censer, the scroll's mount. */
const STEEL = mixHex(DOJO.screen, DOJO.wash, 0.38)
const BRONZE = mixHex(DOJO.gold, DOJO.woodDeep, 0.45)
const SILK = mixHex(DOJO.jade, DOJO.screen, 0.25)
/** Incense smoke: a cool grey against the warm paper. */
const SMOKE = mixHex(DOJO.wash, '#8C9294', 0.45)
/** The sun, warm, as the shafts and the motes in them are lit. */
const SUN = '#FFE4AE'

/**
 * The sun's shafts: where each one's middle meets the floor, how wide it is, and how strong. They come in under the
 * beam from high on the left and slant down to the right (`SLANT`, cells across a cell down), set so none lies on a
 * wooden man's face for long and the fight between each pair goes through the light.
 */
const SHAFTS: { x: number; w: number; a: number }[] = [
  { x: -1.9, w: 1.25, a: 1 },
  { x: 2.6, w: 0.75, a: 0.75 },
  { x: 6.25, w: 1.35, a: 1 },
  { x: 10.9, w: 1.0, a: 0.85 },
  { x: 15.6, w: 1.2, a: 0.9 },
]
const SLANT = 0.62
/** Where the shafts begin: just under the beam, out of the clerestory over it. */
const SHAFT_TOP = WALL.beam - 0.05

/** The bamboo in the yard behind the screens, as its shadow lies on the paper: a stalk's x and its lean, per bay. */
const BAMBOO = { shade: 0.12 }

/** The rack of weapons against the screens, left of the first pillar; the scroll, past the last man; the incense. */
const RACK = { x0: -3.55, x1: -2.15 }
const SCROLL = { x: 8.62, w: 0.6, top: 4.72, foot: 1.75 }
const INCENSE = { x: -0.92 }

export function hall(p: p5, k: number, c: Ctx, ox: number, fy: number, t: number): void {
  const { ink, weight } = c
  const f = frame(p, k)
  const X = (x: number) => (x + ox) * k
  const Y = (h: number) => (fy - h) * k
  // What of the hall is in view, a little over.
  const x0 = f.x0 - ox - 1
  const x1 = f.x1 - ox + 1
  const hTop = fy - f.y0 + 1
  const hBot = fy - f.y1 - 1
  const seen = (a: number, b: number, h0: number, h1: number) => b > x0 && a < x1 && h1 > hBot && h0 < hTop
  const band = (h0: number, h1: number, fill: string | p5.Color) => {
    const lo = Math.max(h0, hBot)
    const hi = Math.min(h1, hTop)
    if (hi <= lo) return
    p.noStroke()
    p.fill(fill as string)
    p.rect(X((x0 + x1) / 2), Y((lo + hi) / 2), (x1 - x0) * k, (hi - lo) * k)
  }
  const ctx = p.drawingContext as CanvasRenderingContext2D

  // The ceiling's dark over the beam, and the plaster between the beam and the screens' head rail.
  band(WALL.beamTop, hTop + 1, DOJO.wash)
  band(WALL.rail, WALL.beam, PLASTER)
  // The screens' paper, lit from behind: warmest at the middle of their height.
  band(WALL.skirt, WALL.screen, PAPER)
  if (WALL.screen > hBot && WALL.skirt < hTop) {
    const g = ctx.createLinearGradient(0, Y(WALL.screen), 0, Y(WALL.skirt))
    g.addColorStop(0, 'rgba(255, 246, 222, 0)')
    g.addColorStop(0.45, 'rgba(255, 246, 222, 0.75)')
    g.addColorStop(1, 'rgba(255, 246, 222, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(X(x0), Y(WALL.screen), (x1 - x0) * k, (WALL.screen - WALL.skirt) * k)
    ctx.restore()
    // The bamboo outside, its shadow on the paper.
    bamboo(p, X, Y, k, x0, x1, t)
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

  // The shade: the beam and the plaster stand back in the afternoon's dark, and the paper's glow is the wall's light.
  shade(ctx, X, Y, k, x0, x1, hBot, hTop)

  // The pillars, lacquered, floor to beam.
  for (let b = first; b <= last; b++) {
    const px = PILLAR0 + b * BAY
    if (px + PILLAR_W < x0 || px - PILLAR_W > x1) continue
    solid(p, ink, weight * 0.45, PILLAR)
    p.rect(X(px), Y(WALL.beam / 2), PILLAR_W * k, WALL.beam * k)
    // The sun down its left side, and a worn gold collar where it meets the beam, and a dark foot.
    p.noStroke()
    p.fill(alpha(p, SUN, 0.22))
    p.rect(X(px - PILLAR_W * 0.27), Y(WALL.beam / 2), PILLAR_W * 0.3 * k, (WALL.beam - 0.1) * k)
    solid(p, ink, weight * 0.4, PILLAR_GOLD)
    p.rect(X(px), Y(WALL.beam - 0.12), (PILLAR_W + 0.04) * k, 0.09 * k)
    solid(p, ink, weight * 0.4, DOJO.woodDeep)
    p.rect(X(px), Y(0.14), (PILLAR_W + 0.06) * k, 0.28 * k)
  }

  // The hall's things, each only where it is in view.
  if (seen(RACK.x0 - 0.3, RACK.x1 + 0.3, 0, 4.6)) rack(p, c, X, Y, k)
  if (seen(SCROLL.x - SCROLL.w, SCROLL.x + SCROLL.w, SCROLL.foot - 0.2, WALL.screen)) scroll(p, c, X, Y, k)
  if (seen(INCENSE.x - 1.2, INCENSE.x + 1.2, -0.4, 5)) incense(p, c, X, Y, k, t)

  // The floor: waxed boards, the paper's glow lying in them, and the dark under the platform to the frame's foot.
  if (hBot < 0) {
    band(Math.min(-0.34, hBot), -0.34, UNDER)
    band(-0.34, 0, BOARDS)
    // The paper's light along the boards' wax, strongest just under the wall.
    const g = ctx.createLinearGradient(0, Y(0), 0, Y(-0.34))
    g.addColorStop(0, 'rgba(255, 240, 205, 0.42)')
    g.addColorStop(0.5, 'rgba(255, 240, 205, 0.12)')
    g.addColorStop(1, 'rgba(255, 240, 205, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(X(x0), Y(0), (x1 - x0) * k, 0.34 * k)
    ctx.restore()
    // Where each shaft lies on the boards: a long warm patch.
    for (const s of SHAFTS) {
      if (s.x + 1.5 < x0 || s.x - 1.5 > x1) continue
      const pg = ctx.createRadialGradient(X(s.x), Y(-0.08), 0, X(s.x), Y(-0.08), s.w * 0.9 * k)
      pg.addColorStop(0, `rgba(255, 228, 174, ${0.38 * s.a})`)
      pg.addColorStop(1, 'rgba(255, 228, 174, 0)')
      ctx.save()
      ctx.translate(X(s.x), Y(-0.08))
      ctx.scale(1, 0.22)
      ctx.translate(-X(s.x), -Y(-0.08))
      ctx.fillStyle = pg
      ctx.fillRect(X(s.x - s.w), Y(-0.08) - s.w * k, 2 * s.w * k, 2 * s.w * k)
      ctx.restore()
    }
    outline(p, ink, weight)
    p.line(X(x0), Y(0), X(x1), Y(0))
    outline(p, ink, weight * 0.5)
    p.line(X(x0), Y(-0.34), X(x1), Y(-0.34))
    // The boards' joints along the edge.
    p.stroke(alpha(p, DOJO.woodDeep, 0.8))
    for (let x = Math.floor(x0 / 1.3) * 1.3; x < x1; x += 1.3) p.line(X(x), Y(0), X(x), Y(-0.34))
  }
}

/**
 * The shade over the wall: deepest at the ceiling, still dark across the plaster and the beam, gone by the paper's
 * middle, and a little again at the skirting, where the floor's dark comes up. Over the wall only, under the pillars
 * and everything that stands in the hall, so the wooden men are the lit things in it.
 */
function shade(ctx: CanvasRenderingContext2D, X: (x: number) => number, Y: (h: number) => number, k: number, x0: number, x1: number, hBot: number, hTop: number): void {
  const top = Math.min(hTop, WALL.beamTop + 3)
  const bot = Math.max(hBot, -0.1)
  if (top <= bot) return
  const g = ctx.createLinearGradient(0, Y(WALL.beamTop + 3), 0, Y(-0.1))
  const at = (h: number) => (WALL.beamTop + 3 - h) / (WALL.beamTop + 3.1)
  g.addColorStop(0, 'rgba(58, 40, 26, 0.58)')
  g.addColorStop(at(WALL.beam), 'rgba(58, 40, 26, 0.44)')
  g.addColorStop(at(WALL.rail), 'rgba(66, 42, 24, 0.34)')
  g.addColorStop(at(WALL.screen - 0.9), 'rgba(96, 58, 26, 0.12)')
  g.addColorStop(at(2.6), 'rgba(110, 66, 28, 0.05)')
  g.addColorStop(at(0.9), 'rgba(96, 58, 26, 0.1)')
  g.addColorStop(1, 'rgba(58, 40, 26, 0.24)')
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(X(x0), Y(top), (x1 - x0) * k, (top - bot) * k)
  ctx.restore()
}

/**
 * The bamboo in the yard, as its shadow lies on the paper: in each bay a stalk or two, jointed, leaning a little,
 * with sprays of leaves that stir. Soft and faint, a shade of the wash, clipped to the paper so it is on the screens
 * and nowhere else.
 */
function bamboo(p: p5, X: (x: number) => number, Y: (h: number) => number, k: number, x0: number, x1: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(x0), Y(WALL.screen), (x1 - x0) * k, (WALL.screen - WALL.skirt) * k)
  ctx.clip()
  const shadow = alpha(p, DOJO.wash, BAMBOO.shade)
  const first = Math.floor((x0 - PILLAR0) / BAY) - 1
  const last = Math.ceil((x1 - PILLAR0) / BAY) + 1
  for (let b = first; b <= last; b++) {
    const stalks = hash(b, 41) > 0.45 ? 2 : 1
    for (let s = 0; s < stalks; s++) {
      const sx = PILLAR0 + b * BAY + 0.8 + (s === 0 ? hash(b, 42) * 1.6 : 2.6 + hash(b, 43) * 1.8)
      if (sx < x0 - 2 || sx > x1 + 2) continue
      const lean = (hash(b, 44, s) - 0.5) * 0.14
      const w = 0.07 + 0.03 * hash(b, 45, s)
      const at = (h: number): number => sx + lean * h
      // The stalk: its segments, a gap at each joint.
      p.noStroke()
      p.fill(shadow)
      const joint = 0.78 + 0.2 * hash(b, 46, s)
      for (let h = WALL.skirt - 0.4 + hash(b, 47, s) * joint; h < WALL.screen + 0.5; h += joint) {
        p.quad(X(at(h) - w), Y(h), X(at(h) + w), Y(h), X(at(h + joint - 0.05) + w), Y(h + joint - 0.05), X(at(h + joint - 0.05) - w), Y(h + joint - 0.05))
      }
      // Sprays of leaves off a few joints, drooping, stirring a little.
      for (let j = 0; j < 4; j++) {
        const h = 1.6 + j * 0.95 + hash(b, 48 + j, s) * 0.5
        const side = hash(b, 52 + j, s) > 0.5 ? 1 : -1
        const stir = 0.07 * Math.sin(t * 0.9 + b * 1.7 + j * 2.3 + s)
        const n = 3 + Math.floor(hash(b, 56 + j, s) * 3)
        const bx = at(h) + side * w
        for (let i = 0; i < n; i++) {
          // Each leaf hangs off the twig, out to its side and drooping, its tip down: a long thin blade.
          const len = 0.55 + 0.25 * hash(b, 60 + i, j + s)
          const droop = 0.3 + 0.24 * i + stir
          const dx = side * Math.cos(droop) * len
          const dy = -Math.sin(droop) * len
          const tip: [number, number] = [bx + dx, h + dy]
          const mid: [number, number] = [bx + dx * 0.45, h + dy * 0.45]
          const nx = -dy / len
          const ny = dx / len
          const bw = 0.075
          p.beginShape()
          p.vertex(X(bx), Y(h))
          p.vertex(X(mid[0] + nx * bw), Y(mid[1] + ny * bw))
          p.vertex(X(tip[0]), Y(tip[1]))
          p.vertex(X(mid[0] - nx * bw), Y(mid[1] - ny * bw))
          p.endShape(p.CLOSE)
        }
      }
    }
  }
  ctx.restore()
}

/**
 * The rack: two uprights and three rails of dark wood, standing on the floor against the screens, and in it the
 * hall's weapons stood on end: a spear with a red tassel, the long-handled broadsword, a plain staff and a second
 * spear, each leaning in its slot.
 */
function rack(p: p5, c: Ctx, X: (x: number) => number, Y: (h: number) => number, k: number): void {
  const { ink, weight } = c
  const { x0, x1 } = RACK
  const w = weight * 0.7
  // The weapons first, behind the front rail.
  const slots = 4
  for (let i = 0; i < slots; i++) {
    const x = x0 + 0.22 + (i * (x1 - x0 - 0.44)) / (slots - 1)
    const lean = 0.07 * (i % 2 === 0 ? 1 : -1)
    const foot: [number, number] = [x, 0.12]
    const top = i === 1 ? 4.05 : i === 2 ? 3.7 : 4.35 - 0.12 * i
    const head: [number, number] = [x + lean * top, top]
    // The haft.
    p.strokeCap(p.ROUND)
    p.stroke(ink)
    p.strokeWeight(0.07 * k + 2 * w)
    p.line(X(foot[0]), Y(foot[1]), X(head[0]), Y(head[1]))
    p.stroke(i === 2 ? DOJO.wood : mixHex(DOJO.lacquer, DOJO.woodDeep, 0.4))
    p.strokeWeight(0.07 * k)
    p.line(X(foot[0]), Y(foot[1]), X(head[0]), Y(head[1]))
    if (i === 2) continue
    const dir: [number, number] = [lean, 1]
    const nlen = Math.hypot(dir[0], dir[1])
    const ux = dir[0] / nlen
    const uy = dir[1] / nlen
    const along = (d: number, s: number): [number, number] => [head[0] + ux * d - uy * s, head[1] + uy * d + ux * s]
    if (i === 1) {
      // The broadsword's blade: broad, curved along its back, a notch and a spike.
      const pts = [along(-0.02, -0.04), along(0.12, -0.17), along(0.42, -0.2), along(0.66, -0.12), along(0.8, 0.05), along(0.55, 0.04), along(0.48, 0.1), along(0.1, 0.06)]
      solid(p, ink, w, STEEL)
      p.beginShape()
      for (const q of pts) p.vertex(X(q[0]), Y(q[1]))
      p.endShape(p.CLOSE)
      solid(p, ink, w * 0.8, DOJO.gold)
      const g0 = along(-0.06, -0.09)
      const g1 = along(-0.06, 0.11)
      p.strokeWeight(0.06 * k)
      p.stroke(DOJO.gold)
      p.line(X(g0[0]), Y(g0[1]), X(g1[0]), Y(g1[1]))
    } else {
      // A spear's leaf-shaped head, and its tassel of red horsehair under it.
      const pts = [along(0, -0.07), along(0.12, -0.08), along(0.42, 0), along(0.12, 0.08), along(0, 0.07)]
      solid(p, ink, w, STEEL)
      p.beginShape()
      for (const q of pts) p.vertex(X(q[0]), Y(q[1]))
      p.endShape(p.CLOSE)
      // The tassel: a hank of strands from the socket, hanging down the haft and spreading.
      p.stroke(DOJO.lacquer)
      p.strokeWeight(Math.max(1, 0.03 * k))
      const t0 = along(-0.01, 0)
      for (let j = 0; j < 6; j++) {
        const spread = (j - 2.5) * 0.045
        const q = along(-0.34 - 0.05 * Math.abs(j - 2.5), spread)
        p.line(X(t0[0]), Y(t0[1]), X(q[0]), Y(q[1]))
      }
      solid(p, ink, w * 0.6, DOJO.gold)
      p.rect(X(t0[0]), Y(t0[1]), 0.1 * k, 0.05 * k)
    }
  }
  // The frame: two uprights, a foot rail, the slotted middle rail and the top rail the hafts lean in.
  solid(p, ink, w, DOJO.woodDeep)
  for (const x of [x0, x1]) p.rect(X(x), Y(1.5), 0.12 * k, 3.0 * k)
  for (const [h, th] of [[0.3, 0.14], [1.65, 0.12], [2.9, 0.14]] as const) p.rect(X((x0 + x1) / 2), Y(h), (x1 - x0 + 0.16) * k, th * k)
  // Finials on the uprights.
  for (const x of [x0, x1]) p.circle(X(x), Y(3.07), 0.17 * k)
}

/**
 * The scroll: hung from the head rail on a cord, mounted in jade silk, a column of four characters brushed down its
 * paper and a red seal under them, weighted by a roller with dark knobs.
 */
function scroll(p: p5, c: Ctx, X: (x: number) => number, Y: (h: number) => number, k: number): void {
  const { ink, weight } = c
  const { x, w, top, foot } = SCROLL
  const w2 = w / 2
  // The cord from a nail under the head rail.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.line(X(x), Y(WALL.screen - 0.05), X(x - w2 * 0.6), Y(top + 0.05))
  p.line(X(x), Y(WALL.screen - 0.05), X(x + w2 * 0.6), Y(top + 0.05))
  solid(p, ink, weight * 0.5, DOJO.woodDeep)
  p.circle(X(x), Y(WALL.screen - 0.05), 0.07 * k)
  // The mount, the paper in it, the top stave and the roller.
  solid(p, ink, weight * 0.6, SILK)
  p.rect(X(x), Y((top + foot) / 2), w * k, (top - foot) * k)
  p.stroke(alpha(p, DOJO.woodDeep, 0.6))
  p.strokeWeight(weight * 0.4)
  p.fill(mixHex(DOJO.screen, DOJO.wood, 0.1))
  p.rect(X(x), Y((top + foot) / 2 + 0.06), (w - 0.16) * k, (top - foot - 0.5) * k)
  solid(p, ink, weight * 0.6, DOJO.woodDeep)
  p.rect(X(x), Y(top), (w + 0.04) * k, 0.07 * k)
  p.rect(X(x), Y(foot), (w + 0.08) * k, 0.1 * k)
  p.circle(X(x - w2 - 0.08), Y(foot), 0.13 * k)
  p.circle(X(x + w2 + 0.08), Y(foot), 0.13 * k)
  // Four characters down it, and the seal.
  const step = (top - foot - 0.75) / 4
  for (let i = 0; i < 4; i++) glyph(p, X(x), Y(top - 0.42 - step * (i + 0.5)), step * 0.78 * k, 70 + i, DOJO.wash)
  p.noStroke()
  p.fill(DOJO.lacquer)
  p.rect(X(x + 0.06), Y(foot + 0.3), 0.1 * k, 0.1 * k)
}

/**
 * A character, as a brush would set it, made up: a few strokes in a square (a cross stroke or two, a down stroke,
 * the falling strokes left and right, a dot), chosen by `seed`. It is not any word, only the hand of one.
 */
function glyph(p: p5, cx: number, cy: number, size: number, seed: number, color: string): void {
  const s = size / 2
  p.stroke(color)
  p.strokeCap(p.ROUND)
  const stroke = (ax: number, ay: number, bx: number, by: number, w = 0.13) => {
    p.strokeWeight(Math.max(1, w * s))
    p.line(cx + ax * s, cy + ay * s, cx + bx * s, cy + by * s)
  }
  const r = (i: number) => hash(seed, i, 77)
  // Cross strokes, one to three, stacked.
  const across = 1 + Math.floor(r(1) * 3)
  for (let i = 0; i < across; i++) {
    const y = -0.6 + (i * 1.1) / Math.max(1, across - 1) * (across > 1 ? 1 : 0) + (across === 1 ? 0.15 : 0)
    const half = 0.5 + 0.35 * r(2 + i)
    stroke(-half, y, half, y - 0.06)
  }
  // A down stroke through them, or a frame's two sides.
  if (r(6) > 0.4) stroke(0.05 * (r(7) - 0.5), -0.85, 0.02, 0.85, 0.15)
  else {
    stroke(-0.55, -0.7, -0.55, 0.55)
    stroke(0.55, -0.7, 0.5, 0.65)
  }
  // The falling strokes, left and right, under it.
  if (r(8) > 0.35) stroke(-0.1, 0.25, -0.7, 0.85, 0.12)
  if (r(9) > 0.35) stroke(0.1, 0.25, 0.75, 0.82, 0.14)
  // A dot over the top.
  if (r(10) > 0.5) stroke(-0.05, -1.0, 0.08, -0.9, 0.17)
}

/**
 * The incense: a bronze censer on a low stand on the floor, three sticks in it, and their smoke going up in one
 * thread that wavers and widens and is gone under the plaster. It drifts, slowly, the way the hall's air goes.
 */
function incense(p: p5, c: Ctx, X: (x: number) => number, Y: (h: number) => number, k: number, t: number): void {
  const { ink, weight } = c
  const x = INCENSE.x
  // The censer: a squat bronze bowl on three short legs, on a dark stand.
  solid(p, ink, weight * 0.6, DOJO.woodDeep)
  p.rect(X(x), Y(0.1), 0.62 * k, 0.2 * k)
  solid(p, ink, weight * 0.6, BRONZE)
  p.arc(X(x), Y(0.42), 0.5 * k, 0.4 * k, 0, Math.PI, p.CHORD)
  p.rect(X(x), Y(0.43), 0.56 * k, 0.05 * k)
  // The sticks, their lit tips.
  for (const [dx, h] of [[-0.06, 0.78], [0.01, 0.86], [0.08, 0.76]] as const) {
    p.stroke(DOJO.lacquer)
    p.strokeWeight(Math.max(1, 0.025 * k))
    p.line(X(x + dx * 0.4), Y(0.45), X(x + dx), Y(h))
    p.noStroke()
    p.fill(alpha(p, '#FFB25A', 0.9))
    p.circle(X(x + dx), Y(h), 0.04 * k)
  }
  // The smoke: two threads from the tips, wandering as they rise, widening and fading.
  p.noFill()
  for (const [seed, from] of [[1, 0.86], [2, 0.8]] as const) {
    let prev: [number, number] | null = null
    for (let i = 0; i <= 34; i++) {
      const u = i / 34
      const h = from + u * 4.3
      const wander = (0.05 + 0.32 * u * u) * Math.sin(h * 2.1 - t * 1.3 + seed * 2.0) + 0.12 * u * Math.sin(h * 0.9 - t * 0.5 + seed)
      const q: [number, number] = [x + 0.01 * seed + wander + 0.25 * u, h]
      if (prev) {
        const a = 0.34 * (1 - u) * Math.min(1, u * 8)
        p.stroke(alpha(p, SMOKE, a))
        p.strokeWeight(Math.max(1, (0.025 + 0.09 * u) * k))
        p.line(X(prev[0]), Y(prev[1]), X(q[0]), Y(q[1]))
      }
      prev = q
    }
  }
}

/**
 * The sun, over everything in the hall: its shafts under the beam, slanting down to the floor, soft at their edges
 * and fading as they fall, and the dust turning slowly in them. Laid on in light, so what it crosses is lit, not
 * covered: the wooden men walk through it and stay themselves.
 */
export function sun(p: p5, k: number, ox: number, fy: number, t: number): void {
  const f = frame(p, k)
  const X = (x: number) => (x + ox) * k
  const Y = (h: number) => (fy - h) * k
  const x0 = f.x0 - ox
  const x1 = f.x1 - ox
  const hTop = fy - f.y0
  const hBot = fy - f.y1
  if (hBot > SHAFT_TOP) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // Under the beam only: the light comes in under it.
  ctx.beginPath()
  ctx.rect(X(x0), Y(Math.min(hTop, SHAFT_TOP)), (x1 - x0) * k, (Math.min(hTop, SHAFT_TOP) - hBot) * k)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  for (const s of SHAFTS) {
    // The shaft's middle, from the beam down to the floor.
    const top: [number, number] = [s.x - SLANT * SHAFT_TOP, SHAFT_TOP]
    const foot: [number, number] = [s.x, 0]
    if (Math.max(top[0], foot[0]) + s.w < x0 || Math.min(top[0], foot[0]) - s.w > x1) continue
    const g = ctx.createLinearGradient(X(top[0]), Y(top[1]), X(foot[0]), Y(foot[1]))
    g.addColorStop(0, 'rgba(255, 228, 174, 0)')
    g.addColorStop(0.1, `rgba(255, 228, 174, ${0.24 * s.a})`)
    g.addColorStop(0.55, `rgba(255, 228, 174, ${0.17 * s.a})`)
    g.addColorStop(1, `rgba(255, 228, 174, ${0.09 * s.a})`)
    ctx.fillStyle = g
    // Three widths laid on each other: a soft edge and a brighter core.
    for (const share of [1, 0.68, 0.36]) {
      const hw = (s.w * share) / 2
      ctx.beginPath()
      ctx.moveTo(X(top[0] - hw), Y(top[1]))
      ctx.lineTo(X(top[0] + hw), Y(top[1]))
      ctx.lineTo(X(foot[0] + hw), Y(foot[1]))
      ctx.lineTo(X(foot[0] - hw), Y(foot[1]))
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
  // The dust in each shaft: motes turning slowly, brightest in the shaft's middle.
  p.noStroke()
  SHAFTS.forEach((s, j) => {
    for (let i = 0; i < 22; i++) {
      const u0 = hash(j, i, 31)
      const v0 = hash(j, i, 32) - 0.5
      const u = (u0 + 0.012 * Math.sin(t * 0.37 + i * 1.9) + 0.006 * t * (hash(j, i, 33) - 0.5)) % 1
      const v = v0 + 0.08 * Math.sin(t * 0.53 + i * 2.7 + j)
      const h = SHAFT_TOP * (1 - Math.abs(u))
      const x = s.x - SLANT * h + v * s.w
      if (x < x0 - 0.1 || x > x1 + 0.1 || h < hBot - 0.1 || h > hTop + 0.1) continue
      const lit = Math.max(0, 1 - Math.abs(v) * 2.2) * (0.55 + 0.45 * Math.sin(t * 1.1 + i * 3.1)) * s.a
      if (lit <= 0.05) continue
      p.fill(alpha(p, '#FFF6DE', 0.9 * lit))
      p.circle(X(x), Y(h), (0.03 + 0.03 * hash(j, i, 34)) * k)
    }
  })
  ctx.restore()
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
