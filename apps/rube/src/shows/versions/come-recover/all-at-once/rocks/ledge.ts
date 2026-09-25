import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { box, frame, hash, part, type PartShot } from '../kit'
import { fall } from '../music'
import { G } from '../physics'
import { EVELYN, JOY, ROCKS } from '../worlds'
import { buildLand, INK, paintCloud, paintRing, paintSky, paintSlices, paintWall, type Land } from './ledgeLand'
import { PEBBLE_LANDS, pebbleAt, pebbleWays, type Pebble, type PebbleWay } from './ledgePebbles'
import {
  BEGIN,
  E_BALK,
  E_GO,
  E_LEAN,
  END,
  LEAN,
  LIP,
  MEET,
  ON,
  OVER,
  PEBBLE_AT,
  plan,
  RECOVER,
  ROCK_AT,
  segsOf,
  TOP,
  wayAt,
  type Plan,
} from './ledgePath'

/**
 * The rocks: the universe where life never formed.
 *
 * The drop out of the fight is into silence. Two rocks sit side by side on the rim of a canyon: Evelyn, her
 * vermilion gone to stone but for a hint of it (and her googly eye), and Joy beside her, nearer the edge, her violet
 * gone to stone too. Nothing moves but the wind. Three pebbles go off the lip, one on each of the first notes, the
 * last a bigger one, and the camera draws back to watch it fall, tick on the talus, and run on down the wall. High
 * cloud drifts on the wind; then the camera comes back in, slowly, all through what Joy does next.
 *
 * Joy rocks (207.56), rocks again (208.36), rolls out to the brink and stays there, leaning over it (209.96), and on
 * the strongest note in the quiet (213.96) she goes over. The camera stays on the rim with Evelyn, alone. She rolls
 * out to where Joy was (214.76), flinches back from the edge (216.36) and stays back, then rolls forward, slowly,
 * and does not stop: over the corner as Joy went, dropping on 219.56. Each of those is on a note, and each note is
 * also one of Joy's landings far below, out of sight: Evelyn's way down is Joy's own, fourteen beats later.
 *
 * The long way down: the camera draws back and back as she comes down the wall, ledge by ledge, until the two of
 * them are small against the canyon. Joy is waiting on a bench halfway down. Evelyn comes to rest against her
 * (226.56), and as they touch their colour starts to come back. Joy goes on (227.76), and Evelyn goes with her, a
 * beat behind, landing where Joy landed, down the gorge on the soft beats of the swell, the long scree, and the last
 * steps to the floor. At the bottom is a dark ring lying in the sand: the bagel. Joy drops into it on 241.35, and
 * Evelyn after her on 241.755, the jump.
 */

/* ------------------------------------------------------------------ colours */

/** Gone to stone: their own colours, but only a hint left. */
export const EVELYN_STONE = mixHex(EVELYN, ROCKS.stoneDeep, 0.68)
export const JOY_STONE = mixHex(JOY, ROCKS.stoneDeep, 0.66)
const GRIT = mixHex(ROCKS.stoneDeep, ROCKS.canyonShade, 0.4)
const DUST = mixHex(ROCKS.sand, ROCKS.far, 0.5)

const recovered = (t: number): number => Math.max(0, Math.min(1, (t - RECOVER[0]) / (RECOVER[1] - RECOVER[0])))

/* ------------------------------------------------------------------ the pebbles */

