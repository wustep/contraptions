import type p5 from 'p5'
import { FLOOR, mixHex, R, type Pt } from '../../../../../parts'
import { alpha, beam, glow, hash, knock, ring, rgba, smooth, type Companion } from '../kit'
import { AT, level, notes, paris, snap } from '../music'
import { CLUB_INK, CLUB_MAT } from '../worlds'

/**
 * The Paris club, shared by its two parts: the jazz (`jazz.ts`) and the
 * trumpet (`trumpet.ts`). One room, one clock: everything here is drawn from
 * show time, in the jazz part's frame (its entry cell, the red door's
 * threshold, is 0,0).
 *
 * A cellar in section, vaulted, red. The red door opens onto a stone landing
 * at the top; a stair of seven steps goes down to the right, and at its foot
 * stands the band, which is one machine: a see-saw. Its left end rests on
 * the hi-hat's pedal and its right end on the kick drum's, so whatever lands
 * on an end plays it: a ball bouncing from end to end is the swing (the
 * kick, the chick of the hi-hat). Over its pivot, high on a tall stand, the
 * band's trumpet; to the right a snare with its own stick, and a stand-up
 * bass whose strings are plucked every time the see-saw comes down.
 *
 * He goes down the stair on the drum fill and plays the see-saw alone. Her
 * premiere is on the landing: flash guns come down from the vault on lazy
 * tongs and fire on the beats as she crosses it; a net of balloons lets go
 * over the stair as she reaches the top of it. She comes down step by step
 * and lands on the other end: from then on they ride it together, the two
 * of them the band's feet, to the last chord. The lights go out but for one
 * spot on the trumpet: they sit on its two ends at the edge of the light.
 */

const M = CLUB_MAT
const BG = CLUB_INK.bg
const INK = CLUB_INK.ink

/* ------------------------------------------------------------------ geometry (the jazz frame) */

/** The landing: its top is at FLOOR (a ball on it has its centre at y = 0), from the left wall to the stair. */
export const LAND_X1 = 0.6
export const RUN = 0.42
export const RISE = 0.3
export const NSTEP = 7
/** A ball on the cellar floor has its centre here; the floor's surface is GROUND. */
export const FLOOR_Y = RISE * (NSTEP + 1)
export const GROUND = FLOOR_Y + FLOOR
export const STAIR_FOOT = LAND_X1 + RUN * NSTEP
/** Where a ball rests on step i (1..7). */
export const stepBall = (i: number): Pt => [LAND_X1 + RUN * (i - 0.5), RISE * i]
export const WALL_L = -3.6
export const WALL_R = 8.6
const SPRING_Y = -0.75
const CROWN: Pt = [2.5, -2.95]
/** The vault's circle, through both springs and the crown. */
const VAULT = (() => {
  const half = (WALL_R - WALL_L) / 2
  const sag = SPRING_Y - CROWN[1]
  const r = (half * half + sag * sag) / (2 * sag)
  return { cx: (WALL_L + WALL_R) / 2, cy: CROWN[1] + r, r }
})()
/** The underside of the vault at x. */
export const vaultY = (x: number): number => VAULT.cy - Math.sqrt(Math.max(0, VAULT.r * VAULT.r - (x - VAULT.cx) ** 2))

/** The door, face-on in the back wall of the landing. */
export const DOOR_X = -0.5
const DOOR_W = 0.86
const DOOR_H = 1.5

/** The see-saw: its pivot, half its length, how far it tips, and where a ball sits on an end. */
export const PIVOT: Pt = [4.45, GROUND - 0.3]
export const HALF = 0.62
export const TILT = 0.16
const BEAM_T = 0.035
export const SEAT_D = 0.5
/** The hi-hat's stand, the kick drum, the snare, the bass, the trumpet on its tall stand. */
const HAT_X = 3.7
const HAT_Y = GROUND - 1.42
const KICK_X0 = 5.3
const KICK_X1 = 5.92
const KICK_D = 0.88
const SNARE: Pt = [6.55, GROUND - 0.98]
const BASS_X = 7.45
/** The trumpet's cradle (the pivot it tilts on) and its length from mouthpiece to bell. */
export const HORN: Pt = [PIVOT[0], 0.5]
/** The lamp in the crown of the vault that holds the trumpet in its light when the room goes dark. */
export const LAMP: Pt = [PIVOT[0] + 0.1, vaultY(PIVOT[0] + 0.1) + 0.32]

/* ------------------------------------------------------------------ the clock (show seconds) */

/** A measured onset near t (strongest within 30 ms), or t itself. */
const on = (t: number): number => snap(t, 0.03)?.t ?? t
/** A beat of the club's comb: its measured onset if it has one, else the comb's own time. */
export const beat = (k: number): number => snap(paris(k), 0.03)?.t ?? paris(k)

export const J0 = AT.jazz
/** The door slams behind them; the bulbs come on. */
export const SLAM = on(215.365)
export const LIGHTS = on(215.69)
/** Off the edge of the landing, and down the stair on the fill, a step an eighth. */
export const LEAVE = on(216.108)
export const STEP_T = [216.468, 216.712, 216.956, 217.199, 217.455, 217.687, 217.873].map(on)

export type End = -1 | 1
/** He plays it alone: every landing on an end, and which. The fill's last note is the first. */
const SOLO: [number, End][] = [
  [on(218.105), -1],
  ...([
    [9.5, 1], [11, -1], [12, 1], [13.5, -1], [14.5, 1], [15.5, -1], [16.5, 1], [17, 1], [18, -1], [19, 1], [20, -1], [20.5, -1],
    [21.5, 1], [22.5, -1], [23.5, 1], [24, 1], [25, -1], [26, 1], [27, -1], [28, 1], [29, -1], [30, 1], [31, -1], [32, 1],
    [33, -1], [34, 1], [34.5, 1], [36, -1], [36.5, -1],
  ] as [number, End][]).map(([k, e]) => [beat(k), e] as [number, End]),
]
/** She lands on the left end as he lands on the right: from here they ride it together. */
export const MEET = beat(38)
/** Together: each time one end comes down, and which. The last is the band's last chord. */
const DUET: [number, End][] = [
  [beat(39), 1], [beat(40.5), -1], [beat(41), 1], [beat(42), -1], [beat(43), 1], [beat(44), -1], [beat(46), 1], [beat(46.5), -1],
  [beat(47), 1], [on(237.447), -1], [on(238.039), 1],
]
export const BUTTON = DUET[DUET.length - 1][0]
/** The room goes dark after the last chord, all but the spot on the trumpet. */
export const DARK: [number, number] = [BUTTON + 0.1, BUTTON + 0.9]

/** The premiere: flash guns fire on six beats as she crosses the landing; the balloons let go on the seventh. */
export const FLASHES = [23, 24, 25, 26, 27, 28].map(beat)
export const BALLOONS = beat(29)
/** The snare's stick, on the band's accents. */
export const SNARE_T = [15, 16.5, 18.5, 20.5, 24, 29, 31.5, 41, 46.5].map(beat)

/** The trumpet's solo: its knock, from silence, when he comes down hard on his end; she rolls down to him. */
export const KNOCK = AT.knock1
export const HOP_UP = KNOCK - 0.35
export const ROLL_FROM = on(265.056)
export const TOUCH = on(266.008)

/* ------------------------------------------------------------------ the see-saw */

/** A struck end: down hard within a few hundredths, then its pedal's spring brings it back up. */
const pulse = (tau: number): number => (tau < 0 ? 0 : smooth(tau, 0, 0.035) * Math.exp(-Math.max(0, tau - 0.035) / 0.13))

