import type p5 from 'p5'
import { ballAt, laneAt, mixHex, R, type BallChange, type Lane, type Pt } from '../../../../../parts'
import { box, frame, hash, part, type PartShot } from '../kit'
import { fall } from '../music'
import { SUB_AT, subtitleLight } from '../credits'
import { G } from '../physics'
import { EVELYN, JOY, ROCKS } from '../worlds'
import { buildLand, INK, paintCloud, paintRing, paintSky, paintSlices, paintWall, type Land } from './ledgeLand'
import { PEBBLE_LANDS, pebbleAt, pebbleWays, type Pebble, type PebbleWay } from './ledgePebbles'
import { EVELYN_ROCK, JOY_ROCK, paintStone, type Flush } from './ledgeStones'
import {
  BEGIN,
  E_BALK,
  E_GO,
  E_LEAN,
  END,
  EVELYN_SEAT,
  JOY_SEAT,
  joyTilt,
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
 * The long way down: the camera goes over after her and stays close as she comes down the wall, ledge by ledge.
 * Joy is waiting on a bench halfway down. Evelyn comes to rest against her (226.56), close, and where they touch
 * their colour comes back first, spreading over each stone from there. Joy goes on (227.76), and Evelyn goes with
 * her, a beat behind, landing where Joy landed, down the gorge on the soft beats of the swell; on the long scree the
 * camera draws back once to show how far down they are, and comes in again for the last steps to the floor. At the bottom is a dark ring lying in the sand: the bagel. Joy drops into it on 241.35, and
 * Evelyn after her on 241.755, the jump.
 */

/* ------------------------------------------------------------------ colours */

/** Gone to stone: their own colours, but only a hint left. */
export const EVELYN_STONE = mixHex(EVELYN, ROCKS.stoneDeep, 0.68)
export const JOY_STONE = mixHex(JOY, ROCKS.stoneDeep, 0.66)
const GRIT = mixHex(ROCKS.stoneDeep, ROCKS.canyonShade, 0.4)
const DUST = mixHex(ROCKS.sand, ROCKS.far, 0.5)

const recovered = (t: number): number => Math.max(0, Math.min(1, (t - RECOVER[0]) / (RECOVER[1] - RECOVER[0])))

/**
 * Where they touch, their colour comes back first. From the meeting, a round of each one's own colour spreads out
 * from the side that touched (fixed on the stone, so it rolls on with it), over the rest of the stone, ahead of the
 * slow return of the whole.
 */
function flushOf(side: 1 | -1, turnAtMeet: number, color: string, t: number): Flush | undefined {
  const s = t - MEET
  if (s <= 0) return undefined
  const u = 1 - Math.exp(-s / 0.6)
  const c = Math.cos(-turnAtMeet)
  const n = Math.sin(-turnAtMeet)
  // The touching side, in the stone's own frame: out to its edge and a little in.
  const at: Pt = [side * 0.95 * c, side * 0.95 * n]
  return { at, r: 0.5 + 2.6 * u, color, alpha: Math.min(1, s / 0.2) * (1 - recovered(t)) }
}

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
  /** Evelyn's lane and what it does to her colour, once built: her stone is drawn on the ball's own path. */
  lane?: Lane
  changes?: BallChange[]
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
      const { k, weight } = c
      const show = c.t + BEGIN
      const f = frame(p, k)
      const seen = (x: number, y: number) => x > f.x0 - 0.5 && x < f.x1 + 0.5 && y > f.y0 - 0.5 && y < f.y1 + 0.5
      // The two of them as stones, over their balls: Joy, then Evelyn (whose eye goes on after all of this).
      const [jx, jy] = wayAt(s.plan.joy, show)
      const [mjx] = wayAt(s.plan.joy, MEET)
      const [mex] = wayAt(s.plan.evelyn, MEET)
      if (show < END + 1e-6 && seen(jx, jy)) {
        const flush = flushOf(-1, (mjx - JOY_SEAT) / R, JOY, show)
        paintStone(p, k, weight, JOY_ROCK, jx, jy, joyTilt(show) || (jx - JOY_SEAT) / R, mixHex(JOY_STONE, JOY, recovered(show)), s.plan.ledges, flush)
      }
      if (s.lane && s.changes && c.t >= 0) {
        const at = laneAt(s.lane, c.t)
        const color = ballAt({ color: c.color, ghost: false, id: 0 }, s.changes, c.t).color
        const flush = flushOf(1, (mex - EVELYN_SEAT) / R, EVELYN, show)
        if (!at.hidden && seen(at.x, at.y)) paintStone(p, k, weight, EVELYN_ROCK, at.x, at.y, (at.x - EVELYN_SEAT) / R, color, s.plan.ledges, flush)
      }
      // The ring's near half over them, so what falls in goes down behind its lip.
      paintRing(p, k, f, s.land, weight * 0.9, true, show, weight)
      // A soft dark low in the frame while a subtitle is up (`SUBTITLES` in `credits.ts`), so its cream reads on the
      // pale stone and sky.
      const sub = subtitleLight(show)
      if (sub > 0.001) {
        const ctx = p.drawingContext as CanvasRenderingContext2D
        const w = f.x1 - f.x0
        const h = f.y1 - f.y0
        // The 16:9 box the words are set in, inside a frame that may be wider or taller.
        const bh = Math.min(h, (w * 9) / 16)
        const cy = (f.y0 + (h - bh) / 2 + bh * (SUB_AT[1] + 0.022)) * k
        const cx = (f.x0 + w * SUB_AT[0]) * k
        const rx = Math.min(w, (bh * 16) / 9) * 0.34 * k
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, 0.16)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
        g.addColorStop(0, `rgba(40, 32, 24, ${0.5 * sub})`)
        g.addColorStop(0.6, `rgba(40, 32, 24, ${0.3 * sub})`)
        g.addColorStop(1, 'rgba(40, 32, 24, 0)')
        ctx.fillStyle = g
        ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
        ctx.restore()
      }
    },
  },
  (slot) => {
    const { plan: pl, land, pebbles } = worked()
    const segs = segsOf(pl.evelyn).map((q) => ({ ...q, from: q.from, to: q.to }))
    const lane = { segs, fire: OVER - slot.begin }
    const end = wayAt(pl.evelyn, END)
    const joy = pl.joy
    const changes: BallChange[] = [
      { at: 0, color: EVELYN_STONE, over: 1.4 },
      { at: RECOVER[0] - slot.begin, color: EVELYN, over: RECOVER[1] - RECOVER[0] },
    ]
    return {
      cells: box(-9, -7, 72, 40, 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane,
      state: { plan: pl, land, pebbles, lane, changes },
      // She goes to stone as the world comes up, and her colour comes back on the way down, from when she reaches Joy.
      changes,
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
    // The last pebble: the camera draws back a little and down the face to see it go, the two of them still on the
    // lip at the top of the frame. A wider shot loses them both and the pebble to specks.
    { t: fall(12.5), cells: 5.2, hold: [1.15, 0.85] },
    { t: fall(14.5), cells: 5.0, hold: [1.05, 0.75] },
    // Then in, slowly, all through Joy's rocking and her lean out over the edge, and closer while she waits there.
    { t: ROCK_AT[0], cells: 4.6, hold: [0.75, 0.5] },
    { t: LEAN, cells: 3.6, hold: [0.34, 0.0] },
    { t: OVER - 0.15, cells: 2.8, hold: [0.2, -0.16] },
    // She is gone; Evelyn on the rim, alone.
    { t: E_LEAN, cells: 2.8, hold: [0.14, -0.14] },
    { t: E_BALK, cells: 2.8, hold: [0.12, -0.15] },
    { t: E_GO - 0.6, cells: 2.65, hold: [0.2, -0.1] },
    // The long way down, with her: the camera goes over the brink after her and stays close, ledge by ledge, the
    // wall's strata going up past, a little room left below her for where she is going.
    { t: fall(49.6), cells: 3.3, hold: [0.7, 1.4], w: 0.45, off: [0.2, 0.5] },
    { t: fall(52), cells: 3.6, off: [0.3, 0.3] },
    { t: fall(58), cells: 3.8, off: [0.45, 0.25] },
    // The long drop to the bench, and Joy waiting on it, coming up into the frame below her.
    { t: fall(62), cells: 4.8, off: [0.45, 0.15] },
    { t: fall(63.4), cells: 5.6, hold: [10.2, 13.6], w: 0.55 },
    // She comes to rest against her: in close on the two of them, touching, as their colour starts to come back.
    { t: fall(64.6), cells: 2.9, hold: [10.62, 15.12], w: 0.75 },
    { t: MEET, cells: 2.25, hold: [10.66, 15.1] },
    { t: ON, cells: 2.05, hold: [10.7, 15.1] },
    // Joy goes on, and the camera goes down the gorge with the two of them, Joy a bound ahead.
    { t: fall(71.2), cells: 3.0, hold: [11.4, 15.3], w: 0.55, off: [0.5, 0.5] },
    { t: fall(74.5), cells: 4.3, off: [0.55, 0.55] },
    { t: fall(80.5), cells: 4.6, off: [0.6, 0.45] },
    // On the long talus, a breath: back, until the canyon is most of the frame and they are small in it, but still
    // the two of them, side by side on the scree.
    { t: fall(86.5), cells: 8.2, hold: [21.2, 24.2], w: 0.8 },
    { t: fall(90.5), cells: 8.8, hold: [22.6, 25.0], w: 0.85 },
    // Then in again for the last bounds, and down to the ring with them.
    { t: fall(95), cells: 5.0, hold: [26.4, 29.3], w: 0.25, off: [0.5, 0.35] },
    { t: fall(99.5), cells: 4.8, hold: [29.2, 32.2], w: 0.4, off: [0.3, 0.2] },
    { t: END, cells: 4.4, hold: [31.25, 33.75], w: 0.8 },
  ],
)

export const ROCKS_HITS: number[] = strikes()
