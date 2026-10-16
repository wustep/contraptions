import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, depth, frame, hash, knock, lastOf, smooth } from '../kit'
import { level, onsetsIn } from '../music'
import { HIBACHI, HIBACHI_THEME } from '../worlds'
import * as rig from './raccacoonie-rig'

/**
 * Raccacoonie's restaurant round the griddle, at its depths: what makes the kitchen a place and not a board.
 *
 * - **The far wall** (at 0.72 of the griddle's pace): the dark slats and the rail of tools, a pass through to the back
 *   kitchen at the left, lit warm, an indigo noren stirring across its top and a cook going to and fro behind it with
 *   steam off the stockpot; at the right a shelf of sake bottles and stacked bowls.
 * - **Over the griddle** (its own plane, behind the chef): a steel extractor hood with a lamp in its mouth, and the
 *   cooking's smoke going up into it, the volcano's most of all.
 * - **The diners** (at 1.4, nearest): the backs of the heads at the counter, along the frame's foot under the griddle's
 *   edge, warm-rimmed by its light. They follow her; they shrink back from the eruption with their hands up,
 *   applaud the tail into the pocket, lean in for the raccoon, and look up after her at the flip.
 *
 * The light is the griddle's from below and the hood's lamp from above; the pass is warm but far.
 */

type Pen = { p: p5; k: number; ink: string; w: number; t: number }

const H = HIBACHI
const BG = HIBACHI_THEME.bg
const X = (pen: Pen, v: number) => v * pen.k
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

function poly(pen: Pen, pts: Pt[], fill: string | p5.Color, ink: string | null = pen.ink, w = pen.w): void {
  const { p } = pen
  if (ink) {
    p.stroke(ink)
    p.strokeWeight(w)
  } else p.noStroke()
  p.fill(fill as string)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(pen, x), X(pen, y))
  p.endShape(p.CLOSE)
}