/** The tilt of the beam at show time t (positive: the right end is down), and how far the whole beam is pressed down. */
export function seesaw(t: number): { a: number; dip: number } {
  if (t < SOLO[0][0]) return { a: 0, dip: 0 }
  if (t < MEET) {
    let a = 0
    for (const [ti, e] of SOLO) {
      if (ti > t) break
      if (t - ti < 1.2) a += e * TILT * pulse(t - ti)
    }
    return { a: Math.max(-TILT, Math.min(TILT, a)), dip: 0 }
  }
  // Both land at once: the beam stays level and goes down on both pedals together.
  const dip = 0.07 * pulse(t - MEET)
  if (t < DUET[0][0]) {
    // Pushed off from level into the first rock.
    const u = (t - MEET) / (DUET[0][0] - MEET)
    return { a: DUET[0][1] * TILT * u * u, dip }
  }
  if (t < BUTTON) {
    let i = 0
    while (i + 1 < DUET.length && DUET[i + 1][0] <= t) i++
    const [t0, e0] = DUET[i]
    const [t1, e1] = DUET[i + 1]
    const u = (t - t0) / (t1 - t0)
    // Off the bottom slowly (a push), into the next bottom fast (a hit); the same end twice rises half way and falls back.
    const from = e0 * TILT
    const to = e1 * TILT
    const a = e0 === e1 ? from - e0 * TILT * 0.55 * Math.sin(Math.PI * u) : from + (to - from) * u * u
    return { a: a + e0 * TILT * 0.12 * ring(t - t0, 7, 0.05), dip }
  }
  // After the last chord it settles level on its springs, the two of them balanced on it.
  let a = TILT * settle(t - BUTTON)
  if (t >= HOP_UP) {
    // He springs up off his end: hers sinks under her; he comes down hard on the knock, and it slams over to his side.
    if (t < KNOCK) a -= TILT * 0.45 * smooth(t, HOP_UP, HOP_UP + 0.2)
    else {
      const s = t - KNOCK
      // From where it was (down on her side) over to his, fast but whole: it slams, it does not teleport.
      a = TILT * (1 - 1.45 * Math.exp(-s / 0.035)) + TILT * 0.1 * ring(s, 5, 0.12) * (1 - Math.exp(-s / 0.02))
    }
  }
  return { a: Math.max(-TILT * 1.05, Math.min(TILT * 1.05, a)), dip: 0 }
}
/** From the right end down, back to level: slow and heavy, with the two of them on it. */
const settle = (s: number): number => (s < 0 ? 1 : Math.exp(-s / 0.28) * (Math.cos(s * 6) + 0.5 * Math.sin(s * 6)))

/** A point on the beam `d` along from the pivot and `up` above its top. */
export function onBeam(t: number, d: number, up = R): Pt {
  const { a, dip } = seesaw(t)
  const c = Math.cos(a)
  const s = Math.sin(a)
  const h = BEAM_T + up
  return [PIVOT[0] + d * c + h * s, PIVOT[1] + dip + d * s - h * c]
}
/** Where a ball sits on the left (-1) or right (1) end at show time t. */
export const seat = (end: End, t: number): Pt => onBeam(t, end * SEAT_D)
/** Where the jazz hands the ball to the trumpet: his seat on the right end as the solo begins. The trumpet's frame is the jazz's less this. */
export const HANDOFF: Pt = seat(1, AT.trumpet)

/** The solo's landings, for the lane: times and ends, in order. */
export const SOLO_LANDINGS = SOLO
/** And every strike the see-saw makes (the kick or the hi-hat), solo and together. */
export const SEESAW_T = [...SOLO.map(([t]) => t), MEET, ...DUET.map(([t]) => t)]

/** How far each pedal is pressed (0..1): the left one works the hi-hat, the right one the kick. */
function pedals(t: number): { hat: number; kick: number } {
  const { a, dip } = seesaw(t)
  const d = dip / 0.07
  return { hat: Math.min(1, Math.max(0, -a / TILT) + d), kick: Math.min(1, Math.max(0, a / TILT) + d) }
}

/* ------------------------------------------------------------------ Mia */

/** Where she stands on the landing, the steps she comes down on, and her seat. */
const MIA_WAIT = -1.35
const MIA_STEPS = [30, 31, 32, 33, 34, 36, 37].map(beat)

/**
 * Mia, in the jazz frame. She comes out of the door with him and waits on the landing while he goes down; at her
 * premiere she crosses the landing a step a beat, stopping for each flash; at the top of the stair the balloons
 * go, and she comes down it the way he did, only on the beats, a hesitation on the fifth step; she lands on the
 * see-saw's other end with him, and rides it. In the dark she sits on her end; when he knocks, it throws her
 * end up and she rolls down the beam to him.
 */
export function miaAt(t: number): Companion {
  const p = miaPos(t)
  return { x: p[0], y: p[1] }
}
function miaPos(t: number): Pt {
  // Out of the doorway to the left of it, easing to a stop.
  const out0 = DOOR_X - 0.14
  if (t < J0 + 1.1) {
    const u = Math.max(0, (t - J0) / 1.1)
    return [out0 + (MIA_WAIT - out0) * (1 - (1 - u) * (1 - u)), 0]
  }
  const walk0 = FLASHES[0] - 0.2
  const top: Pt = [LAND_X1 - 0.17, 0]
  if (t < walk0) {
    // Waiting: she turns toward the stair as he goes down it, and back.
    return [MIA_WAIT + 0.05 * smooth(t, LEAVE - 0.2, LEAVE + 0.4) - 0.05 * smooth(t, 219.5, 220.5), 0]
  }
  if (t < BALLOONS + 0.25) {
    // Across the landing: a step between flashes, still on each.
    const marks = [walk0, ...FLASHES, BALLOONS, BALLOONS + 0.25]
    const n = marks.length - 1
    let i = 0
    while (i + 1 < marks.length && marks[i + 1] <= t) i++
    const u = smooth(t, marks[i], Math.min(marks[i + 1], marks[i] + 0.34))
    const x = MIA_WAIT + ((top[0] - MIA_WAIT) * (i + u)) / n
    return [x, 0]
  }
  if (t < MEET) {
    // Down the stair, a step a beat; then onto her end of the see-saw as he lands on his.
    const ways: [number, Pt][] = [[BALLOONS + 0.25, top], ...MIA_STEPS.map((ti, i) => [ti, stepBall(i + 1)] as [number, Pt]), [MEET, seat(-1, MEET)]]
    let i = 0
    while (i + 1 < ways.length && ways[i + 1][0] <= t) i++
    const [t0, a] = ways[i]
    const [t1, b] = ways[i + 1]
    // She waits on each step and goes in the last 0.36 s before the next beat.
    const T = Math.min(0.36, t1 - t0)
    const go = t1 - T
    if (t < go) return a
    const u = (t - go) / T
    const lift = (16 * T * T) / 8
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - lift * 4 * u * (1 - u)]
  }
  if (t < ROLL_FROM) return seat(-1, t)
  // Down the beam to him: slowly at first, faster, and she stops against him.
  const d0 = -SEAT_D
  const d1 = SEAT_D - 2 * R
  if (t < TOUCH) {
    const u = (t - ROLL_FROM) / (TOUCH - ROLL_FROM)
    return onBeam(t, d0 + (d1 - d0) * u * u)
  }
  const s = t - TOUCH
  return onBeam(t, d1 - 0.035 * Math.sin(Math.min(Math.PI, s * 9)) * Math.exp(-s / 0.2))
}

/* ------------------------------------------------------------------ the trumpet's notes */

/**
 * Its fingering for a (concert) MIDI pitch: which of its three valves are down. A B♭ trumpet reads a tone above what
 * it sounds.
 */
