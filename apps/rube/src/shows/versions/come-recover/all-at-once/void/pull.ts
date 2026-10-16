import type p5 from 'p5'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { mixHex, R, type Pt } from '../../../../../parts'
import { box, carried, depth, frame, hash, part, type Company, type PartShot } from '../kit'
import { JUMPS } from '../music'
import { SEAMS } from '../seams'
import { VOID } from '../worlds'
import { BAGEL, bagelPose, drawThing, edgeAt, HEAVY, inward, SWALLOWED, type BagelPose } from './bagel'
import { BRINK, evelyn, JOY_LIGHT, PULL_AT, REVEAL, TIP_IN } from './pullPath'

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

/** The entry cell of this leg in the dark's own cells (the bagel's centre is at `BAGEL.at`). Her way is in `pullPath.ts`. */
export { PULL_AT } from './pullPath'
/** From the bagel's own frame (its centre at 0, 0) to this part's (the entry cell's centre at 0, 0). */
const OFF: Pt = [BAGEL.at[0] - PULL_AT[0], BAGEL.at[1] - PULL_AT[1]]
const toPart = ([x, y]: Pt): Pt => [x + OFF[0], y + OFF[1]]

const T0 = JUMPS.void
const T1 = JUMPS.mosaic

const ss = (x: number, a: number, b: number): number => {
  const u = clamp((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ Joy on the crown */

/** Where Joy sits: on the bagel's crown, riding its lumps as it turns under her. */
const joyAt = (t: number): Pt => {
  const pose = bagelPose(t)
  return [pose.dx, pose.dy - edgeAt(pose, -Math.PI / 2) - R]
}

/* ------------------------------------------------------------------ the part */

/** Every strike this part makes, in show seconds: the light on Joy, the reveal, each thing over the lip, the brink. */
export const PULL_HITS: number[] = [JOY_LIGHT, REVEAL, ...SWALLOWED.map((s) => s.at), BRINK]

interface PullState {
  begin: number
}

/** How far the light round the bagel reaches: things further out are in the dark. */
const reach = (r: number): number => 1 - ss(r, 9.5, 12.5)
/**
 * Out past the light the things still waiting are only just there: dim shapes turning in the dark, out to the edges of
 * the widest frame, so the dark round the bagel is full of everything on its way in, not empty.
 */
const FAR_LIGHT = 0.26
const seen = (r: number): number => Math.max(reach(r), FAR_LIGHT * (1 - ss(r, 18, 26)))

export const pull = part<PullState>(
  {
    name: 'pull',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      if (t < T0 - 0.5 || t > T1 + 1) return
      const { k, ink, weight } = c
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const pose = bagelPose(t)
      drawStrata(p, k, t)
      drawDust(p, k, t, pose)
      drawCatch(p, k, t, pose)
      // Joy's light: a narrow beam from far above onto the crown, struck on 133.79.
      if (pose.pool > 0.001) {
        const [jx, jy] = toPart(joyAt(t))
        const top = jy - 11
        // Soft at its edges, as light in haze is: a few nested beams, each fainter and wider, so seen close (Jobu's
        // shots) it has no hard side.
        for (let n = 0; n < 10; n++) {
          const wide = 1.3 - 0.1 * n
          const a = 0.0135
          const g = ctx.createLinearGradient(0, top * k, 0, (jy + 0.4) * k)
          g.addColorStop(0, rgba(VOID.rimLight, 0))
          g.addColorStop(1, rgba(VOID.rimLight, a * pose.pool))
          ctx.beginPath()
          ctx.moveTo((jx - 0.25 * wide) * k, top * k)
          ctx.lineTo((jx + 0.25 * wide) * k, top * k)
          ctx.lineTo((jx + 0.9 * wide) * k, (jy + 0.3) * k)
          ctx.lineTo((jx - 0.9 * wide) * k, (jy + 0.3) * k)
          ctx.closePath()
          ctx.fillStyle = g
          ctx.fill()
        }
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
        const light = lit * seen(r)
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
      drawKick(p, k, t)
    },
    // Over everything, the big seeds that drift past close to the lens in the hush.
    over: (p, s, c) => {
      const t = c.t + s.begin
      if (t < T0 - 0.5 || t > NEAR_OUT + 0.1) return
      drawNear(p, c.k, t, bagelPose(t))
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
      // Room for something up and to the right of her, in the dark: the light finds Joy there.
      { t: 133.4, cells: 6.6, hold: H(-3.1, -4.9), w: 0.85 },
      { t: REVERSES[0][0] - 0.004, cells: 6.5, hold: H(-3.05, -4.92), w: 0.85 },
      // The show's one conversation in shot and reverse shot, as a film's confrontation is: cut to Jobu on the crown
      // under her light, her ring of everything going round her (`crown.ts`), for her line, the camera creeping in;
      ...cut(REVERSES[0][0], 2.3, H(-0.45, -6.68)),
      { t: REVERSES[0][1] - 0.004, cells: 2.05, hold: H(-0.4, -6.66), w: 1 },
      // cut to her mother, alone in the dark, for hers;
      ...cut(REVERSES[0][1], 2.6, H(-4.72, -3.98)),
      { t: REVERSES[1][0] - 0.004, cells: 2.45, hold: H(-4.55, -3.86), w: 1 },
      // and back to Jobu for "Come and see", and the reveal: from her, back and back until the whole of the bagel is in
      // the frame and she is tiny on its crown.
      ...cut(REVERSES[1][0], 2.2, H(-0.4, -6.66)),
      { t: 140.7, cells: 6.6, hold: H(-0.35, -5.1), w: 1 },
      { t: 142.4, cells: 16, hold: H(0, -0.6), w: 1 },
      // The pull, ridden: keys every tenth of a second from one smooth move (`ride`).
      ...rideKeys(H),
      // The break: the two of them, one over the other: Evelyn on the brink with the hole under her, Joy on the
      // crown above, watching. Then down with Evelyn as she tips.
      { t: BRINK, cells: 7.9, hold: H(0, -4.0), w: 1 },
      { t: TIP_IN - 0.6, cells: 7.4, hold: H(0, -3.85), w: 0.97 },
      { t: slot.end, cells: SEAMS.mosaic.cells, hold: H(0, -1.75), w: 0.85 },
    ]
    return shots
  },
)

/**
 * The cuts of the hush's conversation, show seconds: on Jobu from the first to the second, on Evelyn to the third, and
 * on Jobu again from the third until the reveal draws back to take her mother in (by 141.1, under Zoom). Through Jobu's two
 * shots the ball is out of the frame on purpose, the one time it is: the check allows them (`REVERSES`).
 */
export const REVERSES: [number, number][] = [
  [134.03, 136.58],
  [139.18, 141.1],
]
/** A cut, as camera keys: the new framing from a hair after `t` (the key before is the old framing, at `t - 0.004`, under a frame before). */
function cut(t: number, cells: number, hold: Pt): PartShot[] {
  return [{ t: t + 0.001, cells, hold, w: 1 }]
}

/* ------------------------------------------------------------------ her catch-light, and the heavy swallows' kick */

/**
 * The great light, caught on the crust where she is: a small, faint warmth on the dough under her as she goes round,
 * warmer on the lit upper side, so in all that black the eye goes to her (kept close and low, a pool, not a halo). Only on the dough (not out in the dark, not down the well).
 */
function drawCatch(p: p5, k: number, t: number, pose: BagelPose): void {
  if (pose.lit < 0.01 || t > TIP_IN) return
  const [ex, ey] = evelyn(t)
  const r = Math.hypot(ex, ey)
  const on = (1 - ss(r, BAGEL.r * pose.scale - 0.15, BAGEL.r * pose.scale + 0.45)) * ss(r, BAGEL.hole * pose.scale, BAGEL.hole * pose.scale + 0.12)
  if (on < 0.01) return
  const up = (1 - Math.sin(Math.atan2(ey, ex))) / 2
  const a = pose.lit * on * (0.07 + 0.09 * up)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [x, y] = toPart([ex, ey])
  const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, 0.42 * k)
  g.addColorStop(0, rgba(VOID.rimLight, a))
  g.addColorStop(0.4, rgba(VOID.rimLight, a * 0.45))
  g.addColorStop(1, rgba(VOID.rimLight, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x * k, y * k, 0.42 * k, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * A heavy thing (the big beats) kicks a little of the crust up off the lip as it goes over: seeds and flakes thrown
 * out across the face, slowing, and drawn back down the hole after it.
 */
const KICK = 1.1
function drawKick(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  SWALLOWED.forEach((w, i) => {
    const s = t - w.at
    if (s < 0 || s > KICK || !HEAVY.includes(w.at)) return
    const [lx, ly] = inward(i, 0)
    const d = Math.hypot(lx, ly) || 1
    const ox = lx / d
    const oy = ly / d
    const fade = Math.pow(1 - s / KICK, 1.3) * 0.95
    const paths = [new Path2D(), new Path2D(), new Path2D()]
    for (let j = 0; j < 24; j++) {
      const spread = (hash(i, j, 81) - 0.5) * 2.6
      const dx = ox * Math.cos(spread) - oy * Math.sin(spread)
      const dy = ox * Math.sin(spread) + oy * Math.cos(spread)
      const v = 1.8 + 2.4 * hash(i, j, 83)
      const go = v * 0.22 * (1 - Math.exp(-s / 0.22))
      const back = 1.1 * s * s
      const [x, y] = toPart([lx + dx * go - ox * back, ly + dy * go - oy * back])
      const size = (0.06 + 0.09 * hash(i, j, 85)) * k
      const a = hash(i, j, 87) * 6.28 + s * (4 + 6 * hash(i, j, 89))
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const X = x * k
      const Y = y * k
      const path = paths[j % 5 === 0 ? 1 : j % 7 === 0 ? 2 : 0]
      path.moveTo(X + ca * size, Y + sa * size)
      path.quadraticCurveTo(X - sa * size * 0.5, Y + ca * size * 0.5, X - ca * size, Y - sa * size)
      path.quadraticCurveTo(X + sa * size * 0.5, Y - ca * size * 0.5, X + ca * size, Y + sa * size)
    }
    ctx.fillStyle = rgba(VOID.sesame, fade)
    ctx.fill(paths[0])
    ctx.fillStyle = rgba(VOID.onion, fade)
    ctx.fill(paths[1])
    ctx.fillStyle = rgba(VOID.salt, fade)
    ctx.fill(paths[2])
  })
}

/* ------------------------------------------------------------------ the camera's ride */

/** The wide's hold, and the brink two-shot's (Evelyn on the lip, Joy on the crown), in the bagel's frame. */
const WIDE: Pt = [0, -0.6]
const TWO_SHOT: Pt = [0, -4.0]

/**
 * Where the camera is in the pull, in the bagel's frame. The wide holds the scale (142 to 146), a little of her in
 * it so she stays in the frame; then it pushes in and rides with her round the hole (from about 149.8), a medium
 * shot a little inward of her so the lip where things go in is beside her in the frame and the crust streams past;
 * closer as she nears the lip (157.8 on); and out again, back to the brink two-shot by beat 56. One function of
 * time, so every move carries its speed and nothing whips.
 */
function ride(t: number): { cells: number; hold: Pt } {
  const [ex, ey] = evelyn(t)
  const d = Math.hypot(ex, ey) || 1
  const inward = 1.1 + (0.7 - 1.1) * ss(t, 156.4, 157.8)
  const on: Pt = [ex - (ex / d) * inward, ey - (ey / d) * inward]
  const kw = 0.45 * ss(t, 142.4, 145.2)
  const wide: Pt = [WIDE[0] + kw * (ex - WIDE[0]), WIDE[1] + kw * (ey - WIDE[1])]
  const a = ss(t, 146.2, 149.8)
  const b = ss(t, 162.9, BRINK)
  const h: Pt = [wide[0] + (on[0] - wide[0]) * a, wide[1] + (on[1] - wide[1]) * a]
  const hold: Pt = [h[0] + (TWO_SHOT[0] - h[0]) * b, h[1] + (TWO_SHOT[1] - h[1]) * b]
  const lw = Math.log(16) + (Math.log(12.5) - Math.log(16)) * ss(t, 142.4, 146.2)
  const lr = Math.log(5.6) + (Math.log(4.3) - Math.log(5.6)) * ss(t, 156.4, 157.8) + (Math.log(7.9) - Math.log(4.3)) * ss(t, 161.5, BRINK)
  return { cells: Math.exp(lw + (lr - lw) * a), hold }
}
const rideKeys = (H: (x: number, y: number) => Pt): PartShot[] => {
  const keys: PartShot[] = []
  for (let t = 142.5; t < BRINK - 0.05; t += 0.1) {
    const { cells, hold } = ride(t)
    keys.push({ t, cells, hold: H(hold[0], hold[1]), w: 1 })
  }
  return keys
}

/** The dark's paper. */
const DARK = '#0A090C'

/* ------------------------------------------------------------------ the dust of everything, in the hush */

/**
 * Seeds and crumbs adrift in the dark at three depths, so the hush has depth and slow motion before anything is lit:
 * the far ones slide by slowly as the camera follows her, the near ones quickly, all sinking very slowly toward the
 * bagel. Each depth is one pattern repeated every `tile` cells and moving as a whole, so nothing pops as it drifts.
 * The two far depths are behind the bagel (kept off its disc); the near one is in front. Bright enough that on a
 * desktop screen the fall reads as depth and motion, not as a stalled black frame, and still a hush.
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
  { depth: 0.32, tile: 12, n: 64, size: 0.05, a: 0.3, seed: 1, behind: true },
  { depth: 0.66, tile: 12, n: 34, size: 0.09, a: 0.4, seed: 2, behind: true },
  { depth: 1.4, tile: 14, n: 11, size: 0.2, a: 0.3, seed: 3, behind: false },
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
    const salt = new Path2D()
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
            salt.moveTo(X + ca * l * 0.5, Y + sa * l * 0.5)
            salt.lineTo(X - sa * l * 0.4, Y + ca * l * 0.4)
            salt.lineTo(X - ca * l * 0.5, Y - sa * l * 0.5)
            salt.lineTo(X + sa * l * 0.4, Y - ca * l * 0.4)
            salt.closePath()
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
    // Salt is brighter than sesame, and steady: it does not twinkle.
    ctx.fillStyle = rgba(VOID.salt, L.a * 1.2 * fade)
    ctx.fill(salt)
  }
}

/* ------------------------------------------------------------------ the dark's depth, in the hush */

/**
 * The hush is nothing, and it is deep. Far behind the dust, strata of a darker dark drift slowly by, a breath of the
 * bagel's violet in some and of the great light's warmth in others, so the black has distance in it and not one
 * flat tone; they slide at a third of the camera's speed.
 */
interface Stratum {
  x: number
  y: number
  rx: number
  ry: number
  tilt: number
  warm: boolean
  a: number
}
const STRATA_TILE: Pt = [34, 26]
const STRATA: Stratum[] = Array.from({ length: 6 }, (_, i) => ({
  x: hash(i, 1, 131) * STRATA_TILE[0],
  y: hash(i, 2, 131) * STRATA_TILE[1],
  rx: 7 + 6 * hash(i, 3, 131),
  ry: 1.3 + 1.4 * hash(i, 4, 131),
  tilt: -0.35 + 0.3 * hash(i, 5, 131),
  warm: i % 3 === 1,
  a: 0.1 + 0.06 * hash(i, 6, 131),
}))
/** From the jump in; thinner once the great light takes the dark over, and on behind the pull to the tip in. */
const strataAt = (t: number): number => ss(t, T0 - 0.4, T0 + 2.2) * (1 - 0.45 * ss(t, REVEAL + 2, 142.6)) * (1 - ss(t, T1 - 1.2, T1))

function drawStrata(p: p5, k: number, t: number): void {
  const fade = strataAt(t)
  if (fade < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const T = t - T0
  depth(p, k, 0.3, [0, 0], (fr) => {
    for (const s of STRATA) {
      // Sinking toward the bagel, slower than the dust.
      const lx = s.x + SINK[0] * 0.05 * T
      const ly = s.y + SINK[1] * 0.05 * T
      const [W, H] = STRATA_TILE
      for (let nx = Math.floor((fr.x0 - s.rx - lx) / W); nx <= Math.floor((fr.x1 + s.rx - lx) / W); nx++) {
        for (let ny = Math.floor((fr.y0 - s.rx - ly) / H); ny <= Math.floor((fr.y1 + s.rx - ly) / H); ny++) {
          const x = lx + nx * W
          const y = ly + ny * H
          ctx.save()
          ctx.translate(x * k, y * k)
          ctx.rotate(s.tilt)
          ctx.scale(1, s.ry / s.rx)
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx * k)
          const col = s.warm ? mixHex(VOID.rimLight, VOID.bagel, 0.6) : mixHex(VOID.glow, VOID.bagel, 0.3)
          g.addColorStop(0, rgba(col, s.a * fade))
          g.addColorStop(0.55, rgba(col, s.a * 0.45 * fade))
          g.addColorStop(1, rgba(col, 0))
          ctx.fillStyle = g
          ctx.fillRect(-s.rx * k, -s.rx * k, 2 * s.rx * k, 2 * s.rx * k)
          ctx.restore()
        }
      }
    }
  })
}

/**
 * Close to the lens, a few of the bagel's own sesame seeds go by, big and slow and out of focus, each a dark shape lit
 * only along the edge that faces the light (the far glint on the rim
 * while the dark is dark, the great light above once it is lit). They slide past at two and a half times the
 * camera's speed and tumble as they sink, so in the hush there is something near and something far. Near the family
 * they go thin, as a thing that close to a lens does, and never hide them.
 */
interface Near {
  x: number
  y: number
  size: number
  vx: number
  vy: number
  spin: number
  turn: number
}
const NEAR_F = 2.5
const NEAR_TILE = 10
const NEAR: Near[] = Array.from({ length: 7 }, (_, i) => {
  const h = (n: number) => hash(i, n, 157)
  const v = 0.11 + 0.1 * h(5)
  return {
    x: h(1) * NEAR_TILE,
    y: h(2) * NEAR_TILE,
    size: 0.95 + 1.0 * h(3),
    vx: SINK[0] * v + 0.05 * (h(6) - 0.5),
    vy: SINK[1] * v + 0.05 * (h(7) - 0.5),
    spin: (h(8) - 0.5) * 0.5,
    turn: h(9) * Math.PI * 2,
  }
})
/** When the near seeds go: as the camera draws back off Jobu to the whole of the bagel. */
const NEAR_OUT = 142.3
const nearAt = (t: number): number => ss(t, T0 - 0.2, T0 + 1.6) * (1 - ss(t, 140.6, NEAR_OUT))
const NEAR_BODY = mixHex(VOID.bagel, DARK, 0.4)

/** A sesame seed, `l` long: a teardrop, pointed at one end. */
function seedPath(ctx: CanvasRenderingContext2D, l: number): void {
  ctx.beginPath()
  ctx.moveTo(l * 0.5, 0)
  ctx.bezierCurveTo(l * 0.2, l * 0.2, -l * 0.42, l * 0.22, -l * 0.48, 0)
  ctx.bezierCurveTo(-l * 0.42, -l * 0.22, l * 0.2, -l * 0.2, l * 0.5, 0)
}

function drawNear(p: p5, k: number, t: number, pose: BagelPose): void {
  const fade = nearAt(t)
  if (fade < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const world = frame(p, k)
  const H = world.y1 - world.y0
  // Seen close (Jobu's shots), they are smaller in the frame, so a seed never takes the picture.
  const sz = Math.max(0.45, Math.min(1.15, H / 5.8))
  // The light they are lit by: the far glint, low and to the right, until the great light comes on above.
  const lit = Math.max(pose.lit, pose.pool * 0.6)
  const lx0 = 0.55 * (1 - lit)
  const ly0 = 0.83 * (1 - lit) - lit
  const lm = Math.hypot(lx0, ly0) || 1
  const [lx, ly] = [lx0 / lm, ly0 / lm]
  const rim = 0.16 + 0.22 * (pose.glint ?? 0) + 0.18 * lit
  const T = t - T0
  // Who they must not hide, in the near layer's cells.
  const [ex, ey] = toPart(evelyn(t))
  const who: Pt[] = [[ex, ey]]
  if (t >= JOY_LIGHT) who.push(toPart(joyAt(t)))
  depth(p, k, NEAR_F, [0, 0], (fr) => {
    const dx = world.cx - fr.cx
    const dy = world.cy - fr.cy
    const people = who.map(([x, y]): Pt => [x - dx, y - dy])
    for (const n of NEAR) {
      const l = n.size * sz
      const px = n.x + n.vx * T
      const py = n.y + n.vy * T
      for (let ix = Math.floor((fr.x0 - l - px) / NEAR_TILE); ix <= Math.floor((fr.x1 + l - px) / NEAR_TILE); ix++) {
        for (let iy = Math.floor((fr.y0 - l - py) / NEAR_TILE); iy <= Math.floor((fr.y1 + l - py) / NEAR_TILE); iy++) {
          const x = px + ix * NEAR_TILE
          const y = py + iy * NEAR_TILE
          let clear = 1
          for (const [qx, qy] of people) clear = Math.min(clear, ss(Math.hypot(x - qx, y - qy), l * 0.35, l * 0.35 + 0.9))
          const a = fade * (0.3 + 0.7 * clear)
          const ang = n.turn + n.spin * T
          ctx.save()
          ctx.translate(x * k, y * k)
          ctx.rotate(ang)
          // The light's way, in the seed's own turn.
          const c = Math.cos(-ang)
          const s2 = Math.sin(-ang)
          const ox = (lx * c - ly * s2) * l * 0.07 * k
          const oy = (lx * s2 + ly * c) * l * 0.07 * k
          // Its lit edge: the shape a little toward the light, under the dark body.
          ctx.translate(ox, oy)
          seedPath(ctx, l * k)
          ctx.fillStyle = rgba(VOID.rimLight, rim * a)
          ctx.fill()
          ctx.translate(-ox, -oy)
          // The body, its edge soft as a thing out of focus: two wider, fainter passes under the core.
          for (const [grow, alpha] of [[1.14, 0.2], [1.06, 0.4], [1, 0.94]] as const) {
            seedPath(ctx, l * k * grow)
            ctx.fillStyle = rgba(NEAR_BODY, alpha * a)
            ctx.fill()
          }
          ctx.restore()
        }
      }
    }
  })
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
