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

export function drawIsland(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 488 || view.x0 > 532) return
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
  fill(ctx, mix(GRASS_SHADE, air, 0.55))
  drawRidge(g, air)
  // The land: grass over the whole hill, darkening towards the water; under the water it goes on down and out, a
  // mound that the cut sea darkens.
  const pts: Pt[] = []
  for (let x = GROUND[0][0]; x <= GROUND[GROUND.length - 1][0] + 1e-6; x += 0.25) pts.push([x, ground(x)])
  const land: Pt[] = [...pts, [525.6, 1.5], [527.2, 2.6], [492.2, 2.6], [493.8, 1.5]]
  poly(ctx, land)
  ctx.fillStyle = vgrad(ctx, -2.1, 0.4, [
    [0, GRASS],
    [0.55, mix(GRASS, GRASS_SHADE, 0.35)],
    [1, GRASS_SHADE],
  ])
  ctx.fill()
  // The beaches: a band of sand along the ground where it meets the water, either side.
  for (const [a, b] of [[495.6, 499.6], [520.2, 523.8]] as const) {
    const top = pts.filter(([x]) => x >= a && x <= b)
    poly(ctx, [...top, ...[...top].reverse().map(([x, y]): Pt => [x, y + 0.22])])
    fill(ctx, SAND)
  }
  // Dry scrub on the near slope, below the pasture's edge: a few low dark clumps, bigger as they come down towards us.
  for (const [x, dy, w] of [[501.2, 0.55, 0.42], [505.0, 0.95, 0.55], [510.6, 0.7, 0.5], [515.2, 1.1, 0.6], [520.4, 0.6, 0.4]] as const) {
    const y = ground(x) + dy
    ctx.beginPath()
    ctx.ellipse(x, y, w, w * 0.42, 0, Math.PI, 0)
    ctx.ellipse(x + w * 0.55, y + 0.02, w * 0.55, w * 0.3, 0, Math.PI, 0)
    ctx.closePath()
    fill(ctx, mix(OLIVE, GRASS_SHADE, 0.35))
  }
  poly(ctx, pts, false)
  stroke(g, INK, 2)
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
      stroke(g, BARK, 2.2)
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
  fill(ctx, rgba(mix(GRASS_SHADE, air, 0.35), a))
  // Bare limestone breaking through at its highest shoulder: an outcrop standing a little out of the skyline, its side
  // away from the sun in shade, so it is rock and not a patch laid on the grass.
  poly(ctx, [P(507.5, -3.7), P(508.4, -4.3), P(509.2, -4.75), P(510.1, -4.8), P(510.9, -4.45), P(511.5, -3.95), P(510.5, -3.6), P(509.0, -3.65)])
  fill(ctx, rgba(mix('#8F8672', air, 0.35), a))
  poly(ctx, [P(507.5, -3.7), P(508.4, -4.3), P(509.2, -4.75), P(509.35, -4.2), P(509.0, -3.65)])
  fill(ctx, rgba(mix('#6F685A', air, 0.35), a))
  // Scrub in its folds: a few broad dark masses, not a scatter.
  for (const [x, y, w, h] of [[503.6, -2.85, 1.3, 0.38], [513.9, -3.6, 1.6, 0.34], [518.9, -2.95, 1.1, 0.3]] as const) {
    ctx.beginPath()
    ctx.ellipse(L.x(x), L.y(y), w * L.s, h * L.s, 0, Math.PI, 0)
    ctx.closePath()
    fill(ctx, rgba(mix(OLIVE, air, 0.4), a))
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
  fill(ctx, BARK)
  stroke(g, INK, 1.6)
  blob(ctx, [
    [x - 0.75 * size, y - 1.0 * size],
    [x - 0.45 * size, y - 1.45 * size],
    [x + 0.05 * size, y - 1.6 * size],
    [x + 0.6 * size, y - 1.38 * size],
    [x + 0.8 * size, y - 1.02 * size],
    [x + 0.3 * size, y - 0.82 * size],
    [x - 0.35 * size, y - 0.8 * size],
  ])
  fill(ctx, OLIVE)
  stroke(g, INK, 1.6)
}

/**
 * A cow of Apollo's: about three balls long, cream, with a darker muzzle and hooves and horns curving up like a lyre's
 * arms. She grazes (her head down, lifting now and then, slowly). `down` (0 to 1) is her going down: the legs fold under
 * her, her body comes down onto the grass, and her head goes down and stays. `fear` (0 to 1) lifts her head and holds
 * it up, her tail still.
 */
