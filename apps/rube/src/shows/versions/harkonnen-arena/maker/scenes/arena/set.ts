import { circle, clamp01, composed, layer, noise1, pulse, rect, smooth, vgrad, type Brush } from '../../paint'
import { A, EAST_GATE, GATE_H, GATE_W, PYLON_H, PYLON_W, STANDS_F, STANDS_PIVOT, SWAY, WEST_GATE, X0 } from './geo'

/**
 * The arena's set: the white sky with its black sun, the bowl of tiers and the crowd in them, the floor, and the two
 * pylons with their gates. Everything is black, white and grey: Giedi Prime has no light a person can see, only the
 * infrared, so its sky is pale, its sun a hole, and its people and stone black.
 */

const SKY_TOP = '#CACAC7'
const SKY_LOW = '#F2F1ED'
const SUN = '#060606'
const RIM = '#161615'
const RISER = '#3D3C39'
const CROWD = '#111111'
const PODIUM = '#2A2927'
const AISLE = '#1B1B1A'
const FLOOR_FAR = '#CFCCC5'
const FLOOR_NEAR = '#A9A69E'
const PYLON = '#141413'
const PYLON_FACE = '#2B2A27'
const GATE_DARK = '#050505'
const DOOR = '#3B3A36'

/** The black sun in the frame: where it is, as shares of the frame, and its radius as a share of the frame's height. */
const SUN_AT = { x: 0.5, y: 0.34, r: 0.05 }

/** The sky and the black sun: the sun stands in the composed frame, as the eclipse's did, so the dissolve finds it where it was. */
export function paintSky(b: Brush): void {
  const { ctx, view } = b
  ctx.fillStyle = vgrad(b, view.y0, view.y0 + view.h * 0.75, [[0, SKY_TOP], [1, SKY_LOW]])
  rect(ctx, view.x0 - 1, view.y0 - 1, view.w + 2, view.h + 2)
  ctx.fill()
  const f = composed(view)
  const r = SUN_AT.r * f.h
  const x = f.cx + (SUN_AT.x - 0.5) * f.h * (16 / 9)
  const y = f.cy + (SUN_AT.y - 0.5) * f.h
  // A hair of white round it, the corona's edge, and the hole.
  ctx.fillStyle = b.c('#FFFFFF')
  circle(ctx, x, y, r * 1.045)
  ctx.fill()
  ctx.fillStyle = b.c(SUN)
  circle(ctx, x, y, r)
  ctx.fill()
}

/* ------------------------------------------------------------------ the bowl */

/** Its tiers, in the stands' own layer: the podium wall, then each tier a riser and the crowd on its tread, then the rim. */
const PODIUM_H = 1.0
const TIERS = 9
const RISER_H = 0.45
const BAND_H = 1.25
const RIM_H = 1.9
const TOP = PODIUM_H + TIERS * (RISER_H + BAND_H)
/** The bowl's half width in the layer, and how much taller it stands toward the edges, where it comes round to us. */
const BOWL_W = 55
const BOWL_RISE = 1.4

/** How much taller than at the middle the bowl stands at layer x. */
const rise = (x: number) => {
  const u = (x - X0) / BOWL_W
  return 1 + BOWL_RISE * u * u
}

/** The crowd's answer: rising on the blows and the kill, swaying on the slow pulse under the duel. 0 sitting, up to about 1. */
function roar(t: number): number {
  return Math.min(1.2, 0.8 * pulse(t, A.blow1, 0.25, 1.6) + 0.9 * pulse(t, A.blow2, 0.25, 1.8) + 1.0 * pulse(t, A.kill, 0.3, 3.2))
}
function sway(t: number, tier: number): number {
  const s = t - SWAY.from - tier * 0.05
  if (s < -0.5 || t > SWAY.to + 1.2) return 0
  const env = smooth(t, SWAY.from - 0.6, SWAY.from + 0.8) * (1 - smooth(t, SWAY.to - 0.6, SWAY.to + 1.2))
  // Up on each beat, easing down between: a crowd on its feet, rocking.
  const ph = (((s / SWAY.period) % 1) + 1) % 1
  return env * Math.pow(Math.sin(Math.PI * ph), 2)
}