const FINGER: Record<number, number[]> = { 0: [], 1: [0], 2: [1], 3: [0, 2], 4: [1, 2], 5: [0, 1], 6: [0, 1, 2] }
const FING = [0, 6, 3, 4, 5, 1, 2, 0, 4, 5, 1, 2] // written C.. B in the octave below C5
const FING_HI = [0, 5, 1, 2, 0, 1, 2, 0, 4, 5, 1, 2] // from C5 up
function fingering(midi: number): number[] {
  const w = midi + 2
  if (w < 60) return FINGER[[6, 3, 4, 5, 1, 2][Math.max(0, Math.min(5, w - 54))]]
  if (w < 72) return FINGER[FING[w - 60]]
  return FINGER[FING_HI[(w - 72) % 12]]
}

/** The solo, as measured (concert MIDI from the recording's pitch, 0 a rest): what the valves and the bell follow. */
const SOLO_PITCH: [number, number][] = [
  [239.05, 62], [239.1, 63], [239.3, 65], [239.5, 67], [239.65, 69], [239.8, 70], [240.0, 72], [240.2, 74], [240.4, 75], [240.65, 74],
  [240.8, 72], [241.0, 74], [241.35, 77], [241.45, 81], [241.75, 80], [241.8, 79], [242.15, 78], [244.65, 0],
  [245.9, 79], [246.6, 77], [246.85, 75], [247.1, 73], [247.3, 75], [247.55, 73], [247.7, 72], [247.9, 70], [248.35, 72], [248.55, 68],
  [248.7, 70], [248.85, 65], [249.15, 63], [249.5, 58], [249.65, 63], [249.8, 56], [250.05, 58], [250.35, 52], [250.65, 56], [251.35, 52],
  [253.15, 0],
  [254.65, 62], [254.8, 63], [254.9, 64], [255.0, 67], [255.2, 70], [255.45, 67], [255.6, 69], [256.4, 67], [256.65, 69], [256.7, 67],
  [256.8, 66], [258.05, 0],
  [259.85, 62], [260.2, 63], [260.5, 70], [260.55, 72], [260.75, 75], [261.3, 74], [261.5, 72], [261.8, 79], [262.1, 82], [262.5, 81],
  [263.75, 0],
  [264.8, 79], [265.15, 82], [265.2, 84], [265.25, 85], [265.3, 86], [265.35, 88], [265.5, 87], [265.75, 86], [266.05, 84], [266.45, 86],
  [267.75, 0], [268.7, 84], [268.75, 85], [268.8, 86], [269.4, 0],
]
const pitchAt = (t: number): number => {
  let m = 0
  for (const [ti, mi] of SOLO_PITCH) {
    if (ti > t) break
    m = mi
  }
  return m
}

/**
 * The valves' presses: the fingering changes only on a measured onset, to the one the pitch just after it wants.
 * In the band, the upper line's onsets; in the solo, every note it tongues.
 */
interface Press {
  t: number
  down: number[]
}
const PRESSES: Press[] = (() => {
  const out: Press[] = []
  let cur: number[] = []
  const put = (t: number, down: number[]) => {
    if (down.join() === cur.join()) return
    cur = down
    out.push({ t, down })
  }
  for (const n of notes(218.4, BUTTON + 0.05, 0.6)) if (n.midi && n.midi >= 60) put(n.t, fingering(Math.min(88, n.midi)))
  put(BUTTON + 0.4, [])
  for (const n of notes(AT.trumpet - 0.01, 268, 0.1)) {
    const m = pitchAt(n.t + 0.08)
    put(n.t, m ? fingering(m) : [])
  }
  return out
})()
/** Every time a valve goes down: the strikes the trumpet makes. */
export const VALVE_T = PRESSES.filter((p, i) => p.down.some((v) => !(PRESSES[i - 1]?.down ?? []).includes(v))).map((p) => p.t)

/** How far each valve is down at t (0..1): down fast on its onset, up on its spring. */
function valves(t: number): number[] {
  let i = -1
  for (let j = 0; j < PRESSES.length; j++) if (PRESSES[j].t <= t) i = j
  const out = [0, 0, 0]
  if (i < 0) return out
  const now = PRESSES[i]
  const was = PRESSES[i - 1]?.down ?? []
  const s = t - now.t
  for (let v = 0; v < 3; v++) {
    const d = now.down.includes(v)
    const w = was.includes(v)
    out[v] = d ? (w ? 1 : smooth(s, 0, 0.03)) : w ? 1 - smooth(s, 0, 0.07) : 0
  }
  return out
}

/** The bell's lift (radians, up is negative) with the solo's line: the high notes raise it, the low ones bow it. */
function bellLift(t: number): number {
  if (t < AT.trumpet - 0.3) return 0
  // Eased toward the pitch over a quarter second, so it rises and bows with the phrase and not note by note.
  let acc = 0
  let wsum = 0
  for (let j = 0; j <= 6; j++) {
    const s = t - j * 0.06
    const m = pitchAt(s)
    const w = 1 - j / 7
    acc += (m ? (m - 72) / 16 : 0) * w
    wsum += w
  }
  return -0.3 * (acc / wsum) * smooth(t, AT.trumpet - 0.3, AT.trumpet + 0.3)
}

/* ------------------------------------------------------------------ balloons */

interface Balloon {
  x: number
  y: number
  color: string
  r: number
  /** When it lets go, how fast it falls, its sway, where it comes to rest. */
  at: number
  v: number
  sway: number
  rest: Pt
  land: number
}
const surface = (x: number): number => {
  if (x < LAND_X1) return FLOOR
  if (x < STAIR_FOOT) return FLOOR + RISE * Math.min(NSTEP, Math.floor((x - LAND_X1) / RUN) + 1)
  return GROUND
}
const BALLOON_SET: Balloon[] = (() => {
  const colors = [M.red, M.brass, M.bulb, M.skin, M.red, M.spot, M.brass, M.red, M.bulb, M.skin, M.red, M.brass, M.spot]
  const out: Balloon[] = []
  for (let i = 0; i < colors.length; i++) {
    const x = 1.05 + (i / (colors.length - 1)) * 2.0 + (hash(i, 3) - 0.5) * 0.18
    const y = -1.9 + Math.sin(i * 2.1) * 0.12 - 0.1 * Math.cos(((x - 2.05) / 1.1) * 1.2)
    const r = 0.16 + hash(i, 5) * 0.04
    const drift = (hash(i, 7) - 0.5) * 0.9 + (x - 2.05) * 0.35
    const restX = Math.min(STAIR_FOOT - 0.3, Math.max(LAND_X1 - 1.2, x + drift))
    const restY = surface(restX) - r * 1.05
    const v = 0.75 + hash(i, 11) * 0.35
    const at = BALLOONS + hash(i, 13) * 0.35
    const land = at + 0.35 + (restY - y) / v
    out.push({ x, y, color: colors[i], r, at, v, sway: 0.5 + hash(i, 17), rest: [restX, restY], land })
  }
  return out
})()

function balloonAt(b: Balloon, t: number): { x: number; y: number; a: number } {
  if (t < b.at) return { x: b.x, y: b.y + 0.01 * Math.sin(t * 1.3 + b.sway * 5), a: 0 }
  if (t < b.land) {
    const s = t - b.at
    const T = b.land - b.at
    const u = s / T
    // Drops free for a moment, then drifts down at its own pace, swaying.
    const y = b.y + (b.rest[1] - b.y) * (u < 0.1 ? u * u * 5 : 0.05 + (u - 0.1) * 1.055)
    const x = b.x + (b.rest[0] - b.x) * smooth(u, 0, 1) + 0.12 * Math.sin(s * (1.6 + b.sway)) * Math.sin(Math.PI * u)
    return { x, y: Math.min(b.rest[1], y), a: 0.25 * Math.sin(s * (1.6 + b.sway) + 1) }
  }
  // A light bounce where it lands, and still.
  const s = t - b.land
  return { x: b.rest[0], y: b.rest[1] - 0.12 * Math.abs(Math.sin(s * 5)) * Math.exp(-s / 0.35), a: 0.2 * Math.exp(-s / 0.5) * Math.sin(s * 6) }
}

