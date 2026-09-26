import type p5 from 'p5'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { R, type Pt } from '../../../../../parts'
import { box, carried, frame, hash, part, type Company, type PartShot } from '../kit'
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
      drawCatch(p, k, t, pose)
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
      drawKick(p, k, t)
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

/* ------------------------------------------------------------------ her catch-light, and the heavy swallows' kick */

/**
 * The great light, caught on the crust where she is: a soft warm glow under her as she goes round, warmer on the lit
 * upper side, so in all that black the eye goes to her. Only on the dough (not out in the dark, not down the well).
 */
function drawCatch(p: p5, k: number, t: number, pose: BagelPose): void {
  if (pose.lit < 0.01 || t > TIP_IN) return
  const [ex, ey] = evelyn(t)
  const r = Math.hypot(ex, ey)
  const on = (1 - ss(r, BAGEL.r * pose.scale - 0.15, BAGEL.r * pose.scale + 0.45)) * ss(r, BAGEL.hole * pose.scale, BAGEL.hole * pose.scale + 0.12)
  if (on < 0.01) return
  const up = (1 - Math.sin(Math.atan2(ey, ex))) / 2
  const a = pose.lit * on * (0.12 + 0.16 * up)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [x, y] = toPart([ex, ey])
  const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, 0.62 * k)
  g.addColorStop(0, rgba(VOID.rimLight, a))
  g.addColorStop(0.4, rgba(VOID.rimLight, a * 0.45))
  g.addColorStop(1, rgba(VOID.rimLight, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x * k, y * k, 0.62 * k, 0, Math.PI * 2)
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
