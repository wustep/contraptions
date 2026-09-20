import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { flash, glow, lamp, score } from '../../../pieces/arcade/neon'

/**
 * A swing boat. A crescent hull hangs by two rods from the head of an
 * A-frame, its stern's tip level with the lane, a brake shoe on the floor
 * under its keel. The ball rolls off the rail's end over the stern and
 * down into the dish of the deck, and its way shoves the boat off: forward a
 * little, back further, forward further still, back as high as it goes, the
 * ball bedded in the bottom of the dish the whole time, since a thing in a
 * swinging boat is pressed straight into its deck. On the way down the third
 * time the brake bites at the bottom of the swing, in sparks, and the boat
 * stops dead; the ball does not. It runs on up the dish at the pace the boat
 * had, off the bow's tip, and over the water to the far rail. The boat
 * creeps back to plumb on its brake, and the lamps along it go out.
 *
 * The boat's angle is one function of time, and the ball's place in the
 * dish another; the lane is the two together, traced, and the drawing reads
 * the same two. The run up the dish is a ball's under this piece's gravity,
 * and the flight is what that run leaves it with.
 */
const CX = 0.48
/** The pivot to the ball's centre at the bottom of the dish; the dish's own radius, tighter than that, so the bottom is a bottom. */
const RHO = 0.8
const RC = 0.5
const DISH_Y = RHO - RC
/** Where the ball's path meets the deck's tips, and where the deck itself ends. */
const PHI_E = (40 * Math.PI) / 180
const DECK_R = RC + R
/** The pivot's height: what puts the deck's tips level with the rail when the boat hangs plumb. */
const PY = FLOOR - (DISH_Y + DECK_R * Math.cos(PHI_E))
/** The keel: an arc through the deck's tips and a plank's depth under the dish's bottom. */
const KEEL_Y = RHO + R + 0.13
const TIP: Pt = [DECK_R * Math.sin(PHI_E), DISH_Y + DECK_R * Math.cos(PHI_E)]
const KEEL_C = (KEEL_Y * KEEL_Y - TIP[0] * TIP[0] - TIP[1] * TIP[1]) / (2 * (KEEL_Y - TIP[1]))
const KEEL_R = KEEL_Y - KEEL_C
/** This piece's gravity, cells a second a second. */
const G = 24

/** The swings: how far each goes, a quarter and a half of the boat's period, and the brake. */
const DEG = Math.PI / 180
const F1 = 18 * DEG
const B1 = -38 * DEG
const F2 = 46 * DEG
const B2 = -60 * DEG
/** Where the last swing would have topped out, had the brake let it. */
const F3 = 64 * DEG
const Q = 0.3
const H = 0.6
/** How far into the last swing the boat is plumb: the brake bites there. */
const U_BRAKE = Math.acos(1 - (2 * -B2) / (F3 - B2)) / Math.PI
const TAU_BRAKE = Q + 3 * H + H * U_BRAKE
const OMEGA_BRAKE = ((F3 - B2) * Math.PI * Math.sin(Math.PI * U_BRAKE)) / (2 * H)
/** The brake takes the boat from that to nothing in a couple of degrees, and it creeps back. */
const SKID = 2.5 * DEG

/** The boat's angle, forward of plumb, `tau` seconds after the ball comes aboard. */
function boatAt(tau: number): number {
  if (tau <= 0) return 0
  if (tau < Q) return F1 * Math.sin((Math.PI * tau) / (2 * Q))
  const half = (from: number, to: number, u: number) => from + ((to - from) * (1 - Math.cos(Math.PI * u))) / 2
  if (tau < Q + H) return half(F1, B1, (tau - Q) / H)
  if (tau < Q + 2 * H) return half(B1, F2, (tau - Q - H) / H)
  if (tau < Q + 3 * H) return half(F2, B2, (tau - Q - 2 * H) / H)
  if (tau < TAU_BRAKE) return half(B2, F3, (tau - Q - 3 * H) / H)
  const s = tau - TAU_BRAKE
  return SKID * (1 - Math.exp((-s * OMEGA_BRAKE) / SKID)) * Math.exp(-s / 0.9)
}