/* ------------------------------------------------------------------ light */

/** The room's bulbs: out before they come on, on, out after the last chord. */
export function roomLight(t: number): number {
  if (t < LIGHTS) return 0
  const on1 = smooth(t, LIGHTS, LIGHTS + 0.06) * (t < LIGHTS + 0.12 ? 0.75 + 0.25 * Math.sin((t - LIGHTS) * 90) : 1)
  return on1 * (1 - smooth(t, DARK[0], DARK[1]))
}

/* ------------------------------------------------------------------ drawing */

const X = (k: number) => (v: number) => v * k

function shape(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** The whole room and the band, at show time t. */
export function drawClub(p: p5, k: number, weight: number, t: number): void {
  const L = roomLight(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const S = X(k)
  const wall = mixHex(BG, M.redDeep, 0.35 + 0.65 * L)
  const wallLit = mixHex(BG, M.red, 0.15 + 0.6 * L)
  const stone = mixHex(M.black, M.redDeep, 0.22 + 0.2 * L)
  const edge = rgba(INK, 0.16 + 0.22 * L)
  const lw = weight * 0.7

  // The earth the cellar is cut into.
  p.noStroke()
  p.fill(mixHex(M.black, BG, 0.5))
  p.rect(S(WALL_L - 30), S(-30), S(WALL_R - WALL_L + 60), S(60))

  // The back wall under the vault: red, warmest high up where the bulbs hang.
  {
    const pts: Pt[] = [[WALL_L, GROUND]]
    for (let i = 0; i <= 40; i++) {
      const x = WALL_L + ((WALL_R - WALL_L) * i) / 40
      pts.push([x, Math.min(SPRING_Y, vaultY(x))])
    }
    pts.push([WALL_R, GROUND])
    const g = ctx.createLinearGradient(0, S(CROWN[1]), 0, S(GROUND))
    g.addColorStop(0, wallLit)
    g.addColorStop(0.55, wall)
    g.addColorStop(1, mixHex(wall, M.black, 0.35))
    ctx.fillStyle = g
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(S(x), S(y)) : ctx.moveTo(S(x), S(y))))
    ctx.closePath()
    ctx.fill()
    // The vault's rim: a band of darker brick round the arch.
    p.noFill()
    p.stroke(mixHex(wall, M.black, 0.45))
    p.strokeWeight(S(0.16))
    p.beginShape()
    for (let i = 0; i <= 40; i++) {
      const x = WALL_L + 0.08 + ((WALL_R - WALL_L - 0.16) * i) / 40
      p.vertex(S(x), S(vaultY(x) + 0.08))
    }
    p.endShape()
    p.stroke(edge)
    p.strokeWeight(lw)
    p.beginShape()
    for (let i = 0; i <= 40; i++) {
      const x = WALL_L + ((WALL_R - WALL_L) * i) / 40
      p.vertex(S(x), S(Math.min(SPRING_Y, vaultY(x))))
    }
    p.endShape()
  }

  // The bulbs strung across the vault, in two swags. Their light is the room's.
  drawBulbs(p, k, weight, t, L)

  // The band's light: a warm pool on the see-saw and the kit once it plays, breathing with the band.
  const band = smooth(t, SOLO[0][0] - 0.05, SOLO[0][0] + 0.1) * (1 - smooth(t, DARK[0], DARK[1]))
  if (band > 0) glow(p, k, PIVOT[0] + 0.9, GROUND - 1.1, 3.2, M.bulb, band * (0.1 + 0.08 * level(t)), 1.2, 0.8)

  // The floor.
  p.noStroke()
  p.fill(M.black)
  p.rect(S(WALL_L - 30), S(GROUND), S(WALL_R - WALL_L + 60), S(20))
  p.stroke(edge)
  p.strokeWeight(lw)
  p.line(S(WALL_L), S(GROUND), S(WALL_R), S(GROUND))

  // The door in the back wall of the landing.
  drawDoor(p, k, weight, t, L)

  // The landing and the stair: one mass of stone, brass on the nosings.
  p.noStroke()
  p.fill(stone)
  {
    const pts: Pt[] = [[WALL_L, FLOOR], [LAND_X1, FLOOR]]
    for (let i = 1; i <= NSTEP; i++) {
      pts.push([LAND_X1 + RUN * (i - 1), FLOOR + RISE * i])
      pts.push([LAND_X1 + RUN * i, FLOOR + RISE * i])
    }
    pts.push([STAIR_FOOT, GROUND], [WALL_L, GROUND])
    shape(p, k, pts)
    // An arch under the landing, dark.
    p.fill(mixHex(M.black, BG, 0.3))
    p.beginShape()
    p.vertex(S(-2.9), S(GROUND))
    p.vertex(S(-2.9), S(1.35))
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (Math.PI * i) / 16
      p.vertex(S(-1.75 + Math.cos(a) * 1.15), S(1.35 + Math.sin(a) * 0.7))
    }
    p.vertex(S(-0.6), S(GROUND))
    p.endShape(p.CLOSE)
    p.stroke(edge)
    p.strokeWeight(lw)
    p.noFill()
    p.line(S(WALL_L), S(FLOOR), S(LAND_X1), S(FLOOR))
    for (let i = 1; i <= NSTEP; i++) {
      p.line(S(LAND_X1 + RUN * (i - 1)), S(FLOOR + RISE * (i - 1)), S(LAND_X1 + RUN * (i - 1)), S(FLOOR + RISE * i))
      p.line(S(LAND_X1 + RUN * (i - 1)), S(FLOOR + RISE * i), S(LAND_X1 + RUN * i), S(FLOOR + RISE * i))
    }
    // Brass nosings catch the light.
    p.stroke(alpha(p, M.brass, 0.35 + 0.5 * L))
    p.strokeWeight(weight * 0.9)
    for (let i = 0; i <= NSTEP; i++) {
      const x = LAND_X1 + RUN * (i - 1)
      if (i === 0) continue
      p.line(S(x + 0.02), S(FLOOR + RISE * i + 0.012), S(x + 0.14), S(FLOOR + RISE * i + 0.012))
    }
    p.line(S(LAND_X1 - 0.14), S(FLOOR + 0.012), S(LAND_X1 - 0.02), S(FLOOR + 0.012))
  }
  // The stair's handrail, brass on black posts, down the near side.
  {
    const up = 0.62
    p.stroke(alpha(p, M.brass, 0.4 + 0.45 * L))
    p.strokeWeight(weight * 0.8)
    p.line(S(LAND_X1 - 0.05), S(FLOOR - up), S(STAIR_FOOT - 0.12), S(GROUND - up))
    p.stroke(alpha(p, M.black, 1))
    p.strokeWeight(weight * 0.9)
    p.line(S(LAND_X1 - 0.05), S(FLOOR - up), S(LAND_X1 - 0.05), S(FLOOR))
    p.line(S(STAIR_FOOT - 0.12), S(GROUND - up), S(STAIR_FOOT - 0.12), S(GROUND - RISE))
  }

  // The premiere's flash guns, down from the vault.
  drawFlashGuns(p, k, weight, t, L)

  // The band.
  drawBass(p, k, weight, t, L)
  drawTrumpet(p, k, weight, t, L)
  drawHat(p, k, weight, t, L)
  drawKick(p, k, weight, t, L)
  drawSnare(p, k, weight, t, L)
  drawSeesaw(p, k, weight, t, L)

  // The balloons, in their net and let go.
  drawBalloons(p, k, weight, t, L)

  // The flashes themselves, over it all.
  for (let i = 0; i < FLASHES.length; i++) {
    const s = t - FLASHES[i]
    if (s < -0.01 || s > 0.6) continue
    const g = GUNS[i % GUNS.length]
    const f = knock(s, 0.11)
    const [hx, hy] = gunHead(g, t)
    glow(p, k, hx, hy + 0.1, 2.6, M.spot, 0.75 * f)
    glow(p, k, hx + 0.1, 0.1, 1.6, M.spot, 0.35 * f, 1.4, 0.6)
  }
}

