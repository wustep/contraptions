import { blob, fill, mix, poly, rgba, smooth, smoother, stroke, vgrad, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { skyAt } from '../../world/sky'
import { flame } from '../troy/city'

/**
 * Thrinacia, Apollo's island: a low gold hill of dry grass over a pale beach, two olive trees, and on its back the god's
 * cattle, cream and calm, with horns like a lyre. The men go up among them while he stays aboard, and close round one;
 * on the hardest beat of the phrase she goes down among them and does not get up, and the rest of the herd stop
 * grazing and stand with their heads up. The men light a fire beside her and go back down to the ship; behind them
 * its smoke goes up black into the gold sky, leaning after them, and the sky closes. That is the crime the bolt
 * answers.
 */

/** The ground's height over x (cells): the beach, the slope, the pasture, and the far shore. */
const GROUND: Pt[] = [
  [495.6, 0.8],
  [497.5, 0.0],
  [498.8, -0.42],
  [500.4, -1.05],
  [502.1, -1.62],
  [504.0, -1.86],
  [506.5, -1.95],
  [509.0, -1.9],
  [511.5, -2.02],
  [514.0, -1.96],
  [516.4, -1.72],
  [518.6, -1.2],
  [520.6, -0.55],
  [522.3, 0.0],
  [523.8, 0.8],
]

/** The ground under x: what the men roll on and the cattle stand on. */
export function ground(x: number): number {
  if (x <= GROUND[0][0]) return GROUND[0][1]
  for (let i = 1; i < GROUND.length; i++) {
    const [x0, y0] = GROUND[i - 1]
    const [x1, y1] = GROUND[i]
    if (x <= x1) {
      // Smoothstep between the points: the slope eases at every one, so a rolling ball never kinks.
      const u = (x - x0) / (x1 - x0)
      return y0 + (y1 - y0) * u * u * (3 - 2 * u)
    }
  }
  return GROUND[GROUND.length - 1][1]
}

/** The cattle: where each stands (x), which way it faces, and its grazing rhythm. Cow 1 is the one that lies down. */
const COWS: { x: number; dir: 1 | -1; ph: number }[] = [
  { x: 503.2, dir: 1, ph: 0.3 },
  { x: 507.4, dir: -1, ph: 1.7 },
  { x: 510.9, dir: 1, ph: 2.9 },
  { x: 514.6, dir: -1, ph: 4.2 },
]
export const DOWN_COW = COWS[1].x
/** When cow 1's legs give, and when she is down: on the phrase's hardest beat, as the last of the men reach her. */
export const KNEEL: [number, number] = [289.9, 290.36]
/** The men's fire beside her: lit on the beat after, burning as they put out, and put out by the rain. */
export const FIRE = { x: DOWN_COW + 0.55, lit: 291.852 }

const GRASS = '#B99A4C'
const GRASS_SHADE = '#8B7434'
const SAND = '#DCC796'
const OLIVE = '#5E6A45'
const BARK = '#4D3F2E'
const HIDE = '#E8D7AC'
const HIDE_SHADE = '#C8B282'
const HOOF = '#6A5640'
const INK = '#2E2A22'
/** The fire's smoke: green wood and fat, dark against the gold. */
const SMOKE = '#3A3631'

/**
 * How far the island has gone into the storm's shadow: in the sun while they graze, taken down with the light as the
 * sky closes over it, so it is never a gold field under a black sky. The fire's own light is not. Set as it is drawn.
 */
let gloom = 0
const STORM = '#262A2B'
const lit = (c: string): string => (gloom > 0.001 ? mix(c, STORM, gloom) : c)

export function drawIsland(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 488 || view.x0 > 532) return
  gloom = 0.55 * smooth(t, 292.5, 301.5)
  const air = skyAt(t).low
  // Far hills of the same island, behind, paler.
  const L = layer(view, 30)
  const far: Pt[] = []
  for (let k = 0; k <= 12; k++) {
    const x = 499 + (24 * k) / 12
    far.push([L.x(x), L.y(-2.6 * Math.sin((Math.PI * k) / 12) ** 0.8 - 0.5 * Math.sin(k * 1.3))])
  }
  far.push([L.x(523), L.y(0.3)], [L.x(499), L.y(0.3)])
  poly(ctx, far)
  fill(ctx, mix(lit(GRASS_SHADE), air, 0.55))
  drawRidge(g, air)
  // The land: grass over the whole hill, darkening towards the water; under the water it goes on down and out, a
  // mound that the cut sea darkens, its skirts going on down out of sight (no floor to it, so a tall frame sees none).
  const pts: Pt[] = []
  for (let x = GROUND[0][0]; x <= GROUND[GROUND.length - 1][0] + 1e-6; x += 0.25) pts.push([x, ground(x)])
  const land: Pt[] = [...pts, [525.6, 1.5], [527.6, 3.2], [530.5, 7], [535, 14], [541, 40], [475, 40], [481, 14], [485.5, 7], [491.8, 3.2], [493.8, 1.5]]
  poly(ctx, land)
  ctx.fillStyle = vgrad(ctx, -2.1, 9, [
    [0, lit(GRASS)],
    [0.124, mix(lit(GRASS), lit(GRASS_SHADE), 0.35)],
    [0.225, lit(GRASS_SHADE)],
    [1, mix(lit(GRASS_SHADE), '#1E2420', 0.75)],
  ])
  ctx.fill()
  // The beaches: a band of sand along the ground where it meets the water, either side.
  for (const [a, b] of [[495.6, 499.6], [520.2, 523.8]] as const) {
    const top = pts.filter(([x]) => x >= a && x <= b)
    poly(ctx, [...top, ...[...top].reverse().map(([x, y]): Pt => [x, y + 0.22])])
    fill(ctx, lit(SAND))
  }
  // Dry scrub on the near slope, below the pasture's edge: a few low dark clumps, bigger as they come down towards us.
  for (const [x, dy, w] of [[501.2, 0.55, 0.42], [505.0, 0.95, 0.55], [510.6, 0.7, 0.5], [515.2, 1.1, 0.6], [520.4, 0.6, 0.4]] as const) {
    const y = ground(x) + dy
    ctx.beginPath()
    ctx.ellipse(x, y, w, w * 0.42, 0, Math.PI, 0)
    ctx.ellipse(x + w * 0.55, y + 0.02, w * 0.55, w * 0.3, 0, Math.PI, 0)
    ctx.closePath()
    fill(ctx, mix(lit(OLIVE), lit(GRASS_SHADE), 0.35))
  }
  poly(ctx, pts, false)
  stroke(g, lit(INK), 2)
  // Two olive trees on the skyline, dark and still.
  drawOlive(g, 517.6, 1.0)
  drawOlive(g, 519.2, 0.75)
  // The fire's smoke behind everything on the hill, going up and leaning off after the ship with the rising wind.
  const burn = smooth(t, FIRE.lit, FIRE.lit + 0.6) * (1 - smooth(t, 303.5, 309))
  const fy = ground(FIRE.x)
  drawColumn(g, FIRE.x, fy - 0.2, burn)
  // The herd: all but her grazing, until she goes down; then heads up, and still.
  const fear = smooth(t, KNEEL[1], KNEEL[1] + 0.7)
  for (const [i, cow] of COWS.entries()) drawCow(g, cow.x, ground(cow.x), cow.dir, cow.ph, i === 1 ? smoother(t, KNEEL[0], KNEEL[1]) : 0, i === 1 ? 0 : fear)
  // The fire itself, on the grass beside her: a few sticks and the flames on them.
  if (burn > 0.01) {
    for (const d of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(FIRE.x - 0.14 * d, fy + 0.01)
      ctx.lineTo(FIRE.x + 0.1 * d, fy - 0.07)
      ctx.lineCap = 'round'
      stroke(g, lit(BARK), 2.2)
    }
    flame(ctx, FIRE.x, fy - 0.02, 0.24 * burn, 0.34 * burn, t, 5)
  }
}

