import type { Pt } from '../../../../../parts'
import type { TrollLook } from '../troll'
import { beatAt } from '../music'
import { TROLL } from '../worlds'
import {
  BELLS, COURT_UP, CRIES, DAIS, FIRST_EYES, FL, FLEE, FLICK_A, FLICK_B, FLICK_C, GALLERY_Y, GRAB, KING_EYES, KING_GRAB, KING_RISE, KING_UP,
  OPEN, PEER_PATH, ROW_Y, SLAY, SMASH, SNORT_A, SNORT_B, SNORT_C, STEPS, TAIL_A, TAIL_B, TAIL_C, THRONE, WAKE_BEGIN, WAKE_END, WAVE, accent,
  ease, kick, ring,
} from './hall-clock'

/**
 * The court of the Dovre King: who sits where, and how each of them moves through the show (a pure function of show
 * time, so the hall can be drawn at any moment, including the finale's collapse).
 *
 * Asleep (court): they doze on their benches, breathing every two beats (heads rising on the in-breath), and three
 * of them react as Peer treads on their tails: a flinch, the tail's flick, a snort into the brazier by their head.
 * Awake (wake): the troll nearest him opens its eyes on the phrase's first note; the heads turn to him in a wave,
 * west from the throne, one column a note; "Slay him!" three times, mouths and arms; they nod on the beats, row
 * against row; they stand on the next downbeat, and the front row comes down after him. After he drops through
 * the floor they stand round, looking where he went. At the bells (the coda) they freeze and look up; on the chord
 * pairs they flee, west along their benches and out through the dark.
 */

export interface Courtier {
  /** Front row 0 (the floor's bench), 1 and 2 the tiers, 3 the dark gallery (eyes only). */
  row: 0 | 1 | 2 | 3
  x: number
  size: number
  seed: number
  hide?: string
  /** Where its head lolls asleep (face). */
  doze: number
  /** A station's sleeper: whose tail he treads on, and when. */
  station?: { tail: number; flick: number; snort: number; toward: number }
  /** Where it goes when the front row comes down after him (x on the floor), and its grab. */
  chase?: { to: number; grab?: number }
}

export const COURT: Courtier[] = [
  // The front row, on the floor's bench: the three sleepers whose tails he treads on, and one between.
  { row: 0, x: 2.3, size: 1.55, seed: 101, doze: 0.55, station: { tail: TAIL_A, flick: FLICK_A, snort: SNORT_A, toward: 1 }, chase: { to: 11.4 } },
  { row: 0, x: 6.3, size: 1.65, seed: 102, doze: -0.55, station: { tail: TAIL_B, flick: FLICK_B, snort: SNORT_B, toward: -1 }, chase: { to: 12.9 } },
  { row: 0, x: 8.4, size: 1.5, seed: 103, doze: 0.18, chase: { to: 14.1 } },
  { row: 0, x: 11.2, size: 2.0, seed: 104, hide: TROLL.old, doze: 0.5, station: { tail: TAIL_C, flick: FLICK_C, snort: SNORT_C, toward: 1 }, chase: { to: 15.05, grab: GRAB } },
  // The tiers.
  { row: 1, x: 1.25, size: 1.45, seed: 111, doze: 0.3 },
  { row: 1, x: 2.85, size: 1.4, seed: 112, doze: -0.25 },
  { row: 1, x: 5.85, size: 1.5, seed: 113, doze: 0.4 },
  { row: 1, x: 7.45, size: 1.4, seed: 114, doze: -0.35 },
  { row: 1, x: 11.0, size: 1.5, seed: 115, doze: 0.2 },
  { row: 2, x: 0.95, size: 1.35, seed: 121, doze: -0.2 },
  { row: 2, x: 2.55, size: 1.3, seed: 122, doze: 0.35 },
  { row: 2, x: 6.4, size: 1.35, seed: 123, doze: -0.3 },
  { row: 2, x: 7.95, size: 1.3, seed: 124, doze: 0.25 },
  { row: 2, x: 11.45, size: 1.35, seed: 125, doze: -0.15 },
  // The gallery in the dark: silhouettes, their eyes the only thing that shows.
  { row: 3, x: 1.0, size: 1.2, seed: 131, doze: 0.2 },
  { row: 3, x: 2.4, size: 1.15, seed: 132, doze: -0.3 },
  { row: 3, x: 5.7, size: 1.2, seed: 133, doze: 0.25 },
  { row: 3, x: 6.95, size: 1.15, seed: 134, doze: -0.2 },
  { row: 3, x: 8.2, size: 1.2, seed: 135, doze: 0.3 },
  { row: 3, x: 10.75, size: 1.15, seed: 136, doze: -0.25 },
  { row: 3, x: 11.95, size: 1.2, seed: 137, doze: 0.1 },
]

