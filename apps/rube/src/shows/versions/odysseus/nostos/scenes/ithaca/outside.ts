import { circle, fill, poly, rect, smoother, stroke, type Paint } from '../../draw'
import { ARGOS, HOIST, HOME, TOP } from './geo'
import { TIMBER, outdoors } from './look'
import { heroBasketY, pinOut, stonesBasketY } from './rig'

/**
 * Out of doors on Ithaca's top: the fishermen's hoist over the east cliff, and Argos on his straw by the courtyard's
 * gate, old, asleep through the years; awake once, for him.
 */

const BASKET = { half: 0.17, h: 0.16 }

/** The hoist's gallows, the pulley, the rope and the two baskets' backs (drawn behind the balls). */
export function drawHoist(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 805 || view.x0 > 810) return
  const timber = outdoors(TIMBER, t)
  const ink = outdoors('#2B241C', t)
  const [px, py] = HOIST.pulley
  // The post on the top, a beam out over the edge, a brace.
  rect(ctx, HOIST.post - 0.045, py - 0.08, 0.09, TOP - py + 0.08)
  fill(ctx, timber)
  rect(ctx, px - 0.14, py - 0.1, HOIST.post - px + 0.2, 0.07)
  fill(ctx, timber)
  ctx.beginPath()
  ctx.moveTo(HOIST.post, py + 0.55)
  ctx.lineTo(HOIST.post - 0.5, py - 0.04)
  stroke(g, timber, 2.4)
  // The rope: down to each basket from either side of the wheel.
  const hy = heroBasketY(t)
  const sy = stonesBasketY(t)
  ctx.beginPath()
  ctx.moveTo(HOIST.hero, py)
  ctx.lineTo(HOIST.hero, hy - BASKET.h - 0.2)
  ctx.moveTo(HOIST.stones, py)
  ctx.lineTo(HOIST.stones, sy - BASKET.h - 0.2)
  stroke(g, outdoors('#5C4A36', t), 1.1)
  // The wheel.
  circle(ctx, px, py, 0.22)
  fill(ctx, outdoors('#6E5640', t))
  stroke(g, ink, 1.4)
  circle(ctx, px, py, 0.04)
  fill(ctx, ink)
  // The pin that held the stones, pulled as he lands below.
  const pin = pinOut(t)
  rect(ctx, HOIST.stones - 0.02 + pin * 0.3, py + 0.22, 0.2, 0.04)
  fill(ctx, timber)
  // The baskets' backs and their bails.
  for (const [x, y] of [[HOIST.hero, hy], [HOIST.stones, sy]] as const) {
    ctx.beginPath()
    ctx.moveTo(x - BASKET.half, y - BASKET.h - 0.01)
    ctx.quadraticCurveTo(x, y - BASKET.h - 0.34, x + BASKET.half, y - BASKET.h - 0.01)
    stroke(g, outdoors('#5C4A36', t), 1.2)
    rect(ctx, x - BASKET.half * 0.9, y - BASKET.h, BASKET.half * 1.8, BASKET.h)
    fill(ctx, outdoors('#6F5A3E', t))
  }
  // The stones in theirs.
  for (const [dx, r] of [[-0.07, 0.07], [0.06, 0.065], [0, 0.06]] as const) {
    circle(ctx, HOIST.stones + dx, sy - BASKET.h + 0.02 - r * 0.5, r)
    fill(ctx, outdoors('#8C8270', t))
  }
}

/** The baskets' fronts, over whoever rides in them. */
export function overHoist(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 805 || view.x0 > 810) return
  const front = outdoors('#8A7350', t)
  const band = outdoors('#5E4A33', t)
  for (const [x, y] of [[HOIST.hero, heroBasketY(t)], [HOIST.stones, stonesBasketY(t)]] as const) {
    poly(ctx, [[x - BASKET.half, y - BASKET.h], [x + BASKET.half, y - BASKET.h], [x + BASKET.half * 0.86, y], [x - BASKET.half * 0.86, y]])
    fill(ctx, front)
    rect(ctx, x - BASKET.half, y - BASKET.h, 2 * BASKET.half, 0.03)
    fill(ctx, band)
    rect(ctx, x - BASKET.half * 0.93, y - BASKET.h * 0.45, 2 * BASKET.half * 0.93, 0.025)
    fill(ctx, band)
  }
}

/* ------------------------------------------------------------------ Argos */

/** How his head is raised, 0 down on his paws to 1 up; whether he still breathes. */
function argosHead(t: number): number {
  if (t < HOME.sees - 0.4) return 0
  const up = smoother(t, HOME.sees - 0.4, HOME.sees + 0.3)
  const down = smoother(t, HOME.dies - 1.1, HOME.dies)
  return up * (1 - down)
}

/**
 * Argos: an old hound lying on a heap of straw, his head on his forepaws, facing the edge the stranger will come over.
 * He has slept through the years; when the beggar comes over the edge he lifts his head, his tail goes once, and he
 * lays his head down and does not breathe again. About two balls long: a big dog, gone thin.
 */
