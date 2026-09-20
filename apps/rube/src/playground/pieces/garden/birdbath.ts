import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { drop, gardenWater, soil, tuft } from '../../../pieces/garden/green'

/**
 * A birdbath, seen from the side and cut through: a wide dish of water on a
 * short pedestal, its rim level with the path, which runs straight onto it.
 * The ball rolls over the near rim and down the dish's inside into the
 * water — a splash — and ploughs across half sunk, slowing, shoving the
 * water ahead of it. The water heaps up against the far side, and the ball
 * is carried up the dish's inside on the swell and out over the pouring lip
 * onto the path, a slop of water going over with it and dripping off the
 * lip. The water rocks itself level behind it.
 *
 * The ball floats on the water's line, wherever that is under it, until the
 * dish's inside is shallower than that and takes it; so its lane is the
 * dish's own shape at both ends and the water's in the middle, and the
 * water's line is one tilting level.
 */
/** The dish: half its width inside at the rim, how deep it is in the middle, its wall, and how square its section is. */
const HW = 0.34
const DEPTH = 0.13
const WALL = 0.07
const SQUARE = 2.4
/** The water's level at rest, and how far under it the ball's centre rides. */
const WATER = FLOOR + 0.02
const FLOAT = -0.035
/** How far the water heaps up toward the far side, how long it takes to get there, and how it dies away. */
const HEAP = 0.04
const SWING = 0.9
const DAMP = 1.6
/** Its pace across the water once the splash has taken the way off it, how fast it loses it, and the pace the swell gives it over the lip. */
const DRIFT = 0.3
const BRAKE = 0.045
const SWELL_V = 1.31
/** How far into the water's swing the swell reaches the ball. */
const LIFT_AT = 0.664

/** The dish's inside, and its outside: a squarish bowl, flat in the middle and steep at the rims. */
const inside = (x: number): number => FLOOR + DEPTH * (1 - Math.pow(Math.min(1, Math.abs(x) / HW), SQUARE))
const outside = (x: number): number => FLOOR + (DEPTH + WALL) * (1 - Math.pow(Math.min(1, Math.abs(x) / (HW + WALL)), SQUARE))

/** The ball is on the path to here, and from there; between, it is the dish's. */
const X_IN = -HW - WALL
const X_OUT = HW + WALL
const T_IN = (X_IN + 0.5) / ROLL

/** How far the water is heaped toward the far side, `t` seconds into the piece; negative when it has rocked back. */
function heap(t: number): number {
  const tau = t - T_SPLASH
  return tau <= 0 ? 0 : HEAP * Math.sin((Math.PI / 2) * (tau / SWING)) * Math.exp(-DAMP * Math.max(0, tau - SWING))
}
/** The water's highest: a hair over the rim. What would stand higher than that has slopped out. */
const BRIM = FLOOR - 0.012
/**
 * The water's line at `x`, `t` seconds into the piece: level until the
 * splash, then rocking — heaped toward the far side first, then back, less
 * each time.
 */
function surface(x: number, t: number): number {
  return Math.max(BRIM, WATER - heap(t) * Math.sin(((Math.PI / 2) * x) / HW))
}

/**
 * The ball's centre over `x` with the dish dry: level over the rim, round
 * the rim's inner corner, then a radius off the dish's inside along its
 * normal, so a ball on the slope touches the slope and is not sunk in it.
 */
const SLOPE = (DEPTH * SQUARE) / HW
const CORNER = R * Math.sin(Math.atan(SLOPE))
const OFFSET: Pt[] = []
for (let i = 0; i <= 200; i++) {
  const x = (HW * i) / 200
  const d = -SLOPE * Math.pow(x / HW, SQUARE - 1)
  const norm = Math.hypot(1, d)
  OFFSET.push([x + (R * d) / norm, inside(x) - R / norm])
}
function dry(x: number): number {
  const a = Math.abs(x)
  if (a >= HW) return 0
  if (a >= HW - CORNER) return R - Math.sqrt(R * R - (HW - a) * (HW - a))
  let i = 1
  while (i < OFFSET.length - 1 && OFFSET[i][0] < a) i++
  const [x0, y0] = OFFSET[i - 1]
  const [x1, y1] = OFFSET[i]
  return y0 + ((y1 - y0) * (a - x0)) / (x1 - x0)
}