/* ------------------------------------------------------------------ bulbs */

const SWAGS: [Pt, Pt, number][] = [
  [[WALL_L + 0.3, vaultY(WALL_L + 0.3) + 0.25], [CROWN[0], CROWN[1] + 0.35], 0.55],
  [[CROWN[0], CROWN[1] + 0.35], [WALL_R - 0.3, vaultY(WALL_R - 0.3) + 0.25], 0.55],
]
const BULBS: { x: number; y: number; w: number }[] = (() => {
  const out: { x: number; y: number; w: number }[] = []
  for (const [a, b, sag] of SWAGS) {
    const n = 13
    for (let i = 1; i < n; i++) {
      const u = i / n
      const x = a[0] + (b[0] - a[0]) * u
      const y = a[1] + (b[1] - a[1]) * u + sag * 4 * u * (1 - u)
      out.push({ x, y: y + 0.07, w: 0.85 + 0.3 * hash(out.length, 21) })
    }
  }
  return out
})()

function drawBulbs(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  p.noFill()
  p.stroke(alpha(p, M.black, 0.9))
  p.strokeWeight(weight * 0.5)
  for (const [a, b, sag] of SWAGS) {
    p.beginShape()
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      p.vertex(S(a[0] + (b[0] - a[0]) * u), S(a[1] + (b[1] - a[1]) * u + sag * 4 * u * (1 - u)))
    }
    p.endShape()
  }
  const breath = 0.9 + 0.1 * level(t)
  for (const b of BULBS) {
    if (L > 0.01) glow(p, k, b.x, b.y, 0.45 * b.w, M.bulb, 0.22 * L * breath)
    p.noStroke()
    p.fill(L > 0.01 ? mixHex(M.redDeep, M.bulb, L) : mixHex(M.black, M.redDeep, 0.6))
    p.ellipse(S(b.x), S(b.y), S(0.07 * b.w), S(0.09 * b.w))
  }
}

/* ------------------------------------------------------------------ the door */

function drawDoor(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const x0 = DOOR_X - DOOR_W / 2
  const top = FLOOR - DOOR_H
  const r = DOOR_W / 2
  const arch = (inset: number): Pt[] => {
    const pts: Pt[] = [[x0 + inset, FLOOR]]
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (Math.PI * i) / 14
      pts.push([DOOR_X + Math.cos(a) * (r - inset), top + r + Math.sin(a) * (r - inset)])
    }
    pts.push([x0 + DOOR_W - inset, FLOOR])
    return pts
  }
  // The frame, then the doorway: the night outside, dark, a streetlamp's warmth low in it.
  p.noStroke()
  p.fill(mixHex(M.black, M.redDeep, 0.3))
  shape(p, k, arch(-0.08))
  p.fill(M.black)
  shape(p, k, arch(0))
  // The leaf: open on the kick as they come through, slammed on the next hit behind them, a rattle, still.
  let open = 0
  if (t < SLAM) open = 0.78 * (1 - Math.pow(smooth(t, SLAM - 0.3, SLAM), 2))
  const rattle = t >= SLAM ? 0.03 * ring(t - SLAM, 9, 0.08) : 0
  const w = DOOR_W * Math.cos((open + Math.abs(rattle)) * (Math.PI / 2))
  if (open > 0.01) glow(p, k, DOOR_X + 0.15, FLOOR - 0.35, 0.6, M.spot, 0.25 * open)
  const leaf = arch(0).map(([x, y]) => [x0 + ((x - x0) / DOOR_W) * w, y] as Pt)
  p.fill(mixHex(M.redDeep, M.red, 0.45 + 0.55 * Math.max(L, 0.35)))
  p.stroke(rgba(INK, 0.3 + 0.2 * L))
  p.strokeWeight(weight * 0.7)
  shape(p, k, leaf)
  if (w > 0.25) {
    // Two panels and a brass knob.
    p.noFill()
    p.stroke(alpha(p, M.redDeep, 0.9))
    p.strokeWeight(weight * 0.6)
    const f = w / DOOR_W
    p.rect(S(x0 + 0.12 * f), S(top + 0.55), S((DOOR_W - 0.24) * f), S(0.45))
    p.rect(S(x0 + 0.12 * f), S(top + 1.08), S((DOOR_W - 0.24) * f), S(0.3))
    p.noStroke()
    p.fill(M.brass)
    p.circle(S(x0 + w - 0.12 * f), S(FLOOR - 0.72), S(0.07))
  }
}

/* ------------------------------------------------------------------ the premiere's flash guns */

interface Gun {
  x: number
  /** Where it hangs from, how far the tongs reach, which way the dish faces. */
  hang: number
  reach: number
  aim: number
}
const GUNS: Gun[] = [
  { x: -2.35, hang: vaultY(-2.35) + 0.05, reach: 0.95, aim: 0.55 },
  { x: -0.1, hang: vaultY(-0.1) + 0.05, reach: 1.15, aim: -0.35 },
  { x: -1.3, hang: vaultY(-1.3) + 0.05, reach: 1.05, aim: 0.2 },
]
/** How far out the tongs are: down as her premiere starts, up again after the balloons. */
const gunOut = (t: number): number => smooth(t, FLASHES[0] - 0.9, FLASHES[0] - 0.25) * (1 - smooth(t, BALLOONS + 0.35, BALLOONS + 1.1))
const gunHead = (g: Gun, t: number): Pt => [g.x, g.hang + 0.12 + g.reach * gunOut(t)]

function drawFlashGuns(p: p5, k: number, weight: number, t: number, L: number): void {
  const out = gunOut(t)
  if (out <= 0.001) return
  const S = X(k)
  for (let gi = 0; gi < GUNS.length; gi++) {
    const g = GUNS[gi]
    const [hx, hy] = gunHead(g, t)
    // Lazy tongs: a scissor of brass links from the vault to the head.
    const n = 4
    const len = hy - g.hang
    const w = 0.05 + 0.18 * (1 - out)
    p.stroke(alpha(p, M.brass, 0.55 + 0.35 * L))
    p.strokeWeight(weight * 0.6)
    for (let i = 0; i < n; i++) {
      const y0 = g.hang + (len * i) / n
      const y1 = g.hang + (len * (i + 1)) / n
      p.line(S(g.x - w), S(y0), S(g.x + w), S(y1))
      p.line(S(g.x + w), S(y0), S(g.x - w), S(y1))
    }
    // The flash: a reflector dish on the head, turned toward her, and its bulb, spent (milky) once it has fired.
    let fired = -1
    for (let i = gi; i < FLASHES.length; i += GUNS.length) if (FLASHES[i] <= t) fired = i
    const kick = fired >= 0 ? ring(t - FLASHES[fired], 5, 0.12) : 0
    p.push()
    p.translate(S(hx), S(hy))
    p.rotate(g.aim + 0.12 * kick)
    p.stroke(rgba(INK, 0.45 + 0.3 * L))
    p.strokeWeight(weight * 0.6)
    p.fill(mixHex(M.black, M.brass, 0.25))
    p.rect(S(-0.05), S(-0.08), S(0.1), S(0.12))
    p.fill(mixHex(M.brass, M.spot, 0.4 + 0.3 * L))
    p.arc(0, S(0.2), S(0.46), S(0.3), Math.PI, 2 * Math.PI, p.CHORD)
    const since = fired >= 0 ? t - FLASHES[fired] : Infinity
    p.noStroke()
    p.fill(since < 0.12 ? M.spot : fired >= 0 ? mixHex(M.skin, M.black, 0.15) : mixHex(M.spot, M.bulb, 0.5))
    p.circle(0, S(0.17), S(0.09))
    p.pop()
  }
}

