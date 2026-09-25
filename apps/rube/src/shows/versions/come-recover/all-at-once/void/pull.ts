import type p5 from 'p5'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { R, type Pt } from '../../../../../parts'
import { box, carried, frame, hash, part, type Company, type PartShot } from '../kit'
import { fight, JUMPS } from '../music'
import { G_LOW } from '../physics'
import { SEAMS } from '../seams'
import { VOID } from '../worlds'
import { BAGEL, BRINK, bagelPose, drawThing, edgeAt, inward, JOY_LIGHT, REVEAL, SWALLOWED, TIP_IN, type BagelPose } from './bagel'

/**
 * PULL: Jobu and the everything bagel (127.79 to 165.62).
 *
 * The hush. Evelyn drifts in out of the surf's last world into the dark, slowing, alone. On 133.79 a light finds
 * Joy, sitting still on something black and curved, and Evelyn turns and drifts toward her daughter. On 135.64 the
 * whole of it is lit, and the camera stands back and back: a colossal everything bagel, crusted with seeds and with
 * small things from every world, its hole a well, and Joy tiny on its crown. On 138.32 the first thing floating in
 * the dark (a receipt) is taken down the hole; Evelyn stalls, and the pull takes her the other way.
 *
 * From 142 the fight's pulse, and the pull. Things from every world come in out of the dark on slow spirals and go
 * over the lip one on a beat, the small ones on the soft beats and the big ones on the loud. Evelyn is drawn in too,
 * round and round the hole, pulled closer on every bar and quicker as she closes, a quarter turn a beat at the end.
 * Joy watches from the crown. The break after beat 56: Evelyn is on the brink, over the hole, still. On 165.62 she
 * tips in, and falls.
 */

/** The entry cell of this leg in the dark's own cells (the bagel's centre is at `BAGEL.at`). */
export const PULL_AT: Pt = [-8, -6]
/** From the bagel's own frame (its centre at 0, 0) to this part's (the entry cell's centre at 0, 0). */
const OFF: Pt = [BAGEL.at[0] - PULL_AT[0], BAGEL.at[1] - PULL_AT[1]]
const toPart = ([x, y]: Pt): Pt => [x + OFF[0], y + OFF[1]]

const T0 = JUMPS.void
const T1 = JUMPS.mosaic

/* ------------------------------------------------------------------ Joy on the crown */

/** Where Joy sits: on the bagel's crown, riding its lumps as it turns under her. */
const joyAt = (t: number): Pt => {
  const pose = bagelPose(t)
  return [pose.dx, pose.dy - edgeAt(pose, -Math.PI / 2) - R]
}

/* ------------------------------------------------------------------ Evelyn's way in */

/** Where she comes in, in the bagel's frame: the ball at (-0.5, 0) of the entry cell. */
const E: Pt = [PULL_AT[0] - 0.5 - BAGEL.at[0], PULL_AT[1] - BAGEL.at[1]]
/** The drift: the surf's velocity at the jump, dying away in the dark. */
const V0 = SEAMS.void.v
const TAU_DRIFT = 4.5
const drift = (t: number): Pt => {
  const s = Math.max(0, t - T0)
  const f = TAU_DRIFT * (1 - Math.exp(-s / TAU_DRIFT))
  return [E[0] + V0[0] * f, E[1] + V0[1] * f]
}

/** The pull takes her: from the drift into the orbit over these seconds. */
const TAKE0 = 137.3
const TAKE1 = 141.6
/** On the brink: at the top of the hole, her foot on its lip. */
const R_BRINK = BAGEL.hole + R
/** A beat of the fight's pulse. */
const BEAT = fight(1) - fight(0)
/** Where the fast orbit ends and the lip brakes her, to the top on beat 56. */
const BRAKE = BRINK - 3 * BEAT
/** Her speed round at the end: a quarter turn a beat. */
const W_END = Math.PI / 2 / BEAT
/**
 * What she still has as she comes to the top on beat 56 (radians a second): she goes a little past it, rocks back
 * and settles there, heavy, on the brink.
 */
const W_LIP = 0.5
const ROCK = 2 * Math.PI / 0.62
const ROCK_DECAY = 0.17
/** How far past the top she is, `s` seconds after beat 56 (the angle's way: counterclockwise is negative). */
const rock = (s: number): number => (s <= 0 ? 0 : -(W_LIP / ROCK) * Math.exp(-s / ROCK_DECAY) * Math.sin(ROCK * s))