/** The ball's centre over `x` at `t`: afloat, or on the dish's inside where that is shallower. */
const seat = (x: number, t: number): number => Math.min(surface(x, t) + FLOAT, dry(x))

/** Where it meets the water coming in, and when. */
const X_SPLASH = (() => {
  let x = -HW
  while (dry(x) < WATER + FLOAT) x += 0.002
  return x
})()
const T_SPLASH = T_IN + (X_SPLASH - X_IN) / ROLL
/** When the swell reaches the ball. */
const T_LIFT = T_SPLASH + SWING * LIFT_AT

/**
 * The crossing: where the ball is along the dish, every 1/480 s from the
 * near rim. At the path's pace to the water; the splash takes the way off
 * it, down to a drift; then the swell, on its way to the far side, picks
 * it up and hurries it over the lip.
 */
const DT = 1 / 480
const CROSS: number[] = [X_IN]
{
  let x = X_IN
  let v = ROLL
  while (x < X_OUT && CROSS.length < 2000) {
    const t = T_IN + CROSS.length * DT
    const lift = over(t, T_LIFT - 0.06, T_LIFT + 0.06)
    const want = x < X_SPLASH ? ROLL : DRIFT + (SWELL_V - DRIFT) * lift
    v += ((want - v) / (BRAKE + (0.2 - BRAKE) * lift)) * DT
    x += v * DT
    CROSS.push(x)
    if (t > 5) break
  }
}
const LAST = CROSS.length - 1
const ACROSS = (LAST - 1 + (X_OUT - CROSS[LAST - 1]) / (CROSS[LAST] - CROSS[LAST - 1])) * DT
const PACE_OUT = (CROSS[LAST] - CROSS[LAST - 1]) / DT

/** The ball in the dish, `t` seconds into the piece. */
function ballAt(t: number): Pt {
  const f = Math.max(0, Math.min(LAST, (t - T_IN) / DT))
  const i = Math.floor(f)
  const x = Math.min(X_OUT, CROSS[i] + (CROSS[Math.min(LAST, i + 1)] - CROSS[i]) * (f - i))
  return [x, seat(x, t)]
}

const LANE: Lane = {
  segs: [roll([-0.5, 0], [X_IN, 0], ROLL), ...trace(ballAt, T_IN, T_IN + ACROSS, 40), ramp([X_OUT, 0], [0.5, 0], PACE_OUT, ROLL)],
  fire: T_SPLASH,
}

/** The splash's drops: which way each is thrown and how hard. */
const DROPS: [number, number][] = [
  [-0.5, 2.0],
  [-0.15, 2.7],
  [0.25, 3.0],
  [0.6, 2.4],
]

/** Where the water's line meets the dish's inside at `t`, on the near side (-1) or the far (1). */
function shore(side: -1 | 1, t: number): number {
  let lo = 0
  let hi = HW
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (surface(side * mid, t) < inside(side * mid)) lo = mid
    else hi = mid
  }
  return side * lo
}

/** The water in the dish at `t`: its line from shore to shore, as points. */
function waterline(t: number): Pt[] {
  const x0 = shore(-1, t)
  const x1 = shore(1, t)
  const pts: Pt[] = []
  for (let i = 0; i <= 28; i++) {
    const x = x0 + ((x1 - x0) * i) / 28
    pts.push([x, surface(x, t)])
  }
  return pts
}

/** The water as one shape, from its line down to the dish's inside. */
function water(p: p5, k: number, line: Pt[]): void {
  p.beginShape()
  for (const [x, y] of line) p.vertex(x * k, y * k)
  for (let i = line.length - 1; i >= 0; i--) p.vertex(line[i][0] * k, inside(line[i][0]) * k)
  p.endShape(p.CLOSE)
}