/* ------------------------------------------------------------------ the see-saw and the kit */

function drawSeesaw(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const { a, dip } = seesaw(t)
  const lit = Math.max(L, 0.25)
  // The pivot: a black stand on a brass hub.
  p.stroke(rgba(INK, 0.35 + 0.25 * lit))
  p.strokeWeight(weight * 0.7)
  p.fill(M.black)
  shape(p, k, [[PIVOT[0] - 0.16, GROUND], [PIVOT[0] - 0.05, PIVOT[1] + dip], [PIVOT[0] + 0.05, PIVOT[1] + dip], [PIVOT[0] + 0.16, GROUND]])
  // The beam.
  p.push()
  p.translate(S(PIVOT[0]), S(PIVOT[1] + dip))
  p.rotate(a)
  p.fill(mixHex(M.redDeep, M.red, 0.3 + 0.5 * lit))
  p.rect(S(-HALF), S(-BEAM_T), S(2 * HALF), S(2 * BEAM_T), S(0.02))
  // Brass cups at the ends where they sit.
  p.fill(M.brass)
  p.noStroke()
  for (const e of [-1, 1]) p.rect(S(e * SEAT_D - 0.1), S(-BEAM_T - 0.02), S(0.2), S(0.02))
  p.fill(mixHex(M.brass, M.black, 0.2))
  p.stroke(rgba(INK, 0.35 + 0.25 * lit))
  p.strokeWeight(weight * 0.6)
  p.circle(0, 0, S(0.1))
  p.pop()
}

/** The end's underside, where it rests on its pedal. */
function endFoot(t: number, e: End): Pt {
  return onBeam(t, e * (HALF - 0.08), -BEAM_T - 0.035 - R)
}

function pedal(p: p5, k: number, weight: number, heel: Pt, toe: Pt, lit: number): void {
  const S = X(k)
  p.stroke(rgba(INK, 0.3 + 0.25 * lit))
  p.strokeWeight(weight * 0.6)
  p.fill(mixHex(M.black, M.brass, 0.35 * lit))
  shape(p, k, [[heel[0], heel[1]], [toe[0], toe[1]], [toe[0], toe[1] + 0.045], [heel[0], heel[1] + 0.02]])
  p.fill(M.black)
  p.circle(S(heel[0]), S(heel[1] + 0.01), S(0.05))
}

function drawHat(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, 0.25)
  const { hat } = pedals(t)
  // Its pedal: heel under the beam, toe out under the stand, pushed down by the left end.
  const foot = endFoot(t, -1)
  pedal(p, k, weight, [PIVOT[0] - 0.3, GROUND - 0.03], [HAT_X - 0.02, foot[1] + 0.005], lit)
  // The stand: three legs, a tube, the rod; the lower cymbal fixed, the upper one pulled down onto it.
  p.stroke(alpha(p, M.black, 1))
  p.strokeWeight(weight * 0.9)
  p.line(S(HAT_X), S(GROUND - 0.28), S(HAT_X - 0.2), S(GROUND))
  p.line(S(HAT_X), S(GROUND - 0.28), S(HAT_X + 0.12), S(GROUND))
  p.line(S(HAT_X), S(GROUND - 0.05), S(HAT_X), S(HAT_Y + 0.05))
  p.stroke(rgba(INK, 0.4 + 0.2 * lit))
  p.strokeWeight(weight * 0.4)
  const gap = 0.1 * (1 - hat)
  p.line(S(HAT_X), S(HAT_Y), S(HAT_X), S(HAT_Y - gap - 0.14))
  const cym = (y: number, flip: number) => {
    p.fill(mixHex(M.brass, M.bulb, 0.25 * lit))
    p.stroke(rgba(INK, 0.35 + 0.25 * lit))
    p.strokeWeight(weight * 0.6)
    p.beginShape()
    p.vertex(S(HAT_X - 0.34), S(y))
    p.quadraticVertex(S(HAT_X), S(y - 0.09 * flip), S(HAT_X + 0.34), S(y))
    p.quadraticVertex(S(HAT_X), S(y - 0.03 * flip), S(HAT_X - 0.34), S(y))
    p.endShape(p.CLOSE)
  }
  cym(HAT_Y, 1)
  cym(HAT_Y - gap, -1)
  // The chick: a glint off the closed pair.
  const since = sinceHit(t, -1)
  if (since < 0.25) glow(p, k, HAT_X, HAT_Y - 0.02, 0.5, M.bulb, 0.45 * knock(since, 0.08) * lit, 1.4, 0.5)
}

/** Seconds since the see-saw last came down on end `e` (or both). */
function sinceHit(t: number, e: End): number {
  let best = Infinity
  for (const [ti, ei] of SOLO) if (ti <= t && ei === e) best = Math.min(best, t - ti)
  if (MEET <= t) best = Math.min(best, t - MEET)
  for (const [ti, ei] of DUET) if (ti <= t && ei === e) best = Math.min(best, t - ti)
  if (e === 1 && KNOCK <= t) best = Math.min(best, t - KNOCK)
  return best
}

function drawKick(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, 0.25)
  const { kick } = pedals(t)
  const foot = endFoot(t, 1)
  pedal(p, k, weight, [PIVOT[0] + 0.3, GROUND - 0.03], [KICK_X0 - 0.12, foot[1] + 0.005], lit)
  const since = sinceHit(t, 1)
  const thump = knock(since, 0.1)
  // The drum on its side: shell, hoops, a head each end; it gives a little on the beat.
  const cy = GROUND - KICK_D / 2 - 0.02
  const bulge = 0.012 * thump
  p.stroke(rgba(INK, 0.4 + 0.25 * lit))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(M.red, M.black, 0.25 + 0.3 * (1 - lit)))
  p.rect(S(KICK_X0), S(cy - KICK_D / 2 - bulge), S(KICK_X1 - KICK_X0), S(KICK_D + 2 * bulge))
  p.fill(mixHex(M.skin, M.black, 0.5 - 0.3 * lit))
  p.ellipse(S(KICK_X0), S(cy), S(0.14 + 0.03 * thump), S(KICK_D + 2 * bulge))
  p.noFill()
  p.stroke(alpha(p, M.brass, 0.5 + 0.4 * lit))
  p.strokeWeight(weight * 0.8)
  p.line(S(KICK_X0 + 0.05), S(cy - KICK_D / 2 - bulge), S(KICK_X0 + 0.05), S(cy + KICK_D / 2 + bulge))
  p.line(S(KICK_X1 - 0.05), S(cy - KICK_D / 2 - bulge), S(KICK_X1 - 0.05), S(cy + KICK_D / 2 + bulge))
  // Spurs.
  p.stroke(alpha(p, M.black, 1))
  p.line(S(KICK_X1 - 0.1), S(cy + 0.25), S(KICK_X1 + 0.12), S(GROUND))
  // The beater: back, and into the head as the pedal goes down.
  const axle: Pt = [KICK_X0 - 0.14, GROUND - 0.3]
  const phi = -0.62 + 0.9 * Math.pow(kick, 0.8)
  const head: Pt = [axle[0] + Math.sin(phi) * 0.42, axle[1] - Math.cos(phi) * 0.42]
  p.stroke(alpha(p, M.black, 1))
  p.strokeWeight(weight * 0.9)
  p.line(S(axle[0]), S(GROUND), S(axle[0]), S(axle[1]))
  p.stroke(rgba(INK, 0.4 + 0.2 * lit))
  p.strokeWeight(weight * 0.5)
  p.line(S(axle[0]), S(axle[1]), S(head[0]), S(head[1]))
  p.noStroke()
  p.fill(mixHex(M.skin, M.black, 0.35 - 0.25 * lit))
  p.circle(S(head[0]), S(head[1]), S(0.1))
}