/** A point in the boat's own frame (x along the deck, y down from the pivot), in the cell's, with the boat at `a`. */
const world = (bx: number, by: number, a: number): Pt => [CX + bx * Math.cos(a) + by * Math.sin(a), PY - bx * Math.sin(a) + by * Math.cos(a)]

/** The ball's place round the dish while it rides: in over the stern's tip at the rail's pace, bedding down into the bottom with no swing back. */
const BED = 7
const rideAt = (tau: number): number => Math.exp(-BED * tau) * (-PHI_E + (ROLL / RC - BED * PHI_E) * tau)

/** The run up the dish when the boat stops under it: the ball's place round the dish against seconds since the brake, until it leaves the tip. */
const RUN: number[] = []
const RUN_DT = 0.002
const V0 = RHO * OMEGA_BRAKE
{
  let phi = 0
  while (phi < PHI_E && RUN.length < 2000) {
    RUN.push(phi)
    phi += (Math.sqrt(Math.max(0.01, V0 * V0 - 2 * G * RC * (1 - Math.cos(phi)))) / RC) * RUN_DT
  }
}
const T_RUN = RUN.length * RUN_DT
const V_TIP = Math.sqrt(V0 * V0 - 2 * G * RC * (1 - Math.cos(PHI_E)))

/** Where the ball is round the dish, `tau` seconds after it came aboard; past the tip it is gone. */
function dishAt(tau: number): number {
  if (tau <= TAU_BRAKE) return rideAt(tau)
  const i = (tau - TAU_BRAKE) / RUN_DT
  const lo = Math.min(RUN.length - 1, Math.floor(i))
  const hi = Math.min(RUN.length - 1, lo + 1)
  return lo >= RUN.length - 1 ? PHI_E : RUN[lo] + (RUN[hi] - RUN[lo]) * (i - lo)
}
const ballAt = (tau: number): Pt => {
  const phi = dishAt(tau)
  return world(RC * Math.sin(phi), DISH_Y + RC * Math.cos(phi), boatAt(tau))
}

/** Aboard: the ball leaves the rail over the stern's tip. The flight: off the bow's tip the way the deck points, to the far rail. */
const ABOARD = ballAt(0)
const RAIL_END = 0.03
const X_OFF = ABOARD[0] - 0.06
const T_ABOARD = (X_OFF + 0.5) / ROLL + Math.hypot(ABOARD[0] - X_OFF, ABOARD[1]) / ROLL
const TAU_OFF = TAU_BRAKE + T_RUN
const OFF = ballAt(TAU_OFF)
const AIM = PHI_E + boatAt(TAU_OFF)
const VX = V_TIP * Math.cos(AIM)
const VY = V_TIP * Math.sin(AIM)
const T_FLY = (VY + Math.sqrt(VY * VY - 2 * G * -OFF[1])) / G
const LAND: Pt = [OFF[0] + VX * T_FLY, 0]
const FAR_RAIL = 1.22

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [X_OFF, 0], ROLL),
    roll([X_OFF, 0], ABOARD, ROLL),
    ...trace(ballAt, 0, TAU_OFF, 150),
    fly(OFF, LAND, T_FLY, (G * T_FLY * T_FLY) / 8),
    ramp(LAND, [1.5, 0], VX, ROLL),
  ],
  fire: T_ABOARD + TAU_BRAKE,
}

