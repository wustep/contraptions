import { R, type Pt } from '../../../../../parts'
import { onset, pulse, SEAM } from '../music'
import { BELLY, LIFT_AT, LIFT_EXIT, MEADOW, SHELL_X } from './geo'

/**
 * The scissor lift's motion (the lift builder's): how far each of its seven stages has opened at any show time, so
 * the drawing and the lane read the same numbers and she never slides off the deck.
 *
 * The lift is a tower of seven scissor stages, each its own X with its own ram, one on top of the next with a thin
 * beam between. They open one after another from the bottom: a stage's ram drives it open (the pressure building, a
 * surge on each of the pump's hard strokes), it hits the end of its stroke (a sharp stop and a small bounce), its latch
 * drops and it settles onto it; then the next stage above it takes the load. Everything above the stage that is
 * opening (the stages still folded, the deck, the two of them) rides up on it.
 *
 * Everything here is in the lift part's own frame (the ball's rest line on the deck at its lowest is y = 0, y down)
 * and in show seconds.
 */

/** The meadow's surface, and the slot's middle (which the deck and the tower are centred under), in this frame. */
export const MEAD = MEADOW - LIFT_AT[1]
export const CX = SHELL_X - LIFT_AT[0]
/** The belly's lowest point, in this frame. */
export const BELLY_Y = BELLY - LIFT_AT[1]
/**
 * The deck: 2.4 long, centred under the slot (inside its 2.6), the same deck the shaft shows ([-0.8, 1.6] from her at
 * the cut). Its roll-out extension carries it EXT further to the left at the bottom, where they came aboard; it rolls
 * back into the deck once they are both off it, so the deck fits the slot.
 */
export const DECK: Pt = [CX - 1.2, CX + 1.2]
export const EXT = 0.6
/** The stages: how many, the arms' length and thickness, the beams between them, and a stage's X folded flat. */
export const STAGES = 7
export const ARM = 2.5
export const ARM_W = 0.06
export const BEAM_T = 0.03
export const FOLDED = 0.065
/** The deck plate's underside at rest, and the tower's foot (the floor of the trailer's well) at rest. */
export const PLATE_BOT = R + 0.14
export const FOOT = PLATE_BOT + STAGES * FOLDED + (STAGES - 1) * BEAM_T

/** How far a stage opens (the rise it gives), cells. The top one is still opening at the cut. */
const OPEN = 2.0
/** The speed the deck goes up into the slot at, at the cut (`SEAMS.shaft`). */
export const INTO = 0.55

const P = pulse
const BEGIN = SEAM.lift
const END = SEAM.shaft
/** The onset between pulses 273 and 274 (0.83): the last surge before the cut. */
const LAST_SURGE = onset(65.4, 0.8)

interface Surge {
  t: number
  /** How much it adds, cells, and how quickly (s). */
  A: number
  tau: number
}
interface Stroke {
  /** Its ram starts (a), hits the end of its stroke (b); its latch drops (latch). */
  a: number
  b: number
  latch?: number
  /** The stroke's speed at its start and at its end, as multiples of its mean (0 eases from rest). */
  m0: number
  m1: number
  /** How much of its speed at the stop comes back as the bounce. */
  kick: number
  surges: Surge[]
}

const S = (t: number, A: number, tau = 0.14): Surge => ({ t, A, tau })

/**
 * The six stages under the top one. The pump starts on 43.758 and the first stage goes at once; the second and third
 * are the quiet stretch's motion; the fourth strains under the fog (52.135 → 52.616) and surges up through it on the
 * burst, the pump's strokes on its hard pulses, and stops on 54.509 out of it; the fifth goes on through the burst's
 * tail and slows; the sixth is slow.
 */