export const SEAT_Y = (row: number): number => (row === 3 ? GALLERY_Y : ROW_Y[row])

/** Breath, 0 (out) to 1 (in), every two beats; a slow one (four beats) for the King. */
const breath = (t: number, phase: number, beats = 2): number => 0.5 - 0.5 * Math.cos((Math.PI * 2 * beatAt(t)) / beats + phase)

/** Where Peer is (court frame): what the waking court looks at. */
const peer = (t: number): Pt => PEER_PATH.at(Math.max(40.2, Math.min(WAKE_END, t)))

/** The column-by-column wave: which of the run's notes this troll's head turns on (east first). */
export function waveAt(c: Courtier): number {
  if (c.row === 0 && c.x > 10.5) return FIRST_EYES
  const i = Math.max(0, Math.min(5, Math.floor((12.6 - c.x) / 2.1)))
  return WAVE[i]
}

/** "Slay him!": how open the mouths and how high the arms, 0..1, for everyone awake. */
export function shout(t: number): number {
  let v = 0
  SLAY.forEach((s, i) => (v = Math.max(v, accent(t, s, 0.16, i === 2 ? 1.0 : 0.75) * (i === 2 ? 1 : 0.92))))
  for (const c of CRIES) v = Math.max(v, 0.45 * accent(t, c, 0.12, 0.35))
  return v
}

/** The court's heads nod on the beats, row against row, from the first shout until they stand. */
function nod(t: number, row: number): number {
  if (t < SLAY[0] + 0.4 || t > COURT_UP + 2) return 0
  const b = beatAt(t) + (row % 2) * 1
  const u = b / 2 - Math.floor(b / 2)
  const env = ease(t, SLAY[0] + 0.4, SLAY[0] + 1.2) * (1 - ease(t, COURT_UP - 0.3, COURT_UP + 1.5))
  return env * Math.pow(Math.max(0, Math.cos(u * Math.PI * 2)), 3)
}

export interface Pose {
  x: number
  y: number
  look: TrollLook
  /** 0 gone (out through the dark), 1 fully there. */
  alpha: number
  /** The tail's flick, 0..1 (a station's sleeper). */
  flick: number
  /** The snort's puff, 0..1: the brazier by its head flares with it. */
  puff: number
  /** Eyes a crack open in the dark gallery: drawn as glints over the silhouette. */
  glint: number
}