/** The hull in the boat's own frame, drawn about the pivot: a crescent between the deck's arc and the keel's. */
function hull(p: p5, k: number, ink: string, weight: number, color: string): void {
  const tipDeck = Math.atan2(TIP[0], TIP[1] - DISH_Y)
  const tipKeel = Math.atan2(TIP[0], TIP[1] - KEEL_C)
  solid(p, ink, weight, color)
  p.beginShape()
  const n = 20
  for (let i = 0; i <= n; i++) {
    const a = -tipDeck + (2 * tipDeck * i) / n
    p.vertex(DECK_R * Math.sin(a) * k, (DISH_Y + DECK_R * Math.cos(a)) * k)
  }
  for (let i = 0; i <= n; i++) {
    const a = tipKeel - (2 * tipKeel * i) / n
    p.vertex(KEEL_R * Math.sin(a) * k, (KEEL_C + KEEL_R * Math.cos(a)) * k)
  }
  p.endShape(p.CLOSE)
}

export const swingboat = definePiece<{ color: string }>({
  name: 'swingboat',
  points: 150,
  weight: 0.8,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const tau = t - T_ABOARD
    const a = boatAt(tau)
    const running = tau > 0 ? 1 - over(since, 0.5, 1.4) : 0

    // The rails either side, the A-frame behind the boat, and the brake shoe on the floor under the keel.
    rail(p, k, ink, weight, -0.5, RAIL_END)
    post(p, k, ink, weight, -0.12)
    rail(p, k, ink, weight, FAR_RAIL, 1.5)
    post(p, k, ink, weight, FAR_RAIL + 0.1)
    outline(p, ink, weight * 1.2)
    for (const foot of [CX - 0.4, CX + 0.4]) {
      p.line(CX * k, PY * k, foot * k, 0.5 * k)
      p.line((foot - 0.06) * k, 0.5 * k, (foot + 0.06) * k, 0.5 * k)
    }
    const bite = since < 0 ? 0 : 1 - over(since, 1.6, 2.2)
    solid(p, ink, weight, ink)
    p.rect(CX * k, (0.475 - 0.022 * bite) * k, 0.2 * k, 0.05 * k, 0.012 * k)

    // The boat, swung about the pivot: two rods to the deck, and the hull.
    p.push()
    p.translate(CX * k, PY * k)
    p.rotate(-a)
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      const at = side * 0.5
      p.line(0, 0, DECK_R * Math.sin(at) * k, (DISH_Y + DECK_R * Math.cos(at)) * k)
    }
    hull(p, k, ink, weight, s.color)
    // Three lamps along her side, chasing while she runs.
    for (let i = 0; i < 3; i++) {
      const at = (i - 1) * 0.42
      const r = (DECK_R + KEEL_R + KEEL_C - DISH_Y) / 2 - 0.005
      lamp(p, k, ink, weight, s.color, bg, r * Math.sin(at), DISH_Y + r * Math.cos(at) + 0.02 * (1 - Math.abs(i - 1)), 0.028, running > 0.5 && Math.floor(t * 6 + i) % 3 === 0 ? 1 : 0)
    }
    p.pop()
    glow(p, k, s.color, CX, PY, 0.1, running)
    solid(p, ink, weight, running > 0.5 ? s.color : bg)
    p.circle(CX * k, PY * k, 0.11 * k)

    // The brake biting: sparks off the shoe, under the keel.
    flash(p, k, s.color, weight, CX, 0.44, since, 0.22, 0.05, 0.2)
    if (since > 0 && since < 0.22) {
      const f = since / 0.22
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const [dx, dy] of [[-1, -0.35], [-0.8, -0.7], [0.75, -0.75], [1, -0.3]]) {
        p.line((CX + dx * (0.12 + 0.14 * f)) * k, (0.45 + dy * (0.05 + 0.12 * f)) * k, (CX + dx * (0.16 + 0.2 * f)) * k, (0.45 + dy * (0.07 + 0.17 * f)) * k)
      }
      p.pop()
    }
  },
  // The ride pays as the ball leaves the bow, over the frame's head.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, CX, PY - 0.08 + 0.1, '+150', since - T_RUN, 1),
})