/** How full a tier stands at x: a crowd stands in knots and thins between them, so its top is never a ruled line. */
function mass(x: number, tier: number): number {
  return 0.86 + 0.14 * noise1(x / 2.3 + tier * 17.3, tier + 40)
}

/** The bowl of tiers behind the floor, filling the frame's back from the floor's far edge up past the rim. */
export function paintStands(b: Brush): void {
  layer(b, STANDS_F, STANDS_PIVOT, (lb) => {
    const { ctx, view, t } = lb
    const x0 = view.x0 - 1
    const x1 = view.x1 + 1
    const n = Math.min(240, Math.max(48, Math.ceil(view.w / 0.6)))
    const step = (x1 - x0) / n
    const xs: number[] = []
    for (let i = 0; i <= n; i++) xs.push(x0 + i * step)
    const ys = (h: number) => xs.map((x) => -h * rise(x))
    // The whole bowl, rim and all, dark; then the risers lighter between the crowd's bands.
    const fillBetween = (lo: number[], hi: number[], color: string) => {
      ctx.beginPath()
      ctx.moveTo(xs[0], lo[0])
      for (let i = 1; i <= n; i++) ctx.lineTo(xs[i], lo[i])
      for (let i = n; i >= 0; i--) ctx.lineTo(xs[i], hi[i])
      ctx.closePath()
      ctx.fillStyle = lb.c(color)
      ctx.fill()
    }
    const ground = xs.map(() => 4)
    // The bowl's stone, rim and all, dark; the risers' grey faces up through the tiers; the podium wall at its foot.
    fillBetween(ground, ys(TOP + RIM_H), RIM)
    fillBetween(ground, ys(TOP), RISER)
    fillBetween(ground, ys(PODIUM_H), PODIUM)
    // Each tier: the crowd standing on its tread, their heads against the next riser's grey. In a wide frame the heads
    // are smaller than a few pixels and the crowd's edge is a plain line; closer, a row of shallow bumps.
    const r = roar(t)
    const headPx = 0.15 * STANDS_F * b.k
    const bump = smooth(headPx, 4, 8)
    for (let i = 0; i < TIERS; i++) {
      const base = PODIUM_H + i * (RISER_H + BAND_H) + 0.12
      const lift = BAND_H * (0.66 + 0.22 * r + 0.2 * sway(t, i))
      const lo = ys(base)
      ctx.beginPath()
      ctx.moveTo(xs[0], lo[0])
      for (let k = 1; k <= n; k++) ctx.lineTo(xs[k], lo[k])
      if (bump > 0.01) {
        // Heads, right to left along the tread: a row of shallow arcs, spaced as people stand, each the tier's size there.
        const sp = 0.34
        let x = Math.floor(x1 / sp) * sp
        while (x >= x0) {
          const s = rise(x)
          const y = -(base + lift * mass(x, i)) * s
          const hr = 0.14 * s
          const off = Math.sin(x * 12.9898 + i * 78.233) * 0.5 + 0.5
          ctx.lineTo(x + hr, y)
          ctx.quadraticCurveTo(x, y - hr * 1.5 * bump * (0.75 + 0.25 * off), x - hr, y)
          x -= sp
        }
      } else {
        for (let k = n; k >= 0; k--) ctx.lineTo(xs[k], -(base + lift * mass(xs[k], i)) * rise(xs[k]))
      }
      ctx.closePath()
      ctx.fillStyle = lb.c(CROWD)
      ctx.fill()
    }
    // The aisles: stairs going straight up the bowl, every so often, dark, breaking the tiers into blocks.
    const top = TOP + RIM_H * 0.4
    for (let k = Math.floor((x0 - X0) / 17); k <= Math.ceil((x1 - X0) / 17); k++) {
      const ax = X0 + 8.5 + k * 17
      if (ax < x0 - 2 || ax > x1 + 2) continue
      const s = rise(ax)
      const w = 0.7 * s
      ctx.beginPath()
      ctx.moveTo(ax - w / 2, -PODIUM_H * s)
      ctx.lineTo(ax + w / 2, -PODIUM_H * s)
      ctx.lineTo(ax + w / 2, -top * s)
      ctx.lineTo(ax - w / 2, -top * s)
      ctx.closePath()
      ctx.fillStyle = lb.c(AISLE)
      ctx.fill()
    }
  })
}