const STROKES: Stroke[] = [
  { a: P(183), b: P(189), latch: P(190), m0: 0.3, m1: 1.15, kick: 0.35, surges: [S(P(186), 0.12)] },
  { a: 45.95, b: P(202), m0: 0, m1: 0.95, kick: 0.25, surges: [S(P(195), 0.06)] },
  { a: 48.75, b: P(215), latch: P(216), m0: 0, m1: 1.1, kick: 0.35, surges: [S(P(206), 0.05), S(P(213), 0.08)] },
  {
    a: P(218),
    b: P(228),
    latch: P(229),
    m0: 0.12,
    m1: 1.15,
    kick: 0.4,
    surges: [S(P(219), 0.035), S(P(220), 0.05), S(P(221), 0.45, 0.38), S(P(222), 0.08), S(P(225), 0.1), S(P(226), 0.1), S(P(227), 0.08)],
  },
  { a: P(230), b: P(242), latch: P(243), m0: 0.7, m1: 0.45, kick: 0.2, surges: [S(P(233), 0.08)] },
  { a: 58.45, b: P(261), m0: 0, m1: 1.0, kick: 0.3, surges: [S(P(247), 0.06), S(P(254), 0.06)] },
]
/** The top stage: from rest to the speed it goes into the slot at, its two last surges, and after the cut, to rest. */
const TOP_A = 62.95
const TOP_SURGES: Surge[] = [S(P(270), 0.05, 0.15), S(LAST_SURGE, 0.04, 0.12)]
/** The top stage carries on at that speed a little past the cut, then slows to rest at the lip over this long. */
const TOP_ON = 0.25
const TOP_STOP = 1.2

/** The jacks biting on the pump's start: the trailer lifts off its springs. */
const BITE = 0.035
const BITE_TAU = 0.07

/** After the slot: the lift comes down empty (as the shaft has it, from 88.8), the top stage first, folded by ~119. */
const DOWN_FROM = 88.8
const DOWN_EACH = 3.9
const DOWN_GAP = 0.4

const BOUNCE_W = (2 * Math.PI) / 0.42
const BOUNCE_TAU = 0.2
const LATCH_DROP = 0.02
const LATCH_TAU = 0.09

const surgeAt = (q: Surge, t: number) => (t <= q.t ? 0 : q.A * (1 - Math.exp(-(t - q.t) / q.tau)))
const surgeV = (q: Surge, t: number) => (t <= q.t ? 0 : (q.A / q.tau) * Math.exp(-(t - q.t) / q.tau))
const hermite = (x: number, m0: number, m1: number) => (x * x * x - 2 * x * x + x) * m0 + (-2 * x * x * x + 3 * x * x) + (x * x * x - x * x) * m1

function strokeAt(s: Stroke, t: number): number {
  if (t <= s.a) return 0
  const got = s.surges.reduce((acc, q) => acc + surgeAt(q, s.b), 0)
  const base = OPEN - got
  const D = s.b - s.a
  if (t < s.b) return base * hermite((t - s.a) / D, s.m0, s.m1) + s.surges.reduce((acc, q) => acc + surgeAt(q, t), 0)
  const vb = (base * s.m1) / D + s.surges.reduce((acc, q) => acc + surgeV(q, s.b), 0)
  const since = t - s.b
  let u = OPEN + ((s.kick * vb) / BOUNCE_W) * Math.exp(-since / BOUNCE_TAU) * Math.sin(BOUNCE_W * since)
  if (s.latch !== undefined && t > s.latch) u -= LATCH_DROP * (1 - Math.exp(-(t - s.latch) / LATCH_TAU))
  return u
}

const smooth = (t: number, a: number, b: number) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}
/** How much of stage `i` is still open as the lift comes down after the slot (1 up .. 0 folded). */
function kept(i: number, t: number): number {
  if (t <= DOWN_FROM) return 1
  const j = STAGES - 1 - i
  const a = DOWN_FROM + j * (DOWN_EACH + DOWN_GAP)
  return 1 - smooth(t, a, a + DOWN_EACH)
}
const DOWN_END = DOWN_FROM + STAGES * (DOWN_EACH + DOWN_GAP)

function biteAt(t: number): number {
  if (t <= BEGIN) return 0
  return BITE * (1 - Math.exp(-(t - BEGIN) / BITE_TAU)) * (1 - smooth(t, DOWN_END, DOWN_END + 1.2))
}

