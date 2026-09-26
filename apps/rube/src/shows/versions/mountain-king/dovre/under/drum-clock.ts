import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { beat, beatAt, CODA, FF } from '../music'
import { PLAN } from '../seams'
import { TROLL } from '../worlds'

/**
 * The trolls' drum: where everything stands and when everything happens, shared by the lane (`drum.ts`) and the
 * drawing (`drum-set.ts`) so the ball is always where the skin that throws him is.
 *
 * The part's frame: Peer drops in from the mine at (-0.5, 0); the chamber's floor is at y FLOOR, its vault near
 * y -6.5; the chimney (the director's finale) rises through x ≈ 1.5, so nothing stands there; the shaft down to the
 * heart is under the great drum's east end, x 14.55 to 16.45.
 *
 *   the kettle        a small iron kettle-drum under the mine's shaft, tipped to throw east: the alarm
 *   the war-drum      a barrel drum on the floor, two drummers on its back rim
 *   the great drum    a barrel drum on a trestle over the shaft (the pit is its sound-box), three drummers
 *
 * The music: phrases 10 and 11 (A A), beats 160 to 192, the quarter from 0.43 to 0.37 s, crescendo to the
 * fortissimo (`FF`, 100.83, beat 189).
 */

/** Phrase 10's first beat (89.23): the ball lands on the kettle. Phrase 11 is beat 176, the heart's phrase 12 beat 192. */
export const B0 = 160
export const BEGIN = PLAN.drum.begin
export const END = PLAN.drum.end

/** The last hang's gravity, a little under the house's 12, so the bar under the vault stays under the vault. */
export const HANG_G = 10.8

/* ------------------------------------------------------------------ the room */

/** The chamber's floor (its top), and the vault over it. */
export const FLOOR = 0.95
export const VAULT = -6.4
/** The chimney's column (the finale lifts Peer up it): keep it clear. */
export const CHIMNEY_X = 1.5
/** The shaft to the heart, under the great drum: its two walls. */
export const SHAFT = { x0: 14.55, x1: 16.45, bottom: 8 }

/* ------------------------------------------------------------------ the drums */

export interface Drum {
  /** Centre of the skin, and its half-width. */
  cx: number
  rx: number
  /** The skin's centre line (a ball on it has its centre R above), and how deep the skin's ellipse looks. */
  skin: number
  ry: number
  /** The barrel's bottom (the floor, or the top of a trestle). */
  bottom: number
}

/**
 * The kettle: an iron bowl with a skin, set on a stone and tipped east by `tilt` radians, so the ball that falls
 * down the mine's shaft onto it is thrown toward the war-drum. Its skin passes through the ball's landing contact.
 */
export const KETTLE = { cx: 0.05, rx: 0.84, ry: 0.14, depth: 0.6, tilt: 0.1 }
/** The kettle's skin centre, so that a ball resting at (-0.5, 0) touches it. */
export const KETTLE_Y = (() => {
  const t = KETTLE.tilt
  const contact: Pt = [-0.5 - R * Math.sin(t), R * Math.cos(t)]
  return contact[1] + (KETTLE.cx - contact[0]) * Math.tan(t)
})()

/** The war-drum: a barrel on the floor. */
export const DRUM2: Drum = { cx: 5.0, rx: 1.62, skin: -1.45, ry: 0.24, bottom: FLOOR }
/** The great drum: a bigger barrel on a trestle over the shaft; the shaft is its sound-box. */
export const DRUM3: Drum = { cx: 13.75, rx: 2.85, skin: -2.6, ry: 0.34, bottom: -0.35 }

/** Where the ball stands on a drum: its centre, R above the skin's centre line. */
export const onSkin = (d: Drum): number => d.skin - R

/** The skin's far edge (the rim behind) at x: what the drummers stand on. */
export const farEdge = (d: Drum, x: number): number => {
  const u = Math.max(-1, Math.min(1, (x - d.cx) / d.rx))
  return d.skin - d.ry * Math.sqrt(1 - u * u)
}

/* ------------------------------------------------------------------ the ball's landings */