function drawSnare(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, 0.25)
  const [sx, sy] = SNARE
  // The stand.
  p.stroke(alpha(p, M.black, 1))
  p.strokeWeight(weight * 0.9)
  p.line(S(sx), S(sy + 0.12), S(sx), S(GROUND - 0.25))
  p.line(S(sx), S(GROUND - 0.25), S(sx - 0.18), S(GROUND))
  p.line(S(sx), S(GROUND - 0.25), S(sx + 0.18), S(GROUND))
  // Its stick: a hinged arm on its own post, cocked, and down on the accent.
  let i = -1
  for (let j = 0; j < SNARE_T.length; j++) if (SNARE_T[j] <= t + 0.18) i = j
  let lift = 1
  if (i >= 0) {
    const s = t - SNARE_T[i]
    lift = s < 0 ? 1 - 0.25 * smooth(s, -0.18, -0.05) + 0.25 * smooth(s, -0.05, 0) - smooth(s, -0.05, 0) : smooth(s, 0.02, 0.3)
    lift = Math.max(0, Math.min(1, lift))
  }
  const pivot: Pt = [sx + 0.42, sy - 0.2]
  const ang = Math.PI + 0.35 - 0.75 * lift
  const tip: Pt = [pivot[0] + Math.cos(ang) * 0.5, pivot[1] + Math.sin(ang) * 0.5]
  p.stroke(alpha(p, M.black, 1))
  p.strokeWeight(weight * 0.9)
  p.line(S(pivot[0]), S(pivot[1]), S(pivot[0]), S(GROUND - 0.2))
  // The drum: a shallow shell, its skin face up; it shivers on the hit.
  const hit = i >= 0 ? knock(t - SNARE_T[i], 0.08) : 0
  p.stroke(rgba(INK, 0.4 + 0.25 * lit))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(M.brass, M.black, 0.45 - 0.25 * lit))
  p.rect(S(sx - 0.3), S(sy - 0.08), S(0.6), S(0.18))
  p.fill(mixHex(M.skin, M.black, 0.45 - 0.35 * lit))
  p.ellipse(S(sx), S(sy - 0.08 + 0.01 * hit), S(0.6), S(0.08))
  p.stroke(mixHex(M.skin, M.brass, 0.3))
  p.strokeWeight(weight * 0.55)
  p.line(S(pivot[0]), S(pivot[1]), S(tip[0]), S(tip[1]))
  p.noStroke()
  p.fill(M.black)
  p.circle(S(pivot[0]), S(pivot[1]), S(0.06))
}

function drawBass(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, 0.2)
  p.push()
  p.translate(S(BASS_X), S(GROUND - 0.12))
  p.rotate(0.12)
  // Body: lower bout, waist, upper bout; the neck and scroll above.
  const body: Pt[] = []
  const prof = (u: number) => 0.38 * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, u / 0.62))) * (u < 0.62 ? 1 : 0) + (u >= 0.62 ? 0.27 + 0.05 * Math.sin((Math.PI * (u - 0.62)) / 0.38) : 0)
  for (let i = 0; i <= 20; i++) {
    const u = i / 20
    body.push([prof(u) + (u > 0.55 && u < 0.7 ? -0.06 * Math.sin((Math.PI * (u - 0.55)) / 0.15) : 0), -u * 1.5])
  }
  const full: Pt[] = [...body, ...body.slice().reverse().map(([x, y]) => [-x, y] as Pt)]
  p.stroke(rgba(INK, 0.35 + 0.25 * lit))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(M.redDeep, M.brass, 0.18 + 0.25 * lit))
  shape(p, k, full)
  // F-holes: two dark slits, curved, no letters in them.
  p.noFill()
  p.stroke(alpha(p, M.black, 0.8))
  p.strokeWeight(weight * 0.6)
  for (const e of [-1, 1]) {
    p.beginShape()
    p.vertex(S(e * 0.14), S(-0.62))
    p.quadraticVertex(S(e * 0.2), S(-0.78), S(e * 0.13), S(-0.94))
    p.endShape()
  }
  // Neck, fingerboard and scroll.
  p.stroke(rgba(INK, 0.3 + 0.2 * lit))
  p.fill(M.black)
  p.rect(S(-0.05), S(-2.55), S(0.1), S(1.35))
  p.fill(mixHex(M.redDeep, M.brass, 0.2 + 0.2 * lit))
  p.circle(0, S(-2.62), S(0.16))
  // Tailpiece and bridge.
  p.fill(M.black)
  p.noStroke()
  p.rect(S(-0.06), S(-0.42), S(0.12), S(0.3))
  p.fill(mixHex(M.skin, M.brass, 0.4))
  p.rect(S(-0.09), S(-0.6), S(0.18), S(0.04))
  // Strings, bridge to scroll: plucked each time the see-saw comes down; the plucked one hums.
  let last = -1
  let ago = Infinity
  for (let j = 0; j < SEESAW_T.length; j++)
    if (SEESAW_T[j] <= t) {
      last = j
      ago = t - SEESAW_T[j]
    }
  if (KNOCK <= t) ago = Math.min(ago, t - KNOCK)
  for (let s = 0; s < 4; s++) {
    const x = -0.045 + s * 0.03
    const hum = last >= 0 && last % 4 === s ? 0.018 * Math.exp(-ago / 0.25) : 0
    p.stroke(alpha(p, M.skin, 0.55 + 0.3 * lit))
    p.strokeWeight(weight * 0.3)
    if (hum > 0.002) {
      p.noFill()
      p.beginShape()
      p.vertex(S(x), S(-0.6))
      p.quadraticVertex(S(x + hum), S(-1.55), S(x), S(-2.5))
      p.quadraticVertex(S(x - hum), S(-1.55), S(x), S(-0.6))
      p.endShape()
    } else p.line(S(x), S(-0.6), S(x), S(-2.5))
  }
  p.pop()
}

