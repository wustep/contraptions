import { circle, drift, fill, hash, layer, mix, poly, rgba, smooth, vgrad, type Paint, type Pt } from '../../paint'
import { DAWN, NIGHT, between, dunes, sky, type Air } from '../../world/desert'
import { STORM, T, ground } from './geo'
import { REACHES, drawReach } from './wall'

/**
 * The land and the air of the night desert, and of the morning after: the sky going from night to dawn, a few fixed
 * stars, Arrakeen burning on the western horizon as a low band of fire under its smoke, the ranges of dunes, and the
 * near floor the balls stand on.
 */

/** The morning past the storm: the sun low ahead, in the east, as they come out. */
const MORNING: Air = { ...DAWN, sun: { x: 0.8, up: 0.08, r: 0.06, color: '#FFF0D6' } }

/** The air at `t`: night until the visions end, dawn by the time they take off; the morning past the storm. */
export function airAt(t: number, viewX: number): Air {
  const a = between(NIGHT, DAWN, smooth(t, T.dawn[0], T.dawn[1]))
  // The storm darkens the dawn round it; out of its back the sun is up ahead.
  const past = smooth(viewX, STORM.back - 2, STORM.back + 14)
  if (past > 0) return between({ ...a, sun: undefined }, MORNING, past)
  return { ...a, sun: undefined }
}

/** Stars: a few, fixed, dim; they go out with the dawn. */
const STARS: [number, number, number][] = Array.from({ length: 16 }, (_, i) => [hash(i, 3), hash(i, 7) * 0.9, 0.5 + hash(i, 11) * 0.5])

function stars(g: Paint, f: number): void {
  if (f <= 0.01) return
  const v = g.view
  const r = Math.max(1.4 * g.px, v.h * 0.0016)
  for (const [sx, sy, b] of STARS) {
    const x = v.x0 + v.w * sx
    const y = v.y0 + (v.cy - v.y0) * sy
    if (y > v.cy - v.h * 0.04) continue
    circle(g.ctx, x, y, r)
    fill(g.ctx, rgba('#D9DCE6', 0.45 * b * f))
  }
}

/**
 * Arrakeen burning, far to the west on the horizon: a low dark line (the rim of its bowl) with a thin band of fire along
 * it, and its smoke a long low pall leaning east. Small, and only a line: the night is the desert's. It moves only with
 * the camera and the slow lick of its flames, and goes out with the dawn.
 */
function city(g: Paint, f: number): void {
  if (f <= 0.01) return
  // Nearer than the far ranges and farther than the near ones, so it stands on the horizon between them.
  const L = layer(g.view, 150)
  const ctx = g.ctx
  const base = L.y(0)
  const cx = (x: number) => L.x(x)
  const s = L.s
  // The smoke: one long low pall, leaning east over the desert.
  const sway = drift(g.t * 0.04, 61)
  ctx.beginPath()
  ctx.moveTo(cx(586), base - 5 * s)
  ctx.quadraticCurveTo(cx(624), base - (19 + 2 * sway) * s, cx(706), base - (15 + 2 * sway) * s)
  ctx.quadraticCurveTo(cx(664), base - 8 * s, cx(668), base - 4.5 * s)
  ctx.closePath()
  fill(ctx, rgba('#24212A', 0.6 * f))
  // The rim of its bowl.
  poly(ctx, [[cx(566), base], [cx(582), base - 4.6 * s], [cx(610), base - 5.8 * s], [cx(648), base - 5.4 * s], [cx(672), base - 4.0 * s], [cx(686), base]])
  fill(ctx, rgba('#120F12', f))
  // The fire along it: a thin band, its top licking slowly.
  const pts: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const x = 586 + i * 5
    const lick = 0.8 + 0.6 * hash(i, 4) + 0.35 * drift(g.t * 0.5 + i * 1.3, 70)
    pts.push([cx(x), base - (5.2 + lick) * s])
  }
  ctx.beginPath()
  ctx.moveTo(cx(586), base - 5.0 * s)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(cx(666), base - 4.6 * s)
  ctx.closePath()
  fill(ctx, rgba('#D27A34', 0.9 * f))
}

/** The ranges of dunes behind the floor. */
const RANGES = [
  { d: 520, base: 0, amp: 26, len: 420, seed: 31 },
  { d: 190, base: 0, amp: 11, len: 170, seed: 32 },
  { d: 70, base: 0, amp: 5.5, len: 70, seed: 33 },
  { d: 24, base: 0, amp: 2.2, len: 26, seed: 34 },
]

export function drawLand(g: Paint): void {
  const air = airAt(g.t, g.view.cx)
  sky(g, air)
  const night = 1 - smooth(g.t, T.dawn[0], T.out - 0.2)
  stars(g, night)
  // Each range in turn from the farthest, with whatever stands between it and the next farther one drawn first: the
  // burning city, and the storm's far reaches.
  let behind = Infinity
  for (const r of RANGES) {
    for (const reach of REACHES) if (reach.d < behind && reach.d >= r.d) drawReach(g, air, reach)
    if (r.d < 150 && r.d >= 70) city(g, night * (1 - smooth(g.view.cx, 760, 800)))
    dunes(g, air, r)
    behind = r.d
  }
  floor(g, air)
}

/** The near floor: the dune under the landing and the tent, and flat sand on east of it, lit at its top. */
export function floor(g: Paint, air: Air): void {
  const v = g.view
  const ctx = g.ctx
  const step = Math.max(0.08, 5 * g.px)
  const pts: Pt[] = []
  for (let x = v.x0 - step; x <= v.x1 + step; x += step) pts.push([x, ground(x)])
  const top = Math.min(...pts.map((p) => p[1]))
  ctx.beginPath()
  ctx.moveTo(pts[0][0], v.y1 + 1)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(pts[pts.length - 1][0], v.y1 + 1)
  ctx.closePath()
  fill(ctx, vgrad(ctx, top, top + 3, [[0, mix(air.sand, '#FFFFFF', 0.04)], [1, air.shade]]))
}