/** The floor: pale sand from the stands' foot to the frame's bottom, a little darker toward us. */
export function paintFloor(b: Brush): void {
  const { ctx, view } = b
  const far = STANDS_PIVOT * (1 - STANDS_F)
  const y1 = Math.max(view.y1, 1) + 1
  ctx.fillStyle = vgrad(b, far, far + 8, [[0, FLOOR_FAR], [1, FLOOR_NEAR]])
  rect(ctx, view.x0 - 1, far, view.w + 2, y1 - far)
  ctx.fill()
}

/** How far up a gate's door is, 0 shut to 1 open: it rises into the pylon over a second and a half. */
export const doorUp = (t: number, at: number): number => smooth(t, at, at + 1.5)

/**
 * A pylon of black stone at the floor's end, the gate through its foot. `side` -1 for the west one, whose inside face is
 * at `WEST_GATE`, 1 for the east. Drawn behind the balls: the stone and the gate's dark.
 */
export function paintPylon(b: Brush, side: -1 | 1): void {
  const { ctx, view } = b
  const face = side < 0 ? WEST_GATE : EAST_GATE
  const outer = face + side * PYLON_W
  const xa = Math.min(face, outer)
  const xb = Math.max(face, outer)
  if (xb < view.x0 - 1 || xa > view.x1 + 1) return
  // The stone: a plain slab, its inside face catching what light there is.
  rect(ctx, xa, -PYLON_H, xb - xa, PYLON_H + 0.6)
  ctx.fillStyle = b.c(PYLON)
  ctx.fill()
  const fx = side < 0 ? face - 0.5 : face
  rect(ctx, fx, -PYLON_H, 0.5, PYLON_H + 0.6)
  ctx.fillStyle = b.c(PYLON_FACE)
  ctx.fill()
  // The gate: a dark way through the pylon's foot.
  const gx = gateX(side)
  rect(ctx, gx - GATE_W / 2, -GATE_H, GATE_W, GATE_H + 0.6)
  ctx.fillStyle = b.c(GATE_DARK)
  ctx.fill()
}

/** The middle of a gate's opening. */
export const gateX = (side: -1 | 1): number => (side < 0 ? WEST_GATE : EAST_GATE) + side * (GATE_W / 2 + 0.9)

/** A gate's door, over the balls: a slab sliding up into the stone. */
export function paintDoor(b: Brush, side: -1 | 1, at: number): void {
  const { ctx } = b
  const up = doorUp(b.t, at)
  if (up >= 0.999) return
  const gx = gateX(side)
  const h = GATE_H * (1 - up)
  rect(ctx, gx - GATE_W / 2, -GATE_H, GATE_W, h)
  ctx.fillStyle = b.c(DOOR)
  ctx.fill()
  // Its foot.
  rect(ctx, gx - GATE_W / 2, -GATE_H + h - 0.08, GATE_W, 0.08)
  ctx.fillStyle = b.c(PYLON)
  ctx.fill()
}

/** A soft dark under a ball on the floor: what seats it there (no sun throws a shadow here). */
export function paintSeat(b: Brush, x: number, size: number, a = 1): void {
  const { ctx } = b
  ctx.beginPath()
  ctx.ellipse(x, 0.012, 0.17 * size, 0.045 * size, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.ca('#000000', 0.22 * clamp01(a))
  ctx.fill()
}