/** Every landing of the ball: the beat it lands on, where, and on which drum. The hop before each lands on it. */
export interface Landing {
  b: number
  x: number
  drum: 1 | 2 | 3
  /** The lift of the hop that lands here over its chord (cells); unset, a throw under gravity 12. */
  arc?: number
}

/**
 * The theme's pitch at eighth `j` of a phrase (semitones over the tonic), the phrase's contour: how high a hop that
 * starts on it goes. B C# D E F# D F# | F C# F · E C E · | B C# D E F# D F# B | A F# D F# A · · ·
 */
const PITCH = [0, 2, 3, 5, 7, 3, 7, 7, 6, 2, 6, 6, 5, 1, 5, 5, 0, 2, 3, 5, 7, 3, 7, 12, 10, 7, 3, 7, 10, 10, 10, 10]

/**
 * Phrase 10: the kettle throws him onto the war-drum (a long rise with the theme's run), and there he is bounced on
 * every beat, each hop as high as the note it starts on, drifting east from the first drummer to the second. On the
 * phrase's strongest accent (beat 173) both drummers throw him across to the great drum, landing on phrase 11's
 * first beat. Phrase 11: bounced on the backbeats, higher each time, east across the great drum to the middle of its
 * skin over the shaft, where the fortissimo's blow bursts it.
 */
function landings(): Landing[] {
  // The kettle: he lands on the phrase's first note, bounces on the run's next two quarters, rising with it (B, D,
  // F#), and on the third the kettle rocks east and throws him over the held note onto the war-drum's first bar line.
  const out: Landing[] = [
    { b: 160, x: -0.5, drum: 1 },
    { b: 161, x: -0.5, drum: 1, arc: 0.2 },
    { b: 162, x: -0.5, drum: 1, arc: 0.3 },
    { b: 164, x: 4.3, drum: 2 },
  ]
  // The war-drum, every beat from 165 to 173.
  for (let b = 165; b <= 173; b++) {
    const i = b - 164
    const j = 2 * (b - 1 - B0)
    // The hop that lands on b starts on b - 1: its height is that note's, a little higher as the phrase grows.
    const arc = (0.26 + 0.034 * PITCH[j % 32]) * (1 + 0.035 * i)
    out.push({ b, x: 4.3 + (1.55 * i) / 9, drum: 2, arc })
  }
  // Across to the great drum (a throw under gravity), then the backbeats, each a little higher, drifting east from
  // the first of its drummers toward the last; and from the third backbeat the great blow that throws him up under
  // the vault for a whole bar, while they wind up, to come down into the fortissimo's blow on the middle of the skin.
  out.push({ b: 176, x: 11.95, drum: 3 })
  const hang = beat(189) - beat(185)
  const d3: [number, number, number | undefined][] = [
    [179, 12.8, undefined],
    [181, 13.6, 0.95],
    [183, 14.1, 1.02],
    [185, 14.6, 1.1],
    [189, 15.5, (HANG_G * hang * hang) / 8],
  ]
  for (const [b, x, arc] of d3) out.push({ b, x, drum: 3, arc })
  return out
}
export const LANDINGS: readonly Landing[] = landings()

/** The fortissimo's blow (beat 189, 100.83): the great drum's skin bursts under him at BURST_X. */
export const BURST_B = 189
export const BURST = beat(BURST_B)
export const BURST_X = 15.5
/** How fast he goes on through the burst skin (cells a second, down), and the fall's gravity. */
export const THROUGH = 2.4
export const FALL_G = 12

/** The ball's height on landing `l`. */
export const landY = (l: Landing): number => (l.drum === 1 ? 0 : onSkin(l.drum === 2 ? DRUM2 : DRUM3))

/* ------------------------------------------------------------------ the drummers */

export interface Drummer {
  /** Where it stands on the drum's back rim, cells. */
  x: number
  drum: 2 | 3
  size: number
  seed: number
  hide?: string
  /** The beat it gets up onto the rim: it climbs the drum's back for the bar before. */
  up: number
}

