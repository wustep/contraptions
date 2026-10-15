import type { Pt } from '../../../../../parts'
import { shade, type Frame } from '../depth'
import { ctxOf, ellipse, type Pen } from '../pen'
import { hash } from '../kit'
import { CREAK, F_MARTY, F_MISH, KNOCKS, ceilOf, WALL_L, WALL_R } from './geo'
import { ELS } from './room'

/**
 * The small life of the two rooms before the floor goes. In Marty's, a mouse lives in the wall by the bed's foot: it
 * comes out as he comes in, freezes at every knock of the radiator, runs in under the bed, sits there washing its
 * face while he hops into the tub, and on the creak bolts back across the floor into its hole. Under the floor, seen
 * through the cut, the smoke of Mishkin's cigarettes has gathered under his ceiling and drifts there, a layer of it,
 * before he is seen at all.
 */

/** The mouse's hole, low in the wall behind the bed's foot. */
const HOLE = 1.55
/** Its way: [show time, x], darting from one to the next (a dash, then still); it faces the way it last went. */
const DARTS: [number, number][] = [
  [91.8, HOLE],
  [92.15, 1.95],
  [92.4, 1.95],
  [92.55, 2.2],
  [92.95, 2.2],
  [93.25, 3.05],
  [93.55, 3.05],
  [93.75, 3.45],
  [94.4, 3.45],
  [94.55, 3.2],
  [95.4, 3.2],
  [95.55, 3.55],
  [CREAK + 0.06, 3.55],
  [CREAK + 0.56, HOLE],
]
const PEEK = DARTS[0][0]
const HOME = DARTS[DARTS.length - 1][0]
const DASH = 0.22

const ease = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/** Where the mouse is, which way it faces, whether it runs, and how much of it is out of the hole (0 in, 1 out). */
function mouseAt(t: number): { x: number; dir: number; run: number; out: number } | null {
  if (t < PEEK || t > HOME + 0.05) return null
  let i = 0
  while (i + 1 < DARTS.length && DARTS[i + 1][0] <= t) i++
  const [t0, x0] = DARTS[i]
  const [t1, x1] = DARTS[Math.min(i + 1, DARTS.length - 1)]
  let dir = 1
  for (let j = 1; j <= Math.min(i + 1, DARTS.length - 1); j++) if (DARTS[j][1] !== DARTS[j - 1][1] && DARTS[j - 1][0] <= t) dir = Math.sign(DARTS[j][1] - DARTS[j - 1][1])
  // A dash takes the last of the span (the whole of a long one, the bolt home); the rest of it is sitting still.
  const dash = Math.min(t1 - t0, x1 === x0 ? 0 : Math.max(DASH, Math.abs(x1 - x0) / 4.5))
  const u = dash > 0 ? (t - (t1 - dash)) / dash : 0
  const x = x0 + (x1 - x0) * ease(u)
  const run = u > 0 && u < 1 && x1 !== x0 ? 1 : 0
  const out = Math.min(1, (t - PEEK) / 0.3, (HOME + 0.05 - t) / 0.12)
  return { x, dir, run, out }
}

/** How it starts at each knock: crouched flat, then easing. */
const flinch = (t: number): number => KNOCKS.reduce((m, k) => Math.max(m, t >= k && t < k + 0.5 ? 1 - (t - k) / 0.5 : 0), 0)