/**
 * The island's own hills behind the pasture: a long ridge of dry grass with an outcrop of bare limestone and dark scrub in
 * its folds, hazier than the near ground, so the cattle graze on a shoulder of land with more of it going back. Faded
 * by the camera's place as it comes and goes, so the piece's edge never cuts it off.
 */
function drawRidge(g: Paint, air: string): void {
  const { ctx, view } = g
  const a = smooth(view.cx, 478, 490) * (1 - smooth(view.cx, 523, 533))
  if (a <= 0.01) return
  const L = layer(view, 9)
  const P = (x: number, y: number): Pt => [L.x(x), L.y(y)]
  const ridge: Pt[] = [
    [495.8, 0.05], [497.6, -0.7], [499.8, -1.7], [502.5, -2.6], [505.5, -3.3], [507.8, -4.1], [509.6, -4.5],
    [511.2, -4.2], [513.4, -3.7], [515.8, -3.9], [518.4, -3.2], [521.0, -2.0], [523.6, 0.05],
  ]
  poly(ctx, ridge.map(([x, y]) => P(x, y)))
  fill(ctx, rgba(mix(lit(GRASS_SHADE), air, 0.35), a))
  // Bare limestone breaking through at its highest shoulder: an outcrop standing a little out of the skyline, its side
  // away from the sun in shade, so it is rock and not a patch laid on the grass.
  poly(ctx, [P(507.5, -3.7), P(508.4, -4.3), P(509.2, -4.75), P(510.1, -4.8), P(510.9, -4.45), P(511.5, -3.95), P(510.5, -3.6), P(509.0, -3.65)])
  fill(ctx, rgba(lit(mix('#8F8672', air, 0.35)), a))
  poly(ctx, [P(507.5, -3.7), P(508.4, -4.3), P(509.2, -4.75), P(509.35, -4.2), P(509.0, -3.65)])
  fill(ctx, rgba(lit(mix('#6F685A', air, 0.35)), a))
  // Scrub in its folds: a few broad dark masses, not a scatter.
  for (const [x, y, w, h] of [[503.6, -2.85, 1.3, 0.38], [513.9, -3.6, 1.6, 0.34], [518.9, -2.95, 1.1, 0.3]] as const) {
    ctx.beginPath()
    ctx.ellipse(L.x(x), L.y(y), w * L.s, h * L.s, 0, Math.PI, 0)
    ctx.closePath()
    fill(ctx, rgba(mix(lit(OLIVE), air, 0.4), a))
  }
}