/** Soft vapour: one uninked union of lobes, so overlaps never darken. */
function vapour(pen: Pen, x: number, y: number, r: number, a: number, hex: string): void {
  if (a <= 0.004 || r <= 0.005) return
  const ctx = pen.p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.fillStyle = `rgba(${rgbOf(hex)}, ${a})`
  ctx.beginPath()
  for (const [dx, dy, f] of [[0, 0, 1], [0.7, 0.18, 0.72], [-0.66, 0.22, 0.66], [0.12, -0.52, 0.62]] as const) {
    const cx = X(pen, x + dx * r)
    const cy = X(pen, y + dy * r)
    ctx.moveTo(cx + X(pen, r * f), cy)
    ctx.arc(cx, cy, X(pen, r * f), 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** How hot the room is, as the room's own light map has it: the burners with the music, the volcano while it burns. */
function heat(t: number): number {
  const e = t - rig.ERUPT
  const b = e < 0 ? 0 : e < 0.9 ? 1 : Math.max(0, 1 - (e - 0.9) / 0.8)
  return Math.max(level(t), b)
}
const blazeOf = (t: number): number => {
  const e = t - rig.ERUPT
  return e < 0 ? 0 : e < 0.9 ? 1 : Math.max(0, 1 - (e - 0.9) / 0.8)
}

/* ------------------------------------------------------------------ the far wall */

/** Where the far wall sits as drawn: the camera's middle in the kitchen's wide shots. */
const REF: Pt = [0, -0.8]
/** The pass through to the back kitchen, in the far wall's cells. */
const PASS = { x0: -5.3, x1: -2.75, y0: -2.75, y1: -1.3 }
/** The sake shelf. */
const SHELF = { x0: 4.4, x1: 6.9, boards: [-2.05, -1.25] }
const RAIL = rig.TOP - 3.35
const WALL_TONE = mixHex(BG, H.soy, 0.1)

export function backWall(pen: Pen): void {
  const { p, k, t } = pen
  const hot = heat(t)
  depth(p, k, 0.72, REF, (f) => {
    // The slats, barely there.
    p.noStroke()
    p.fill(WALL_TONE)
    const SL = 0.5
    for (let i = Math.floor(f.x0 / SL) - 1; i < f.x1 / SL + 1; i++) p.rect(X(pen, i * SL + SL / 2), X(pen, (f.y0 - 1 + rig.TOP) / 2), X(pen, SL - 0.035), X(pen, rig.TOP - f.y0 + 1))
    if (PASS.x1 + 0.5 > f.x0 && PASS.x0 - 0.5 < f.x1) pass(pen)
    if (SHELF.x1 + 0.3 > f.x0 && SHELF.x0 - 0.3 < f.x1) shelf(pen, hot)
    tools(pen, f.x0, f.x1, hot)
  })
}

/** The pass to the back kitchen: a warm room beyond, a cook at the stove, steam, and the noren over it all. */
function pass(pen: Pen): void {
  const { p, t } = pen
  const { x0, x1, y0, y1 } = PASS
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const back = mixHex(mixHex(H.onion, H.flame, 0.25), BG, 0.38)
  const backDim = mixHex(back, BG, 0.45)
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(pen, x0), X(pen, y0), X(pen, x1 - x0), X(pen, y1 - y0))
  ctx.clip()
  // The back kitchen's tiled wall, lit from a lamp out of sight, dimmer to its corners.
  const g = ctx.createLinearGradient(0, X(pen, y0), 0, X(pen, y1))
  g.addColorStop(0, `rgb(${rgbOf(backDim)})`)
  g.addColorStop(0.55, `rgb(${rgbOf(back)})`)
  g.addColorStop(1, `rgb(${rgbOf(mixHex(back, BG, 0.2))})`)
  ctx.fillStyle = g
  ctx.fillRect(X(pen, x0), X(pen, y0), X(pen, x1 - x0), X(pen, y1 - y0))
  p.stroke(alpha(p, backDim, 0.6))
  p.strokeWeight(Math.max(1, X(pen, 0.012)))
  for (let y = y0 + 0.2; y < y1; y += 0.2) p.line(X(pen, x0), X(pen, y), X(pen, x1), X(pen, y))
  // A shelf of bowls and the stove's hood along the back.
  p.noStroke()
  p.fill(mixHex(back, H.soy, 0.55))
  p.rect(X(pen, (x0 + x1) / 2), X(pen, y0 + 0.62), X(pen, x1 - x0), X(pen, 0.05))
  for (let i = 0; i < 7; i++) {
    const bx = x0 + 0.3 + i * 0.32
    p.fill(i % 3 === 1 ? mixHex(H.hat, back, 0.3) : mixHex('#3E5C7A', back, 0.35))
    p.arc(X(pen, bx), X(pen, y0 + 0.595), X(pen, 0.22), X(pen, 0.16), 0, Math.PI, p.CHORD)
  }
  // The cook: a dark figure at the stove, going to and fro with a ladle, now and then stirring the stockpot.
  const walk = Math.sin(t * 0.55) * 0.75 + 0.12 * Math.sin(t * 1.7)
  const cx = (x0 + x1) / 2 + walk
  const cook = mixHex(BG, H.soy, 0.35)
  p.fill(cook)
  p.ellipse(X(pen, cx), X(pen, y1 - 0.02), X(pen, 0.62), X(pen, 0.62))
  p.circle(X(pen, cx), X(pen, y1 - 0.5), X(pen, 0.28))
  // A white cap.
  p.fill(mixHex(H.hat, back, 0.25))
  p.rect(X(pen, cx), X(pen, y1 - 0.66), X(pen, 0.26), X(pen, 0.1), X(pen, 0.04))
  // The arm, stirring.
  const stir = Math.sin(t * 3.2)
  p.stroke(cook)
  p.strokeWeight(X(pen, 0.07))
  p.line(X(pen, cx + 0.2), X(pen, y1 - 0.25), X(pen, cx + 0.42 + 0.05 * stir), X(pen, y1 - 0.12 - 0.04 * stir))
  // The stockpot at the right of the pass, and its steam.
  const potX = x1 - 0.5
  p.noStroke()
  p.fill(mixHex(H.steelDeep, BG, 0.25))
  p.rect(X(pen, potX), X(pen, y1 - 0.12), X(pen, 0.5), X(pen, 0.34), X(pen, 0.03))
  ctx.restore()
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.32 + i / 4 + hash(i, 12)) % 1
    vapour(pen, potX + 0.08 * Math.sin(t * 1.3 + i * 2) + 0.1 * u, y1 - 0.32 - u * 1.25, 0.08 + 0.2 * u, 0.15 * Math.sin(Math.PI * u) * (1 - u * 0.4), H.onion)
  }
  // The frame of the opening.
  poly(pen, [[x0 - 0.06, y0 - 0.06], [x1 + 0.06, y0 - 0.06], [x1 + 0.06, y1 + 0.06], [x0 - 0.06, y1 + 0.06]], 'rgba(0,0,0,0)', mixHex(BG, H.soy, 0.5), pen.w)
  poly(pen, [[x0 - 0.15, y1], [x1 + 0.15, y1], [x1 + 0.15, y1 + 0.1], [x0 - 0.15, y1 + 0.1]], mixHex(BG, H.soy, 0.55), pen.ink, pen.w * 0.6)
  // The noren: four indigo panels split from the top, a white ring on the middle two, stirring in the draught.
  const n = 4
  const pw = (x1 - x0) / n
  const drop = 0.62
  for (let i = 0; i < n; i++) {
    const a = x0 + i * pw + 0.02
    const b = a + pw - 0.04
    const sway = 0.04 * Math.sin(t * 1.1 + i * 0.9) + 0.02 * Math.sin(t * 2.3 + i)
    poly(pen, [[a, y0], [b, y0], [b + sway, y0 + drop], [a + sway, y0 + drop]], '#2E4766', pen.ink, pen.w * 0.6)
    if (i === 1 || i === 2) {
      p.noFill()
      p.stroke(alpha(p, H.onion, 0.85))
      p.strokeWeight(Math.max(1, X(pen, 0.035)))
      const cx2 = i === 1 ? b + sway * 0.5 : a + sway * 0.5
      p.arc(X(pen, cx2), X(pen, y0 + 0.32), X(pen, 0.34), X(pen, 0.34), i === 1 ? Math.PI / 2 : -Math.PI / 2, i === 1 ? Math.PI * 1.5 : Math.PI / 2)
    }
  }
  poly(pen, [[x0 - 0.1, y0 - 0.05], [x1 + 0.1, y0 - 0.05], [x1 + 0.1, y0 + 0.03], [x0 - 0.1, y0 + 0.03]], mixHex(BG, H.soy, 0.7), pen.ink, pen.w * 0.5)
}