/** A courtier at show time t. */
export function courtierAt(c: Courtier, t: number): Pose {
  const seatY = SEAT_Y(c.row)
  const woke = waveAt(c)
  const awake = ease(t, woke - 0.25, woke)
  const b = breath(t, c.seed * 1.7)
  let x = c.x
  let y = seatY - 0.012 * c.size * b * (1 - awake)
  let face = c.doze + 0.05 * Math.sin(t * 0.7 + c.seed)
  let slump = 0.86 - 0.14 * b
  let eyes = 0
  let mouth = 0
  let arms = 0
  let rise = 0
  let flick = 0
  let puff = 0
  let pose: TrollLook['pose'] = 'sit'
  let phase = 0

  // A station's sleeper: the flinch when the tail is trodden, the flick, the snort into the brazier.
  if (c.station && t < WAKE_BEGIN) {
    const s = c.station
    const flinch = kick(t - s.tail, 0.18)
    flick = ease(t, s.flick - 0.18, s.flick) * (1 - ease(t, s.flick + 0.25, s.flick + 0.9))
    // The in-breath before the snort lifts the head; the snort drives it down toward the brazier, and it settles.
    const inhale = ease(t, s.snort - 0.7, s.snort - 0.05) * (1 - ease(t, s.snort - 0.05, s.snort))
    puff = t >= s.snort ? Math.exp(-(t - s.snort) / 0.35) : 0
    slump += 0.12 * flinch - 0.35 * inhale + 0.3 * puff * (1 - ease(t, s.snort + 0.3, s.snort + 1.4)) + 0.05 * ring(t - s.snort - 0.3, 0.5, 7)
    face += s.toward * (0.2 * puff - 0.15 * flinch)
    mouth = 0.28 * puff
    // The elder: an eye opens a crack when its tail is trodden, and closes again.
    if (c.seed === 104) eyes = 0.32 * ease(t, s.tail + 0.08, s.tail + 0.35) * (1 - ease(t, s.tail + 0.9, s.tail + 1.5))
  }

  if (t >= woke - 0.3) {
    const [px] = peer(t)
    const look = Math.max(-1, Math.min(1, (px - x) / 2.2))
    face = face + (look - face) * awake
    // Their heads go down together on the beat, row against row: the court keeps the tune's pulse.
    const n = nod(t, c.row)
    slump = slump + (0.08 - slump) * ease(t, woke - 0.25, woke + 0.1) + 0.7 * n
    y += 0.035 * c.size * n
    eyes = 1.35 * ease(t, woke - 0.12, woke) - 0.3 * ease(t, woke + 0.3, woke + 1.0)
    const sh = shout(t)
    mouth = Math.max(mouth, 0.9 * sh * awake)
    arms = (c.row === 3 ? 0 : 0.85) * sh * awake
    // The first eyes: the elder's, a beat before the rest.
    if (c.seed === 104) eyes = Math.max(eyes, 1.35 * ease(t, FIRST_EYES - 0.1, FIRST_EYES) - 0.3 * ease(t, FIRST_EYES + 0.3, FIRST_EYES + 1))
  }

  // They stand on the downbeat; the front row comes down after him.
  if (t >= COURT_UP - 0.45) {
    rise = ease(t, COURT_UP - 0.45, COURT_UP)
    if (c.row === 3) rise = 0
    if (c.chase && t >= STEPS[0] - 0.3) {
      // Down off the bench onto the floor, then on toward the dais on the notes, one stride each.
      const down = ease(t, STEPS[0] - 0.3, STEPS[0])
      y = seatY + (FL - seatY) * down - 0.12 * Math.sin(Math.PI * down)
      const go = ease(t, STEPS[0], c.chase.grab ? c.chase.grab : STEPS[2] + 0.9)
      const go2 = ease(t, 69.0, 70.4)
      const to2 = c.chase.to + (c.chase.grab ? 0.35 : 1.0)
      x = c.x + (c.chase.to - c.x) * go + (to2 - c.chase.to) * go2
      pose = go > 0.01 && go < 0.99 ? 'run' : 'stand'
      // Their feet come down on the eighths: the chase keeps time.
      phase = beatAt(t)
      if (c.chase.grab) {
        // The grab: a lunge, arms out at where he was, closing on nothing on the note, and a slow step back.
        const lunge = ease(t, c.chase.grab - 0.28, c.chase.grab) * (1 - ease(t, c.chase.grab + 0.15, c.chase.grab + 1.3))
        x += 0.55 * lunge
        arms = Math.max(arms, 0.5 * lunge)
        mouth = Math.max(mouth, 0.7 * lunge)
      }
    } else {
      y = seatY
    }
    if (pose === 'run') arms = 0
  }

  // After the drop: standing where they stopped, looking at the hatch; breathing hard, then calmer.
  if (t > WAKE_END) {
    const since = t - WAKE_END
    const u = ease(t, WAKE_END, WAKE_END + 1.6)
    const pant = 0.5 - 0.5 * Math.cos(t * 4.2 + c.seed)
    const mix = (a: number, b: number) => a + (b - a) * u
    slump = mix(slump, 0.12 + 0.05 * pant * Math.exp(-since / 8))
    face = mix(face, c.row === 0 ? 0.85 : 0.7)
    eyes = mix(eyes, 1)
    mouth = mix(mouth, 0.15 * Math.exp(-since / 3))
    arms = mix(arms, 0.1 * Math.exp(-since / 3))
  }

  // The bells: they freeze and look up; on the chord pairs, they flee west along their benches, out through the dark.
  let alpha = 1
  if (t >= BELLS - 0.05) {
    const hear = ease(t, BELLS - 0.05, BELLS + 0.25)
    face = face * (1 - hear)
    eyes = 1 + 0.5 * hear
    slump = slump + (-0.35 - slump) * hear
    mouth = 0.35 * hear
    arms = arms + (0.3 - arms) * hear
    const go = FLEE[Math.min(3, c.row)] + 0.08 * (c.seed % 3)
    if (t >= go) {
      const run = t - go
      const speed = 5.2 - 0.4 * c.row
      // Off the bench (the front row is already on the floor), and away west.
      const dist = speed * (run - 0.25 * (1 - Math.exp(-run / 0.25)))
      x = x - dist
      pose = 'run'
      phase = dist / 0.9
      face = -1
      rise = 1
      eyes = 1.5
      mouth = 0.6
      arms = 0
      slump = 0
    }
    // Into the dark at the west end: gone.
    alpha = Math.max(0, Math.min(1, (x - 0.1) / 0.7))
  }

  return {
    x,
    y,
    look: {
      size: c.size,
      pose,
      rise,
      face: Math.max(-1, Math.min(1, face)),
      slump,
      eyes: Math.max(0, eyes),
      mouth: Math.max(0, Math.min(1, mouth)),
      arms: Math.max(0, Math.min(1, arms)),
      seed: c.seed,
      hide: c.hide,
      phase,
      noTail: true,
    },
    alpha,
    flick,
    puff,
    // Awake in the dark, their eyes catch what light there is: the wave reads as eyes opening across the court.
    glint: c.row === 3 ? Math.max(0, eyes) : c.seed === 104 && t < woke ? Math.max(0, eyes) * 2 : Math.max(0, eyes - 0.2) * (t >= woke - 0.2 ? 1 : 0),
  }
}