/**
 * The smoke off the men's fire: one column, going up from the fire and spreading as it goes, bending over downwind
 * as the wind gets up. Its rounds are filled as one shape, dark at the fire and thinning to nothing at the top, so it
 * is a column and not a string of puffs; it grows up from the fire after it is lit.
 */
function drawColumn(g: Paint, x: number, y: number, burn: number): void {
  const { ctx, t } = g
  if (burn <= 0.01) return
  const age = t - FIRE.lit
  const H = 8
  const L = 9
  const N = 48
  const lean = 0.05 + 0.2 * smooth(t, 293, 302)
  ctx.beginPath()
  for (let i = 0; i < N; i++) {
    const u = (((t / L + i / N) % 1) + 1) % 1
    if (u * L > age) continue
    const h = u * H
    const px = x + lean * Math.pow(h, 1.6) + Math.sin(t * 0.4 + i * 1.7) * 0.05 * (0.3 + u)
    const r = 0.17 + 0.7 * u + 0.04 * Math.sin(i * 2.3)
    ctx.moveTo(px + r, y - h)
    ctx.ellipse(px, y - h, r, r * 0.85, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = vgrad(ctx, y - H, y, [
    [0, rgba(SMOKE, 0)],
    [0.5, rgba(SMOKE, 0.5 * burn)],
    [1, rgba(SMOKE, 0.82 * burn)],
  ])
  ctx.fill()
}

function drawOlive(g: Paint, x: number, size: number): void {
  const { ctx } = g
  const y = ground(x)
  ctx.beginPath()
  ctx.moveTo(x - 0.06 * size, y + 0.05)
  ctx.quadraticCurveTo(x - 0.12 * size, y - 0.5 * size, x + 0.02 * size, y - 0.85 * size)
  ctx.lineTo(x + 0.1 * size, y - 0.82 * size)
  ctx.quadraticCurveTo(x + 0.02 * size, y - 0.45 * size, x + 0.08 * size, y + 0.05)
  ctx.closePath()
  fill(ctx, lit(BARK))
  stroke(g, lit(INK), 1.6)
  blob(ctx, [
    [x - 0.75 * size, y - 1.0 * size],
    [x - 0.45 * size, y - 1.45 * size],
    [x + 0.05 * size, y - 1.6 * size],
    [x + 0.6 * size, y - 1.38 * size],
    [x + 0.8 * size, y - 1.02 * size],
    [x + 0.3 * size, y - 0.82 * size],
    [x - 0.35 * size, y - 0.8 * size],
  ])
  fill(ctx, lit(OLIVE))
  stroke(g, lit(INK), 1.6)
}

/** A point `p` turned `a` radians about the origin. */
const turn = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]
const lerpPt = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/**
 * A leg as one tapered shape down its joints: `pts` from the body to the hoof, `w` its width at each. Filled and
 * outlined as one, so it reads as a limb with a forearm and a cannon, not a stick.
 */
function limb(g: Paint, pts: Pt[], w: number[], color: string): void {
  const { ctx } = g
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const n = Math.hypot(dx, dy) || 1
    const ox = (-dy / n) * w[i] * 0.5
    const oy = (dx / n) * w[i] * 0.5
    left.push([pts[i][0] + ox, pts[i][1] + oy])
    right.push([pts[i][0] - ox, pts[i][1] - oy])
  }
  poly(ctx, [...left, ...right.reverse()])
  ctx.lineJoin = 'round'
  fill(ctx, color)
  stroke(g, lit(INK), 1.5)
  // The hoof: a small dark block under the fetlock, flat on the ground.
  const [hx, hy] = pts[pts.length - 1]
  const [px, py] = pts[pts.length - 2]
  const a = Math.atan2(hy - py, hx - px) - Math.PI / 2
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(a)
  poly(ctx, [[-0.024, -0.03], [0.022, -0.03], [0.03, 0.004], [-0.028, 0.004]])
  fill(ctx, lit(HOOF))
  stroke(g, lit(INK), 1.3)
  ctx.restore()
}

