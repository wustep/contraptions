import { swing } from './music'

/**
 * The freeway's clock: every moment of the on-ramp, in show seconds, on the
 * swing's comb (`swing(k)`, beats 161 → 221, bars on k ≡ 1 mod 4). The
 * drawing and the lane read the same numbers, so a strike is where the music
 * is by construction.
 */

/** The swing's first downbeat: the light comes up on the freeway flat as he comes out of the club's door. */
export const LIGHTS_UP = swing(161)
/** The ramp gate drops to the road on the brass pickup; he hits its foot on the bar. */
export const GATE_DROP = swing(164.5)
export const GATE_FOOT = swing(165)
/** He tops the gate (no strike); the driver leans on the horn; the gate is pulled up and slams shut behind him. */
export const GATE_TOP = swing(166.2)
export const HORN = swing(166.5)
export const GATE_RISE = swing(166.7)
export const SLAM = swing(167)
/** The slam flings her into the bed; he bumps the cab. */
export const HER_BED = swing(167.5)
export const BONK = swing(168)
/** The pickup crouches on its hydraulics; the rear pops and throws him up onto the rack, she after him. */
export const SQUAT = swing(168.5)
export const POP_R = swing(169)
export const RACK = swing(169.5)
export const HER_RACK = swing(170.5)
/** The front pops: off the rack's end, the two fly to the bus's roof, she half a beat after him. */
export const POP_F = swing(172)
export const BUS = swing(173)
export const HER_BUS = swing(173.5)
/** The bus's windows light one by one on the riff's eighths; on the bar every window flashes. */
export const WINDOWS = [174.5, 175.5, 177.5, 178.5, 180.5, 182.5, 183.5].map(swing)
export const FLASH = swing(181)
/** She hesitates on the roof at a window, and catches up. */
export const HESITATE = swing(177.5)
/** The chorus line: eight cars, a landing a beat, his on the beat and hers a beat behind; each landing pops the hood. */
export const CARS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => swing(185 + i))
export const HER_CARS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => swing(186 + i))
/** The convertible: they land on its folded top; on the bar the top releases and rises; it latches on the beat after. */
export const DECK = swing(193)
export const HER_DECK = swing(194)
export const RELEASE = swing(197)
export const LATCH = swing(198)
/** The latch's bang throws the two of them into the Buick's seats. */
export const SEAT = swing(199.5)
/** The Buick: two turns of the starter, the catch, a rev, the lights, another rev, the lurch, and it pulls away. */
export const CRANKS = [swing(201), swing(202)]
export const CATCH = swing(203)
export const REVS = [swing(204), swing(205.5)]
export const HEADLIGHTS = swing(205)
export const LURCH = swing(207.5)
export const PULL = swing(208)
/** The deck's expansion joints: the car bumps over one on each of these. */
export const JOINTS = [swing(213), swing(214), swing(217.5), swing(218)]
/** The brake lights come on; on the loudest beat it stops dead at the freeway's end and they are thrown out. */
export const BRAKE = swing(220)
export const STOP = swing(221)

/** Every beat of the stretch: the jam's tail lights pulse on each (bright on the bar), the jam keeping time. */
export const BEATS: number[] = []
for (let k = 161; k <= 221; k++) BEATS.push(swing(k))
export const isBar = (i: number): boolean => (161 + i) % 4 === 1

/* ------------------------------------------------------------------ the drive */

/** It gathers to the freeway's pace over this long after it pulls away, and holds it to the stop. */
export const PACE = 2.5
const GATHER = swing(211) - PULL
const smoothU = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/** How far the Buick has driven from where it waited, at show time `T`: the lurch, the pull-away, the run, the stop. */
export function driveAt(T: number): number {
  let d = 0
  // The clutch bites: it creeps forward a hand's width and rocks.
  if (T > LURCH) d += 0.12 * smoothU((T - LURCH) / 0.18)
  if (T <= PULL) return d
  if (T >= STOP) return d + PACE * GATHER * 0.5 + PACE * (STOP - PULL - GATHER)
  const g = Math.min(1, (T - PULL) / GATHER)
  // ∫ smoothstep = g³ − g⁴/2 over the gather, then the pace.
  d += PACE * GATHER * (g * g * g - (g * g * g * g) / 2)
  if (T > PULL + GATHER) d += PACE * (T - PULL - GATHER)
  return d
}

/** The Buick's speed at `T`, cells a second. */
export function speedAt(T: number): number {
  if (T <= PULL || T >= STOP) return 0
  return PACE * smoothU((T - PULL) / GATHER)
}
