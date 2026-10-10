import type { Pt, Seg } from '../../../../../parts'
import { box, carried, lookFrom, part, type Company, type Look, type PartShot } from '../kit'
import { TURN } from '../music'
import { drawSwell } from './chamber-glass'
import { drawDeckOver, drawDeckRig, drawDust, drawMist, drawMistFront, drawPuffs, drawStone } from './shaft-draw'
import {
  I_HOPS,
  I_TOUCH,
  ianAt,
  ianSpin,
  L_BREAKS,
  L_HOPS,
  L_TOUCH,
  louiseAt,
  louiseSpin,
  smoother,
  turned,
  T_END,
  T_IAN_LEAP,
  T_LEAP,
  T0,
  T_KNOCK,
  T_ON,
  T_STOP,
  T_SWITCH,
  X_END,
  X_LAND,
  X_STOP,
  Y_C,
  Y_F,
} from './shaft-path'

/**
 * The shaft (65.985 → 85.786): the shaft builder's. The film's most famous physical moment.
 *
 * The cut comes inside the shell: the camera is turned a quarter, so the shaft looks as it did from outside, a tall
 * dark tunnel going up, the valley's daylight coming up the throat from below. The deck rises into the mouth with the
 * two of them on it and comes up against its stops on a pulse (67.431). Dark. She rolls across the deck to the
 * floodlight's switch and touches it (68.383): the lamp stutters, and catches on the next pulse (68.621), and its beam
 * goes up the shaft, the low ribs round it catching the light one above another into the dark, and far up a faint
 * white. Dust hangs in the beam, falling slowly down the throat.
 *
 * On the great burst (70.513) she leaps from the deck, and gravity turns under her: Earth's pull (down the throat)
 * swings round to the shell's own, toward the wall on her right, over half a second, and she falls in a true curve
 * (the path a throw takes in a gravity that turns) onto that wall, which is now the floor (71.227). The camera turns
 * after gravity like a heavy body on a spring (`rollAt`): lagging it, a few degrees past square as her first bounce
 * lands, settling as the bounces die, so the tall tunnel lies down into a long corridor; the dust turns with
 * gravity, lagging as fine dust does. Ian follows a pulse later (70.751), pressed along the deck by the turning pull
 * before he leaps, and lands on the next pulse after hers (71.465). They bounce, damped, three pulses, then two, then
 * one, each a pulse apart from the other (71.941, 72.173, 72.411, 72.644, 72.887): every hard pulse of the burst
 * but one is a touch. A breath of dust off the floor at each.
 *
 * Then the long shaft to the light. They roll along it, the flood's beam laid down the corridor over them and the
 * white growing at its end, the mist lying on the floor there. Over the first rib she floats a low hop (73.816), Ian
 * after her (74.553); the camera draws back to the whole shaft, the two of them small in it, from the daylight at
 * the mouth to the white; then the last ribs (81.473, 81.746; 83.882, 84.108), and in, as the shaft opens into the
 * chamber's dark. Out at 85.786 at 0.9 c/s along the floor, the camera square, Ian half a cell behind.
 */

/**
 * The camera's roll: a quarter turn in the mouth (the shell's +x up the screen), and square again with gravity. From
 * the great burst it follows gravity round as a heavy body on a damped spring would: slow to start (gravity's own turn
 * eases in), lagging it through the turn, carried about three degrees past square as her first bounce lands, and
 * settling back as the bounces die. The spring's last tenth of a degree is faded out, so it is square exactly by
 * `ROLL_FOR` after the burst.
 */
const ROLL_W = 3.7
const ROLL_ZETA = 0.72
export const ROLL_FOR = 2.9
const ROLL_DT = 1 / 1000
const ROLL: number[] = (() => {
  const out: number[] = []
  let a = -Math.PI / 2
  let v = 0
  for (let i = 0; i * ROLL_DT <= ROLL_FOR + ROLL_DT; i++) {
    out.push(a)
    // Semi-implicit Euler at a millisecond: the pull toward where gravity points, less the damping.
    const s = (i + 0.5) * ROLL_DT
    const pull = -(Math.PI / 2) * (1 - turned(TURN + s))
    v += (ROLL_W * ROLL_W * (pull - a) - 2 * ROLL_ZETA * ROLL_W * v) * ROLL_DT
    a += v * ROLL_DT
  }
  return out
})()
export const rollAt = (t: number): number => {
  if (t < T0) return 0
  if (t <= TURN) return -Math.PI / 2
  const s = t - TURN
  if (s >= ROLL_FOR) return 0
  const i = s / ROLL_DT
  const j = Math.floor(i)
  const a = ROLL[j] + (ROLL[j + 1] - ROLL[j]) * (i - j)
  return a * (1 - smoother((s - (ROLL_FOR - 0.5)) / 0.5))
}

