import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { lamp, score } from './neon'

/**
 * A helter-skelter. A tapered tower with a cone roof and a lamp on its
 * tip, and a chute wound round it from a gangway at the top to a mat at
 * the foot. The rail runs out along the gangway to the tower's shoulder,
 * the ball slowing to the brink, and over it goes: round the front of the
 * tower in the chute, gathering pace, out of sight round the back, round
 * the front again lower down and faster, and out of the chute's mouth
 * along the mat, which takes the way off it. The lamp lights as it comes
 * out. Two hundred.
 *
 * The chute is one helix about the tower's axis, seen from the side: the
 * ball's place across the tower is the cosine of its turn, its height
 * falls steadily with the turn, and the helix widens with the tower's
 * taper. Its pace is a sliding thing's, from the height it has lost. The
 * chute's outer wall, the two bands across the tower's front, is drawn
 * from the same helix a chute's width further out, in front of the ball,
 * which rides behind it; and while the ball is round the back the tower
 * stands in front of it.
 */
export interface HelterState {
  color: string
  trim: string
}

/** The tower: its axis, its shoulders and its foot, and half its width at each. */
const CX = 0.5
const TOP = -0.2
const FOOT = 1.5
const HALF_TOP = 0.16
const HALF_FOOT = 0.3
const halfAt = (y: number) => HALF_TOP + ((HALF_FOOT - HALF_TOP) * (y - TOP)) / (FOOT - TOP)
/** The roof's tip, where the lamp sits. */
const TIP = -0.41
/** The chute: the ball's centre rides this far off the tower's wall, and the chute's own outer wall twice that. */
const OFF = R + 0.01
/** The wall stands this high over the chute's floor, and the floor is this thick under it. */
const LIP = 0.085
const UNDER = 0.035
/** The mat at the foot is this thick. */
const MAT = 0.08

/** The turn: on at the tower's near shoulder, off at the middle of its front a turn and a bit later. Front is 0..π, the back π..2π. */
const PHI_IN = 0.3 * Math.PI
const PHI_OUT = 2.5 * Math.PI
/** The ball's line when it leaves the helix, a little over the mat's. */
const Y_OUT = 0.93
/** The chute eases off the level gangway over this much turn. */
const EASE = 0.5
const DROP = Y_OUT / (PHI_OUT - PHI_IN - EASE / 2)
/** The ball's height at turn `phi`. */
function yAt(phi: number): number {
  const u = phi - PHI_IN
  return DROP * (u < EASE ? (u * u) / (2 * EASE) : u - EASE / 2)
}
/** The ball on the helix at turn `phi`, and the chute's outer wall there. */
const onHelix = (phi: number, off = OFF): Pt => [CX - (halfAt(yAt(phi)) + off) * Math.cos(phi), yAt(phi)]

/** The run-out: off the helix along its tangent, flattening onto the mat. */
const SLOPE_OUT = DROP / (halfAt(Y_OUT) + OFF)
const RUN = (2 * (1 - Y_OUT)) / SLOPE_OUT
const X_MAT = CX + RUN
const runAt = (d: number): Pt => [CX + d, Y_OUT + SLOPE_OUT * d - (SLOPE_OUT * d * d) / (2 * RUN)]

/** A push off the brink, and show gravity down the chute. */
const V_PUSH = 2.2
const G = 9.7609

/**
 * The slide, tabulated: where the ball is every step of the way from the
 * brink to the mat, and when. Its way along the chute is measured round
 * the tower, not across the page, so it is slow across the page where
 * the chute turns away and fast across the front.
 */
const STEP = 0.004
const SLIDE: { t: number; at: Pt; phi: number }[] = []
{
  let t = 0
  let at = onHelix(PHI_IN)
  SLIDE.push({ t, at, phi: PHI_IN })
  const go = (to: Pt, way: number, phi: number) => {
    const v0 = Math.sqrt(V_PUSH * V_PUSH + 2 * G * at[1])
    const v1 = Math.sqrt(V_PUSH * V_PUSH + 2 * G * to[1])
    t += way / ((v0 + v1) / 2)
    at = to
    SLIDE.push({ t, at, phi })
  }
  const turns = Math.ceil((PHI_OUT - PHI_IN) / STEP)
  for (let i = 1; i <= turns; i++) {
    const phi = PHI_IN + ((PHI_OUT - PHI_IN) * i) / turns
    const to = onHelix(phi)
    const round = (halfAt(to[1]) + OFF) * ((PHI_OUT - PHI_IN) / turns)
    go(to, Math.hypot(round, to[1] - at[1]), phi)
  }
  const runs = Math.ceil(RUN / STEP)
  for (let i = 1; i <= runs; i++) {
    const to = runAt((RUN * i) / runs)
    go(to, Math.hypot(to[0] - at[0], to[1] - at[1]), PHI_OUT)
  }
}
const LAST = SLIDE[SLIDE.length - 1]
/** Where the ball is `s` seconds after the brink. */
function slideAt(s: number): Pt {
  let lo = 0
  let hi = SLIDE.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (SLIDE[mid].t <= s) lo = mid
    else hi = mid
  }
  const a = SLIDE[lo]
  const b = SLIDE[hi]
  const f = b.t > a.t ? Math.min(1, Math.max(0, (s - a.t) / (b.t - a.t))) : 0
  return [a.at[0] + (b.at[0] - a.at[0]) * f, a.at[1] + (b.at[1] - a.at[1]) * f]
}
/** When, after the brink, the ball is at turn `phi`. */
const whenAt = (phi: number): number => (SLIDE.find((s) => s.phi >= phi) ?? LAST).t