function drawTrumpet(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, t > DARK[0] ? 1 : 0.3)
  // The tall stand: a black pole from behind the see-saw's pivot to a cradle, three feet.
  p.stroke(alpha(p, M.black, 1))
  p.strokeWeight(weight * 0.8)
  p.line(S(HORN[0]), S(HORN[1] + 0.12), S(HORN[0]), S(PIVOT[1] - 0.05))
  p.line(S(HORN[0] - 0.1), S(PIVOT[1] - 0.05), S(HORN[0] + 0.1), S(PIVOT[1] - 0.05))
  const v = valves(t)
  const lift = bellLift(t)
  // It sways a little on the band's big hits, and lifts its bell with the solo's high notes.
  const sway = 0.03 * ring(t - (sinceHit(t, 1) < sinceHit(t, -1) ? t - sinceHit(t, 1) : t - sinceHit(t, -1)), 2.2, 0.35)
  p.push()
  p.translate(S(HORN[0]), S(HORN[1]))
  p.rotate(lift + sway)
  const brass = mixHex(M.brass, M.black, 0.55 - 0.5 * lit)
  const shine = mixHex(M.brass, M.spot, 0.35 * lit)
  p.stroke(rgba(INK, 0.3 + 0.35 * lit))
  p.strokeWeight(weight * 0.55)
  // The main tuning slide: a loop under the leadpipe, back toward the mouthpiece.
  p.noFill()
  p.stroke(brass)
  p.strokeWeight(S(0.045))
  p.beginShape()
  p.vertex(S(-0.2), S(0.05))
  p.vertex(S(-0.45), S(0.05))
  p.quadraticVertex(S(-0.58), S(0.05), S(-0.58), S(0.13))
  p.quadraticVertex(S(-0.58), S(0.21), S(-0.45), S(0.21))
  p.vertex(S(0.2), S(0.21))
  p.endShape()
  // The leadpipe from the mouthpiece, over to the valves, and the bell's long taper.
  p.stroke(shine)
  p.strokeWeight(S(0.04))
  p.line(S(-0.62), S(-0.04), S(0.2), S(-0.04))
  p.line(S(0.2), S(0.21), S(0.28), S(0.21))
  p.noStroke()
  p.fill(shine)
  p.beginShape()
  p.vertex(S(0.2), S(0.19))
  p.quadraticVertex(S(0.4), S(0.19), S(0.5), S(0.16))
  p.quadraticVertex(S(0.6), S(0.12), S(0.64), S(-0.04))
  p.vertex(S(0.64), S(0.36))
  p.quadraticVertex(S(0.6), S(0.2), S(0.5), S(0.24))
  p.quadraticVertex(S(0.4), S(0.24), S(0.2), S(0.24))
  p.endShape(p.CLOSE)
  // The bell's mouth, and the breath in it: a warm light that comes and goes with the phrase.
  p.fill(mixHex(M.brass, M.black, 0.35))
  p.ellipse(S(0.64), S(0.16), S(0.07), S(0.4))
  const blow = t > AT.trumpet - 0.1 && pitchAt(t) > 0 ? 0.25 + 0.25 * level(t) : 0
  // The mouthpiece.
  p.fill(brass)
  p.stroke(rgba(INK, 0.3 + 0.3 * lit))
  p.strokeWeight(weight * 0.5)
  p.rect(S(-0.7), S(-0.065), S(0.09), S(0.05))
  // Three valves: casings, stems, and the caps that go down on the notes.
  for (let i = 0; i < 3; i++) {
    const vx = -0.12 + i * 0.105
    p.fill(brass)
    p.rect(S(vx - 0.035), S(-0.1), S(0.07), S(0.36), S(0.015))
    const d = 0.06 * v[i]
    p.stroke(mixHex(M.skin, M.brass, 0.5))
    p.strokeWeight(weight * 0.5)
    p.line(S(vx), S(-0.1), S(vx), S(-0.19 + d))
    p.fill(mixHex(M.skin, M.brass, 0.3 + 0.3 * (1 - lit)))
    p.stroke(rgba(INK, 0.3 + 0.3 * lit))
    p.rect(S(vx - 0.04), S(-0.225 + d), S(0.08), S(0.035), S(0.01))
  }
  p.pop()
  if (blow > 0) {
    const a = lift + sway
    const bx = HORN[0] + Math.cos(a) * 0.68 - Math.sin(a) * 0.16
    const by = HORN[1] + Math.sin(a) * 0.68 + Math.cos(a) * 0.16
    glow(p, k, bx, by, 0.55, M.bulb, 0.3 * blow, 0.7, 1.1)
  }
}

/* ------------------------------------------------------------------ balloons */

function drawBalloons(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, 0.2)
  const net0: Pt = [0.9, vaultY(0.9) + 0.2]
  const net1: Pt = [3.2, vaultY(3.2) + 0.2]
  // The net: slung between two hooks; on the beat its right side lets go and it hangs from the left.
  const drop = smooth(t, BALLOONS, BALLOONS + 0.3)
  const swing = t > BALLOONS ? 0.06 * ring(t - BALLOONS - 0.3, 1.4, 0.5) : 0
  p.noFill()
  p.stroke(alpha(p, M.skin, 0.45 * lit))
  p.strokeWeight(weight * 0.4)
  const mid: Pt = [(net0[0] + net1[0]) / 2, Math.max(net0[1], net1[1]) + 0.45]
  const end1: Pt = [net1[0] + (net0[0] + 0.25 - net1[0]) * drop + swing, net1[1] + (1.6 - 0) * drop]
  p.beginShape()
  p.vertex(S(net0[0]), S(net0[1]))
  p.quadraticVertex(S(mid[0] - 0.4 * drop), S(mid[1] + 0.5 * drop), S(end1[0]), S(end1[1]))
  p.endShape()
  p.beginShape()
  p.vertex(S(net0[0]), S(net0[1]))
  p.quadraticVertex(S(mid[0] - 0.3 * drop), S(mid[1] - 0.25 + 0.6 * drop), S(end1[0]), S(end1[1]))
  p.endShape()
  for (const b of BALLOON_SET) {
    const q = balloonAt(b, t)
    p.push()
    p.translate(S(q.x), S(q.y))
    p.rotate(q.a)
    p.stroke(alpha(p, M.black, 0.5))
    p.strokeWeight(weight * 0.35)
    p.line(0, S(b.r), S(0.02), S(b.r + 0.2))
    p.stroke(rgba(INK, 0.25 + 0.2 * lit))
    p.strokeWeight(weight * 0.5)
    p.fill(mixHex(M.black, b.color, 0.35 + 0.65 * lit))
    p.ellipse(0, 0, S(b.r * 1.7), S(b.r * 2))
    p.noStroke()
    p.fill(mixHex(M.black, b.color, 0.5 + 0.5 * lit))
    p.triangle(S(-0.025), S(b.r + 0.03), S(0.025), S(b.r + 0.03), 0, S(b.r - 0.005))
    p.fill(rgba(M.spot, 0.35 * lit))
    p.ellipse(S(-b.r * 0.35), S(-b.r * 0.45), S(b.r * 0.35), S(b.r * 0.5))
    p.pop()
  }
}

/* ------------------------------------------------------------------ the dark, and the trumpet's spot */

/** The room gone dark round one spot on the trumpet: drawn over the room, under the two of them. */
export function drawDark(p: p5, k: number, t: number, view: { x0: number; y0: number; x1: number; y1: number }): void {
  const f = smooth(t, DARK[0], DARK[1])
  if (f <= 0) return
  const S = X(k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const pool: Pt = [PIVOT[0], GROUND - 0.9]
  // The dark: nearly black, with a soft round hole where the spot falls.
  ctx.save()
  const g = ctx.createRadialGradient(S(pool[0]), S(pool[1]), S(0.7), S(pool[0]), S(pool[1]), S(2.1))
  g.addColorStop(0, rgba(M.black, 0))
  g.addColorStop(1, rgba(M.black, 0.93 * f))
  ctx.fillStyle = g
  ctx.fillRect(S(view.x0 - 2), S(view.y0 - 2), S(view.x1 - view.x0 + 4), S(view.y1 - view.y0 + 4))
  ctx.restore()
  // The beam, from the lamp in the vault to the floor, and its pool.
  const on1 = f
  beam(p, k, LAMP[0], LAMP[1] + 0.1, PIVOT[0], GROUND, 0.2, 1.6, M.spot, 0.12 * on1)
  glow(p, k, PIVOT[0], GROUND - 0.02, 1.0, M.spot, 0.3 * on1, 1.3, 0.28)
  glow(p, k, HORN[0] + 0.1, HORN[1] + 0.1, 0.9, M.spot, 0.18 * on1)
  // The lamp itself: a black can in the crown, its lens lit.
  p.stroke(rgba(INK, 0.35))
  p.strokeWeight(Math.max(1, k * 0.02))
  p.fill(M.black)
  p.push()
  p.translate(S(LAMP[0]), S(LAMP[1]))
  p.rect(S(-0.13), S(-0.2), S(0.26), S(0.28), S(0.04))
  p.noStroke()
  p.fill(rgba(M.spot, 0.5 + 0.5 * on1))
  p.ellipse(0, S(0.09), S(0.2), S(0.05))
  p.pop()
}

/** The lamp before it is lit: a black can in the crown of the vault, drawn with the room. */
export function drawLamp(p: p5, k: number, weight: number, t: number): void {
  if (smooth(t, DARK[0], DARK[1]) >= 1) return
  const S = X(k)
  p.stroke(rgba(INK, 0.3))
  p.strokeWeight(weight * 0.6)
  p.line(S(LAMP[0]), S(vaultY(LAMP[0])), S(LAMP[0]), S(LAMP[1] - 0.2))
  p.fill(M.black)
  p.rect(S(LAMP[0] - 0.13), S(LAMP[1] - 0.2), S(0.26), S(0.28), S(0.04))
}
