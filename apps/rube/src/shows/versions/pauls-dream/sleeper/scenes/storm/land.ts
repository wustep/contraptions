import { circle, drift, ellipse, fill, hash, layer, mix, poly, rgba, smooth, vgrad, type Paint, type Pt } from '../../paint'
import { DAWN, NIGHT, between, dunes, sky, type Air } from '../../world/desert'
import { T, backAt, ground } from './geo'
import { REACHES, drawReach } from './wall'

/**
 * The land and the air of the night desert, and of the morning after: the sky going from night to dawn, a few fixed
 * stars, Arrakeen burning on the western horizon as a low band of fire under its smoke, the ranges of dunes, and the
 * near floor the balls stand on.
 */

/** The morning past the storm: the sun low ahead, in the east, as they come out. */
/**
 * The morning past the storm. Its sun is where the Fremen's first shot has its own, the frame the glide dissolves into
 * (a share 0.82 across the 16:9 frame and 0.17 of its height over the horizon, 0.049 of its height across), so the
 * dissolve shows one sun.
 */
const MORNING: Air = { ...DAWN, sun: { x: 0.82, up: 0.171, r: 0.049, color: '#FFF1DA' } }

/** The air at `t`: night until the visions end, dawn by the time they take off; the morning past the storm. */
export function airAt(t: number, viewX: number): Air {
  const a = between(NIGHT, DAWN, smooth(t, T.dawn[0], T.dawn[1]))
  // The storm darkens the dawn round it; out of its back the sun is up ahead.
  const past = smooth(viewX, backAt(t) - 2, backAt(t) + 14)
  if (past > 0) return between({ ...a, sun: undefined }, MORNING, past)
  return { ...a, sun: undefined }
}

/**
 * The sun, placed as the Fremen's scene places its own: against the composed 16:9 frame (its height, and across its
 * width from the middle), not the whole stage, so the two frames of the dissolve agree on a tall stage too.
 */
function sun(g: Paint, air: Air): void {
  if (!air.sun) return
  const v = g.view
  const h = Math.min(v.h, (v.w * 9) / 16)
  circle(g.ctx, v.cx + (air.sun.x - 0.5) * ((h * 16) / 9), v.cy - h * air.sun.up, h * air.sun.r)
  fill(g.ctx, air.sun.color)
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
 * Arrakeen burning, far to the west on the horizon: a low dark line (the rim of its bowl) with fires here and there
 * along it, and its smoke a long low pall leaning east. Small, and only a line: the night is the desert's. It moves only with
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
  // The smoke: a long low pall leaning east over the desert, a few soft overlapping masses, thinning as it goes.
  const sway = drift(g.t * 0.04, 61)
  for (let i = 0; i < 5; i++) {
    const u = i / 4
    const x = 600 + u * 92 + 3 * sway
    const y = 7.5 + u * 6.5 + 1.2 * sway * u
    ellipse(ctx, cx(x), base - y * s, (10 + u * 14) * s, (3.2 + u * 2.4) * s, -0.12)
    fill(ctx, rgba('#24212A', (0.34 - 0.16 * u) * f))
  }
  // The rim of its bowl: a worn crest, low at both ends.
  // Its foot runs on down under the nearer dunes, so no flat underside of it is ever seen.
  const rim: Pt[] = [[cx(556), base + 6 * s]]
  for (let i = 0; i <= 30; i++) {
    const x = 568 + i * 4
    const k = Math.sin((Math.PI * i) / 30)
    rim.push([cx(x), base - (4.6 * Math.pow(k, 0.35) + 0.9 * k + 0.5 * (hash(i, 3) - 0.5)) * s])
  }
  rim.push([cx(700), base + 6 * s])
  poly(ctx, rim)
  fill(ctx, rgba('#1A1820', f))
  // The fires along it: separate low patches, not one band, their tops licking slowly.
  const fires: [number, number][] = [[588, 9], [603, 6], [616, 13], [636, 7], [651, 10]]
  for (const [j, [x0, w]] of fires.entries()) {
    const top = (x: number) => {
      const i = Math.round((x - 568) / 4)
      const k = Math.sin((Math.PI * Math.max(0, Math.min(30, i))) / 30)
      return 4.6 * Math.pow(k, 0.35) + 0.9 * k
    }
    const pts: Pt[] = [[cx(x0), base - (top(x0) - 0.3) * s]]
    for (let i = 0; i <= 6; i++) {
      const x = x0 + (w * i) / 6
      const lick = (0.35 + 0.45 * hash(i + j * 7, 4)) * Math.sin((Math.PI * i) / 6) + 0.18 * drift(g.t * 0.5 + i * 1.3 + j, 70)
      pts.push([cx(x), base - (top(x) + Math.max(0, lick)) * s])
    }
    pts.push([cx(x0 + w), base - (top(x0 + w) - 0.3) * s])
    poly(ctx, pts)
    fill(ctx, rgba(j % 2 ? '#B9612B' : '#D27A34', 0.85 * f))
  }
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
  sky(g, { ...air, sun: undefined })
  sun(g, air)
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