export const birdbath = definePiece<{ color: string; water: string }>({
  name: 'birdbath',
  weight: 1,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const wet = gardenWater(theme, ball.color)
    // The dish is never the water's colour, or it would look brim-full of itself.
    const dish = color !== wet ? color : rng.pick(theme.colors.filter((c) => c !== wet && c !== ball.color)) ?? color
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: dish, water: wet } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The path in to the near rim and out from the pouring lip; the ground.
    rail(p, k, ink, weight, -0.5, X_IN)
    rail(p, k, ink, weight, X_OUT, 0.5)
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, -0.42, 0.5, 0.1, -0.02)

    // The pedestal: a foot, and a stem that swells under the dish.
    solid(p, ink, weight, bg)
    p.rect(0, 0.475 * k, 0.3 * k, 0.05 * k, 0.012 * k)
    p.beginShape()
    p.vertex(-0.1 * k, (FLOOR + DEPTH + WALL - 0.01) * k)
    p.vertex(0.1 * k, (FLOOR + DEPTH + WALL - 0.01) * k)
    p.quadraticVertex(0.03 * k, 0.4 * k, 0.07 * k, 0.45 * k)
    p.vertex(-0.07 * k, 0.45 * k)
    p.quadraticVertex(-0.03 * k, 0.4 * k, -0.1 * k, (FLOOR + DEPTH + WALL - 0.01) * k)
    p.endShape(p.CLOSE)

    // The dish, cut through: its wall from rim to rim, a pouring lip on the far one.
    const n = 32
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = -HW - WALL + (2 * (HW + WALL) * i) / n
      p.vertex(x * k, outside(x) * k)
    }
    p.vertex((X_OUT + 0.05) * k, (FLOOR + 0.035) * k)
    p.vertex(X_OUT * k, FLOOR * k)
    for (let i = n; i >= 0; i--) {
      const x = -HW + (2 * HW * i) / n
      p.vertex(x * k, inside(x) * k)
    }
    p.endShape(p.CLOSE)

    // The water, behind the ball.
    p.noStroke()
    p.fill(s.water)
    water(p, k, waterline(t))
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The water again, in front of the ball, so it rides half sunk; and its line.
    const line = waterline(t)
    p.noStroke()
    p.fill(s.water)
    water(p, k, line)
    outline(p, ink, weight * 0.8)
    p.beginShape()
    for (const [x, y] of line) p.vertex(x * k, y * k)
    p.endShape()

    // The splash: water thrown up from either side of the ball as it goes in, falling back into the dish.
    if (since > 0 && since < 0.45) {
      for (const [vx, vy] of DROPS) {
        const from = X_SPLASH + 0.04 + Math.sign(vx) * (R + 0.02)
        const x = Math.max(-HW + 0.05, Math.min(HW - 0.05, from + vx * since * 0.45))
        const y = WATER - vy * since + 9 * since * since
        if (y < WATER) drop(p, k, s.water, x, y, 0.022 * (1 - since))
      }
    }
    // The slop over the pouring lip while the water stands over the brim there, dripping off its tip.
    const spill = Math.min(1, Math.max(0, heap(t) - (WATER - BRIM)) / 0.006)
    if (spill > 0) {
      p.noStroke()
      p.fill(s.water)
      p.ellipse((X_OUT + 0.005) * k, (FLOOR + 0.004) * k, 0.11 * spill * k, 0.035 * spill * k)
    }
    const drip = over(since, SWING * 0.75, SWING * 0.75 + 0.5)
    if (drip > 0 && drip < 1) {
      for (const d of [0, 0.35]) {
        const f = drip - d
        if (f > 0 && f < 0.6) drop(p, k, s.water, X_OUT + 0.045, FLOOR + 0.07 + 0.55 * f * f + 0.1 * f, 0.02)
      }
    }
  },
})