/** The mouse, and its hole in the wall's foot. Drawn behind the bed and the suitcase, so it runs in behind them. */
export function drawMouse(pen: Pen, t: number): void {
  const fl = F_MARTY
  // The hole: a dark arch where the wall meets the boards.
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = pen.tone('#140E0A')
  ctx.beginPath()
  ctx.moveTo((HOLE - 0.08) * k, fl * k)
  ctx.lineTo((HOLE - 0.08) * k, (fl - 0.05) * k)
  ctx.quadraticCurveTo(HOLE * k, (fl - 0.15) * k, (HOLE + 0.08) * k, (fl - 0.05) * k)
  ctx.lineTo((HOLE + 0.08) * k, fl * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  const m = mouseAt(t)
  if (!m) return
  const col = '#6E6458'
  const fl2 = flinch(t)
  const bob = m.run ? 0.012 * Math.abs(Math.sin(t * 38)) : 0
  const ry = (m.run ? 0.038 : 0.046 - 0.012 * fl2) * m.out
  const rx = (m.run ? 0.085 : 0.07) * (0.4 + 0.6 * m.out)
  const cx = m.x - m.dir * (1 - m.out) * 0.06
  const cy = fl - ry - bob
  // Washing its face while it sits: its head bobbing.
  const wash = !m.run && fl2 < 0.1 ? 0.012 * Math.sin(t * 11) : 0
  const head: Pt = [cx + m.dir * (rx + 0.02), cy - 0.01 + wash - 0.01 * fl2]
  // Its tail along the boards behind it, curling a little.
  ctx.save()
  ctx.strokeStyle = pen.tone(col)
  ctx.lineWidth = Math.max(0.6, 0.012 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  const tx = cx - m.dir * rx
  ctx.moveTo(tx * k, (fl - 0.025) * k)
  ctx.quadraticCurveTo((tx - m.dir * 0.08) * k, (fl - 0.005) * k, (tx - m.dir * (0.15 + 0.02 * Math.sin(t * 3))) * k, (fl - 0.03 - 0.02 * Math.sin(t * 2.3)) * k)
  ctx.stroke()
  ctx.restore()
  ellipse(pen, [cx, cy], rx, ry, col)
  ellipse(pen, head, 0.045 * m.out, 0.032 * m.out, col)
  ellipse(pen, [head[0] - m.dir * 0.02, head[1] - 0.03], 0.018 * m.out, 0.02 * m.out, '#7A6E62')
  ellipse(pen, [head[0] + m.dir * 0.04, head[1] + 0.004], 0.008, 0.008, '#1A1410')
}

/** Mishkin's smoke, gathered under his ceiling: long soft banks of it drifting along the room, slowly, as layers do. */
export function drawMishSmoke(pen: Pen, t: number, f: Frame): void {
  const ceil = ceilOf(F_MISH)
  if (f.y1 < ceil || f.y0 > ceil + 1.4) return
  const x0 = WALL_L[1] + 0.6
  const span = WALL_R[0] - 0.6 - x0
  for (let i = 0; i < 7; i++) {
    const rx = 0.8 + 0.12 * i
    const v = 0.07 + 0.025 * (i % 3)
    const x = x0 + ((((i * 1.37 + v * t) % span) + span) % span)
    const y = ceil + 0.2 + 0.09 * (i % 3) + 0.05 * Math.sin(t * 0.5 + i * 1.9)
    if (x + rx < f.x0 || x - rx > f.x1) continue
    // Thinning out at either end of the room, where each bank comes round again.
    const ends = Math.min(1, (x - x0) / 1.2, (x0 + span - x) / 1.2)
    shade(pen, [x, y], rx, 0.16 + 0.03 * (i % 2), '#C4BEAC', 0.16 * ends)
  }
}

/* ------------------------------------------------------------------ the ceiling, sifting */

/**
 * The ceiling over Marty's bed is not to be trusted, and says so before it goes: as the El goes by, and on the
 * radiator's hardest knocks, a little plaster sifts down out of the stain, the grains falling to the boards.
 */
const SIFTS: [number, number][] = [
  [ELS[0] + 0.35, 16],
  [KNOCKS[3], 6],
  [KNOCKS[5], 8],
]
const SIFT_FROM: [number, number] = [0.95, 2.25]
const FALL = 12
export function drawSift(pen: Pen, t: number): void {
  const top = ceilOf(F_MARTY) + 0.12
  const span = F_MARTY - 0.05 - top
  const life = Math.sqrt((2 * span) / FALL)
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = pen.tone('#CFC4A2')
  ctx.beginPath()
  for (const [i, [at, n]] of SIFTS.entries()) {
    for (let j = 0; j < n; j++) {
      const go = at + 0.9 * hash(j, i, 71)
      const u = t - go
      if (u < 0 || u > life) continue
      const x = SIFT_FROM[0] + (SIFT_FROM[1] - SIFT_FROM[0]) * hash(j, i, 72) + 0.04 * Math.sin(u * 7 + j)
      const y = top + 0.5 * FALL * u * u
      const r = (0.012 + 0.012 * hash(j, i, 73)) * k
      ctx.moveTo(x * k + r, y * k)
      ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
  ctx.restore()
}