/** Where the top stage has got to without its own surges and exactness: the ease from rest, the run, the stop. */
function topBase(t: number, ta: number): number {
  const s = t - TOP_A
  if (s <= 0) return 0
  if (s < ta) {
    const x = s / ta
    return INTO * ta * (x * x * x - (x * x * x * x) / 2)
  }
  const run = END - TOP_A + TOP_ON
  if (s < run) return INTO * (ta / 2 + (s - ta))
  const d = Math.min(s - run, TOP_STOP)
  return INTO * (ta / 2 + (run - ta)) + INTO * d - (INTO * d * d) / (2 * TOP_STOP)
}

/**
 * The top stage's ease is as long as makes the deck arrive at the cut exactly where the seam says, at exactly its
 * speed: the rest of the lift has settled by then, so the top stage alone makes up the difference.
 */
const TOP_TA = (() => {
  const rise = -LIFT_EXIT[1]
  const below = biteAt(END) + STROKES.reduce((acc, s) => acc + strokeAt(s, END), 0) + TOP_SURGES.reduce((acc, q) => acc + surgeAt(q, END), 0)
  const need = rise - below
  const T = END - TOP_A
  const ta = 2 * (T - need / INTO)
  if (!(ta > 0 && ta <= T)) console.warn(`logogram: lift's top stage cannot make the cut (ease ${ta.toFixed(3)} of ${T.toFixed(3)} s)`)
  return Math.max(0.05, Math.min(T, ta))
})()

function topAt(t: number): number {
  return topBase(t, TOP_TA) + TOP_SURGES.reduce((acc, q) => acc + surgeAt(q, t), 0)
}

/** How far each stage has opened (its rise, cells), bottom to top. */
export function stagesAt(t: number): number[] {
  const out = STROKES.map((s, i) => strokeAt(s, t) * kept(i, t))
  out.push(topAt(t) * kept(STAGES - 1, t))
  return out
}

/** How far the trailer has lifted on its jacks (cells). */
export const liftOff = biteAt

/** How far the deck has risen above its rest (cells): the jacks and every stage. */
export function riseAt(t: number): number {
  return biteAt(t) + stagesAt(t).reduce((a, b) => a + b, 0)
}

/** When each stage under the top one latches (its stroke's end, where it has no latch of its own). */
export const LATCHES: number[] = STROKES.map((s) => s.latch ?? s.b)

/** Louise and Ian on the deck: in from its end to its middle as it starts up, Louise first, Ian a step behind. */
const ease = (t: number, a: number, b: number) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return 0.5 - 0.5 * Math.cos(Math.PI * u)
}
export const louiseX = (t: number): number => -0.5 + 0.5 * ease(t, 44.05, P(188))
export const ianX = (t: number): number => -0.92 + 0.5 * ease(t, 44.42, 45.36)
/**
 * How far the extension is out (1 .. 0): out while he is on it, rolling in behind him once he is clear, home and
 * locked on the first stage's latch; out again for the next time once the lift is folded.
 */
export function extAt(t: number): number {
  if (t < BEGIN) return 1
  if (t < DOWN_END + 1.5) return 1 - ease(t, 44.98, P(190))
  return ease(t, DOWN_END + 1.5, DOWN_END + 3.5)
}

/** Every strike of the lift, in show seconds: what the audience sees on each. */
export const STRIKES_LIFT: number[] = [
  P(183), // the pump starts: the engine catches, the jacks bite, the first stage goes
  P(186), // the pump's first hard stroke: a surge, a puff at the stack
  P(189), // the first stage's ram hits the end of its stroke: the tower bounces
  P(190), // its latch drops; it settles
  P(202), // the second stage's stroke ends (soft: the quiet stretch)
  P(213), // the third stage surges
  P(215), // its stroke ends
  P(216), // its latch drops
  P(218), // under the fog, the fourth stage's ram takes the load: a creep
  P(219), // it strains
  P(220), // and strains
  P(221), // and surges up into the fog
  P(222), // the pump's strokes through the fog
  P(225),
  P(226),
  P(227),
  P(228), // out of the fog: the stroke ends, the bounce
  P(229), // the latch
  P(230), // the fifth stage kicks off on the burst's tail
  P(233), // a last surge of the burst
  P(242), // its stroke ends, slow
  P(247), // the sixth stage's surges
  P(254),
  P(261), // its stroke ends under the belly
  P(270), // the top stage's surges, going up into the dark
  LAST_SURGE,
]
