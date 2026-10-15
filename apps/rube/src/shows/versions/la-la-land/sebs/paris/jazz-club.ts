import type p5 from 'p5'
import { FLOOR, mixHex, R, type Pt } from '../../../../../parts'
import { alpha, beam, frame as frameOf, glow, hash, knock, lastOf, ring, rgba, smooth, type Companion } from '../kit'
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
 * bass, idle.
 *
 * He goes down the stair on the drum fill and plays the see-saw alone. Her
 * premiere is on the landing: flash guns come down from the vault on lazy
 * tongs and fire on the beats as she crosses it; the knot of a bunch of
 * balloons tied to the newel slips as she reaches the top of the stair, and
 * they go up into the crown of the vault. She comes down step by step
 * and lands on the other end: from then on they ride it together, the two
 * of them the band's feet, to the last chord. The lights go out but for one
 * spot on the trumpet: they sit on its two ends at the edge of the light, a
 * balance, and through the solo she inches in toward him.
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
/** The snare's stick, on the band's accents (the comb's, and three loud ones off it). */
export const SNARE_T = [...[15, 16.5, 18.5, 20.5, 24, 29, 31.5, 41, 46.5].map(beat), on(220.09), on(230.075), on(235.741)].sort((a, b) => a - b)

/** The trumpet's solo: its knock, from silence, when he comes down hard on his end; she rolls down to him. */
export const KNOCK = AT.knock1
export const HOP_UP = KNOCK - 0.35
export const ROLL_FROM = on(265.056)
export const TOUCH = on(266.008)

/**
 * The solo's breaths: in each rest between its phrases she inches along her end toward the pivot, toward him, and
 * the beam leans his way a little more each time. [from, to, her distance from the pivot after].
 */
const INCH: [number, number, number][] = [
  [244.75, 245.62, 0.41],
  [253.25, 254.3, 0.335],
  [258.2, 259.4, 0.265],
]
/** The solo's high accents: the hi-hat's open cymbal, at the edge of the spot, shivers. Its first, and the two-note climb
 * near its end (the high D, then the peak). */
export const SHIVER = [on(241.325), on(261.248), on(262.072)]
/** Its biggest (the F the solo comes back in on, every valve up): the spot's lamp flares. */
export const FLARE = on(246.549)

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
  // After the last chord it settles level on its springs, the two of them balanced on it; then it leans his way as she
  // inches in toward him.
  let a = TILT * settle(t - BUTTON) + leanAt(t)
  if (t >= HOP_UP) {
    // He springs up off his end: hers sinks under her; he comes down hard on the knock, and it slams over to his side.
    if (t < KNOCK) a += (-TILT * 0.45 - a) * smooth(t, HOP_UP, HOP_UP + 0.2)
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

/** How far she sits from the pivot (cells, on her side) at t: her seat, then nearer him in each of the solo's breaths. */
function miaReach(t: number): number {
  let d = SEAT_D
  for (const [a, b, to] of INCH) {
    if (t >= b) d = to
    else {
      if (t > a) d += (to - d) * smooth(t, a, b)
      break
    }
  }
  return d
}
/**
 * The lean her moves give the beam (radians, his side down): the two of them are a balance, so as she comes in
 * toward the pivot his end goes down. The beam is heavy on its pedal springs: it follows a little late and settles
 * with a small overshoot, never a jump. Simulated once from the first breath to his hop.
 */
const LEAN = (() => {
  const t0 = INCH[0][0] - 0.1
  const dt = 1 / 240
  const n = Math.ceil((HOP_UP + 0.3 - t0) / dt)
  const out = new Float32Array(n + 1)
  // At her last reach, the beam lies over just over half its full tilt.
  const K = (0.55 * TILT) / (SEAT_D - INCH[INCH.length - 1][2])
  const w = 2 * Math.PI * 1.05
  const z = 0.62
  let a = 0
  let v = 0
  for (let i = 0; i <= n; i++) {
    out[i] = a
    const goal = K * (SEAT_D - miaReach(t0 + i * dt))
    v += (w * w * (goal - a) - 2 * z * w * v) * dt
    a += v * dt
  }
  return { t0, dt, out }
})()
function leanAt(t: number): number {
  const u = (t - LEAN.t0) / LEAN.dt
  if (u <= 0) return 0
  const i = Math.min(LEAN.out.length - 2, Math.floor(u))
  const f = Math.min(1, u - i)
  return LEAN.out[i] * (1 - f) + LEAN.out[i + 1] * f
}

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
/** Her landings on the stair's steps, on the beats. */
export const MIA_STEPS = [30, 31, 32, 33, 34, 36, 37].map(beat)

/**
 * Mia, in the jazz frame. She comes out of the door with him and waits on the landing while he goes down; at her
 * premiere she crosses the landing a step a beat, stopping for each flash; at the top of the stair the balloons
 * go, and she comes down it the way he did, only on the beats, a hesitation on the fifth step; she lands on the
 * see-saw's other end with him, and rides it. In the dark she sits on her end and, in the solo's breaths, inches
 * along it toward him; when he knocks, it throws her end up and she rolls down the beam the rest of the way.
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
  // On her end; in the solo's breaths she inches in along it toward him.
  if (t < ROLL_FROM) return onBeam(t, -miaReach(t))
  // Down the beam to him: slowly at first, faster, and she stops against him.
  const d0 = -miaReach(ROLL_FROM)
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
/** Whether the solo is sounding a note at `t` (false in its rests). */
export const SOLO_SOUNDING = (t: number): boolean => t > AT.trumpet - 0.4 && t < 268.3 && pitchAt(t) > 0
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

/** The tie: a brass cleat on the stair's newel post, where the bunch's ribbons are knotted. */
const TIE: Pt = [LAND_X1 - 0.05, FLOOR - 0.68]
interface Balloon {
  color: string
  r: number
  sway: number
  /** Where it floats on its ribbon before the knot lets go, and its ribbon's length. */
  x: number
  y: number
  len: number
  /** After the knot lets go: its flight, sampled from BALLOONS (x, y, vx, vy per step). */
  track: Float32Array
}
const B_DT = 1 / 120
const B_STEPS = 8 * 120
/** Tethered: each rides its ribbon, swaying a hair round the tie. */
function tethered(b: { x: number; y: number; sway: number }, t: number): Pt {
  const a = 0.018 * Math.sin(t * (0.9 + 0.35 * b.sway) + b.sway * 7) + 0.008 * Math.sin(t * 2.3 + b.sway * 3)
  const dx = b.x - TIE[0]
  const dy = b.y - TIE[1]
  return [TIE[0] + dx * Math.cos(a) - dy * Math.sin(a), TIE[1] + dx * Math.sin(a) + dy * Math.cos(a)]
}
/**
 * The bunch: packed round a middle over the top of the stair, every ribbon to the tie. When the knot lets go they
 * rise, each at its own pace, drifting toward the crown; they bump the vault and slide along it to the top, and stay
 * up there, out of the way. One flight each, worked out once.
 */
const BALLOON_SET: Balloon[] = (() => {
  const colors = [M.red, M.brass, M.bulb, M.skin, M.red, M.spot, M.brass, M.red, M.bulb, M.skin, M.red, M.brass, M.spot]
  const C: Pt = [1.15, -1.5]
  const spots: Pt[] = [[0, 0]]
  for (let i = 0; i < 6; i++) spots.push([0.3 * Math.cos(i * 1.047 + 0.3), 0.3 * Math.sin(i * 1.047 + 0.3)])
  for (let i = 0; i < 6; i++) spots.push([0.56 * Math.cos(i * 1.047 + 0.8), 0.5 * Math.sin(i * 1.047 + 0.8)])
  const out: Balloon[] = spots.map(([dx, dy], i) => {
    const x = C[0] + dx + (hash(i, 3) - 0.5) * 0.08
    const y = C[1] + dy + (hash(i, 4) - 0.5) * 0.08
    const r = 0.155 + hash(i, 5) * 0.04
    return { color: colors[i % colors.length], r, sway: hash(i, 17), x, y, len: Math.hypot(x - TIE[0], y + r - TIE[1]), track: new Float32Array(0) }
  })
  // Where each ends up under the vault, in the order they start (left to right), so none crosses another.
  const order = out.map((_, i) => i).sort((a, b) => out[a].x - out[b].x)
  order.forEach((bi, rank) => {
    const b = out[bi]
    const goal = 1.35 + (rank / (out.length - 1)) * 2.6
    const rise = 0.62 + 0.3 * hash(bi, 11)
    const D = 2.2
    let [x, y] = tethered(b, BALLOONS)
    let vx = 0
    let vy = 0
    const tr = new Float32Array((B_STEPS + 1) * 4)
    for (let s = 0; s <= B_STEPS; s++) {
      tr.set([x, y, vx, vy], s * 4)
      const age = s * B_DT
      // Up at its own pace (drag holds it near that speed), steered gently toward its place, wandering a little.
      const ax = 0.9 * (goal - x) - D * vx + 0.35 * Math.sin(age * (1.4 + b.sway) + bi)
      const ay = -D * rise - D * vy
      vx += ax * B_DT
      vy += ay * B_DT
      x += vx * B_DT
      y += vy * B_DT
      // The vault: it may not go through; it bumps soft and slides along the curve toward the crown.
      const ox = x - VAULT.cx
      const oy = y - VAULT.cy
      const d = Math.hypot(ox, oy)
      const lim = VAULT.r - b.r * 1.05
      if (d > lim) {
        const nx = ox / d
        const ny = oy / d
        x = VAULT.cx + nx * lim
        y = VAULT.cy + ny * lim
        const vn = vx * nx + vy * ny
        if (vn > 0) {
          vx -= 1.3 * vn * nx
          vy -= 1.3 * vn * ny
        }
      }
    }
    b.track = tr
  })
  return out
})()

/** Where a balloon is at t, its lean, and how fast it is going (for its ribbon). */
function balloonAt(b: Balloon, t: number): { x: number; y: number; a: number; vx: number; vy: number } {
  if (t < BALLOONS) {
    const [x, y] = tethered(b, t)
    return { x, y, a: Math.atan2(x - TIE[0], TIE[1] - y) * 0.6, vx: 0, vy: 0 }
  }
  const u = Math.min(B_STEPS, (t - BALLOONS) / B_DT)
  const i = Math.min(B_STEPS - 1, Math.floor(u))
  const f = u - i
  const tr = b.track
  const at = (j: number) => tr[i * 4 + j] * (1 - f) + tr[(i + 1) * 4 + j] * f
  const x = at(0)
  // Up against the vault at last, it bobs a hair on the room's air.
  const rest = smooth(t, BALLOONS + B_STEPS * B_DT - 2, BALLOONS + B_STEPS * B_DT)
  const y = at(1) + rest * 0.01 * Math.sin(t * 1.1 + b.sway * 6)
  const vx = at(2)
  const vy = at(3)
  const lean0 = Math.atan2(b.x - TIE[0], TIE[1] - b.y) * 0.6
  const a = lean0 * (1 - smooth(t, BALLOONS, BALLOONS + 0.6)) + Math.max(-0.35, Math.min(0.35, 0.3 * vx)) + 0.05 * Math.sin(t * 1.3 + b.sway * 4)
  return { x, y, a, vx, vy }
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
  drawBulbs(p, k, weight, L)

  // The band's light: a warm pool on the see-saw and the kit once it plays, breathing with the band.
  const band = smooth(t, SOLO[0][0] - 0.05, SOLO[0][0] + 0.1) * (1 - smooth(t, DARK[0], DARK[1]))
  if (band > 0) glow(p, k, PIVOT[0] + 0.9, GROUND - 1.1, 3.2, M.bulb, band * (0.1 + 0.08 * level(t)), 1.2, 0.8)

  // The floor: old boards, wine-dark, the room's light lying on them and dying into the black under the frame.
  p.noStroke()
  p.fill(M.black)
  p.rect(S(WALL_L - 30), S(GROUND), S(WALL_R - WALL_L + 60), S(20))
  {
    const deck = 0.8
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, S(GROUND), 0, S(GROUND + deck))
    g.addColorStop(0, mixHex(stone, M.redDeep, 0.35))
    g.addColorStop(1, M.black)
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(S(WALL_L), S(GROUND), S(WALL_R - WALL_L), S(deck))
    ctx.restore()
    // The boards' ends: a staggered joint every so often, fading with the light as the deck goes down.
    p.strokeWeight(lw * 0.6)
    for (let x = WALL_L + 0.35, i = 0; x < WALL_R - 0.1; x += 0.62, i++) {
      const o = (i % 2) * 0.31
      p.stroke(rgba(INK, 0.09 + 0.09 * L))
      p.line(S(x + o), S(GROUND + 0.04), S(x + o), S(GROUND + 0.16))
      p.stroke(rgba(INK, 0.06 + 0.06 * L))
      p.line(S(x + 0.31 - o), S(GROUND + 0.2), S(x + 0.31 - o), S(GROUND + 0.36))
      p.stroke(rgba(INK, 0.03 + 0.03 * L))
      p.line(S(x + o), S(GROUND + 0.4), S(x + o), S(GROUND + 0.6))
    }
    // The bulbs' and the band's warmth on the boards.
    glow(p, k, (WALL_L + WALL_R) / 2, GROUND + 0.05, 5.5, M.bulb, 0.06 + 0.06 * L, 1.4, 0.12)
    if (band > 0) glow(p, k, PIVOT[0] + 0.9, GROUND + 0.06, 2.4, M.bulb, band * 0.14, 1.3, 0.12)
  }
  p.stroke(rgba(M.brass, 0.18 + 0.2 * L))
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
    // An arch under the landing, and through it the room beyond.
    drawUnderLanding(p, k, t, L)
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

  // The arch into the next vault, behind the bass.
  drawBackArch(p, k, t, 0.75 + 0.25 * L, edge)

  // The band.
  drawBass(p, k, weight, L)
  drawTrumpet(p, k, weight, t, L)
  drawHat(p, k, weight, t, L)
  drawKick(p, k, weight, t, L)
  drawSnare(p, k, weight, t, L)
  drawSeesaw(p, k, weight, t, L)

  // The balloons, in their net and let go.
  drawBalloons(p, k, weight, t, L)

  // The flashes: each lights the landing and the wall behind her for an instant (the gun's own bulb goes white, then
  // milky, on the gun). Light on the stone, not a burst round the gun.
  for (let i = 0; i < FLASHES.length; i++) {
    const s = t - FLASHES[i]
    if (s < -0.01 || s > 0.6) continue
    const g = GUNS[i % GUNS.length]
    const f = knock(s, 0.11)
    const [hx] = gunHead(g, t)
    glow(p, k, hx + 0.1, -0.35, 1.7, M.spot, 0.3 * f, 1.3, 0.75)
    glow(p, k, hx + 0.1, FLOOR + 0.02, 1.4, M.spot, 0.3 * f, 1.4, 0.2)
  }
}

