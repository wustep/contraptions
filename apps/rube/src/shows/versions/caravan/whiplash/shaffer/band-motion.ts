import type { Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { BAND, ONSETS, TEMPO, TUNE_ORIGIN, TUNE_PERIOD, tune } from '../music'
import { G_EARTH } from '../physics'
import { LEDGE_R, PAD_DOWN, PAD_UP, PIT_Y, PODIUM, SEAT, STEP, TIERS, TURNER, WALL_L, kitLand } from './band-plan'
import { Walk, laneAtShow } from './band-walk'

/**
 * The band part's clock and Andrew's path through it (30.65 → 80.79, the tune's first chorus with the band): every
 * strike as a show second, and where he is at any moment. The lane and the drawing both read `heroBand`.
 *
 *   71   the band comes in; he is in the corridor, rolling           75   he pushes the door open
 *   79   it swings shut behind him                                   83, 87, 91   he comes down the tiers, a step a bar
 *   92, 92¾  two bounces in the pit       93¾  he rolls up against Fletcher's podium: the glare
 *   96   Fletcher points him to his place: the alternate's chair, beside Tanner's chart
 *   102  seated.  Then the job: turning Tanner's pages with the stand's page-turner (`TURNER`): down off the seat
 *        onto its treadle on a phrase's downbeat, the arm sweeping the page over by the next beat, back up to the
 *        seat: 112, 123, the tutti (on its biggest hit, the page going over in its one breath of silence, 134¼ →
 *        135¾), 156
 *   171  up at the stand's ledge, waiting for the next page        175  Fletcher points at him: you
 *   177  and at the kit: Tanner, off        179  Tanner hops down and stands aside
 *   184–188  Andrew comes onto the kit by a fill: floor tom, floor tom, rack, rack, the snare on 188
 */

/** One beat of the tune (a half note), in seconds. */
export const BEAT = TUNE_PERIOD

/** Seconds to roll off a tier's edge and land on the next, a step down. */
export const DROP = Math.sqrt((2 * STEP) / G_EARTH)

export const DOOR_IN = tune(75)
export const DOOR_SHUT = tune(79)
/** Landing on the trombones' tier, the saxophones' tier, and the pit. */
export const LANDINGS = [tune(83), tune(87), tune(91)]
/** The two bounces in the pit, and the bump against the podium. */
export const PIT_BOUNCES = [39.653, 39.967]
export const BUMP = 40.378
/** Fletcher points him to his place. */
export const THERE = tune(96)
export const SEATED = 44.345

/**
 * A page turn: his drop off the seat onto the page-turner's treadle (`press`, a phrase's downbeat), the page landing
 * on the left as the arm reaches its stop (`page`), the hop back up to the seat (`down`). The last is only the hop
 * up to the stand's ledge (`up`), where he waits for a page that never comes: Fletcher takes him to the kit.
 */
export interface Turn {
  press?: number
  up?: number
  page?: number
  down?: number
}
export const TURNS: Turn[] = [
  { press: tune(112), page: tune(113), down: tune(115) },
  { press: 52.954, page: tune(124), down: tune(126) },
  { press: 57.73, page: 58.364, down: 59.798 },
  { press: 67.064, page: tune(157), down: 68.598 },
  { up: 73.508 },
]
/** Between pages, on his seat, he keeps time with Tanner: a small hop on every beat (the alternate playing along). */
export const TAP_G = 9
export const SEAT_TAPS: number[] = []
/** The tutti: the trumpets stand, the biggest hit, the breath of silence, the answer. */
export const TUTTI = 55.491
export const PEAK = 57.73
export const ANSWER = 58.364

/** Fletcher: "you", then at the kit: "off". Tanner comes down; Andrew comes onto the kit by a fill. */
export const YOU = 75.214
export const OFF = tune(177)
export const TANNER_OFF = tune(179)
export const TANNER_DOWN = tune(181)
export const FILL = [79.071, tune(185), tune(186), 80.354, TEMPO]

/* ------------------------------------------------------------------ his path */

/** How long the page-turner's treadle takes to give under him (the ball rides it down). */
const PRESS = 0.14

function build(): Walk {
  const w = new Walk(BAND, [-0.5, 0], 1.6)
  // The corridor, at the pace he came in with, to the door's push plate.
  w.roll([WALL_L.x0 - 0.13, 0], DOOR_IN)
  // Down the tiers: a roll to each edge, off it, a landing on the bar and a small bounce, on.
  let y = 0
  TIERS.forEach((tier, i) => {
    const land = LANDINGS[i]
    w.roll([tier.x1, y], land - DROP)
    y += STEP
    w.hop([tier.x1 + w.vx * DROP, y], land).landed()
    if (i < 2) w.hop([w.x + w.vx * BEAT * 0.5, y], land + BEAT * 0.5).landed()
  })
  // The pit: two bounces, each lower and shorter, and a roll up against the podium's foot.
  const vx = w.vx
  w.hop([w.x + vx * 0.75 * (PIT_BOUNCES[0] - w.T), PIT_Y], PIT_BOUNCES[0]).landed()
  w.vx *= 0.75
  w.hop([w.x + w.vx * 0.8 * (PIT_BOUNCES[1] - w.T), PIT_Y], PIT_BOUNCES[1]).landed()
  const foot = PODIUM.x - PODIUM.w / 2 - 0.13
  w.roll([foot, PIT_Y], BUMP)
  // The bump: a little way back off it, and still.
  w.ease([foot - 0.06, PIT_Y], BUMP + 0.32, 'out')
  w.rest(THERE)
  // Pointed to his place: along the pit floor, past the podium and the stand's feet, and up onto the seat.
  const launch: Pt = [SEAT[0] - 0.5, PIT_Y]
  const upAt = SEATED - 2 * BEAT
  w.travel(launch, upAt, 0.6)
  w.hop(SEAT, SEATED).landed()
  // The pages.
  // On the seat until `until`: a hop on every beat he can fit, then still for the launch.
  const tap = (until: number) => {
    for (let k = Math.ceil((w.T - TUNE_ORIGIN) / BEAT + 0.6); tune(k) <= until - 0.02; k++) {
      w.hop(SEAT, tune(k), TAP_G)
      SEAT_TAPS.push(tune(k))
    }
    w.rest(until)
  }
  for (const turn of TURNS) {
    const from = turn.press ?? turn.up
    if (from === undefined) continue
    if (Math.abs(w.x - SEAT[0]) < 0.01 && Math.abs(w.y - SEAT[1]) < 0.01) tap(from - 2 * BEAT)
    w.rest(from - 2 * BEAT)
    if (turn.press === undefined) {
      // The last: up onto the ledge's corner, to wait for the next page.
      w.hop(LEDGE_R, from).landed()
      continue
    }
    // Off the seat, up past the chair's back and down onto the treadle's pad on the downbeat; it gives under him,
    // and the arm takes the page over. He waits on it until the hop back up to the seat.
    w.hop(PAD_UP, turn.press).landed()
    w.ease(PAD_DOWN, turn.press + PRESS, 'out')
    w.rest((turn.down as number) - 2 * BEAT)
    w.hop(SEAT, turn.down as number).landed()
  }
  // Onto the kit: off the ledge's corner to the floor tom, a fill across the toms, the snare on the downbeat.
  w.rest(FILL[0] - 1.5 * BEAT)
  w.hop(kitLand('floor'), FILL[0], G_EARTH)
  w.bounces([FILL[1]])
  w.hop(kitLand('rack'), FILL[2])
  w.bounces([FILL[3]])
  w.hop(kitLand('snare'), FILL[4])
  return w
}

export const BAND_WALK = build()
export const BAND_LANE = BAND_WALK.lane(BAND, DOOR_IN)
/** Where Andrew is at show time `T` in the band's frame (clamped to the part). */
export const heroBand = (T: number): Pt => laneAtShow(BAND_LANE, BAND, T)

/* ------------------------------------------------------------------ the page-turner */

/**
 * The page-turner at `T`: how far the treadle is pressed (0 up, 1 down) and the arm's angle off straight down
 * (radians, positive to the right: `TURNER.swing` at rest, past the desk's right edge; `-swing` at its stop past the
 * left). Pressed as he lands, it gives under him and holds; it springs back up, damped, as he leaves it. The arm is
 * tripped as the treadle goes down: it sweeps over, gathering speed, to its stop on the page's beat (with a small
 * rebound), holds a moment, and its spring swings it back, damped, to rest.
 */
export function turnerAt(T: number): { lever: number; arm: number } {
  const A = TURNER.swing
  let lever = 0
  let arm = A
  for (const turn of TURNS) {
    if (turn.press === undefined || turn.page === undefined || turn.down === undefined) continue
    const off = turn.down - 2 * BEAT
    if (T >= turn.press && T < off + 1.2) {
      const down = 1 - Math.pow(1 - Math.min(1, (T - turn.press) / PRESS), 2)
      const s = T - off
      // Back up as his weight leaves it: quick, a small overshoot above its rest, settled (a spring's step, from rest).
      const w = 18
      const tau = 0.08
      const up = s <= 0 ? 0 : 1 - Math.exp(-s / tau) * (Math.cos(w * s) + Math.sin(w * s) / (w * tau))
      lever = down * (1 - up)
    }
    const t0 = turn.press + 0.04
    if (T <= t0 || T > turn.page + 2.2) continue
    if (T < turn.page) {
      const u = (T - t0) / (turn.page - t0)
      arm = A - 2 * A * u * u
    } else {
      const s = T - turn.page
      // At the stop: a small rebound off it, held, then the spring takes it back (critically damped).
      const bounce = 0.07 * Math.exp(-s / 0.05) * Math.sin(s * 40)
      const r = Math.max(0, s - 0.22)
      const back = 1 - (1 + r / 0.2) * Math.exp(-r / 0.2)
      arm = -A + bounce + 2 * A * back
    }
  }
  return { lever, arm }
}

/**
 * Which page is showing on the right (0 at first), and how far the one being turned has gone (0..1), at `T`: the page's
 * free corner is under the arm's tip while the arm sweeps it over (`pw` the page's width from the spine).
 */
export function pageAt(T: number, pw = 0.64): { turned: number; u: number } {
  let turned = 0
  let u = 0
  for (const turn of TURNS) {
    if (turn.page === undefined || turn.press === undefined) continue
    if (T >= turn.page) turned++
    else if (T > turn.press) {
      const tip = TURNER.arm * Math.sin(turnerAt(T).arm)
      u = Math.acos(Math.max(-1, Math.min(1, tip / pw))) / Math.PI
    }
  }
  return { turned, u }
}

/* ------------------------------------------------------------------ the doors */

/**
 * The door off the corridor, 0 shut to 1 wide open (swung into the room, face on to the house). He pushes it on
 * the beat; it swings wide, then the closer brings it back, slow and steady, and it latches on the bar.
 */
export function doorL(T: number): number {
  const a = T - DOOR_IN
  if (a <= 0) return 0
  const open = 1 - Math.exp(-a / 0.1)
  const close = smooth(T, DOOR_IN + 0.55, DOOR_SHUT - 0.02)
  const shut = T >= DOOR_SHUT ? -0.03 * Math.exp(-(T - DOOR_SHUT) / 0.08) * Math.cos((T - DOOR_SHUT) * 40) : 0
  return Math.max(0, open * (1 - close) * 0.93 + shut)
}

/* ------------------------------------------------------------------ the band */

/** The band's hits in this stretch: every onset at least `min` strong, with its colour (low, middle, high). */
export const bandHits = (a: number, b: number, min = 1.0) => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min)