function paintPebble(p: p5, k: number, pb: Pebble, at: { x: number; y: number; a: number }, weight: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(at.x * k, at.y * k)
  ctx.rotate(at.a)
  ctx.beginPath()
  const n = 6
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i, pb.seed) * 0.5
    const r = pb.r * (0.72 + 0.45 * hash(i, pb.seed, 7))
    const x = Math.cos(a) * r * 1.15
    const y = Math.sin(a) * r * 0.85
    if (i === 0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  ctx.closePath()
  ctx.fillStyle = pb.big ? mixHex(ROCKS.stone, ROCKS.stoneDeep, 0.5) : ROCKS.stoneDeep
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = weight * 0.55
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ dust */

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** A puff of sand where a rock comes down: a few low, soft wisps that spread along the ground, lift, drift off on the wind, and thin away. */
function paintPuff(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, since: number, size: number, seed: number): void {
  const life = 1.0 + size * 0.8
  if (since < 0 || since > life) return
  const u = since / life
  const fade = (1 - u) * (1 - u)
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1
    const far = i % 2 === 0 ? 1 : 0.55
    const spread = (1 - Math.exp(-since / 0.16)) * (0.16 + 0.14 * far) * (0.5 + size)
    const px = x + side * spread + since * 0.2
    const py = y + R - 0.02 - (1 - Math.exp(-since / 0.45)) * (0.05 + 0.07 * hash(i, seed, 2)) * (0.5 + size)
    const rx = (0.06 + 0.1 * (1 - Math.exp(-since / 0.3))) * (0.5 + size) * (0.8 + 0.4 * hash(i, seed, 3))
    ctx.fillStyle = rgba(DUST, 0.42 * fade * (0.7 + 0.3 * hash(i, seed, 4)))
    ctx.beginPath()
    ctx.ellipse(px * k, py * k, rx * k, rx * 0.42 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Grit that goes over the lip with a rock: a few crumbs of the edge, falling after it. */
function paintGrit(ctx: CanvasRenderingContext2D, k: number, at: number, t: number, seed: number): void {
  const s = t - at
  if (s < -0.1 || s > 1.4) return
  ctx.fillStyle = GRIT
  for (let i = 0; i < 6; i++) {
    const d = Math.max(0, s + 0.1 - 0.05 * i)
    const vx = 0.12 + 0.35 * hash(i, seed)
    const x = LIP - 0.02 + vx * d
    const y = TOP + 0.01 + 0.5 * G * d * d
    const r = 0.008 + 0.012 * hash(i, seed, 2)
    ctx.beginPath()
    ctx.rect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ the part */

interface State {
  plan: Plan
  land: Land
  pebbles: PebbleWay[]
}

let cached: State | null = null
const worked = (): State => {
  if (!cached) {
    const pl = plan()
    cached = { plan: pl, land: buildLand(pl), pebbles: pebbleWays(pl) }
  }
  return cached
}

/** Every strike, show seconds: the pebbles going over, Joy's rocking and lean and going, Evelyn's, and every landing of both that is in sight. */
const strikes = (): number[] => {
  const { plan: pl } = worked()
  const out = [...PEBBLE_AT, ...PEBBLE_LANDS, ...ROCK_AT, LEAN, OVER, E_LEAN, E_BALK, E_GO, MEET, ON, ...pl.landings.map((l) => l.t)]
  return [...new Set(out.map((t) => Math.round(t * 1e4) / 1e4))].sort((a, b) => a - b)
}

export const ledge = part<State>(
  {
    name: 'rocks',
    draw: (p, s, c) => {
      const { k, t, weight } = c
      const show = t + BEGIN
      const f = frame(p, k)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      paintSky(p, k, f)
      paintCloud(p, k, f, show)
      paintSlices(p, k, f, s.land)
      paintWall(p, k, f, s.land, weight)
      paintRing(p, k, f, s.land, weight * 0.9, false, show)
      for (const w of s.pebbles) {
        const at = pebbleAt(w, show)
        if (at && at.x > f.x0 - 1 && at.x < f.x1 + 1 && at.y > f.y0 - 1 && at.y < f.y1 + 1) paintPebble(p, k, w.pb, at, weight)
        // The big one's two ticks, far below: a pinch of dust each.
        if (w.pb.big) for (const l of w.lands.slice(0, 2)) paintPuff(ctx, k, l.x, l.y - R + w.pb.r * 0.8, show - l.t, 0.15, 77 + Math.round(l.t))
      }
      paintGrit(ctx, k, OVER, show, 11)
      paintGrit(ctx, k, E_GO, show, 12)
      for (const l of s.plan.landings) {
        // Nothing to raise from the ring's crust.
        if (Math.abs(l.p[0] - s.land.ring.x) < 1.4 && l.p[1] > s.land.ring.y - 0.5) continue
        const since = show - l.t
        if (since < 0 || since > 2.5) continue
        if (l.p[0] < f.x0 - 2 || l.p[0] > f.x1 + 2 || l.p[1] < f.y0 - 2 || l.p[1] > f.y1 + 2) continue
        paintPuff(ctx, k, l.p[0], l.p[1], since, Math.min(1.2, l.hard / 9), Math.round(l.t * 10))
      }
    },
    over: (p, s, c) => {
      paintRing(p, c.k, frame(p, c.k), s.land, c.weight * 0.9, true, c.t + BEGIN, c.weight)
    },
  },
  (slot) => {
    const { plan: pl, land, pebbles } = worked()
    const segs = segsOf(pl.evelyn).map((q) => ({ ...q, from: q.from, to: q.to }))
    const lane = { segs, fire: OVER - slot.begin }
    const end = wayAt(pl.evelyn, END)
    const joy = pl.joy
    return {
      cells: box(-9, -7, 72, 40, 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane,
      state: { plan: pl, land, pebbles },
      // She goes to stone as the world comes up, and her colour comes back on the way down, from when she reaches Joy.
      changes: [
        { at: 0, color: EVELYN_STONE, over: 1.4 },
        { at: RECOVER[0] - slot.begin, color: EVELYN, over: RECOVER[1] - RECOVER[0] },
      ],
      company: [
        {
          who: 'joy',
          from: BEGIN,
          to: END,
          at: (T: number) => {
            const [x, y] = wayAt(joy, T)
            return { x, y, color: mixHex(JOY_STONE, JOY, recovered(T)) }
          },
        },
      ],
    }
  },
  (): PartShot[] => [
    // Close on the two of them, still, and closer, the canyon open beyond the lip.
    { t: BEGIN + 0.9, cells: 3.0, hold: [0.2, -0.3], w: 0.9 },
    { t: PEBBLE_AT[2] - 0.5, cells: 2.45, hold: [0.3, -0.2] },
    // The last pebble: the camera draws back to watch it go down, and down.
    { t: fall(12.5), cells: 11, hold: [3.3, 3.05] },
    { t: fall(14.5), cells: 10.6, hold: [3.15, 2.95] },
    // Then in, slowly, all through Joy's rocking and her lean out over the edge, and closer while she waits there.
    { t: ROCK_AT[0], cells: 5.6, hold: [1.0, 0.75] },
    { t: LEAN, cells: 3.9, hold: [0.38, 0.05] },
    { t: OVER - 0.15, cells: 2.8, hold: [0.2, -0.16] },
    // She is gone; Evelyn on the rim, alone.
    { t: E_LEAN, cells: 2.8, hold: [0.14, -0.14] },
    { t: E_BALK, cells: 2.8, hold: [0.12, -0.15] },
    { t: E_GO - 0.6, cells: 2.65, hold: [0.2, -0.1] },
    // The long way down: after her, drawing back, the canyon opening on the right.
    { t: fall(50.5), cells: 5.6, hold: [1.9, 3.3], w: 0.5 },
    { t: fall(55), cells: 8.2, hold: [5.4, 6.4], w: 0.55 },
    { t: fall(60), cells: 10.5, hold: [9.6, 10.4], w: 0.7 },
    // Down to the bench, to Joy.
    { t: fall(66), cells: 9.2, hold: [12.2, 13.6], w: 0.9 },
    // A still moment with the two of them together.
    { t: fall(68.5), cells: 9.0, hold: [12.3, 13.6], w: 0.9 },
    // And on down the gorge together, back and back until they are small against it.
    { t: fall(73), cells: 16, hold: [16.5, 18], w: 0.85 },
    { t: fall(82), cells: 22.5, hold: [22, 23.5], w: 0.88 },
    { t: fall(90), cells: 23.5, hold: [24.5, 26], w: 0.9 },
    // In on the ring as they come down to it.
    { t: fall(98), cells: 12.5, hold: [29, 30.8], w: 0.75 },
    { t: END, cells: 7, hold: [31.2, 33.4], w: 0.6 },
  ],
)

export const ROCKS_HITS: number[] = strikes()