/* ------------------------------------------------------------------ the room under the landing */

/**
 * Under the landing an arch opens on the cellar's other room, lower and further in, where the club goes on: little
 * tables, a candle on each, people at them; and a couple dancing to the band between the tables, a step and a dip on
 * each beat and a turn every two bars. It is further off, so it is smaller, warmer and dimmer than this room, and it
 * slides a little behind the arch as the camera goes.
 */
const UNDER = { cx: -1.75, x0: -2.9, x1: -0.6, spring: 1.35, rx: 1.15, ry: 0.7 }
const UNDER_FLOOR = GROUND - 0.18
const UNDER_TABLES = [-2.75, -1.95, -0.85]
function underPath(ctx: CanvasRenderingContext2D, k: number): void {
  ctx.beginPath()
  ctx.moveTo(UNDER.x0 * k, GROUND * k)
  ctx.lineTo(UNDER.x0 * k, UNDER.spring * k)
  ctx.ellipse(UNDER.cx * k, UNDER.spring * k, UNDER.rx * k, UNDER.ry * k, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(UNDER.x1 * k, GROUND * k)
  ctx.closePath()
}
/** A seated figure, small with distance: shoulders and a head, the candle's light along the side toward it. */
function farSitter(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, s: number, toward: number, nod: number, rim: string): void {
  ctx.fillStyle = mixHex(M.black, M.redDeep, 0.2)
  ctx.beginPath()
  ctx.ellipse(x * k, y * k, 0.17 * s * k, 0.15 * s * k, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillRect((x - 0.17 * s) * k, y * k, 0.34 * s * k, 0.12 * s * k)
  const hy = y - (0.2 - 0.015 * nod) * s
  ctx.beginPath()
  ctx.arc((x + 0.015 * toward * s) * k, hy * k, 0.085 * s * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = rim
  ctx.lineWidth = Math.max(1, 0.012 * k)
  ctx.beginPath()
  const a0 = toward > 0 ? -0.5 : Math.PI - 0.6
  ctx.arc((x + 0.015 * toward * s) * k, hy * k, 0.085 * s * k, a0, a0 + 1.1)
  ctx.stroke()
}
/** A dancer: a standing figure, skirt or trousers, turned through `turn` (0 facing right, 1 facing left). */
function farDancer(ctx: CanvasRenderingContext2D, k: number, x: number, s: number, dip: number, skirt: boolean, flare: number, arm: number): void {
  const fy = UNDER_FLOOR
  const hip = fy - 0.42 * s + 0.04 * dip * s
  const sh = fy - 0.72 * s + 0.05 * dip * s
  ctx.fillStyle = mixHex(M.black, M.redDeep, 0.18)
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.05 * s * k
  ctx.beginPath()
  if (skirt) {
    // The skirt swings out on the turn.
    ctx.moveTo((x - 0.06 * s) * k, sh * k)
    ctx.lineTo((x + 0.06 * s) * k, sh * k)
    ctx.lineTo((x + (0.16 + 0.1 * flare) * s) * k, (hip + 0.12 * s) * k)
    ctx.lineTo((x - (0.16 + 0.1 * flare) * s) * k, (hip + 0.12 * s) * k)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo((x - 0.04 * s) * k, (hip + 0.1 * s) * k)
    ctx.lineTo((x - 0.05 * s) * k, fy * k)
    ctx.moveTo((x + 0.04 * s) * k, (hip + 0.1 * s) * k)
    ctx.lineTo((x + 0.05 * s) * k, fy * k)
    ctx.stroke()
  } else {
    ctx.moveTo((x - 0.08 * s) * k, sh * k)
    ctx.lineTo((x + 0.08 * s) * k, sh * k)
    ctx.lineTo((x + 0.06 * s) * k, hip * k)
    ctx.lineTo((x - 0.06 * s) * k, hip * k)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo((x - 0.03 * s) * k, hip * k)
    ctx.lineTo((x - 0.07 * s) * k, fy * k)
    ctx.moveTo((x + 0.03 * s) * k, hip * k)
    ctx.lineTo((x + 0.07 * s) * k, fy * k)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(x * k, (sh - 0.09 * s) * k, 0.07 * s * k, 0, Math.PI * 2)
  ctx.fill()
  // The arm out to the partner's hand.
  ctx.lineWidth = 0.035 * s * k
  ctx.beginPath()
  ctx.moveTo(x * k, (sh + 0.04 * s) * k)
  ctx.lineTo((x + arm * 0.2 * s) * k, (sh + 0.12 * s) * k)
  ctx.stroke()
}
function drawUnderLanding(p: p5, k: number, t: number, L: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fr = frameOf(p, k)
  // Further than the arch: as the camera goes, it slides behind the opening a third as fast.
  const shift = (fr.cx - UNDER.cx) * 0.3
  const lit = 0.55 + 0.45 * L
  ctx.save()
  underPath(ctx, k)
  ctx.fillStyle = mixHex(M.black, BG, 0.3)
  ctx.fill()
  ctx.clip()
  ctx.translate(shift * k, 0)
  // The far room: its back wall, warm low down where the candles are, dark up under its own low vault.
  const g = ctx.createLinearGradient(0, (UNDER.spring - UNDER.ry) * k, 0, GROUND * k)
  g.addColorStop(0, mixHex(M.black, M.redDeep, 0.25))
  g.addColorStop(0.7, mixHex(mixHex(M.redDeep, M.bulb, 0.18), M.black, 1 - 0.75 * lit))
  g.addColorStop(1, mixHex(M.black, M.redDeep, 0.3))
  ctx.fillStyle = g
  ctx.fillRect((UNDER.x0 - 1) * k, (UNDER.spring - UNDER.ry - 0.1) * k, (UNDER.x1 - UNDER.x0 + 2) * k, (GROUND - UNDER.spring + UNDER.ry + 0.2) * k)
  // Its own arches, a further row, just found by the candles.
  ctx.strokeStyle = rgba(mixHex(M.redDeep, M.bulb, 0.3), 0.35 * lit)
  ctx.lineWidth = Math.max(1, 0.015 * k)
  for (const ax of [-3.0, -1.75, -0.5]) {
    ctx.beginPath()
    ctx.ellipse(ax * k, (UNDER.spring + 0.25) * k, 0.5 * k, 0.4 * k, 0, Math.PI, Math.PI * 2)
    ctx.stroke()
  }
  const beat = lastOf(CLUB_BEATS, t)
  const going = t > LIGHTS - 0.2 && t < DARK[1]
  // The couple, dancing between the tables: a step and a dip on each beat, a turn every two bars.
  {
    const bi = going ? beat.i : -1
    const u = bi >= 0 ? Math.min(1, beat.ago / 0.49) : 0
    const dip = bi >= 0 ? Math.sin(Math.PI * u) : 0
    const turnPhase = bi >= 0 ? (bi + u) / 8 : 0
    const c = Math.cos(Math.PI * turnPhase)
    const cx = -2.35 + 0.08 * Math.sin(Math.PI * (bi + u) / 2)
    const s = 0.95
    farDancer(ctx, k, cx - 0.17 * c, s, dip, false, 0, c >= 0 ? 1 : -1)
    farDancer(ctx, k, cx + 0.17 * c, s, dip, true, Math.abs(Math.sin(Math.PI * turnPhase)), c >= 0 ? -1 : 1)
  }
  // The tables: a cloth, a candle's flame, two at each, nodding to the band in their own time.
  for (const [i, tx] of UNDER_TABLES.entries()) {
    const flame = (0.75 + 0.25 * Math.sin(t * 7 + i * 2.3)) * (0.6 + 0.4 * lit)
    const ty = UNDER_FLOOR - 0.24
    ctx.fillStyle = mixHex(M.black, M.redDeep, 0.25)
    ctx.fillRect((tx - 0.03) * k, ty * k, 0.06 * k, (UNDER_FLOOR - ty) * k)
    ctx.fillStyle = mixHex(mixHex(M.skin, M.redDeep, 0.6), M.black, 1 - 0.7 * lit)
    ctx.fillRect((tx - 0.17) * k, (ty - 0.03) * k, 0.34 * k, 0.04 * k)
    ctx.fillStyle = rgba(M.bulb, 0.95 * flame)
    ctx.beginPath()
    ctx.ellipse(tx * k, (ty - 0.06) * k, 0.012 * k, 0.022 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    const rim = rgba(M.bulb, 0.5 * flame)
    for (const side of [-1, 1]) {
      const nod = going && hash(i, side + 5, 77) < 0.7 ? Math.exp(-Math.max(0, beat.ago - 0.03 * (side + 2)) / 0.12) : 0
      farSitter(ctx, k, tx + side * 0.27, ty + 0.02, 0.85, -side, nod, rim)
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the back arch, and the waiter */

/**
 * An archway in the back wall behind the bass, into the next vault, where the bar is: its low warm light seen
 * through the arch, bottles on the shelves against it, a lamp hung over the counter. Through the band's numbers it is
 * one more lit room beyond this one; when the room goes dark for the solo it is the only other light, and the bass,
 * and the man who comes to play it, stand against it. A waiter goes by in it: on the beat while the band plays, and in
 * the solo stopped mid-step while it sounds, easing on only in its breaths.
 */
const ARCH = { x0: 7.2, x1: 8.5, spring: 0.62 }
const ARCH_R = (ARCH.x1 - ARCH.x0) / 2
const ARCH_C = (ARCH.x0 + ARCH.x1) / 2
function archPath(ctx: CanvasRenderingContext2D, k: number, inset = 0): void {
  ctx.beginPath()
  ctx.moveTo((ARCH.x0 + inset) * k, GROUND * k)
  ctx.lineTo((ARCH.x0 + inset) * k, ARCH.spring * k)
  ctx.arc(ARCH_C * k, ARCH.spring * k, (ARCH_R - inset) * k, Math.PI, Math.PI * 2)
  ctx.lineTo((ARCH.x1 - inset) * k, GROUND * k)
  ctx.closePath()
}
/** The far floor, a little higher than ours: it is further off. */
const FAR_FLOOR = GROUND - 0.12
const BOTTLES = Array.from({ length: 22 }, (_, i) => ({ row: i % 2, x: ARCH.x0 - 0.1 + ((i >> 1) + 0.5 * (i % 2)) * 0.135 + 0.03 * hash(i, 61), h: 0.16 + 0.07 * hash(i, 62), w: 0.045 + 0.015 * hash(i, 63) }))
/** How much the solo is sounding at `t` (0 in its rests), eased over a short window. */
function soloPlaying(t: number): number {
  let a = 0
  for (let j = 0; j < 8; j++) if (SOLO_SOUNDING(t - j * 0.1)) a += 1 / 8
  return a
}
/** The waiter's walk in the solo: how far across the arch he has come, moving only in the solo's breaths. */
const WAIT_DT = 0.05
const WAITER_SOLO: number[] = (() => {
  const out: number[] = []
  let x = 0
  for (let t = DARK[0]; t <= 269; t += WAIT_DT) {
    out.push(x)
    x += (1 - soloPlaying(t)) ** 2 * 0.22 * WAIT_DT
  }
  return out
})()
/** The band's beats, for his steps while it plays. */
const CLUB_BEATS = Array.from({ length: 140 }, (_, k) => paris(k)).filter((b) => b > LIGHTS - 1 && b < DARK[0] + 1)
/** Where the waiter is at `t` (x across the far room) and how far through his stride (0..1), or null. */
function waiterAt(t: number): { x: number; stride: number; dir: number } | null {
  if (t >= DARK[0]) {
    const i = Math.min(WAITER_SOLO.length - 1, Math.max(0, Math.floor((t - DARK[0]) / WAIT_DT)))
    const d = WAITER_SOLO[i]
    // Frozen in the arch's left half as the room goes dark, a step a breath to the right, and out behind the jamb.
    return { x: ARCH.x0 + 0.34 + d, stride: (d / 0.2) % 1, dir: 1 }
  }
  // While the band plays: across the arch and back, a step a beat, twice.
  const { i, ago } = lastOf(CLUB_BEATS, t)
  if (i < 0) return null
  const passes: [number, number, number][] = [[4, 14, 1], [22, 32, -1], [40, 48, 1]]
  for (const [a, b, dir] of passes) {
    if (i < a || i >= b) continue
    const span = b - a
    const u = (i - a + Math.min(1, ago / 0.49)) / span
    const x = dir > 0 ? ARCH.x0 - 0.35 + u * (ARCH.x1 - ARCH.x0 + 0.7) : ARCH.x1 + 0.35 - u * (ARCH.x1 - ARCH.x0 + 0.7)
    return { x, stride: (i - a + Math.min(1, ago / 0.49)) % 1, dir }
  }
  return null
}
function drawWaiter(ctx: CanvasRenderingContext2D, k: number, x: number, stride: number, dir: number, fill: string): void {
  const S = (v: number) => v * k
  const fy = FAR_FLOOR
  const swing = Math.sin(stride * Math.PI * 2)
  const bob = 0.03 * Math.abs(Math.cos(stride * Math.PI * 2))
  const hip: Pt = [x, fy - 0.98 - bob]
  const sh: Pt = [x - 0.02 * dir, fy - 1.72 - bob]
  ctx.fillStyle = fill
  ctx.strokeStyle = fill
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Legs mid-stride, the long apron, the body, the head.
  ctx.lineWidth = S(0.085)
  ctx.beginPath()
  ctx.moveTo(S(hip[0]), S(hip[1]))
  ctx.lineTo(S(x + 0.2 * swing), S(fy))
  ctx.moveTo(S(hip[0]), S(hip[1]))
  ctx.lineTo(S(x - 0.2 * swing), S(fy))
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(S(sh[0] - 0.15), S(sh[1]))
  ctx.lineTo(S(sh[0] + 0.15), S(sh[1]))
  ctx.lineTo(S(hip[0] + 0.15), S(hip[1] + 0.35))
  ctx.lineTo(S(hip[0] - 0.15), S(hip[1] + 0.35))
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(S(sh[0] + 0.02 * dir), S(sh[1] - 0.2), S(0.12), 0, Math.PI * 2)
  ctx.fill()
  // The tray, up on his far hand, a glass and a bottle on it; the other arm at his side.
  const tx = sh[0] + 0.28 * dir
  ctx.lineWidth = S(0.07)
  ctx.beginPath()
  ctx.moveTo(S(sh[0] + 0.1 * dir), S(sh[1] + 0.05))
  ctx.lineTo(S(tx), S(sh[1] - 0.12))
  ctx.moveTo(S(sh[0] - 0.12 * dir), S(sh[1] + 0.05))
  ctx.lineTo(S(sh[0] - 0.16 * dir - 0.06 * swing), S(sh[1] + 0.6))
  ctx.stroke()
  ctx.fillRect(S(tx - 0.2), S(sh[1] - 0.16), S(0.4), S(0.03))
  ctx.fillRect(S(tx - 0.1), S(sh[1] - 0.27), S(0.04), S(0.11))
  ctx.fillRect(S(tx + 0.05), S(sh[1] - 0.33), S(0.05), S(0.17))
}
/** The far room through the arch, and the light it lays on our floor. `a` is how lit it is. */
function drawBackArch(p: p5, k: number, t: number, a: number, edge: string): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // The light it lays on the boards in front of it, spreading toward us.
  {
    const g = ctx.createLinearGradient(0, GROUND * k, 0, (GROUND + 0.7) * k)
    g.addColorStop(0, rgba(M.bulb, 0.2 * a))
    g.addColorStop(1, rgba(M.bulb, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((ARCH.x0 + 0.05) * k, GROUND * k)
    ctx.lineTo((ARCH.x1 - 0.05) * k, GROUND * k)
    ctx.lineTo((ARCH.x1 + 0.55) * k, (GROUND + 0.7) * k)
    ctx.lineTo((ARCH.x0 - 0.45) * k, (GROUND + 0.7) * k)
    ctx.closePath()
    ctx.fill()
  }
  archPath(ctx, k)
  ctx.clip()
  // The far vault: warm low down where the lamp over the counter lights it, dark up in its curve.
  const g = ctx.createLinearGradient(0, (ARCH.spring - ARCH_R) * k, 0, GROUND * k)
  g.addColorStop(0, mixHex(M.black, M.redDeep, 0.35))
  g.addColorStop(0.55, mixHex(mixHex(M.redDeep, M.bulb, 0.38), M.black, 1 - a))
  g.addColorStop(1, mixHex(mixHex(M.redDeep, M.bulb, 0.22), M.black, 1 - a))
  ctx.fillStyle = g
  ctx.fillRect((ARCH.x0 - 0.1) * k, (ARCH.spring - ARCH_R - 0.1) * k, (ARCH.x1 - ARCH.x0 + 0.2) * k, (GROUND - ARCH.spring + ARCH_R + 0.2) * k)
  // Shelves of bottles against it, and the counter.
  const dark = mixHex(M.black, M.redDeep, 0.15)
  ctx.fillStyle = dark
  for (const sy of [1.12, 1.52]) ctx.fillRect((ARCH.x0 - 0.1) * k, sy * k, (ARCH.x1 - ARCH.x0 + 0.2) * k, 0.03 * k)
  for (const b of BOTTLES) {
    const sy = b.row ? 1.12 : 1.52
    ctx.fillRect((b.x - b.w / 2) * k, (sy - b.h) * k, b.w * k, b.h * k)
    ctx.fillRect((b.x - b.w / 5) * k, (sy - b.h - 0.07) * k, (b.w / 2.5) * k, 0.08 * k)
  }
  ctx.fillRect((ARCH.x0 - 0.1) * k, (FAR_FLOOR - 0.62) * k, (ARCH.x1 - ARCH.x0 + 0.2) * k, 0.64 * k)
  ctx.fillStyle = rgba(M.bulb, 0.35 * a)
  ctx.fillRect((ARCH.x0 - 0.1) * k, (FAR_FLOOR - 0.62) * k, (ARCH.x1 - ARCH.x0 + 0.2) * k, 0.02 * k)
  // The lamp over the counter: a dark shade on its flex, its lit rim the source of all of it.
  const lx = ARCH_C + 0.15
  ctx.strokeStyle = dark
  ctx.lineWidth = Math.max(1, 0.012 * k)
  ctx.beginPath()
  ctx.moveTo(lx * k, (ARCH.spring - ARCH_R) * k)
  ctx.lineTo(lx * k, 0.62 * k)
  ctx.stroke()
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.moveTo((lx - 0.05) * k, 0.62 * k)
  ctx.lineTo((lx + 0.05) * k, 0.62 * k)
  ctx.lineTo((lx + 0.17) * k, 0.78 * k)
  ctx.lineTo((lx - 0.17) * k, 0.78 * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba(M.bulb, 0.9 * a)
  ctx.fillRect((lx - 0.15) * k, 0.775 * k, 0.3 * k, 0.018 * k)
  // The waiter.
  const w = waiterAt(t)
  if (w) drawWaiter(ctx, k, w.x, w.stride, w.dir, mixHex(M.black, M.redDeep, 0.1))
  ctx.restore()
  // The arch's own edge: its reveal, lit on the side away from the lamp.
  ctx.save()
  ctx.strokeStyle = edge
  ctx.lineWidth = Math.max(1, 0.02 * k)
  archPath(ctx, k)
  ctx.stroke()
  ctx.restore()
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

function drawBulbs(p: p5, k: number, weight: number, L: number): void {
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
  // Lit glass, or dark: their light is the warmth of the vault round them, not a halo round each.
  for (const b of BULBS) {
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
  // The upper cymbal: in the solo, open at the edge of the spot, it shivers on the trumpet's high accents, rocking
  // on its rod and catching the light on the rim that tips up.
  const sh = lastOf(SHIVER, t)
  const rock = sh.i >= 0 ? ring(sh.ago, 3.4, 0.28) : 0
  p.push()
  p.translate(S(HAT_X), S(HAT_Y - gap))
  p.rotate(-0.13 * rock)
  p.translate(-S(HAT_X), -S(HAT_Y - gap))
  cym(HAT_Y - gap, -1)
  p.pop()
  if (sh.i >= 0 && sh.ago < 0.9) {
    const f = smooth(sh.ago, 0, 0.012) * (0.75 * Math.exp(-sh.ago / 0.16) + 0.25 * Math.exp(-sh.ago / 0.5))
    glow(p, k, HAT_X + 0.25, HAT_Y - gap - 0.035 - 0.03 * rock, 0.26, M.spot, 0.6 * f, 1.3, 0.45)
  }
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
  // Its stick: a hinged arm on its own post. It waits cocked; before an accent it draws back a little further, then
  // snaps down into the skin on the onset, and lifts back to cocked.
  const { i, ago } = lastOf(SNARE_T, t)
  let up = i >= 0 && ago < 0.45 ? smooth(ago, 0.02, 0.42) : 1
  const next = SNARE_T[i + 1]
  if (next !== undefined && t > next - 0.22) {
    const s = t - next
    const drop = s > -0.07 ? ((s + 0.07) / 0.07) ** 2 : 0
    up = (up + 0.3 * smooth(s, -0.22, -0.07)) * (1 - drop)
  }
  const pivot: Pt = [sx + 0.42, sy - 0.2]
  // Up 0 lays the tip on the skin; up 1 is cocked.
  const ang = Math.PI - 0.4 + 0.75 * up
  const tip: Pt = [pivot[0] + Math.cos(ang) * 0.5, pivot[1] + Math.sin(ang) * 0.5]
  p.stroke(alpha(p, M.black, 1))
  p.strokeWeight(weight * 0.9)
  p.line(S(pivot[0]), S(pivot[1]), S(pivot[0]), S(GROUND - 0.2))
  // The drum: a shallow shell, its skin face up; it shivers on the hit.
  const hit = i >= 0 ? knock(ago, 0.08) : 0
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

function drawBass(p: p5, k: number, weight: number, L: number, dim = 0): void {
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
  // Strings, bridge to scroll. The bass stands idle: nothing in the machine reaches it, so nothing plucks it.
  p.stroke(alpha(p, M.skin, 0.55 + 0.3 * lit))
  p.strokeWeight(weight * 0.3)
  for (let s = 0; s < 4; s++) {
    const x = -0.045 + s * 0.03
    p.line(S(x), S(-0.6), S(x), S(-2.5))
  }
  // In the dark, against the arch's light: the same bass, sunk to a shape with a line of light along it.
  if (dim > 0) {
    p.noStroke()
    p.fill(rgba(M.black, dim))
    shape(p, k, full)
    p.rect(S(-0.06), S(-2.55), S(0.12), S(1.35))
    p.circle(0, S(-2.62), S(0.17))
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
  // The bell's mouth, and the breath in it: the inside of the bell warms while a phrase sounds and goes dark in its rests.
  const blow = t > AT.trumpet - 0.1 && pitchAt(t) > 0 ? 0.25 + 0.25 * level(t) : 0
  p.fill(mixHex(mixHex(M.brass, M.black, 0.35), M.bulb, 0.6 * blow))
  p.ellipse(S(0.64), S(0.16), S(0.07), S(0.4))
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
}

/* ------------------------------------------------------------------ balloons */

function drawBalloons(p: p5, k: number, weight: number, t: number, L: number): void {
  const S = X(k)
  const lit = Math.max(L, 0.2)
  const since = t - BALLOONS
  const qs = BALLOON_SET.map((b) => balloonAt(b, t))
  // The ribbons: taut to the knot on the tie while it holds; on the beat the knot slips and they spring loose and
  // trail under each balloon as it goes up.
  const loose = since >= 0 ? smooth(since, 0, 0.28) : 0
  p.noFill()
  p.stroke(alpha(p, M.skin, 0.5 * lit))
  p.strokeWeight(weight * 0.4)
  BALLOON_SET.forEach((b, i) => {
    const q = qs[i]
    const kx = q.x - Math.sin(q.a) * (b.r + 0.03)
    const ky = q.y + Math.cos(q.a) * (b.r + 0.03)
    const trail = 0.24 + 0.06 * b.sway
    const tail: Pt = [kx - 0.18 * q.vx + 0.04 * Math.sin(t * 1.9 + b.sway * 5), ky + trail]
    const end: Pt = [TIE[0] + (tail[0] - TIE[0]) * loose, TIE[1] + (tail[1] - TIE[1]) * loose]
    // The trailing ribbon bows against the way it is going.
    const bow = loose * (-0.12 * q.vx + 0.03 * Math.sin(t * 2.6 + b.sway * 9))
    p.beginShape()
    p.vertex(S(kx), S(ky))
    p.quadraticVertex(S((kx + end[0]) / 2 + bow), S((ky + end[1]) / 2), S(end[0]), S(end[1]))
    p.endShape()
  })
  // The tie: a brass ring on the newel, the knot in it; it jumps when the knot slips.
  const jolt = since >= 0 ? 0.025 * ring(since, 5, 0.12) : 0
  p.stroke(alpha(p, M.brass, 0.45 + 0.45 * L))
  p.strokeWeight(weight * 0.7)
  p.noFill()
  p.circle(S(TIE[0]), S(TIE[1] + 0.03 - jolt), S(0.07))
  if (since < 0) {
    p.noStroke()
    p.fill(mixHex(M.skin, M.black, 0.3 - 0.2 * lit))
    p.circle(S(TIE[0]), S(TIE[1]), S(0.045))
  }
  for (let i = 0; i < BALLOON_SET.length; i++) {
    const b = BALLOON_SET[i]
    const q = qs[i]
    p.push()
    p.translate(S(q.x), S(q.y))
    p.rotate(q.a)
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
  // On the solo's biggest note the lamp's filament surges: its pool on the boards widens and brightens, and for a
  // moment the dark gives back a little more of the room round it.
  const fs = t - FLARE
  const fl = fs < -0.02 ? 0 : smooth(fs, -0.02, 0) * (0.8 * Math.exp(-Math.max(0, fs) / 0.24) + 0.2 * Math.exp(-Math.max(0, fs) / 0.9))
  // The dark: black round the one spot, but not empty. The spot's spill falls off slowly, so the room is still there
  // in it: the band's things and the stair near the light, the vault and the far wall barely, and black at the edges.
  ctx.save()
  const g = ctx.createRadialGradient(S(pool[0]), S(pool[1]), S(0.6 + 0.3 * fl), S(pool[0]), S(pool[1]), S(4.6 + 0.6 * fl))
  g.addColorStop(0, rgba(M.black, 0))
  g.addColorStop(0.22, rgba(M.black, 0.45 * f * (1 - 0.2 * fl)))
  g.addColorStop(0.55, rgba(M.black, 0.74 * f * (1 - 0.1 * fl)))
  g.addColorStop(1, rgba(M.black, 0.92 * f))
  ctx.fillStyle = g
  ctx.fillRect(S(view.x0 - 2), S(view.y0 - 2), S(view.x1 - view.x0 + 4), S(view.y1 - view.y0 + 4))
  ctx.restore()
  drawSpill(p, k, t, f)
  // The beam, from the lamp in the vault to the floor, and its pool on the boards.
  const on1 = f
  beam(p, k, LAMP[0], LAMP[1] + 0.1, PIVOT[0], GROUND, 0.2, 1.6, M.spot, 0.12 * on1 * (1 + 0.5 * fl))
  glow(p, k, PIVOT[0], GROUND - 0.02, 1.0 + 0.55 * fl, M.spot, 0.3 * on1 * (1 + 0.8 * fl), 1.3, 0.28)
  // The arch keeps its light, the bar's beyond, and the bass and the man playing it stand against it.
  if (on1 > 0.01) {
    ctx.save()
    ctx.globalAlpha = on1
    drawBackArch(p, k, t, 0.5, rgba(M.bulb, 0.14))
    drawBass(p, k, k * 0.014, 0, 0.72)
    ctx.restore()
  }
  drawBassist(p, k, t, on1)
  drawSolo(p, k, t, on1)
  // The lamp itself: a black can in the crown, its lens lit.
  p.stroke(rgba(INK, 0.35))
  p.strokeWeight(Math.max(1, k * 0.02))
  p.fill(M.black)
  p.push()
  p.translate(S(LAMP[0]), S(LAMP[1]))
  p.rect(S(-0.13), S(-0.2), S(0.26), S(0.28), S(0.04))
  p.noStroke()
  p.fill(rgba(M.spot, Math.min(1, 0.5 + 0.5 * on1 + 0.3 * fl)))
  p.ellipse(0, S(0.09), S(0.2), S(0.05))
  p.pop()
}

/** How much of the spot's light reaches (x, y): what lets the dark room be modelled, near things more than far. */
function spillAt(x: number, y: number): number {
  const d = Math.hypot(x - PIVOT[0], (y - (GROUND - 0.9)) * 1.15)
  return Math.max(0, 1 - d / 5.2) ** 1.6
}

/**
 * The vault in the spill: its rim and the courses of its brick, the dead bulbs on their strings, just found by the
 * spot's light off the floor and fading into the black away from it. Far things barely there.
 */
const COURSES: { y: number; x0: number; x1: number }[] = (() => {
  const out: { y: number; x0: number; x1: number }[] = []
  for (let y = CROWN[1] + 0.3; y < GROUND - 0.3; y += 0.27) {
    // Each course runs from wall to wall under the vault, broken where the plaster has held.
    const span: [number, number] = [WALL_L + 0.1, WALL_R - 0.1]
    const lo = y < SPRING_Y ? (() => { let a = span[0]; while (a < CROWN[0] && vaultY(a) > y - 0.05) a += 0.05; return a })() : span[0]
    const hi = y < SPRING_Y ? 2 * CROWN[0] - lo : span[1]
    for (let x = lo, i = 0; x < hi; i++) {
      const L = 0.5 + 1.4 * hash(Math.round(y * 100), i, 91)
      if (hash(Math.round(y * 100), i, 92) > 0.45) out.push({ y, x0: x, x1: Math.min(hi, x + L) })
      x += L + 0.2 + 0.5 * hash(Math.round(y * 100), i, 93)
    }
  }
  return out
})()
function drawSpill(p: p5, k: number, t: number, f: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const S = X(k)
  ctx.save()
  ctx.lineCap = 'round'
  // The rim of the vault, in short lengths, each as lit as the spill where it is.
  const LV = 6
  const rim: Path2D[] = Array.from({ length: LV }, () => new Path2D())
  for (let i = 0; i < 48; i++) {
    const xa = WALL_L + 0.1 + ((WALL_R - WALL_L - 0.2) * i) / 48
    const xb = WALL_L + 0.1 + ((WALL_R - WALL_L - 0.2) * (i + 1)) / 48
    const ya = vaultY(xa) + 0.17
    const yb = vaultY(xb) + 0.17
    const a = spillAt((xa + xb) / 2, (ya + yb) / 2)
    if (a < 0.03) continue
    const lv = Math.min(LV - 1, Math.floor(a * LV * 1.4))
    rim[lv].moveTo(S(xa), S(ya))
    rim[lv].lineTo(S(xb), S(yb))
  }
  ctx.lineWidth = S(0.03)
  for (let lv = 0; lv < LV; lv++) {
    ctx.strokeStyle = rgba(mixHex(M.redDeep, M.spot, 0.35), f * 0.34 * ((lv + 0.5) / LV))
    ctx.stroke(rim[lv])
  }
  // The courses of brick, fainter still, and the joints between the bricks along them.
  const course: Path2D[] = Array.from({ length: LV }, () => new Path2D())
  for (const c of COURSES) {
    const a = spillAt((c.x0 + c.x1) / 2, c.y)
    if (a < 0.03) continue
    const lv = Math.min(LV - 1, Math.floor(a * LV * 1.4))
    course[lv].moveTo(S(c.x0), S(c.y))
    course[lv].lineTo(S(c.x1), S(c.y))
    const o = (Math.round(c.y * 100) % 2) * 0.17
    for (let x = c.x0 + 0.1 + o; x < c.x1 - 0.05; x += 0.34) {
      course[lv].moveTo(S(x), S(c.y))
      course[lv].lineTo(S(x), S(c.y + 0.27))
    }
  }
  ctx.lineWidth = S(0.012)
  for (let lv = 0; lv < LV; lv++) {
    ctx.strokeStyle = rgba(mixHex(M.redDeep, M.spot, 0.25), f * 0.26 * ((lv + 0.5) / LV))
    ctx.stroke(course[lv])
  }
  // The strings of bulbs, out: their glass just catching the spot, a dull warm bead on a dark line.
  ctx.lineWidth = S(0.012)
  for (const [a, b, sag] of SWAGS) {
    for (let i = 0; i < 24; i++) {
      const u0 = i / 24
      const u1 = (i + 1) / 24
      const x0 = a[0] + (b[0] - a[0]) * u0
      const y0 = a[1] + (b[1] - a[1]) * u0 + sag * 4 * u0 * (1 - u0)
      const x1 = a[0] + (b[0] - a[0]) * u1
      const y1 = a[1] + (b[1] - a[1]) * u1 + sag * 4 * u1 * (1 - u1)
      const s = spillAt((x0 + x1) / 2, (y0 + y1) / 2)
      if (s < 0.04) continue
      ctx.strokeStyle = rgba(M.spot, f * 0.16 * s)
      ctx.beginPath()
      ctx.moveTo(S(x0), S(y0))
      ctx.lineTo(S(x1), S(y1))
      ctx.stroke()
    }
  }
  for (const bl of BULBS) {
    const s = spillAt(bl.x, bl.y)
    if (s < 0.04) continue
    ctx.fillStyle = rgba(mixHex(M.redDeep, M.bulb, 0.5), f * 0.5 * s)
    ctx.beginPath()
    ctx.ellipse(S(bl.x), S(bl.y), S(0.035 * bl.w), S(0.045 * bl.w), 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  void t
}

/**
 * The bass player. Through the band's numbers the bass stands idle, nothing in the machine reaching it; when the room
 * goes dark for the solo he is there behind it in the spill, the one other player, a black shape with the spot's light
 * along the edge of him that faces it. He bows long notes under the trumpet: the bow turns at each phrase's first
 * note and is drawn slowly through it, and rests on the string in the solo's breaths; his left hand shifts on the neck
 * with the phrase. On the knock he lifts the bow off.
 */
const BASSIST: Pt = [BASS_X + 0.78, GROUND]
/** The solo's phrases' first notes, from the threads it draws (filled in once the phrases are known). */
let PHRASE_STARTS: number[] = []
function bowAt(t: number): { u: number; on: number } {
  if (!PHRASE_STARTS.length) PHRASE_STARTS = SOLO_PHRASES.map((ph) => ph[0].s)
  const { i, ago } = lastOf(PHRASE_STARTS, t)
  if (i < 0) return { u: 0.5, on: 0 }
  const dir = i % 2 === 0 ? 1 : -1
  const ph = SOLO_PHRASES[i]
  const len = Math.max(0.6, ph[ph.length - 1].s - ph[0].s)
  // Drawn across the phrase, easing to a stop at its end; it waits there, on the string, through the breath.
  const u = smooth(ago, 0, len)
  const from = dir > 0 ? 0.15 : 0.85
  const to = dir > 0 ? 0.85 : 0.15
  const off = smooth(t, KNOCK - 0.1, KNOCK + 0.4)
  return { u: from + (to - from) * u, on: 1 - off }
}
/** Where he is and how he is holding the bow at `t`. */
function bassistPose(t: number) {
  const [bx, by] = BASSIST
  const { u, on } = bowAt(t)
  // The breath of a player: he leans into the long notes, a little, and straightens in the rests.
  const lean = 0.05 * on * Math.sin(Math.PI * u)
  const hip: Pt = [bx + 0.02, by - 1.32]
  const neck: Pt = [bx - 0.06 - lean, by - 2.3]
  const head: Pt = [neck[0] - 0.04, neck[1] - 0.2]
  // His left hand on the neck of the bass (the bass leans 0.12 rad to the right from its foot), shifting with the phrase.
  const shift = PHRASE_STARTS.length ? 0.15 * Math.sin(lastOf(PHRASE_STARTS, t).i * 2.1) : 0
  const along = 2.0 + shift
  const lh: Pt = [BASS_X + Math.sin(0.12) * along - 0.02, GROUND - 0.12 - Math.cos(0.12) * along]
  // The bow at the bridge, drawn across the strings; his right hand at its frog.
  const bridge: Pt = [BASS_X + Math.sin(0.12) * 0.75, GROUND - 0.12 - Math.cos(0.12) * 0.75]
  const frog: Pt = [bridge[0] + 0.62 - 0.9 * u, bridge[1] + 0.05 - 0.04 * on]
  const tipB: Pt = [frog[0] - 0.95, frog[1] + 0.08]
  const shL: Pt = [neck[0] - 0.12, neck[1] + 0.12]
  const shR: Pt = [neck[0] + 0.16, neck[1] + 0.14]
  return { bx, by, on, hip, neck, head, lh, frog, tipB, shL, shR }
}
const bassistThere = (t: number): number => smooth(t, DARK[0] + 0.2, DARK[1] + 1.4)

/**
 * Him, drawn over the dark (he stands clear of the bass's body, to its right, so nothing of the room is in front of him
 * but the bass's neck, which his left hand reaches round, and his bow). A dark shape, warmer on the side the spot is
 * on and black away from it, with the spot's light along his edge: so he is there in the dark and is not lit.
 */
function drawBassist(p: p5, k: number, t: number, on1: number): void {
  const there = bassistThere(t) * on1
  if (there <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const S = X(k)
  const { bx, by, on, hip, neck, head, lh, frog, tipB, shL, shR } = bassistPose(t)
  ctx.save()
  ctx.globalAlpha = there
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const g = ctx.createLinearGradient(S(bx - 0.35), 0, S(bx + 0.3), 0)
  g.addColorStop(0, mixHex(M.redDeep, M.black, 0.86))
  g.addColorStop(1, M.black)
  ctx.fillStyle = g
  ctx.strokeStyle = g
  // Legs, body, head.
  ctx.beginPath()
  ctx.moveTo(S(hip[0] - 0.2), S(hip[1]))
  ctx.lineTo(S(shL[0]), S(shL[1]))
  ctx.quadraticCurveTo(S(neck[0]), S(neck[1] - 0.02), S(shR[0]), S(shR[1]))
  ctx.lineTo(S(hip[0] + 0.2), S(hip[1]))
  ctx.lineTo(S(bx + 0.2), S(by))
  ctx.lineTo(S(bx + 0.06), S(by))
  ctx.lineTo(S(hip[0]), S(hip[1] + 0.35))
  ctx.lineTo(S(bx - 0.08), S(by))
  ctx.lineTo(S(bx - 0.22), S(by))
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(S(head[0]), S(head[1]), S(0.16), 0, Math.PI * 2)
  ctx.fill()
  // The arm round the neck of the bass.
  ctx.lineWidth = S(0.1)
  ctx.beginPath()
  ctx.moveTo(S(shL[0]), S(shL[1]))
  ctx.quadraticCurveTo(S(shL[0] - 0.25), S((shL[1] + lh[1]) / 2 + 0.25), S(lh[0]), S(lh[1]))
  ctx.stroke()
  // The bass's neck in front of his hand, as the room draws it.
  ctx.save()
  ctx.translate(S(BASS_X), S(GROUND - 0.12))
  ctx.rotate(0.12)
  ctx.fillStyle = M.black
  ctx.fillRect(S(-0.05), S(-2.55), S(0.1), S(1.35))
  ctx.strokeStyle = rgba(M.skin, 0.25)
  ctx.lineWidth = Math.max(1, S(0.008))
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const x = -0.045 + i * 0.03
    ctx.moveTo(S(x), S(-1.2))
    ctx.lineTo(S(x), S(-2.5))
  }
  ctx.stroke()
  ctx.restore()
  // His bowing arm, in front of the bass.
  ctx.strokeStyle = g
  ctx.lineWidth = S(0.1)
  ctx.beginPath()
  ctx.moveTo(S(shR[0]), S(shR[1]))
  ctx.quadraticCurveTo(S(shR[0] + 0.12), S((shR[1] + frog[1]) / 2 + 0.1), S(frog[0]), S(frog[1]))
  ctx.stroke()
  // The spot's light along the edge of him that faces it: his head, his shoulder, the arm reaching round the neck, and
  // down his side; and along the bow's stick.
  ctx.strokeStyle = rgba(M.spot, 0.45)
  ctx.lineWidth = Math.max(1, S(0.016))
  ctx.beginPath()
  ctx.arc(S(head[0]), S(head[1]), S(0.16), Math.PI * 0.72, Math.PI * 1.5)
  ctx.moveTo(S(shL[0] - 0.04), S(shL[1] + 0.02))
  ctx.quadraticCurveTo(S(shL[0] - 0.3), S((shL[1] + lh[1]) / 2 + 0.22), S(lh[0] - 0.05), S(lh[1] - 0.03))
  ctx.stroke()
  ctx.strokeStyle = rgba(M.spot, 0.2)
  ctx.beginPath()
  ctx.moveTo(S(shL[0] - 0.02), S(shL[1] + 0.12))
  ctx.lineTo(S(hip[0] - 0.21), S(hip[1]))
  ctx.lineTo(S(bx - 0.22), S(by))
  ctx.stroke()
  ctx.strokeStyle = rgba(M.spot, 0.3 + 0.2 * on)
  ctx.beginPath()
  ctx.moveTo(S(frog[0]), S(frog[1]))
  ctx.lineTo(S(tipB[0]), S(tipB[1]))
  ctx.stroke()
  ctx.restore()
  void neck
}

/**
 * The solo, written in the air. Each phrase the trumpet plays leaves the bell as a thread of warm light, set at the
 * height of its notes as it goes out (the high ones higher), drifting off through the spot and up into the vault and
 * fading, so the dark fills with the solo while she inches toward him: one thread a phrase. The last phrase, the run to the top as she rolls down to him, goes highest.
 */
const SOLO_DT = 0.025
/** The line's pitch at `s`: the measured one, eased over a few hundredths so it bends from note to note. */
function sungAt(s: number): number {
  let acc = 0
  let n = 0
  for (let j = -4; j <= 4; j++) {
    const m = pitchAt(s + j * 0.02)
    if (m) {
      acc += m
      n++
    }
  }
  return n ? acc / n : 0
}
const SOLO_PHRASES: { s: number; m: number }[][] = (() => {
  const out: { s: number; m: number }[][] = []
  let cur: { s: number; m: number }[] = []
  for (let s = AT.trumpet - 0.4; s < 268.3; s += SOLO_DT) {
    const m = pitchAt(s) ? sungAt(s) : 0
    if (m) cur.push({ s, m })
    else if (cur.length) {
      out.push(cur)
      cur = []
    }
  }
  if (cur.length) out.push(cur)
  // A thread of light, not a trace of the pitch: within each phrase the line follows the melody's contour, its high
  // notes higher, but not its vibrato and grace notes, which drawn note for note made a jagged, heart-monitor line.
  const W = 6
  return out.map((ph) => ph.map((n, i) => {
    let acc = 0
    let w = 0
    for (let j = Math.max(0, i - W); j <= Math.min(ph.length - 1, i + W); j++) {
      const q = 1 - Math.abs(j - i) / (W + 1)
      acc += ph[j].m * q
      w += q
    }
    return { s: n.s, m: acc / w }
  }))
})()

/** Where the bell's mouth is at show time `s`, as the trumpet holds it. (Fixed for a given `s`, so kept once worked out:
 * the threads ask it of every point of every phrase, every frame.) */
const MOUTH = new Map<number, Pt>()
function mouthAt(s: number): Pt {
  const known = MOUTH.get(s)
  if (known) return known
  const q = mouthOf(s)
  MOUTH.set(s, q)
  return q
}
function mouthOf(s: number): Pt {
  const a = bellLift(s)
  const [u, v] = [0.68, 0.16]
  return [HORN[0] + Math.cos(a) * u - Math.sin(a) * v, HORN[1] + Math.sin(a) * u + Math.cos(a) * v]
}

/**
 * And the solo paints the city they are going to. Each phrase, once it is played, settles out of its improvised shape
 * into a stretch of a Paris skyline hung in the dark over the band: mansard roofs and chimneys, a dome, and on the last
 * run, as she rolls down to him, the tower. By the knock the whole skyline is there in gold, and the iris opens on it.
 * The skyline, left to right, as a polyline in this frame.
 */
/** The windows in the skyline's houses, lit as their stretch settles. */
const WINDOWS_AT: Pt[] = []
export const SKYLINE: Pt[] = (() => {
  const base = 1.32
  const out: Pt[] = [[2.3, base]]
  // Houses: [width, wall, mansard]; low under the trumpet, taller either side of it.
  const houses: [number, number, number][] = [
    [0.36, 0.34, 0.15], [0.42, 0.46, 0.17], [0.32, 0.28, 0.13], [0.4, 0.2, 0.11], [0.38, 0.22, 0.11], [0.42, 0.18, 0.11],
    [0.36, 0.26, 0.12], [0.4, 0.4, 0.16],
  ]
  let x = 2.3
  houses.forEach(([w, wall, roof], i) => {
    const top = base - wall
    for (let j = 0; j < Math.floor(w / 0.14); j++) for (let r = 0; r * 0.13 + 0.12 < wall; r++) if (hash(i * 13 + j, r + 71) > 0.35) WINDOWS_AT.push([x + 0.08 + j * 0.14, top + 0.1 + r * 0.13])
    out.push([x, top], [x + 0.07, top - roof])
    if (i % 2 === 0) out.push([x + w * 0.35, top - roof], [x + w * 0.35, top - roof - 0.1], [x + w * 0.45, top - roof - 0.1], [x + w * 0.45, top - roof])
    out.push([x + w - 0.07, top - roof], [x + w, top])
    x += w
  })
  // The dome on its drum.
  const dc = x + 0.3
  const drum = base - 0.42
  out.push([x, drum], [dc - 0.26, drum])
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI
    out.push([dc + Math.cos(a) * 0.26, drum + Math.sin(a) * 0.3])
  }
  out.push([dc + 0.26, drum], [dc + 0.32, base - 0.24])
  x = dc + 0.32
  out.push([x + 0.1, base - 0.24], [x + 0.1, base - 0.1])
  // The tower: its feet, the first platform, the waist, the spire.
  const tc = x + 0.45
  const H = 0.98
  const half = (v: number) => 0.28 * Math.pow(1 - v, 2.2) + 0.012
  for (let i = 0; i <= 12; i++) {
    const v = i / 12
    out.push([tc - half(v), base - v * H])
  }
  for (let i = 12; i >= 0; i--) {
    const v = i / 12
    out.push([tc + half(v), base - v * H])
  }
  return out
})()
/** Where the tower's outline begins on the skyline, as a share of its length: the last run's stretch. */
const SKY_LEN: number[] = (() => {
  const acc = [0]
  for (let i = 1; i < SKYLINE.length; i++) acc.push(acc[i - 1] + Math.hypot(SKYLINE[i][0] - SKYLINE[i - 1][0], SKYLINE[i][1] - SKYLINE[i - 1][1]))
  return acc
})()
const TOWER_U = SKY_LEN[SKYLINE.length - 26] / SKY_LEN[SKY_LEN.length - 1]
function skylineAt(u: number): Pt {
  const L = SKY_LEN[SKY_LEN.length - 1] * Math.max(0, Math.min(1, u))
  let i = 1
  while (i < SKY_LEN.length - 1 && SKY_LEN[i] < L) i++
  const f = (L - SKY_LEN[i - 1]) / Math.max(1e-9, SKY_LEN[i] - SKY_LEN[i - 1])
  return [SKYLINE[i - 1][0] + (SKYLINE[i][0] - SKYLINE[i - 1][0]) * f, SKYLINE[i - 1][1] + (SKYLINE[i][1] - SKYLINE[i - 1][1]) * f]
}

/** A note blown at `s` (pitch `m`), seen at `t`, as the solo improvised it: where it has drifted to, and how much is left. */
function blownAt(s: number, m: number, t: number): { x: number; y: number; a: number } {
  const age = t - s
  const [x0, y0] = mouthAt(s)
  const out = 1 - Math.exp(-age / 1.3)
  const x = x0 + 0.85 * out + 0.07 * age
  const y = y0 - ((m - 70) / 16) * 0.38 * out - 0.045 * age + 0.03 * Math.sin(1.7 * age + s * 2.3)
  const a = (1 - Math.exp(-age / 0.06)) * Math.max(0.5, Math.exp(-age / 4.2))
  return { x, y, a }
}
/** Each note's place on the skyline, and when its phrase settles there. */
const SETTLE: Map<number, { u: number; from: number; to: number }> = (() => {
  const map = new Map<number, { u: number; from: number; to: number }>()
  const lastI = SOLO_PHRASES.length - 1
  const before = SOLO_PHRASES.slice(0, lastI).reduce((n, ph) => n + ph.length, 0)
  let done = 0
  SOLO_PHRASES.forEach((ph, j) => {
    const end = ph[ph.length - 1].s
    const last = j === lastI
    ph.forEach((n, i) => {
      const share = ph.length > 1 ? i / (ph.length - 1) : 0
      // The last run is not carried anywhere: it draws the tower in place as it climbs (`drawTower`).
      if (last) return
      const u = (TOWER_U * (done + share * (ph.length - 1))) / Math.max(1, before)
      map.set(n.s, { u, from: end + 0.5, to: end + 2.3 })
    })
    if (!last) done += ph.length
  })
  return map
})()
/** When the stretch of skyline over `x` has settled: the settling of the note that goes nearest it. */
const LIT_AT: number[] = WINDOWS_AT.map(([wx]) => {
  let best = Infinity
  let at = Infinity
  for (const st of SETTLE.values()) {
    const d = Math.abs(skylineAt(st.u)[0] - wx)
    if (d < best) { best = d; at = st.to }
  }
  return at
})
function drawWindows(ctx: CanvasRenderingContext2D, k: number, t: number, on1: number): void {
  WINDOWS_AT.forEach(([x, y], i) => {
    const a = smooth(t, LIT_AT[i] + 0.1 * (i % 5), LIT_AT[i] + 0.4 + 0.1 * (i % 5))
    if (a <= 0) return
    ctx.fillStyle = rgba(M.spot, 0.55 * a * on1)
    ctx.fillRect((x - 0.025) * k, (y - 0.035) * k, 0.05 * k, 0.07 * k)
  })
}

/** The last run: when it starts, and how far through it the tower is drawn, foot to spire to foot. */
const LAST_RUN = SOLO_PHRASES[SOLO_PHRASES.length - 1]
export const towerDrawn = (t: number): number => smooth(t, LAST_RUN[0].s, LAST_RUN[0].s + 0.8 * (LAST_RUN[LAST_RUN.length - 1].s - LAST_RUN[0].s))
function drawTower(ctx: CanvasRenderingContext2D, k: number, t: number, on1: number): void {
  const d = towerDrawn(t)
  if (d <= 0) return
  const u1 = TOWER_U + (1 - TOWER_U) * d
  const path = new Path2D()
  const n = 60
  for (let i = 0; i <= n; i++) {
    const [x, y] = skylineAt(TOWER_U + ((u1 - TOWER_U) * i) / n)
    if (i === 0) path.moveTo(x * k, y * k)
    else path.lineTo(x * k, y * k)
  }
  for (const [w, a0] of [[0.075, 0.1], [0.018, 0.75]] as const) {
    ctx.lineWidth = w * k
    ctx.strokeStyle = rgba(M.spot, a0 * on1 * 0.7)
    ctx.stroke(path)
  }
  // The pen: a bright point where it is drawing.
  if (d < 1) {
    const [x, y] = skylineAt(u1)
    ctx.fillStyle = rgba(M.spot, on1)
    ctx.beginPath()
    ctx.arc(x * k, y * k, 0.045 * k, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** A note of the solo seen at `t`: improvised as it leaves the bell, then settling into its place in the skyline. */
function threadAt(s: number, m: number, t: number): { x: number; y: number; a: number } {
  const q = blownAt(s, m, t)
  const st = SETTLE.get(s)
  if (!st) return q
  const f = smooth(t, st.from, st.to)
  if (f <= 0) return q
  const [tx, ty] = skylineAt(st.u)
  // On its way to its place it goes down to the skyline's height first, out on the bell's open side, and only then
  // across under the horn into its place: a straight line from where it drifted to (above and right of the trumpet)
  // to the skyline (below and left of it) went through the trumpet.
  const down = f < 0.6 ? smooth(f, 0, 0.6) : 1
  const across = smooth(f, 0.35, 1)
  return { x: q.x + (tx - q.x) * across, y: q.y + (ty - q.y) * down, a: q.a + (0.7 - q.a) * f }
}

/** Every point of the solo's threads that is lit at `t` (more than a quarter there), in this frame: what the checks see. */
export function soloThreads(t: number): Pt[] {
  const out: Pt[] = []
  for (const phrase of SOLO_PHRASES) for (const n of phrase) {
    if (n.s > t) break
    const q = threadAt(n.s, n.m, t)
    if (q.a > 0.25) out.push([q.x, q.y])
  }
  return out
}

function drawSolo(p: p5, k: number, t: number, on1: number): void {
  if (on1 <= 0.01 || t < AT.trumpet - 0.4) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // The segments, gathered into a few paths by how bright they are, so a thousand of them are a handful of strokes.
  const LV = 10
  const paths: Path2D[] = Array.from({ length: LV }, () => new Path2D())
  for (const phrase of SOLO_PHRASES) {
    if (phrase[0].s > t) break
    let prev: { x: number; y: number; a: number } | null = null
    for (const n of phrase) {
      if (n.s > t) break
      const q = threadAt(n.s, n.m, t)
      // (No stroke between a note gone to its place in the skyline and the next one still leaving the bell.)
      if (prev && q.a > 0.01 && Math.hypot(q.x - prev.x, q.y - prev.y) < 0.3) {
        const lv = Math.min(LV - 1, Math.floor(Math.min(prev.a, q.a) * LV))
        paths[lv].moveTo(prev.x * k, prev.y * k)
        paths[lv].lineTo(q.x * k, q.y * k)
      }
      prev = q
    }
  }
  // The thread itself: a line of warm light, no haze round it.
  ctx.lineWidth = 0.02 * k
  for (let lv = 0; lv < LV; lv++) {
    ctx.strokeStyle = rgba(M.spot, 0.8 * on1 * ((lv + 0.5) / LV))
    ctx.stroke(paths[lv])
  }
  drawTower(ctx, k, t, on1)
  drawWindows(ctx, k, t, on1)
  ctx.restore()
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