export function drawArgos(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < ARGOS.x - 1 || view.x0 > ARGOS.x + 1 || view.y1 < TOP - 1 || view.y0 > TOP + 0.5) return
  const x = ARGOS.x
  const y = ARGOS.y
  const coat = outdoors('#806B52', t)
  const back = outdoors('#5F4E3C', t)
  const grey = outdoors('#AFA08A', t)
  const dark = outdoors('#2E261E', t)
  // The straw under him.
  ctx.beginPath()
  ctx.ellipse(x + 0.04, y, 0.4, 0.05, 0, Math.PI, 0)
  fill(ctx, outdoors('#B49F6E', t))
  // His breath, slow, and then none.
  const breath = 0.006 * Math.sin(t * 1.6) * (1 - smoother(t, HOME.dies - 0.4, HOME.dies + 0.3))
  // The tail, lying out behind him to the west, a long feathered sweep; it goes once: up off the straw, and down.
  const w = Math.max(0, Math.min(1, (t - HOME.wag) / 0.75))
  const wag = Math.pow(Math.sin(Math.PI * w), 1.4)
  ctx.save()
  ctx.translate(x + 0.22, y - 0.05)
  ctx.rotate(-wag * 1.05)
  ctx.beginPath()
  ctx.moveTo(0, -0.02)
  ctx.quadraticCurveTo(0.12, -0.03, 0.2, 0.025)
  ctx.quadraticCurveTo(0.12, 0.02, 0, 0.025)
  ctx.closePath()
  fill(ctx, back)
  ctx.restore()
  // The haunch, the body (chest high at the front, and up off the straw while he looks), the line of the back darker.
  const up = argosHead(t)
  const chest = 0.04 * up
  ctx.beginPath()
  ctx.ellipse(x + 0.15, y - 0.065 - breath * 0.5, 0.1, 0.07, 0, 0, Math.PI * 2)
  fill(ctx, back)
  ctx.beginPath()
  ctx.moveTo(x - 0.14, y - 0.005)
  ctx.quadraticCurveTo(x - 0.17, y - 0.13 - breath - chest, x - 0.06, y - 0.14 - breath - chest * 0.6)
  ctx.quadraticCurveTo(x + 0.08, y - 0.15 - breath, x + 0.2, y - 0.12 - breath * 0.5)
  ctx.quadraticCurveTo(x + 0.27, y - 0.06, x + 0.22, y - 0.005)
  ctx.closePath()
  fill(ctx, coat)
  ctx.beginPath()
  ctx.moveTo(x - 0.08, y - 0.135 - breath - chest * 0.6)
  ctx.quadraticCurveTo(x + 0.06, y - 0.155 - breath, x + 0.2, y - 0.12 - breath * 0.5)
  ctx.quadraticCurveTo(x + 0.06, y - 0.13 - breath, x - 0.08, y - 0.12 - breath - chest * 0.6)
  ctx.closePath()
  fill(ctx, back)
  // The hind foot tucked under, the forelegs out east along the straw.
  ctx.beginPath()
  ctx.ellipse(x + 0.2, y - 0.012, 0.06, 0.016, 0, 0, Math.PI * 2)
  fill(ctx, back)
  rect(ctx, x - 0.31, y - 0.03, 0.2, 0.03)
  fill(ctx, coat)
  rect(ctx, x - 0.33, y - 0.028, 0.05, 0.028)
  fill(ctx, grey)
  // The head: down on the paws, or lifted towards the edge, the neck up off them.
  ctx.save()
  ctx.translate(x - 0.15, y - 0.08 - chest)
  ctx.rotate(-0.42 * up + 0.12 * (1 - up))
  ctx.translate(0, -0.05 * up)
  // Skull, then the long muzzle going east, grey with age; the nose; the eye, open while he looks.
  ctx.beginPath()
  ctx.ellipse(-0.02, -0.01, 0.07, 0.06, 0, 0, Math.PI * 2)
  fill(ctx, coat)
  ctx.beginPath()
  ctx.moveTo(-0.05, -0.04)
  ctx.quadraticCurveTo(-0.16, -0.035, -0.175, 0.0)
  ctx.quadraticCurveTo(-0.17, 0.035, -0.06, 0.035)
  ctx.closePath()
  fill(ctx, grey)
  ctx.beginPath()
  ctx.ellipse(-0.17, -0.008, 0.016, 0.014, 0, 0, Math.PI * 2)
  fill(ctx, dark)
  if (up > 0.12) {
    ctx.beginPath()
    ctx.ellipse(-0.055, -0.025, 0.011 * Math.min(1, up * 2), 0.009, 0, 0, Math.PI * 2)
    fill(ctx, dark)
  } else {
    ctx.beginPath()
    ctx.moveTo(-0.068, -0.024)
    ctx.lineTo(-0.042, -0.022)
    stroke(g, dark, 0.9)
  }
  // The ear, long and hanging, lifting a little with his head.
  ctx.beginPath()
  ctx.moveTo(0.0, -0.05)
  ctx.quadraticCurveTo(0.05 - 0.02 * up, -0.01, 0.03, 0.06 - 0.02 * up)
  ctx.quadraticCurveTo(-0.01, 0.04, -0.015, -0.035)
  ctx.closePath()
  fill(ctx, back)
  ctx.restore()
}
