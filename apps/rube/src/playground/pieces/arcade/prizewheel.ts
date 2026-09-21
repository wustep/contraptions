import { outline, solid } from '../../../../../../src/core/draw'
import { R, ROLL, definePiece, over, post, rail, ramp, roll, wait, type Lane, type Pt } from '../../../parts'
import { flash, glow, lamp, score } from '../../../pieces/arcade/neon'

/**
 * A prize wheel. Six wedges on a mast behind the lane, a peg between each
 * pair, a sprung flapper hanging into the pegs at the top, and one peg grown
 * long into a handle with a knob, hanging just short of the bottom with the
 * knob in the ball's way. The ball knocks the knob on and the wheel is away:
 * round it goes, the flapper ticking over every peg, bent along by each and
 * snapping back, slower and slower against the flapper's drag until it
 * cannot lift the next peg over. The ball has rolled on under the wheel to a stop pin in the lane
 * and waits there, clear of the handle's sweep, while the wheel runs down.
 * The lamp on the mast's head lights in the colour of the wedge under the
 * flapper; its prize pops over the mast, a hundred, two hundred or five, and
 * the pin drops out of the ball's way.
 * The wheel is left where it stopped and the pin down.
 *
 * Which wedge wins is the seed's, and the spin is worked back from it: the
 * wheel loses pace evenly, so how hard it was knocked is whatever brings
 * that wedge to rest dead under the flapper. The pegs at rest stand a
 * twelfth of a turn either side of the bottom, the handle among them, which
 * is just high enough for a ball to pass under.
 */
const CX = 0.5
/** The hub's height over the lane's line; the rim; how far the pegs and the handle's knob stand out from the hub. */
const H = 0.7
const RIM = 0.5
const PEG = 0.555
const KNOB = 0.6
const KNOB_R = 0.035
const WEDGES = 6
const STEP = (Math.PI * 2) / WEDGES
/** What each wedge pays, round from the handle. Three hundreds, two two-hundreds, one five. */
const PRIZES = [100, 200, 100, 500, 100, 200]
/** The handle hangs this far short of the bottom, on the ball's side. */
const PHI0 = (10 * Math.PI) / 180
/** How fast the flapper's drag takes the pace off the wheel, radians a second a second. */
const DRAG = 6
/** A point on the wheel at angle `a` round from the bottom toward the way the ball came, `r` from the hub. */
const at = (a: number, r: number): Pt => [CX - r * Math.sin(a), -H + r * Math.cos(a)]

/** Where the ball is when its front meets the knob. */
const X_HIT = at(PHI0, KNOB)[0] - Math.sqrt((R + KNOB_R) ** 2 - at(PHI0, KNOB)[1] ** 2)
const T_HIT = (X_HIT + 0.5) / ROLL
/** The stop pin, and the ball waiting against it. */
const X_PIN = 1.2
const X_WAIT = X_PIN - 0.03 - R
const V_ON = 1.9
const T_WAIT = T_HIT + 0.08 / ((ROLL + V_ON) / 2) + (X_WAIT - 0.14 - X_HIT - 0.08) / V_ON + 0.14 / (V_ON / 2)
/** The lamp holds a beat before the pin drops. */
const HOLD = 0.3
/** The flapper: hung from the mast's head, its tip a hair inside the pegs' reach. */
const FLAP_Y = -H - 0.66
const FLAP_LEN = 0.125
const TOUCH = 0.06
const SLIP = 0.1

export interface PrizewheelState {
  color: string
  /** The wedges' colours: the hundreds', the two hundreds', the five hundred's. */
  colors: [string, string, string]
  /** The wedge that comes to rest under the flapper, and what it pays. */
  wedge: number
  prize: number
  /** How far the wheel turns, radians, and how long it takes. */
  total: number
  spin: number
}

/** How far the wheel has turned, `s` seconds after the knock. */
function turned(s: PrizewheelState, since: number): number {
  if (since <= 0) return 0
  if (since >= s.spin) return s.total
  const w0 = (2 * s.total) / s.spin
  return w0 * since - (w0 * since * since) / (2 * s.spin)
}
/** When the wheel had turned `angle`. */
const whenTurned = (s: PrizewheelState, angle: number): number => s.spin * (1 - Math.sqrt(Math.max(0, 1 - angle / s.total)))

/**
 * The flapper's bend, toward the way the pegs go: a peg coming under it
 * takes it along until its tip slips over, and it snaps back and shivers.
 */
function flapAt(s: PrizewheelState, since: number): number {
  if (since <= 0) return 0
  const turn = turned(s, since)
  // The nearest peg's angle past the flapper, in the pegs' own direction; negative while it is still coming.
  const past = ((((turn - PHI0 + Math.PI) % STEP) + STEP) % STEP)
  const d = past > STEP / 2 ? past - STEP : past
  if (d >= -TOUCH && d <= SLIP && since < s.spin) return 0.75 * ((d + TOUCH) / (TOUCH + SLIP))
  // Free: how long since the last peg let it go.
  const last = turn - (d > SLIP ? d - SLIP : d + STEP - SLIP)
  if (last < 0) return 0
  const free = since - whenTurned(s, last)
  return 0.75 * Math.exp(-free * 26) * Math.cos(free * 70)
}