/** The sake shelf: two boards of bottles and bowls, their glass catching the griddle's light. */
function shelf(pen: Pen, hot: number): void {
  const { p } = pen
  const glassTones = ['#3F6B4A', '#5E3B24', '#DCD3C0', '#2F4A5E', '#6E5A3A']
  for (const [j, by] of SHELF.boards.entries()) {
    poly(pen, [[SHELF.x0, by], [SHELF.x1, by], [SHELF.x1, by + 0.06], [SHELF.x0, by + 0.06]], mixHex(BG, H.soy, 0.6), pen.ink, pen.w * 0.5)
    for (let i = 0; i < 7; i++) {
      const bx = SHELF.x0 + 0.22 + i * 0.34 + 0.05 * hash(i, j, 31)
      const tone = mixHex(glassTones[(i + j * 2) % glassTones.length], BG, 0.35)
      if (j === 1 && i % 3 === 2) {
        // A stack of bowls.
        p.noStroke()
        p.fill(mixHex(H.hat, BG, 0.45))
        for (let s = 0; s < 3; s++) p.arc(X(pen, bx), X(pen, by - 0.02 - s * 0.075), X(pen, 0.26 - s * 0.02), X(pen, 0.16), 0, Math.PI, p.CHORD)
        continue
      }
      const tall = 0.42 + 0.14 * hash(i, j, 32)
      p.noStroke()
      p.fill(tone)
      p.rect(X(pen, bx), X(pen, by - tall * 0.35), X(pen, 0.17), X(pen, tall * 0.7), X(pen, 0.04))
      p.rect(X(pen, bx), X(pen, by - tall * 0.82), X(pen, 0.06), X(pen, tall * 0.3), X(pen, 0.015))
      // A paper label, and a line of the griddle's light down the glass.
      p.fill(mixHex(H.onion, BG, 0.4))
      p.rect(X(pen, bx), X(pen, by - tall * 0.3), X(pen, 0.12), X(pen, 0.12))
      p.fill(alpha(p, H.flameHot, 0.12 + 0.12 * hot))
      p.rect(X(pen, bx - 0.055), X(pen, by - tall * 0.35), X(pen, 0.025), X(pen, tall * 0.5))
    }
  }
}