function drawCow(g: Paint, x: number, y: number, dir: 1 | -1, ph: number, down: number, fear = 0): void {
  const { ctx, t } = g
  const L = 0.66
  const legH = 0.21 * (1 - down)
  const bodyY = y - legH - 0.15 + 0.03 * down
  ctx.save()
  ctx.translate(x, 0)
  ctx.scale(dir, 1)
  // Grazing: the head mostly down, lifted for a few seconds every so often; still once she is down.
  const graze = smooth(Math.sin(t * 0.32 + ph), 0.55, 0.95)
  const lift = (graze + (1 - graze) * fear) * (1 - down)
  const headDrop = 0.17 * (1 - lift) + 0.08 * down - 0.03 * fear
  const tail = 0.18 * Math.sin(t * 1.1 + ph * 2) * (1 - down) * (1 - 0.85 * fear)
  // Legs: two seen pairs, a little apart; under her when she kneels.
  for (const lx of [-0.25, -0.17, 0.15, 0.24]) {
    const fold = down
    const knee: Pt = [lx + 0.04 * fold, bodyY + 0.12 + legH * 0.5]
    ctx.beginPath()
    ctx.moveTo(lx, bodyY + 0.08)
    ctx.lineTo(knee[0], knee[1])
    ctx.lineTo(lx + 0.01 - 0.08 * fold, y - 0.005 - 0.02 * fold)
    ctx.lineCap = 'round'
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.05 + 2 / 108
    ctx.stroke()
    ctx.strokeStyle = mix(HIDE_SHADE, HOOF, 0.35)
    ctx.lineWidth = 0.05
    ctx.stroke()
  }
  // The body: a long barrel with a rise over the shoulders.
  const body: Pt[] = [
    [-L / 2, bodyY + 0.02],
    [-L / 2 + 0.02, bodyY - 0.1],
    [-0.1, bodyY - 0.15],
    [0.18, bodyY - 0.18],
    [L / 2 - 0.02, bodyY - 0.12],
    [L / 2, bodyY + 0.02],
    [L / 2 - 0.08, bodyY + 0.12],
    [-L / 2 + 0.06, bodyY + 0.12],
  ]
  blob(ctx, body)
  fill(ctx, HIDE)
  poly(ctx, [[-L / 2, bodyY + 0.02], [L / 2, bodyY + 0.02], [L / 2 - 0.08, bodyY + 0.12], [-L / 2 + 0.06, bodyY + 0.12]])
  fill(ctx, rgba(HIDE_SHADE, 0.7))
  blob(ctx, body)
  stroke(g, INK, 1.8)
  // The tail, swinging slowly.
  ctx.beginPath()
  ctx.moveTo(-L / 2 + 0.02, bodyY - 0.08)
  ctx.quadraticCurveTo(-L / 2 - 0.06 + tail * 0.2, bodyY + 0.06, -L / 2 - 0.02 + tail * 0.3, bodyY + 0.18)
  stroke(g, INK, 1.6)
  // The head on its neck: down to the grass, or up.
  const hx = L / 2 + 0.1
  const hy = bodyY - 0.12 + headDrop
  ctx.beginPath()
  ctx.moveTo(L / 2 - 0.08, bodyY - 0.12)
  ctx.lineTo(hx - 0.02, hy - 0.04)
  ctx.lineTo(hx + 0.02, hy + 0.06)
  ctx.lineTo(L / 2 - 0.04, bodyY + 0.02)
  ctx.closePath()
  fill(ctx, HIDE)
  stroke(g, INK, 1.6)
  const head: Pt[] = [[hx - 0.05, hy - 0.06], [hx + 0.08, hy - 0.04], [hx + 0.13, hy + 0.06], [hx + 0.09, hy + 0.1], [hx - 0.04, hy + 0.06]]
  blob(ctx, head)
  fill(ctx, HIDE)
  stroke(g, INK, 1.6)
  // The muzzle, and the horns: up and out, and turning in at their tips.
  ctx.beginPath()
  ctx.ellipse(hx + 0.11, hy + 0.06, 0.035, 0.03, 0, 0, Math.PI * 2)
  fill(ctx, HOOF)
  ctx.beginPath()
  ctx.moveTo(hx - 0.01, hy - 0.05)
  ctx.quadraticCurveTo(hx - 0.2, hy - 0.1, hx - 0.13, hy - 0.24)
  ctx.lineTo(hx - 0.16, hy - 0.28)
  ctx.moveTo(hx + 0.03, hy - 0.05)
  ctx.quadraticCurveTo(hx + 0.2, hy - 0.1, hx + 0.13, hy - 0.24)
  ctx.lineTo(hx + 0.16, hy - 0.28)
  ctx.lineCap = 'round'
  stroke(g, INK, 2.4)
  ctx.restore()
}