function laneFor(spin: number): Lane {
  const go = T_HIT + spin + HOLD - T_WAIT
  return {
    segs: [
      roll([-0.5, 0], [X_HIT, 0], ROLL),
      // The knock takes a little of its pace; it rolls on under the wheel and stops against the pin.
      ramp([X_HIT, 0], [X_HIT + 0.08, 0], ROLL, V_ON),
      roll([X_HIT + 0.08, 0], [X_WAIT - 0.14, 0], V_ON),
      ramp([X_WAIT - 0.14, 0], [X_WAIT, 0], V_ON, 0),
      wait([X_WAIT, 0], go),
      ramp([X_WAIT, 0], [X_WAIT + 0.3, 0], 0.8, ROLL),
      roll([X_WAIT + 0.3, 0], [1.5, 0], ROLL),
    ],
    fire: T_HIT,
  }
}

export const prizewheel = definePiece<PrizewheelState>({
  name: 'prizewheel',
  points: (s) => s.prize,
  weight: 0.8,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    const prize = rng.weighted([100, 200, 500], (v) => (v === 100 ? 5 : v === 200 ? 3.5 : 1.5))
    const wedge = rng.pick(PRIZES.map((v, i) => (v === prize ? i : -1)).filter((i) => i >= 0))
    // The winning wedge's middle comes to rest under the flapper, after a turn or two.
    let total = PHI0 + wedge * STEP + STEP / 2 - Math.PI
    while (total < (400 * Math.PI) / 180) total += Math.PI * 2
    const spin = Math.sqrt((2 * total) / DRAG)
    const spare = theme.colors.filter((c) => c !== ball.color && c !== color)
    const others = rng.shuffle(spare.length >= 2 ? spare : theme.colors.filter((c) => c !== color))
    const colors: [string, string, string] = [others[0], others[1 % others.length], color]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: laneFor(spin), state: { color, colors, wedge, prize, total, spin } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const turn = turned(s, since)
    const won = since >= s.spin
    const pin = over(since, s.spin + HOLD - 0.1, s.spin + HOLD)

    // The mast, from its feet to the flapper's bracket, behind everything; then the lane.
    outline(p, ink, weight * 1.2)
    p.line(CX * k, (FLAP_Y - 0.02) * k, CX * k, 0.5 * k)
    for (const dx of [-0.16, 0.16]) p.line(CX * k, 0.3 * k, (CX + dx) * k, 0.5 * k)
    rail(p, k, ink, weight, -0.5, 1.5)

    // The wheel: six wedges, a peg at every seam, the handle among them.
    if (won) glow(p, k, s.colors[PRIZES[s.wedge] === 100 ? 0 : PRIZES[s.wedge] === 200 ? 1 : 2], CX, -H, RIM * 0.9, 0.6 * (1 - over(since, s.spin + 1.2, s.spin + 2.4)))
    for (let j = 0; j < WEDGES; j++) {
      const a0 = PHI0 + j * STEP - turn
      solid(p, ink, weight, s.colors[PRIZES[j] === 100 ? 0 : PRIZES[j] === 200 ? 1 : 2])
      // p5 measures angles clockwise from east; `at` measures them from the bottom toward the west.
      p.arc(CX * k, -H * k, RIM * 2 * k, RIM * 2 * k, Math.PI / 2 + a0, Math.PI / 2 + a0 + STEP, p.PIE)
    }
    for (let j = 0; j < WEDGES; j++) {
      const a = PHI0 + j * STEP - turn
      const [x0, y0] = at(a, RIM)
      const [x1, y1] = at(a, j === 0 ? KNOB : PEG)
      outline(p, ink, weight * (j === 0 ? 1.5 : 1.2))
      p.line(x0 * k, y0 * k, x1 * k, y1 * k)
    }
    const [hx, hy] = at(PHI0 - turn, KNOB)
    solid(p, ink, weight, s.color)
    p.circle(hx * k, hy * k, KNOB_R * 2 * k)
    solid(p, ink, weight, ink)
    p.circle(CX * k, -H * k, 0.09 * k)

    // The flapper, hung from the mast's head into the pegs.
    p.push()
    p.translate(CX * k, FLAP_Y * k)
    p.rotate(flapAt(s, since))
    solid(p, ink, weight, s.color)
    p.triangle(-0.03 * k, 0, 0.03 * k, 0, 0, FLAP_LEN * k)
    p.pop()
    // The lamp on the mast's head, over the flapper: lit when the wheel has stopped.
    lamp(p, k, ink, weight, won ? s.colors[s.prize === 100 ? 0 : s.prize === 200 ? 1 : 2] : s.color, bg, CX, FLAP_Y - 0.01, 0.04, won ? 1 : 0)

    // The stop pin in its sleeve under the lane, and the knock on the knob.
    post(p, k, ink, weight, X_PIN, 0.4, 0.5)
    solid(p, ink, weight, s.color)
    p.rect(X_PIN * k, (-0.02 + 0.27 * pin) * k, 0.05 * k, 0.24 * k, 0.015 * k)
    solid(p, ink, weight, bg)
    p.rect(X_PIN * k, 0.2725 * k, 0.1 * k, 0.255 * k, 0.015 * k)
    const [kx, ky] = at(PHI0, KNOB)
    flash(p, k, s.color, weight, kx - 0.04, ky + 0.03, since, 0.2, 0.05, 0.16)
  },
  // The prize pops over the mast's head when the wheel has stopped, in the winning wedge's colour.
  scores: (p, s, { k, since, bg }) => score(p, k, s.colors[s.prize === 100 ? 0 : s.prize === 200 ? 1 : 2], bg, CX, FLAP_Y - 0.04 + 0.1, `+${s.prize}`, since - s.spin, 1),
})