/** The rail along the far wall, hung with the kitchen's tools, the griddle's light catching their bellies. */
function tools(pen: Pen, fx0: number, fx1: number, hot: number): void {
  const { p, t } = pen
  const tool = mixHex(mixHex(BG, H.steel, 0.22), H.flame, 0.12 + 0.1 * hot)
  p.stroke(mixHex(BG, H.steel, 0.3))
  p.strokeWeight(Math.max(1, X(pen, 0.05)))
  // The rail runs between the pass and the shelf.
  const r0 = Math.max(fx0 - 1, PASS.x1 + 0.3)
  const r1 = Math.min(fx1 + 1, SHELF.x0 - 0.3)
  if (r1 <= r0) return
  p.line(X(pen, r0), X(pen, RAIL), X(pen, r1), X(pen, RAIL))
  const GAP = 1.3
  for (let i = Math.floor(r0 / GAP); i < r1 / GAP + 1; i++) {
    const x = i * GAP + 0.35
    if (x < r0 + 0.1 || x > r1 - 0.1) continue
    const kind = ((i % 4) + 4) % 4
    const sway = 0.03 * Math.sin(t * 0.9 + i * 1.7)
    const hx = x + sway
    p.stroke(tool)
    p.strokeWeight(Math.max(1, X(pen, 0.035)))
    p.noFill()
    p.circle(X(pen, x), X(pen, RAIL + 0.05), X(pen, 0.08))
    if (kind === 2) {
      p.noStroke()
      p.fill(tool)
      p.arc(X(pen, hx), X(pen, RAIL + 0.42), X(pen, 0.78), X(pen, 0.62), 0, Math.PI, p.CHORD)
      p.stroke(tool)
      p.line(X(pen, x), X(pen, RAIL + 0.09), X(pen, hx), X(pen, RAIL + 0.42))
      continue
    }
    const len = kind === 0 ? 0.62 : 0.7
    p.line(X(pen, x), X(pen, RAIL + 0.09), X(pen, hx), X(pen, RAIL + 0.09 + len))
    p.noStroke()
    p.fill(tool)
    if (kind === 0) p.ellipse(X(pen, hx), X(pen, RAIL + 0.15 + len), X(pen, 0.2), X(pen, 0.16))
    else if (kind === 1) p.rect(X(pen, hx), X(pen, RAIL + 0.16 + len), X(pen, 0.17), X(pen, 0.2), X(pen, 0.02))
    else p.circle(X(pen, hx), X(pen, RAIL + 0.2 + len), X(pen, 0.26))
  }
}

/* ------------------------------------------------------------------ the hood */

/** The extractor hood over the griddle's right half, where the volcano stands: its mouth, its throat, its duct. */
const HOOD = { x0: 0.85, x1: 4.75, mouth: -2.12, throat: -3.0, d0: 2.3, d1: 3.3 }