/**
 * A cow of Apollo's, in profile: a deep straight-backed barrel a little taller at the withers than two balls, the hip
 * bones and pins square at the rump, a dewlap under the neck, legs that bend at knee and hock onto dark hooves, a tail
 * hanging to the hocks with a switch at its end, and a broad head with a dark muzzle, ears out to the side, and horns
 * spread wide from the poll like a lyre's arms. She grazes: the neck goes down to the grass and the
 * head crops at it, lifting every so often to look round while the tail swings and now and then flicks. `down` (0 to 1)
 * is her lying down as cattle do, the front going down onto its knees first, then the hindquarters folding, then all of
 * her settling with the legs under her; her head goes down to the grass and stays. `fear` (0 to 1) brings her head up
 * high and holds it, ears forward, her weight back, her tail still.
 */
function drawCow(g: Paint, x: number, y: number, dir: 1 | -1, ph: number, down: number, fear = 0): void {
  const { ctx, t } = g
  const hide = lit(HIDE)
  const shade = lit(HIDE_SHADE)
  const far = mix(shade, lit(INK), 0.18)
  // Lying down: the front onto its knees, then the back end down, then the front the rest of the way.
  const knees = smoother(down, 0, 0.5)
  const hocks = smoother(down, 0.35, 0.85)
  const settle = smoother(down, 0.65, 1)
  const front = 0.1 * knees + 0.05 * settle
  const rear = 0.15 * hocks
  // The body's frame: a shear that drops the front by `front` and the rump by `rear` (cells, down the screen).
  const k = (front - rear) / 0.7
  const c = rear + k * 0.35
  const back = -0.025 * fear
  const B = (p: Pt): Pt => [p[0] + back, p[1] + k * p[0] + c]
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  // The head's carriage: the neck turns at its root and the head at the poll. Grazing is the neck down to the grass and
  // the muzzle cropping; she lifts it for a few seconds now and then. Afraid, up high, with a start that settles.
  const graze = smooth(Math.sin(t * 0.32 + ph), 0.55, 0.95)
  const alert = fear + 0.12 * Math.sin(Math.PI * fear)
  const lift = (graze + (1 - graze) * alert) * (1 - down)
  const crop = 0.045 * Math.sin(t * 6.6 + ph * 3) * (1 - lift) * (1 - down)
  const want = ((1.0 + crop) * (1 - lift) - 0.1 * lift - 0.2 * alert * (1 - down)) * (1 - down) + 1.0 * down
  const nod = (0.1 * (1 - lift) - 0.06 * alert) * (1 - down) + 0.15 * down
  const root = B([0.25, -0.37])
  const slope = Math.atan(k)
  const HEAD = 1.3
  // The neck's root, its poll, and the chin under the muzzle, for a neck turned `n`.
  const pollFor = (n: number): Pt => {
    const o = turn([0.15, -0.065], n + slope)
    return [root[0] + o[0], root[1] + o[1]]
  }
  const chinFor = (n: number): number => pollFor(n)[1] + turn([0.12 * HEAD, 0.205 * HEAD], 0.45 * n + nod + slope)[1]
  // Never through the grass: as the front goes down, the neck comes up just as far as keeps the muzzle on it.
  let neck = want
  if (chinFor(want) > -0.008) {
    let lo = -0.3
    let hi = want
    for (let i = 0; i < 10; i++) {
      const m = (lo + hi) / 2
      if (chinFor(m) > -0.008) hi = m
      else lo = m
    }
    neck = lo
  }
  const poll = pollFor(neck)
  const headTurn = 0.45 * neck + nod + slope
  const H = (p: Pt): Pt => {
    const q = turn([p[0] * HEAD, p[1] * HEAD], headTurn)
    return [poll[0] + q[0], poll[1] + q[1]]
  }
  // The legs, joints from the body down, standing and folded under her; the far pair first, darker and set back.
  const legs: { top: Pt; stand: Pt[]; fold: Pt[]; u: number }[] = [
    { top: [0.2, -0.24], stand: [[0.2, -0.105], [0.205, -0.032], [0.212, 0]], fold: [[0.24, -0.03], [0.14, -0.032], [0.1, -0.02]], u: knees },
    { top: [-0.22, -0.26], stand: [[-0.3, -0.125], [-0.275, -0.032], [-0.27, 0]], fold: [[-0.3, -0.035], [-0.2, -0.032], [-0.15, -0.02]], u: hocks },
  ]
  const step = 0.012 * Math.sin(t * 0.21 + ph * 1.3) * (1 - down) * (1 - fear)
  for (const [off, color, near] of [[-0.06, far, false], [0, hide, true]] as const) {
    for (const [i, leg] of legs.entries()) {
      const dx = off + (i === 0 ? (near ? step : -step) : 0) + back
      const top = B([leg.top[0] + off, leg.top[1]])
      const joints = leg.stand.map((p, j): Pt => {
        const q = lerpPt(p, leg.fold[j], leg.u)
        return [q[0] + dx, q[1]]
      })
      limb(g, [top, ...joints], i === 0 ? [0.085, 0.055, 0.044, 0.044] : [0.1, 0.058, 0.044, 0.044], color)
    }
  }
  // The tail, hanging from the tail head to the hocks with its switch, swinging slowly and now and then flicking; it comes
  // down to the grass behind her once she is down.
  const tailRoot = B([-0.335, -0.42])
  const flick = Math.max(0, Math.sin(t * 0.7 + ph * 2.1)) ** 6 * Math.sin(t * 5.5 + ph)
  const calm = (1 - down) * (1 - 0.85 * fear)
  const a1 = (0.1 * Math.sin(t * 1.1 + ph * 2) + 0.1 * flick) * calm + 0.06 + 0.3 * down
  const a2 = (0.16 * Math.sin(t * 1.1 + ph * 2 - 0.9) + 0.3 * flick) * calm + 0.04 + 0.9 * down
  const mid: Pt = [tailRoot[0] - 0.15 * Math.sin(a1), tailRoot[1] + 0.15 * Math.cos(a1)]
  const tip: Pt = [mid[0] - 0.12 * Math.sin(a2), Math.min(-0.03, mid[1] + 0.12 * Math.cos(a2))]
  ctx.beginPath()
  ctx.moveTo(tailRoot[0], tailRoot[1])
  ctx.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1])
  ctx.lineCap = 'round'
  stroke(g, lit(INK), 2.2)
  const ta = Math.atan2(tip[1] - mid[1], tip[0] - mid[0])
  ctx.save()
  ctx.translate(tip[0], tip[1])
  ctx.rotate(ta)
  ctx.beginPath()
  ctx.moveTo(-0.01, 0)
  ctx.quadraticCurveTo(0.02, -0.024, 0.075, 0)
  ctx.quadraticCurveTo(0.02, 0.024, -0.01, 0)
  fill(ctx, mix(shade, lit(HOOF), 0.55))
  stroke(g, lit(INK), 1.3)
  ctx.restore()
  // Body and neck as one shape: rump square at the pins, the back straight from hips to withers, the neck up to the poll,
  // the dewlap hanging from the throat to the brisket, the belly deep, the flank tucked up to the stifle.
  const throat = H([-0.05, 0.05])
  const brisket = B([0.32, -0.22])
  const dewlap = lerpPt(throat, brisket, 0.55)
  dewlap[1] += 0.035
  const sil: Pt[] = [
    B([-0.335, -0.425]),
    B([-0.22, -0.445]),
    B([-0.06, -0.43]),
    B([0.12, -0.445]),
    B([0.2, -0.455]),
    lerpPt(B([0.22, -0.45]), H([-0.035, -0.02]), 0.5),
    H([-0.035, -0.02]),
    throat,
    dewlap,
    brisket,
    B([0.22, -0.185]),
    B([0.02, -0.17]),
    B([-0.16, -0.19]),
    B([-0.26, -0.21]),
    B([-0.36, -0.27]),
    B([-0.365, -0.38]),
  ]
  blob(ctx, sil)
  ctx.lineJoin = 'round'
  fill(ctx, hide)
  // The belly's shade, and the creases at the shoulder and the hip that set the barrel between them.
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  ctx.moveTo(-1, 0.4)
  for (const [px, py] of [B([-0.5, -0.255]), B([0.5, -0.255])]) ctx.lineTo(px, py)
  ctx.lineTo(1, 0.4)
  ctx.closePath()
  fill(ctx, rgba(shade, 0.75))
  ctx.beginPath()
  for (const [i, p] of [B([0.17, -0.44]), B([0.235, -0.36]), B([0.23, -0.24])].entries()) i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])
  ctx.moveTo(...B([-0.22, -0.44]))
  ctx.quadraticCurveTo(...B([-0.17, -0.32]), ...B([-0.25, -0.22]))
  stroke(g, shade, 1.6)
  ctx.restore()
  blob(ctx, sil)
  stroke(g, lit(INK), 1.8)
  // The hip bone, just showing on the line of the back.
  ctx.beginPath()
  const hook = B([-0.22, -0.43])
  ctx.ellipse(hook[0], hook[1], 0.028, 0.012, 0, Math.PI * 1.05, Math.PI * 1.95)
  stroke(g, shade, 1.4)
  // The head, from the poll: the far horn and ear behind it, the near ones over.
  ctx.save()
  ctx.translate(poll[0], poll[1])
  ctx.rotate(headTurn)
  ctx.scale(HEAD, HEAD)
  const earUp = 0.035 * fear + 0.012 * Math.max(0, Math.sin(t * 0.9 + ph * 4)) ** 12 * (1 - down)
  // The horns as a lyre's arms, drawn wide as the old painters drew them on a head in profile: out from the poll to
  // either side, up, in, and out again at the tips.
  const horn = (side: number, color: string): void => {
    ctx.beginPath()
    ctx.moveTo(0.01 * side, -0.02)
    ctx.bezierCurveTo(0.13 * side, -0.01, 0.175 * side, -0.06, 0.15 * side, -0.135)
    ctx.quadraticCurveTo(0.14 * side, -0.175, 0.185 * side, -0.19)
    ctx.lineCap = 'round'
    stroke(g, lit(INK), 4.6 / HEAD)
    stroke(g, color, 2.2 / HEAD)
  }
  const ear = (dx: number, color: string): void => {
    ctx.beginPath()
    ctx.moveTo(-0.02 + dx, -0.005)
    ctx.quadraticCurveTo(-0.08 + dx, -0.04 - earUp, -0.11 + dx, 0.0 - earUp)
    ctx.quadraticCurveTo(-0.07 + dx, 0.03, -0.015 + dx, 0.02)
    ctx.closePath()
    fill(ctx, color)
    stroke(g, lit(INK), 1.4 / HEAD)
  }
  horn(-1, mix(lit('#D8CBAE'), lit(INK), 0.2))
  ear(0.015, far)
  const head: Pt[] = [
    [-0.03, -0.03], [0.03, -0.025], [0.075, 0.04], [0.115, 0.13], [0.13, 0.175], [0.115, 0.205], [0.075, 0.2],
    [0.04, 0.14], [-0.02, 0.09], [-0.055, 0.04],
  ]
  blob(ctx, head)
  fill(ctx, hide)
  stroke(g, lit(INK), 1.6 / HEAD)
  // The muzzle, broad and dark, a nostril in it; the eye.
  ctx.beginPath()
  ctx.ellipse(0.105, 0.172, 0.035, 0.03, -0.5, 0, Math.PI * 2)
  fill(ctx, mix(shade, lit(HOOF), 0.7))
  ctx.beginPath()
  ctx.arc(0.112, 0.162, 0.008, 0, Math.PI * 2)
  fill(ctx, lit(INK))
  ctx.beginPath()
  ctx.arc(0.025, 0.035, 0.011, 0, Math.PI * 2)
  fill(ctx, lit(INK))
  ear(0, hide)
  horn(1, lit('#E6DCC2'))
  ctx.restore()
  ctx.restore()
}