/** A drummer joins every bar: two on the war-drum, three on the great drum, the last the biggest and oldest. */
export const DRUMMERS: readonly Drummer[] = [
  { x: 4.25, drum: 2, size: 1.75, seed: 3, up: 164 },
  { x: 5.8, drum: 2, size: 1.9, seed: 8, up: 168 },
  { x: 11.95, drum: 3, size: 2.0, seed: 11, up: 172 },
  { x: 13.6, drum: 3, size: 2.2, seed: 5, up: 176 },
  { x: 15.4, drum: 3, size: 2.35, seed: 14, hide: TROLL.old, up: 180 },
]
/** How long a drummer takes to climb up the drum's back, seconds. */
export const CLIMB = 0.95

/**
 * The drummers' blows, as beats: every beat through phrase 10 (the right fists on the even ones, the left on the
 * odd), then the backbeats through phrase 11 (a bigger swing, one fist each), on to the fortissimo's, and on through
 * the third statement on the backbeats until the coda stops them.
 */
function blowBeats(): number[] {
  const out: number[] = []
  for (let b = 150; b <= 176; b++) out.push(b)
  for (let b = 179; b <= 287; b += 2) out.push(b)
  return out
}
export const BLOW_BEATS: readonly number[] = blowBeats()
export const BLOWS: readonly number[] = BLOW_BEATS.map((b) => beat(b))
/** Is the blow at beat index `i` two-handed (phrase 11 on)? */
export const pairedBlow = (t: number): boolean => t >= beat(PAIRED) - 0.01

/** From phrase 11's first backbeat the drummers bring both clubs down together (`TrollLook.pair`), easing in from 176. */
const PAIRED = 179
export const pairAt = (t: number): number => {
  const b = beatAt(t)
  const u = Math.max(0, Math.min(1, (b - 176) / (PAIRED - 176)))
  return u * u * (3 - 2 * u)
}

/**
 * The strike pose's phase for every drummer (they drum as one), from show time: a fist comes down on every blow
 * (the right at 0.15, the left at 0.65 of the cycle, `troll.ts`), and between blows the arm goes up at the pace the
 * gap allows. A monotone cubic through the blows, so a longer gap is a slower, bigger wind-up, not a pause.
 */
const PHASE_AT = 0.15
function phaseCurve(): (b: number) => number {
  const xs = BLOW_BEATS
  // Through phrase 10 the fists alternate, a blow a beat (half a cycle each); from phrase 11 both come down at once
  // (a whole cycle a blow).
  const ys: number[] = []
  for (let i = 0; i < xs.length; i++) ys.push(i === 0 ? PHASE_AT : ys[i - 1] + (xs[i] <= PAIRED - 1e-6 ? 0.5 : 1))
  const n = xs.length
  const d = (i: number) => (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])
  const m: number[] = new Array(n).fill(0)
  m[0] = d(0)
  m[n - 1] = d(n - 2)
  for (let i = 1; i < n - 1; i++) {
    const a = d(i - 1)
    const b = d(i)
    const h0 = xs[i] - xs[i - 1]
    const h1 = xs[i + 1] - xs[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  return (b: number) => {
    if (b <= xs[0]) return ys[0] + (b - xs[0]) * m[0]
    if (b >= xs[n - 1]) return ys[n - 1] + (b - xs[n - 1]) * m[n - 1]
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (xs[mid] <= b) lo = mid
      else hi = mid
    }
    const h = xs[lo + 1] - xs[lo]
    const u = (b - xs[lo]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[lo] + (u3 - 2 * u2 + u) * h * m[lo] + (-2 * u3 + 3 * u2) * ys[lo + 1] + (u3 - u2) * h * m[lo + 1]
  }
}
const phaseOfBeat = phaseCurve()

/** When the coda's first chord stops them, the drummers freeze where they are. */
export const FREEZE = CODA
/** And duck down behind their drums on the chords that follow, gone. */
export const DUCK = CODA + 0.9

/** The drummers' strike phase at show time `t` (frozen from the coda). */
export function phase(t: number): number {
  return phaseOfBeat(beatAt(Math.min(t, FREEZE)))
}

/** Is drummer `d` up on its rim at `t` (climbing counts from the start of its climb)? */
export const upAt = (d: Drummer): number => beat(d.up)

/** The fortissimo's shake starts a little before `FF`; the part's own jolts are its blows'. */
export const SHAKE_FROM = FF - 1.2