export function hood(pen: Pen): void {
  const { p, k, t } = pen
  const f = frame(p, k)
  if (f.y0 > HOOD.mouth + 0.1 || f.x1 < HOOD.x0 - 0.2 || f.x0 > HOOD.x1 + 0.2) return
  const hot = heat(t)
  const steel = mixHex(H.steelDeep, BG, 0.45)
  // The duct up out of the frame, and the hood's body narrowing to it.
  poly(pen, [[HOOD.d0, HOOD.throat], [HOOD.d1, HOOD.throat], [HOOD.d1, Math.min(HOOD.throat, f.y0 - 1)], [HOOD.d0, Math.min(HOOD.throat, f.y0 - 1)]], mixHex(steel, BG, 0.2), pen.ink, pen.w * 0.7)
  poly(pen, [[HOOD.x0, HOOD.mouth], [HOOD.x1, HOOD.mouth], [HOOD.d1 + 0.35, HOOD.throat], [HOOD.d0 - 0.35, HOOD.throat]], steel, pen.ink, pen.w * 0.8)
  // Its seams, and the griddle's light up its face, strongest at the lip.
  p.stroke(alpha(p, pen.ink, 0.14))
  p.strokeWeight(pen.w * 0.6)
  for (const u of [0.25, 0.5, 0.75]) {
    const bx = HOOD.x0 + (HOOD.x1 - HOOD.x0) * u
    const tx = HOOD.d0 - 0.35 + (HOOD.d1 - HOOD.d0 + 0.7) * u
    p.line(X(pen, bx), X(pen, HOOD.mouth - 0.12), X(pen, tx), X(pen, HOOD.throat + 0.02))
  }
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(pen, HOOD.mouth), 0, X(pen, HOOD.throat))
  g.addColorStop(0, `rgba(${rgbOf(H.flame)}, ${0.1 + 0.16 * hot})`)
  g.addColorStop(1, `rgba(${rgbOf(H.flame)}, 0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(X(pen, HOOD.x0), X(pen, HOOD.mouth))
  ctx.lineTo(X(pen, HOOD.x1), X(pen, HOOD.mouth))
  ctx.lineTo(X(pen, HOOD.d1 + 0.35), X(pen, HOOD.throat))
  ctx.lineTo(X(pen, HOOD.d0 - 0.35), X(pen, HOOD.throat))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // The lip, and the lamp in its mouth.
  poly(pen, [[HOOD.x0 - 0.06, HOOD.mouth], [HOOD.x1 + 0.06, HOOD.mouth], [HOOD.x1 + 0.06, HOOD.mouth + 0.1], [HOOD.x0 - 0.06, HOOD.mouth + 0.1]], mixHex(H.steel, BG, 0.25), pen.ink, pen.w * 0.7)
  p.stroke(alpha(p, H.flameHot, 0.25 + 0.3 * hot))
  p.strokeWeight(Math.max(1, X(pen, 0.025)))
  p.line(X(pen, HOOD.x0), X(pen, HOOD.mouth + 0.1), X(pen, HOOD.x1), X(pen, HOOD.mouth + 0.1))
  for (const lx of [1.55, 3.95]) {
    p.noStroke()
    p.fill(mixHex(H.flameHot, H.onion, 0.55))
    p.rect(X(pen, lx), X(pen, HOOD.mouth + 0.135), X(pen, 0.42), X(pen, 0.05), X(pen, 0.02))
  }
}

/* ------------------------------------------------------------------ the smoke */

/** A stream of smoke off the griddle: where, and how much at `t`; those under the hood are drawn into it. */
const STREAMS: { x: number; amount: (t: number) => number }[] = [
  // The scallions on the board, after the chopping.
  { x: -3.25, amount: (t) => 0.35 + 0.65 * smooth(t, 106.95, 108.6) * (1 - 0.6 * smooth(t, 111, 114)) },
  // The spatula's end of the plate, and the egg once it fries.
  { x: 0.95, amount: (t) => 0.3 + 0.7 * smooth(t, rig.SPLAT, rig.SPLAT + 0.6) },
  { x: 1.9, amount: () => 0.35 },
  // The volcano: hotter while she sits in it, and a great deal after it goes up.
  { x: rig.VX, amount: (t) => 0.4 + 0.5 * smooth(t, rig.CORKED, rig.ERUPT) + 0.9 * smooth(t, rig.ERUPT, rig.ERUPT + 0.4) * (1 - 0.7 * smooth(t, rig.ERUPT + 1.5, rig.ERUPT + 5)) },
  { x: 3.85, amount: () => 0.3 },
]

export function smoke(pen: Pen): void {
  const { p, t } = pen
  const intake = (HOOD.x0 + HOOD.x1) / 2
  p.noFill()
  p.strokeCap(p.ROUND)
  for (const [s, st] of STREAMS.entries()) {
    const amount = st.amount(t)
    const under = st.x > HOOD.x0 - 0.2 && st.x < HOOD.x1 + 0.2
    const rise = under ? rig.TOP - HOOD.mouth - 0.1 : 1.7
    // Three wisps a stream, each a thin curl going up, born at the plate and thinning out as it climbs.
    for (let i = 0; i < 3; i++) {
      const life = (t * (0.3 + 0.06 * hash(s, i, 3)) + i / 3 + hash(s, i, 7)) % 1
      const fade = Math.sin(Math.PI * life)
      const a = 0.22 * amount * fade
      if (a < 0.01) continue
      const x0 = st.x + (hash(s, i, 9) - 0.5) * 0.3
      const n = 10
      let px = 0
      let py = 0
      for (let j = 0; j <= n; j++) {
        const u = j / n
        // The wisp is a length of rise that travels up with its life.
        const h = (life * 0.6 + u * 0.55) * rise
        const lean = under ? (intake - x0) * 0.25 * (h / rise) ** 2 : 0.25 * (h / rise)
        const x = x0 + lean + 0.07 * Math.sin(h * 4.2 - t * 1.6 + i * 2 + s)
        const y = rig.TOP - 0.06 - h
        if (j > 0) {
          // Thin at its ends, gone into the hood's mouth.
          const w = 0.035 * Math.sin(Math.PI * u) + 0.006
          const gone = under ? 1 - smooth(h / rise, 0.82, 1) : 1 - smooth(h / rise, 0.6, 1)
          p.stroke(alpha(p, H.onion, a * gone))
          p.strokeWeight(Math.max(0.6, X(pen, w)))
          p.line(X(pen, px), X(pen, py), X(pen, x), X(pen, y))
        }
        px = x
        py = y
      }
    }
  }
}

/* ------------------------------------------------------------------ the diners */

type Look = 'bald' | 'bun' | 'cap' | 'curls' | 'kid' | 'pony'
interface Diner {
  x: number
  r: number
  look: Look
  tone: string
  /** Throws their hands up at the eruption, and claps the tail in. */
  hands: boolean
}

const DINERS: Diner[] = [
  { x: -6.7, r: 0.3, look: 'cap', tone: '#1C1A1E', hands: false },
  { x: -5.2, r: 0.28, look: 'bun', tone: '#211816', hands: true },
  { x: -3.75, r: 0.31, look: 'bald', tone: '#1A1F24', hands: false },
  { x: -2.35, r: 0.23, look: 'kid', tone: '#211A22', hands: true },
  { x: -0.95, r: 0.29, look: 'curls', tone: '#1D1816', hands: false },
  { x: 0.6, r: 0.28, look: 'pony', tone: '#211A1D', hands: true },
  { x: 2.05, r: 0.31, look: 'bald', tone: '#1B1E1A', hands: false },
  { x: 3.55, r: 0.28, look: 'bun', tone: '#1E1A20', hands: true },
  { x: 5.0, r: 0.3, look: 'cap', tone: '#231B17', hands: false },
  { x: 6.5, r: 0.29, look: 'curls', tone: '#1A1C20', hands: true },
]

/** The tail into the hat's pocket: they clap it in, on the notes after. */
const CLAPS = onsetsIn(rig.TAIL_IN, rig.TAIL_IN + 1.15, 0.25)
const BEATS = onsetsIn(rig.IN, rig.OUT, 0.5)

/**
 * The backs of the diners at the counter, nearest of all: silhouettes against the counter, unoutlined, the near side of
 * the picture, with the griddle's light along their crowns and shoulders. `where` is the ball, in the kitchen's cells.
 */
export function diners(pen: Pen, where: Pt | null): void {
  const { p, k, t } = pen
  const world = frame(p, k)
  // Their crowns never above the griddle's front edge, so the plate and everything on it stays clear.
  const crown = Math.max(rig.TOP + 0.3, world.y1 - 0.78)
  if (crown > world.y1 + 0.05) return
  const hot = heat(t)
  const blaze = blazeOf(t)
  // They shrink back from the blast, hands up; lean in for the raccoon; look up after her at the flip.
  const shrink = smooth(t, rig.ERUPT, rig.ERUPT + 0.12) * (1 - smooth(t, rig.ERUPT + 0.9, rig.ERUPT + 1.6))
  const leanIn = smooth(t, 115.4, 115.9) * (1 - smooth(t, rig.DUCK - 0.2, rig.DUCK + 0.2))
  const lookUp = smooth(t, rig.FLIP - 0.05, rig.FLIP + 0.12)
  const bob = knock(lastOf(BEATS, t).ago, 0.2)
  const clapAgo = lastOf(CLAPS, t).ago
  const clapping = t > rig.TAIL_IN && t < rig.TAIL_IN + 1.35
  const fill = (tone: string) => mixHex(tone, H.flame, 0.05 * hot + 0.14 * blaze)
  const rim = alpha(p, mixHex(H.flame, H.flameHot, 0.35), 0.45 + 0.3 * hot + 0.25 * blaze)
  // Nearer than the griddle: they slide past faster than it does, sideways only, so they stay sat at the counter.
  const fx = (world.cx - REF[0]) * (1 - 1.4)
  p.push()
  p.translate(X(pen, fx), 0)
  p.noStroke()
  const ball = where ? where[0] - fx : null
  for (const [i, d] of DINERS.entries()) {
    if (d.x + 1.2 < world.x0 - fx || d.x - 1.2 > world.x1 - fx) continue
    // Turned toward her: their heads tilt her way, more the nearer she is.
    const toward = ball === null ? 0 : Math.max(-1, Math.min(1, (ball - d.x) / 3))
    const y = crown + d.r * 1.15 + 0.1 * shrink + 0.025 * bob * (i % 2 ? 1 : -1) - 0.06 * leanIn - 0.05 * lookUp
    const x = d.x + 0.03 * Math.sin(t * 0.8 + i * 2.1) + 0.06 * shrink * Math.sign(d.x + fx - rig.VX)
    const tone = fill(d.tone)
    // Shoulders and back, wide, down past the frame, rimmed along their tops.
    const sw = d.r * 2.3
    const sy = y + d.r * 1.25
    p.fill(tone)
    p.beginShape()
    p.vertex(X(pen, x - sw), X(pen, sy + 1.2))
    p.bezierVertex(X(pen, x - sw), X(pen, sy + 0.1), X(pen, x - sw * 0.75), X(pen, sy - 0.05), X(pen, x - d.r * 0.45), X(pen, sy - 0.08))
    p.vertex(X(pen, x + d.r * 0.45), X(pen, sy - 0.08))
    p.bezierVertex(X(pen, x + sw * 0.75), X(pen, sy - 0.05), X(pen, x + sw), X(pen, sy + 0.1), X(pen, x + sw), X(pen, sy + 1.2))
    p.endShape(p.CLOSE)
    p.noFill()
    p.stroke(rim)
    p.strokeWeight(Math.max(1, X(pen, 0.022)))
    p.bezier(X(pen, x - sw * 0.98), X(pen, sy + 0.18), X(pen, x - sw * 0.9), X(pen, sy - 0.02), X(pen, x - sw * 0.6), X(pen, sy - 0.06), X(pen, x - d.r * 0.5), X(pen, sy - 0.08))
    p.bezier(X(pen, x + sw * 0.98), X(pen, sy + 0.18), X(pen, x + sw * 0.9), X(pen, sy - 0.02), X(pen, x + sw * 0.6), X(pen, sy - 0.06), X(pen, x + d.r * 0.5), X(pen, sy - 0.08))
    p.noStroke()
    // The neck.
    p.fill(tone)
    p.rect(X(pen, x), X(pen, y + d.r * 0.9), X(pen, d.r * 0.85), X(pen, d.r * 0.8), X(pen, 0.03))
    if (d.hands) {
      const up = Math.max(shrink, clapping ? smooth(t, rig.TAIL_IN, rig.TAIL_IN + 0.15) * (1 - smooth(t, rig.TAIL_IN + 1.1, rig.TAIL_IN + 1.35)) : 0)
      if (up > 0.01) {
        const meet = clapping && shrink < 0.1 ? Math.exp(-clapAgo / 0.08) : 0
        const gap = d.r * 0.85 + 0.2 * (1 - meet) + 0.16 * shrink
        for (const side of [-1, 1]) hand(pen, x + side * gap, y + 0.35 - 0.5 * up, side, tone, rim, t + i, shrink)
      }
    }
    head(pen, x, y, d, 0.14 * toward, tone, rim)
  }
  p.pop()
}

/** A head from behind, its hair or hat, unoutlined, with the light along its crown. */
function head(pen: Pen, x: number, y: number, d: Diner, tilt: number, tone: string, rim: p5.Color): void {
  const { p } = pen
  const r = d.r
  p.push()
  p.translate(X(pen, x), X(pen, y))
  p.rotate(tilt)
  p.noStroke()
  p.fill(tone)
  // Ears, and the back of the head, a little taller than wide.
  p.ellipse(X(pen, -r * 0.98), X(pen, r * 0.12), X(pen, r * 0.32), X(pen, r * 0.55))
  p.ellipse(X(pen, r * 0.98), X(pen, r * 0.12), X(pen, r * 0.32), X(pen, r * 0.55))
  p.ellipse(0, 0, X(pen, 2 * r), X(pen, 2.3 * r))
  // What sits on it: its outline against the light is what says who they are.
  let crownH = 1.15
  if (d.look === 'bun') {
    p.circle(0, X(pen, -r * 1.2), X(pen, r * 0.9))
    p.stroke(tone)
    p.strokeWeight(X(pen, 0.03))
    p.line(X(pen, -r * 0.7), X(pen, -r * 1.7), X(pen, r * 0.4), X(pen, -r * 0.85))
    p.line(X(pen, r * 0.65), X(pen, -r * 1.75), X(pen, -r * 0.3), X(pen, -r * 0.9))
    p.noStroke()
    crownH = 1.55
  } else if (d.look === 'cap') {
    p.arc(0, X(pen, -r * 0.2), X(pen, 2.12 * r), X(pen, 2.1 * r), Math.PI, Math.PI * 2, p.CHORD)
    // Its peak turned round to the back, the way a man wears it at the counter.
    p.ellipse(0, X(pen, -r * 0.18), X(pen, 2.6 * r), X(pen, 0.26 * r))
  } else if (d.look === 'curls') {
    for (let j = 0; j < 7; j++) {
      const a = Math.PI * (1.02 + j * 0.16)
      p.circle(X(pen, Math.cos(a) * r * 0.92), X(pen, Math.sin(a) * r * 1.02), X(pen, r * 0.62))
    }
    crownH = 1.3
  } else if (d.look === 'kid') {
    // A kid knelt up on the stool to see: a tuft standing up, and big ears.
    p.ellipse(X(pen, -r * 1.05), X(pen, r * 0.05), X(pen, r * 0.5), X(pen, r * 0.7))
    p.ellipse(X(pen, r * 1.05), X(pen, r * 0.05), X(pen, r * 0.5), X(pen, r * 0.7))
    p.triangle(X(pen, -0.05), X(pen, -r * 1.05), X(pen, 0.03), X(pen, -r * 1.55), X(pen, 0.08), X(pen, -r * 1.0))
  } else if (d.look === 'pony') {
    p.ellipse(X(pen, r * 0.12), X(pen, r * 0.95), X(pen, r * 0.5), X(pen, r * 1.4))
    p.fill(mixHex(H.flame, tone, 0.55))
    p.circle(X(pen, r * 0.08), X(pen, r * 0.2), X(pen, r * 0.26))
  }
  // The griddle's light along the crown: they are lit from the far side, from below the edge they look over.
  p.noFill()
  p.stroke(rim)
  p.strokeWeight(Math.max(1, X(pen, 0.025)))
  p.arc(0, X(pen, -(crownH - 1.15) * r * 0.5), X(pen, 1.96 * r), X(pen, 2.3 * r + (crownH - 1.15) * r), Math.PI * 1.1, Math.PI * 1.9)
  p.pop()
}

/** A raised hand beside the head, a silhouette: the forearm up from below, the palm, the fingers spread or together. */
function hand(pen: Pen, x: number, y: number, side: number, tone: string, rim: p5.Color, t: number, shrink: number): void {
  const { p } = pen
  p.noStroke()
  p.fill(tone)
  p.quad(X(pen, x - 0.08), X(pen, y + 0.9), X(pen, x + 0.08), X(pen, y + 0.9), X(pen, x + 0.07), X(pen, y + 0.12), X(pen, x - 0.07), X(pen, y + 0.12))
  p.ellipse(X(pen, x), X(pen, y + 0.02), X(pen, 0.2), X(pen, 0.24))
  const spread = 0.14 + 0.2 * shrink
  for (let j = 0; j < 4; j++) {
    const a = -Math.PI / 2 + (j - 1.5) * spread - side * 0.12 + 0.05 * Math.sin(t * 7 + j)
    p.push()
    p.translate(X(pen, x + Math.cos(a) * 0.08), X(pen, y + Math.sin(a) * 0.08))
    p.rotate(a + Math.PI / 2)
    p.rect(0, X(pen, -0.07), X(pen, 0.055), X(pen, 0.16), X(pen, 0.025))
    p.pop()
  }
  // The thumb, and the light along the hand's top.
  p.push()
  p.translate(X(pen, x - side * 0.09), X(pen, y + 0.02))
  p.rotate(-side * 0.9)
  p.rect(0, X(pen, -0.05), X(pen, 0.055), X(pen, 0.12), X(pen, 0.025))
  p.pop()
  p.noFill()
  p.stroke(rim)
  p.strokeWeight(Math.max(1, X(pen, 0.02)))
  p.arc(X(pen, x), X(pen, y - 0.1), X(pen, 0.26), X(pen, 0.2), Math.PI * 1.15, Math.PI * 1.85)
}