/* ------------------------------------------------------------------ the King */

export interface KingPose {
  x: number
  y: number
  look: TrollLook
  /** The sceptre's angle (radians, y down; -π/2 straight up), and the part of it past his grip that reaches the dais. */
  sceptre: number
  /** How far the crown has slid over while he dozed (radians). */
  crownTilt: number
  alpha: number
}

/** The sceptre's angle to bring its head down on the dais at `hand`. */
export const SCEPTRE = { len: 2.55, grip: 0.22 }

export function kingAt(t: number, hand?: Pt): KingPose {
  const b = breath(t, 0.4, 4)
  const size = 3.0
  // Seated until he rises; then standing before the throne.
  const up = ease(t, KING_RISE[0], KING_RISE[1])
  const seat: Pt = [THRONE.x, THRONE.seat]
  let x = seat[0] + (KING_UP[0] - seat[0]) * up
  let y = seat[1] + (KING_UP[1] - seat[1]) * up
  const woke = ease(t, KING_EYES - 0.12, KING_EYES)
  const lift = ease(t, KING_EYES, KING_EYES + 0.9)
  let slump = (0.98 - 0.08 * b) * (1 - lift) + 0.3 * lift - 0.2 * up
  let eyes = 1.25 * woke - 0.25 * ease(t, KING_EYES + 0.3, KING_EYES + 1)
  const [px] = peer(t)
  const toward = Math.max(-1, Math.min(1, (px - x) / 2.0))
  let face = -0.14 * (1 - lift) + toward * ease(t, KING_EYES, KING_EYES + 0.7)
  const sh = accent(t, SLAY[1], 0.3, 0.9)
  let mouth = Math.max(sh, accent(t, SMASH, 0.12, 0.8), 0.4 * accent(t, KING_GRAB, 0.2, 0.5))
  // The sceptre: resting upright while he dozes; up in the air with the roar; down at Peer's feet as he passes; up
  // again behind him, and down on the dais where he stood.
  let arms = 0.3 * up + 0.7 * ease(t, SLAY[1] - 0.35, SLAY[1])
  // The grab: he stoops, hands down at Peer running through his feet, and straightens.
  const grab = ease(t, KING_GRAB - 0.32, KING_GRAB) * (1 - ease(t, KING_GRAB + 0.12, KING_GRAB + 0.75))
  arms = arms * (1 - grab) + 0.06 * grab
  slump += 0.55 * grab
  const raise = ease(t, 69.95, 70.95)
  const strike = ease(t, SMASH - 0.13, SMASH)
  const after = ease(t, SMASH + 1.4, SMASH + 2.6)
  if (t >= 69.95) arms = Math.max(arms, 0.55 + 0.45 * raise)
  if (t >= SMASH - 0.13) arms = 1 - 0.72 * strike + 0.72 * after * 0.35 - 0.04 * ring(t - SMASH, 0.3, 18)
  if (t >= 69.4 && t < WAKE_END + 1) face = Math.max(face, 0.25 + 0.6 * ease(t, 69.4, 70.3))
  // The blow's weight: he drops into it, head and all, and comes back up slowly.
  const blow = t >= SMASH - 0.13 ? ease(t, SMASH - 0.13, SMASH) * (1 - ease(t, SMASH + 0.1, SMASH + 1.1)) : 0
  slump += 0.3 * blow
  if (t >= OPEN) {
    eyes = 1.5 - 0.4 * ease(t, OPEN + 0.6, OPEN + 2.5)
    face = 0.95
    slump = 0.25 + 0.2 * ease(t, OPEN, OPEN + 1.2)
  }

  // The sceptre's angle: upright seated, raised high with the roar, reaching down with the grab, then the blow.
  const upright = -Math.PI / 2 + 0.12
  const high = -Math.PI / 2 + 0.3
  let sceptre = upright + (high - upright) * ease(t, SLAY[1] - 0.35, SLAY[1])
  sceptre -= 0.25 * grab
  if (t >= SMASH - 0.13) {
    // Down on the dais (the angle that brings its head to the dais from where his hand is), lifted again, held upright.
    const reach = SCEPTRE.len * (1 - SCEPTRE.grip)
    const onDais = hand ? Math.asin(Math.max(-1, Math.min(1, (DAIS.top - 0.02 - hand[1]) / reach))) : 0.75
    const raised = -Math.PI / 2 - 0.2
    sceptre = raised + (onDais - raised) * strike
    sceptre = after >= 1 ? upright : sceptre + (upright - sceptre) * after
  } else if (t >= 69.95) {
    sceptre = sceptre + (-Math.PI / 2 - 0.2 - sceptre) * raise
  }

  // After the drop: standing at the dais's east side, looking down at the open hatch.
  let alpha = 1
  let pose: TrollLook['pose'] = 'stand'
  let phase = 0
  if (t >= BELLS - 0.05) {
    const hear = ease(t, BELLS - 0.05, BELLS + 0.3)
    face = face * (1 - hear)
    eyes = 1.5
    slump = slump + (-0.35 - slump) * hear
    mouth = 0.4 * hear
    const go = FLEE[3] + 0.1
    if (t >= go) {
      // He goes too, east, heavily: along the dais, down, out of the east door.
      const run = t - go
      const dist = 3.2 * (run - 0.4 * (1 - Math.exp(-run / 0.4)))
      x = KING_UP[0] + dist
      const down = ease(x, DAIS.x1 - 0.7, DAIS.x1 + 0.4)
      y = DAIS.top + (FL - DAIS.top) * down
      pose = 'run'
      phase = dist / 1.4
      face = 1
      slump = 0
      arms = 0
      alpha = Math.max(0, Math.min(1, (29.4 - x) / 0.8))
    }
  }

  return {
    x,
    y,
    look: {
      size,
      pose,
      // Knees giving a little into the blow.
      rise: up * (1 - 0.18 * blow),
      face: Math.max(-1, Math.min(1, face)),
      slump,
      eyes: Math.max(0, eyes),
      mouth: Math.min(1, mouth),
      arms: Math.max(0, Math.min(1, arms)),
      seed: 7,
      hide: TROLL.old,
      phase,
      noTail: true,
    },
    sceptre,
    crownTilt: -0.16 * (1 - lift),
    alpha,
  }
}