/** Along the gangway: at the rail's pace, and slowing over the last of it to the pace the chute takes it on at across the page. */
const BRINK = onHelix(PHI_IN)
const SLOW = 0.22
const V_BRINK = Math.hypot(SLIDE[1].at[0] - SLIDE[0].at[0], SLIDE[1].at[1] - SLIDE[0].at[1]) / SLIDE[1].t
const V_FOOT = Math.sqrt(V_PUSH * V_PUSH + 2 * G)
const gangway = [roll([-0.5, 0], [BRINK[0] - SLOW, 0], ROLL), ramp([BRINK[0] - SLOW, 0], BRINK, ROLL, V_BRINK)]
const T_BRINK = gangway[0].dur + gangway[1].dur
const T_FOOT = T_BRINK + LAST.t
/** Round the back, the tower stands in front of the ball. */
const T_BACK0 = T_BRINK + whenAt(Math.PI)
const T_BACK1 = T_BRINK + whenAt(2 * Math.PI)

const LANE: Lane = {
  segs: [...gangway, ...trace((t) => slideAt(t - T_BRINK), T_BRINK, T_FOOT, 72), ramp([X_MAT, 1], [1.5, 1], V_FOOT, ROLL)],
  fire: T_FOOT,
}

/** The chute's outer wall from turn `a` to turn `b`, as the points of its foot. */
function wallPts(a: number, b: number): Pt[] {
  const n = Math.max(2, Math.ceil((b - a) / 0.06))
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const [x, y] = onHelix(a + ((b - a) * i) / n, 2 * OFF)
    pts.push([x, y + R])
  }
  return pts
}
const FRONT_1 = wallPts(PHI_IN, Math.PI)
const BACK = wallPts(Math.PI, 2 * Math.PI)
/** The second band runs on off the tower's front down the run-out, its wall dying away into the mat. */
const FRONT_2: Pt[] = wallPts(2 * Math.PI, PHI_OUT)
const LIPS_2: number[] = FRONT_2.map(() => LIP)
for (let i = 1; i <= 12; i++) {
  const [x, y] = runAt((RUN * i) / 12)
  FRONT_2.push([x, y + R])
  LIPS_2.push(LIP * (1 - over(i / 12, 0.35, 1)))
}

/** A band of the chute: its wall from the floor's underside up to the lip, along `pts`. */
function band(p: p5, k: number, ink: string, weight: number, color: string, pts: Pt[], lips?: number[]): void {
  solid(p, ink, weight, color)
  p.beginShape()
  pts.forEach(([x, y], i) => p.vertex(x * k, (y - (lips ? lips[i] : LIP)) * k))
  for (let i = pts.length - 1; i >= 0; i--) p.vertex(pts[i][0] * k, (pts[i][1] + UNDER) * k)
  p.endShape(p.CLOSE)
}

/** The tower's body, and the way in at its foot. */
function tower(p: p5, k: number, ink: string, weight: number, color: string, bg: string): void {
  solid(p, ink, weight, color)
  p.quad((CX - HALF_TOP) * k, TOP * k, (CX + HALF_TOP) * k, TOP * k, (CX + HALF_FOOT) * k, FOOT * k, (CX - HALF_FOOT) * k, FOOT * k)
  solid(p, ink, weight, bg)
  p.rect(CX * k, (FOOT - 0.11) * k, 0.17 * k, 0.22 * k, 0.085 * k, 0.085 * k, 0, 0)
}

export const helter = definePiece<HelterState>({
  name: 'helter',
  points: 200,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    // The chute and the roof in a colour of their own: not the tower's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color, trim: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const lit = since < 0 ? 0 : 1 - over(since, 1.4, 2.4)

    // The gangway to the tower's shoulder, on a strut off its wall; the mat at the foot and the rail out, on posts.
    rail(p, k, ink, weight, -0.5, BRINK[0])
    outline(p, ink, weight)
    p.line(-0.05 * k, FLOOR * k, (CX - halfAt(0.45)) * k, 0.45 * k)
    solid(p, ink, weight, s.trim)
    p.rect(((X_MAT + 1.46) / 2) * k, (1 + FLOOR + MAT / 2) * k, (1.46 - X_MAT) * k, MAT * k, 0.025 * k)
    rail(p, k, ink, weight, 1.46, 1.5, 1 + FLOOR)
    post(p, k, ink, weight, X_MAT + 0.1, 1 + FLOOR + MAT, 1.5)
    post(p, k, ink, weight, 1.4, 1 + FLOOR + MAT, 1.5)
    // The chute round the back, which only shows past the tower's sides; the tower in front of it.
    band(p, k, ink, weight, s.trim, BACK)
    tower(p, k, ink, weight, s.color, bg)
    // The roof, and the lamp on its tip, lit as the ball comes out at the foot.
    solid(p, ink, weight, s.trim)
    p.triangle((CX - HALF_TOP - 0.06) * k, TOP * k, (CX + HALF_TOP + 0.06) * k, TOP * k, CX * k, TIP * k)
    lamp(p, k, ink, weight, s.color, bg, CX, TIP - 0.02, 0.035, lit)
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // Round the back the tower stands in front of the ball; the chute's wall is in front of it all the way.
    if (t > T_BACK0 && t < T_BACK1) tower(p, k, ink, weight, s.color, bg)
    band(p, k, ink, weight, s.trim, FRONT_1)
    band(p, k, ink, weight, s.trim, FRONT_2, LIPS_2)
  },
  // Over the mat, beside the tower.
  scores: (p, s, { k, since, bg }) => score(p, k, s.trim, bg, 1.26, 0.98, '+200', since, 1),
})