const beatOf = (t: number): number => (t - fight(0)) / BEAT
const ss = (x: number, a: number, b: number): number => {
  const u = clamp((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}

const TAKE_AT = drift(TAKE0)
const R_TAKE = Math.hypot(TAKE_AT[0], TAKE_AT[1])
const PHI_TAKE = Math.atan2(TAKE_AT[1], TAKE_AT[0])

/** How close she is to the middle: pulled in a step on every bar of the pulse, on its downbeat. */
function radius(t: number): number {
  let g = 1 - 0.05 * ss(t, TAKE0, fight(0))
  const b = beatOf(t)
  for (let j = 0; j < 14; j++) g -= (0.95 / 14) * ss(b, 4 * j, 4 * j + 2.2)
  return R_BRINK + (R_TAKE - R_BRINK) * Math.max(0, g)
}

/**
 * Her speed round (radians a second, the pull's way): nothing as she is taken, quickening to a quarter turn a beat
 * by beat 53, then braked by the lip to rest. The curve's power is solved so she comes to rest exactly at the top.
 */
const OMEGA = (() => {
  // Laps: from where she is taken, counterclockwise (the angle going down) to the top, and five times round.
  const target = PHI_TAKE - (-Math.PI / 2 - 5 * 2 * Math.PI)
  const brake = ((W_END - W_LIP) * (BRINK - BRAKE)) / 3 + W_LIP * (BRINK - BRAKE)
  const main = target - brake
  const q = (W_END * (BRAKE - TAKE0)) / main - 1
  return (t: number): number => {
    if (t <= TAKE0) return 0
    if (t <= BRAKE) return W_END * Math.pow((t - TAKE0) / (BRAKE - TAKE0), q)
    if (t <= BRINK) return W_LIP + (W_END - W_LIP) * (1 - (t - BRAKE) / (BRINK - BRAKE)) ** 2
    return 0
  }
})()
const ANGLE_STEP = 0.005
const SWEPT: Float64Array = (() => {
  const n = Math.ceil((BRINK - TAKE0) / ANGLE_STEP) + 2
  const out = new Float64Array(n)
  for (let i = 1; i < n; i++) {
    const a = TAKE0 + (i - 1) * ANGLE_STEP
    // Simpson on each step: the swept angle exact enough to land on the top.
    out[i] = out[i - 1] + (ANGLE_STEP / 6) * (OMEGA(a) + 4 * OMEGA(a + ANGLE_STEP / 2) + OMEGA(a + ANGLE_STEP))
  }
  return out
})()
const swept = (t: number): number => {
  const i = clamp((t - TAKE0) / ANGLE_STEP, 0, SWEPT.length - 1.001)
  const j = Math.floor(i)
  return SWEPT[j] + (SWEPT[j + 1] - SWEPT[j]) * (i - j)
}
/** Whatever the sum says, she ends at the top exactly: the small miss is spread over the whole orbit. */
const MISS = PHI_TAKE - swept(BRINK) - (-Math.PI / 2 - 10 * Math.PI)
const orbitAngle = (t: number): number => PHI_TAKE - swept(t) + MISS * ss(t, TAKE0, BRINK)

const orbit = (t: number): Pt => {
  const r = radius(t)
  const a = orbitAngle(t)
  return [r * Math.cos(a), r * Math.sin(a)]
}

/** Tipped in: from rest on the brink she falls straight down, under the dark's low pull, to the seam's speed. */
const TIP = T1 - SEAMS.mosaic.v[1] / G_LOW

/** Evelyn at show time `t`, in the bagel's frame. */
/**
 * When the light finds Joy, Evelyn turns in the dark and drifts toward her daughter, a little way, before the pull
 * takes her round the other way.
 */
const REACH = 0.7
const TOWARD = (() => {
  const from = drift(JOY_LIGHT)
  const to = joyAt(JOY_LIGHT)
  const d = Math.hypot(to[0] - from[0], to[1] - from[1])
  return [(to[0] - from[0]) / d, (to[1] - from[1]) / d] as Pt
})()
const towardJoy = (t: number): Pt => {
  const f = REACH * ss(t, JOY_LIGHT + 0.15, TAKE1)
  return [TOWARD[0] * f, TOWARD[1] * f]
}

export function evelyn(t: number): Pt {
  if (t >= BRINK) {
    const a = -Math.PI / 2 + rock(t - BRINK)
    const s = Math.max(0, t - TIP)
    return [R_BRINK * Math.cos(a), R_BRINK * Math.sin(a) + 0.5 * G_LOW * s * s]
  }
  const [dx, dy] = drift(t)
  const [rx, ry] = towardJoy(t)
  const d: Pt = [dx + rx, dy + ry]
  if (t <= TAKE0) return d
  const w = ss(t, TAKE0, TAKE1)
  const o = orbit(t)
  return [d[0] + (o[0] - d[0]) * w, d[1] + (o[1] - d[1]) * w]
}

/* ------------------------------------------------------------------ the part */

/** Every strike this part makes, in show seconds: the light on Joy, the reveal, each thing over the lip, the brink. */
export const PULL_HITS: number[] = [JOY_LIGHT, REVEAL, ...SWALLOWED.map((s) => s.at), BRINK]

interface PullState {
  begin: number
}

/** How far the light round the bagel reaches: things further out are in the dark. */
const reach = (r: number): number => 1 - ss(r, 9.5, 12.5)

export const pull = part<PullState>(
  {
    name: 'pull',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      if (t < T0 - 0.5 || t > T1 + 1) return
      const { k, ink, weight } = c
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const pose = bagelPose(t)
      drawDust(p, k, t, pose)
      // Joy's light: a narrow beam from far above onto the crown, struck on 133.79.
      if (pose.pool > 0.001) {
        const [jx, jy] = toPart(joyAt(t))
        const top = jy - 11
        const g = ctx.createLinearGradient(0, top * k, 0, (jy + 0.4) * k)
        g.addColorStop(0, rgba(VOID.rimLight, 0))
        g.addColorStop(1, rgba(VOID.rimLight, 0.13 * pose.pool))
        ctx.beginPath()
        ctx.moveTo((jx - 0.25) * k, top * k)
        ctx.lineTo((jx + 0.25) * k, top * k)
        ctx.lineTo((jx + 0.9) * k, (jy + 0.3) * k)
        ctx.lineTo((jx - 0.9) * k, (jy + 0.3) * k)
        ctx.closePath()
        ctx.fillStyle = g
        ctx.fill()
      }
      // The things from every world: floating in the dark round it, then taken, each on its beat.
      const lit = pose.lit
      SWALLOWED.forEach((w, i) => {
        const u = w.at - t
        if (u < -0.45) return
        const [bx, by] = inward(i, Math.min(u, w.dur))
        // Before its spiral it floats where it is, turning lazily.
        const idle = Math.max(0, u - w.dur)
        const bob = 0.08 * Math.sin(0.7 * idle + i)
        const r = Math.hypot(bx, by)
        const sink = u < 0 ? clamp(-u / 0.45) : 0
        const size = w.size * (1 - easeOutCubic(sink))
        const light = lit * reach(r)
        if (light < 0.02 || size < 0.01) return
        const spin = hash(i, 21) * 6.28 + (0.25 + 0.3 * hash(i, 22)) * (t - T0) + 2.2 * Math.max(0, 1 - Math.max(0, u) / 2.5) ** 2
        const [x, y] = toPart([bx, by + bob])
        const dark = 1 - light * (1 - 0.8 * sink) * 0.92
        // Over the bagel's face it throws a shadow down onto it: it is in front, floating, not crusted in.
        if (r < BAGEL.r + 0.6 && r > BAGEL.hole - 0.2) {
          castShadow(p, k, pose, 0.05, 0.16, 0.75 * light * (1 - sink), () =>
            drawThing(p, k, ink, weight, w.thing, x, y, size, spin, dark, w.variant),
          )
        }
        drawThing(p, k, ink, weight, w.thing, x, y, size, spin, dark, w.variant)
      })
    },
  },
  (slot) => {
    const D = slot.end - slot.begin
    const at = (u: number): Pt => toPart(evelyn(slot.begin + u))
    const segs = carried(at, 0, D, Math.ceil(D * 60))
    const end = segs[segs.length - 1].to
    const company: Company[] = [
      {
        who: 'joy',
        from: slot.begin,
        to: slot.end,
        // In the dark she is not seen; the light on 133.79 finds her where she has been sitting all along.
        at: (t) => {
          const [x, y] = toPart(joyAt(t))
          return { x, y, scale: t < JOY_LIGHT ? 0 : 1 }
        },
      },
    ]
    return {
      cells: box(-6, -4, 22, 16, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: JOY_LIGHT - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot) => {
    const H = (x: number, y: number): Pt => toPart([x, y])
    const shots: PartShot[] = [
      // Out of the surf's last framing, with her as she drifts in, alone in the dark.
      { t: slot.begin + 0.6, cells: 5.2, w: 0, off: [0.15, 0.1] },
      { t: 131.2, cells: 5.8, w: 0, off: [0.6, -0.4] },
      // Room for something up and to the right of her, in the dark.
      { t: 133.4, cells: 6.6, hold: H(-3.1, -4.9), w: 0.85 },
      { t: REVEAL, cells: 6.2, hold: H(-2.9, -5.0), w: 0.85 },
      // The reveal: back and back until the whole of it is in the frame, Joy tiny on its crown.
      { t: REVEAL + 4.8, cells: 16.5, hold: H(0, -0.6), w: 0.92 },
      { t: 142.4, cells: 16, hold: H(0, -0.6), w: 0.9 },
      // The pull: in with her as she is drawn round, the hole always in the frame.
      { t: 145.6, cells: 12, hold: H(0, -0.5), w: 0.5 },
      { t: 150.4, cells: 10.4, hold: H(0, -0.4), w: 0.5 },
      { t: 157, cells: 9.4, hold: H(0, -0.3), w: 0.62 },
      // The last, fastest laps: the hole held in the middle of the frame, all of her circle in it.
      { t: 161.5, cells: 8.4, hold: H(0, 0), w: 0.9 },
      { t: BRAKE, cells: 8.0, hold: H(0, -0.2), w: 0.9 },
      // The break: the two of them, one over the other: Evelyn on the brink with the hole under her, Joy on the
      // crown above, watching. Then down with Evelyn as she tips.
      { t: BRINK, cells: 7.9, hold: H(0, -4.0), w: 0.95 },
      { t: TIP_IN - 0.6, cells: 7.4, hold: H(0, -3.85), w: 0.97 },
      { t: slot.end, cells: SEAMS.mosaic.cells, hold: H(0, -1.75), w: 0.85 },
    ]
    return shots
  },
)

/** The dark's paper. */
const DARK = '#0A090C'

/* ------------------------------------------------------------------ the dust of everything, in the hush */

/**
 * Seeds and crumbs adrift in the dark at three depths, so the hush has depth and slow motion before anything is lit:
 * the far ones slide by slowly as the camera follows her, the near ones quickly, all sinking very slowly toward the
 * bagel. Each depth is one pattern repeated every `tile` cells and moving as a whole, so nothing pops as it drifts.
 * The two far depths are behind the bagel (kept off its disc); the near one is in front.
 */
interface DustLayer {
  depth: number
  tile: number
  n: number
  size: number
  a: number
  seed: number
  behind: boolean
}
const DUST: DustLayer[] = [
  { depth: 0.32, tile: 12, n: 64, size: 0.05, a: 0.2, seed: 1, behind: true },
  { depth: 0.66, tile: 12, n: 34, size: 0.09, a: 0.26, seed: 2, behind: true },
  { depth: 1.4, tile: 14, n: 11, size: 0.2, a: 0.19, seed: 3, behind: false },
]
/** Where the dark sinks to: toward the bagel, down and to the right of where she comes in. */
const SINK: Pt = [0.8, 0.6]
/** How much of it shows: from the jump, gone as the great light takes over. */
const dustAt = (t: number): number => ss(t, T0 - 0.4, T0 + 1.4) * (1 - ss(t, REVEAL + 1.2, REVEAL + 4.5))

function drawDust(p: p5, k: number, t: number, pose: BagelPose): void {
  const fade = dustAt(t)
  if (fade < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const [bx, by] = toPart([pose.dx, pose.dy])
  const rim = BAGEL.r * pose.scale * 1.02
  const T = t - T0
  for (const L of DUST) {
    const sx = f.cx * (1 - L.depth)
    const sy = f.cy * (1 - L.depth)
    const x0 = f.x0 - sx - 0.3
    const x1 = f.x1 - sx + 0.3
    const y0 = f.y0 - sy - 0.3
    const y1 = f.y1 - sy + 0.3
    const seeds = new Path2D()
    const glints = new Path2D()
    for (let j = 0; j < L.n; j++) {
      const h1 = hash(j, L.seed, 41)
      const h2 = hash(j, L.seed, 43)
      const h3 = hash(j, L.seed, 47)
      const v = (0.05 + 0.03 * h3) * L.depth
      const vx = SINK[0] * v + 0.02 * (hash(j, L.seed, 53) - 0.5)
      const vy = SINK[1] * v + 0.02 * (hash(j, L.seed, 59) - 0.5)
      const lx = h1 * L.tile + vx * T
      const ly = h2 * L.tile + vy * T
      for (let nx = Math.floor((x0 - lx) / L.tile); nx <= Math.floor((x1 - lx) / L.tile); nx++) {
        for (let ny = Math.floor((y0 - ly) / L.tile); ny <= Math.floor((y1 - ly) / L.tile); ny++) {
          const x = lx + nx * L.tile + sx
          const y = ly + ny * L.tile + sy
          if (L.behind && Math.hypot(x - bx, y - by) < rim) continue
          const size = L.size * (0.7 + 0.6 * hash(j, L.seed, 61))
          const a = hash(j, L.seed, 67) * Math.PI * 2 + (0.2 + 0.3 * h3) * T
          const ca = Math.cos(a)
          const sa = Math.sin(a)
          const X = x * k
          const Y = y * k
          const l = size * k
          if (hash(j, L.seed, 71) < 0.12) {
            // A grain of salt: a tiny diamond.
            glints.moveTo(X + ca * l * 0.5, Y + sa * l * 0.5)
            glints.lineTo(X - sa * l * 0.4, Y + ca * l * 0.4)
            glints.lineTo(X - ca * l * 0.5, Y - sa * l * 0.5)
            glints.lineTo(X + sa * l * 0.4, Y - ca * l * 0.4)
            glints.closePath()
          } else {
            // A sesame seed: a teardrop.
            const w = l * 0.24
            seeds.moveTo(X + ca * l * 0.5, Y + sa * l * 0.5)
            seeds.quadraticCurveTo(X - sa * w * 2, Y + ca * w * 2, X - ca * l * 0.5, Y - sa * l * 0.5)
            seeds.quadraticCurveTo(X + sa * w * 2, Y - ca * w * 2, X + ca * l * 0.5, Y + sa * l * 0.5)
          }
        }
      }
    }
    ctx.fillStyle = rgba(VOID.sesame, L.a * fade)
    ctx.fill(seeds)
    ctx.fillStyle = rgba(VOID.salt, L.a * 1.4 * fade * (0.7 + 0.3 * Math.sin(T * 1.7 + L.seed)))
    ctx.fill(glints)
  }
}

/**
 * A flat shadow of whatever `draw` draws, `dx, dy` cells down and along from it, cast onto the bagel's face only:
 * the thing is drawn far off the canvas and only its shadow is let fall back on the frame.
 */
function castShadow(p: p5, k: number, pose: BagelPose, dx: number, dy: number, a: number, draw: () => void): void {
  if (a <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [cx, cy] = toPart([pose.dx, pose.dy])
  ctx.save()
  // Only on the dough: not out in the dark, not down the hole.
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, BAGEL.r * pose.scale * k, 0, Math.PI * 2)
  ctx.moveTo((cx + BAGEL.hole * pose.scale) * k, cy * k)
  ctx.arc(cx * k, cy * k, BAGEL.hole * pose.scale * k, 0, Math.PI * 2, true)
  ctx.clip()
  const m = ctx.getTransform()
  const FAR = 40000
  ctx.shadowColor = rgba(DARK, a)
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = -m.a * FAR + m.a * dx * k + m.c * dy * k
  ctx.shadowOffsetY = -m.b * FAR + m.b * dx * k + m.d * dy * k
  ctx.translate(FAR, 0)
  draw()
  ctx.restore()
}

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