/** Every strike, show seconds. */
export const SHAFT_HITS: number[] = [
  ...new Set([T_STOP, T_SWITCH, T_ON, T_LEAP, T_IAN_LEAP, T_KNOCK, ...L_TOUCH, ...I_TOUCH, ...L_HOPS.flat(), ...I_HOPS.flat()]),
].sort((a, b) => a - b)

interface ShaftState {
  begin: number
}

/** Her lane: sampled from the one function the drawing reads, broken at every landing so each is a segment's end. */
function lane(slot: { begin: number; end: number }): Seg[] {
  const breaks = [...new Set([...L_BREAKS, slot.begin, slot.end])].filter((t) => t >= slot.begin - 1e-9 && t <= slot.end + 1e-9).sort((a, b) => a - b)
  const segs: Seg[] = []
  const at = (s: number): Pt => louiseAt(slot.begin + s)
  for (let i = 0; i + 1 < breaks.length; i++) {
    const a = breaks[i] - slot.begin
    const b = breaks[i + 1] - slot.begin
    if (b - a < 1e-9) continue
    const p0 = at(a)
    const p1 = at(b)
    const pm = at((a + b) / 2)
    // A stretch where she does not move (waiting on the deck) is one pause; anything else is sampled finely.
    const still = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 1e-6 && Math.hypot(pm[0] - p0[0], pm[1] - p0[1]) < 1e-6
    const n = still ? 1 : Math.max(2, Math.ceil((b - a) / 0.025))
    segs.push(...carried(at, a, b, n))
  }
  return segs
}

/**
 * Where they look on the deck in the mouth: once she has pressed the switch, up the shaft the way the beam goes (along
 * its length, which the camera's quarter turn shows as up), into the dark it lights, until they leap; then the eyes
 * roll with them again.
 */
const UP_SHAFT: Look[] = [{ from: T_SWITCH + 0.1, to: T_LEAP - 0.1, at: () => 0 }]

export const shaft = part<ShaftState>(
  {
    name: 'shaft',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      drawStone(p, c, t)
      drawMist(p, c, t)
      drawDeckRig(p, c, t)
      drawDust(p, c, t)
      drawPuffs(p, c, t)
    },
    over: (p, s, c) => {
      drawDeckOver(p, c, s.begin + c.t)
      drawMistFront(p, c, s.begin + c.t)
      drawSwell(p, c.k, s.begin + c.t, Y_F, 1.6)
    },
  },
  (slot) => {
    const segs = lane(slot)
    const end = louiseAt(slot.end)
    const company: Company[] = [
      {
        who: 'ian',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const [x, y] = ianAt(t)
          return { x, y, spin: lookFrom(UP_SHAFT, t, ianSpin(t)) ?? ianSpin(t) }
        },
      },
    ]
    return {
      cells: box(-4, Y_C - 6, X_END + 2, Y_F + 5),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: T_STOP - slot.begin },
      state: { begin: slot.begin },
      company,
      riders: (t, hero) => [{ ...hero, spin: lookFrom(UP_SHAFT, t, louiseSpin(t)) ?? louiseSpin(t) }],
    }
  },
  (slot) => {
    const L = (t: number) => louiseAt(t)
    const keys: PartShot[] = [
      // Coming up into the mouth: close, on her.
      { t: T0 + 0.6, cells: 4.6, off: [0.72, 0], w: 0 },
      // Home against the stops: settle a little wide of her, the shaft over them.
      { t: T_STOP + 0.25, cells: 4.9, hold: [X_STOP + 0.85, 0.2], w: 1 },
      // The lamp catches and the beam goes up: look up the shaft with it.
      { t: T_ON + 0.5, cells: 6.6, hold: [X_STOP + 2.1, 0.35], w: 1 },
      // Back down to them, framing the wall she will land on.
      { t: TURN - 0.35, cells: 5.9, hold: [X_STOP + 1.45, 0.75], w: 1 },
      // The turn: the frame turns about the middle of her fall.
      { t: TURN + 0.6, cells: 5.6, hold: [X_STOP + 0.95, 1.55], w: 1 },
      { t: TURN + 1.7, cells: 5.5, hold: [X_LAND + 1.3, 1.75], w: 1 },
      // Settled: the deck at the left edge, the corridor opening right; then drawing back as they set off.
      { t: TURN + 3.0, cells: 6.2, hold: [L(TURN + 3)[0] + 2.0, 1.4], w: 1 },
      // One breath of the whole shaft: the mouth's daylight at one end, the white at the other, the two of them small
      // between; then back in to them, moving with them past the beam and the lit ribs.
      { t: 76.0, cells: 11.8, hold: [7.4, -0.35], w: 1 },
      { t: 77.7, cells: 11.4, hold: [7.9, -0.3], w: 1 },
      { t: 79.9, cells: 6.6, off: [1.2, -1.15], w: 0 },
      { t: 83.3, cells: 6.2, off: [1.1, -1.05], w: 0 },
      { t: T_END, cells: 5, off: [0.91, -0.9], w: 0 },
    ]
    return keys.filter((k) => k.t > slot.begin && k.t <= slot.end + 1e-6)
  },
)
