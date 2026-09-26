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
/** Where the fortissimo bursts the great drum under him: over the shaft, his exit's x (the seam's drop is straight down). */
const BURST_AT = 15.5

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

/**
 * The war-drum: a squat barrel on the floor between the two war-fires, wide enough that its drummers, one at each
 * end, swing their clubs down either side of him without reaching the middle of the skin where he bounces.
 */
export const DRUM2: Drum = { cx: 5.4, rx: 2.0, skin: -1.45, ry: 0.26, bottom: FLOOR }
/**
 * The great drum: a bigger barrel on a trestle over the shaft; the shaft is its sound-box. It stands as far east as
 * the chamber lets it (its barrel's belly just short of the east wall), so the burst (over the shaft, the exit's x)
 * is near the middle of its skin, with room for a drummer either side.
 */
export const DRUM3: Drum = { cx: 14.05, rx: 2.8, skin: -2.6, ry: 0.34, bottom: -0.35 }

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
 * Phrase 10: the kettle throws him onto the war-drum, into the clear middle of its skin between its two drummers
 * (one at each end), and there he is bounced on every beat, each hop as high as the note it starts on and higher as
 * the crescendo grows, drifting a little east. On the phrase's strongest accent (beat 173) both drummers' blows
 * throw him high over the east drummer's head and across to the great drum, landing on phrase 11's first beat in the
 * west half of its skin, where nobody stands yet. Phrase 11: one long bound east over the place where the big old
 * drummer is about to climb up, into the gap between it and the east end's drummer; there he is bounced on the
 * backbeats, clear over their heads, higher each time; the third throws him up under the vault for a whole bar while
 * they wind up, and he comes down alone in the gap, their clubs coming down either side of him, into the
 * fortissimo's blow, which bursts the skin.
 *
 * Every landing stands clear of every drummer who is up (`CLEAR`, the check in `landings`), and no flight crosses a
 * drummer who is up: the drummers join in an order that keeps his path open (the east end's first on each drum).
 */
function landings(): Landing[] {
  // The kettle: he lands on the phrase's first note, bounces on the run's next two quarters, rising with it (B, D,
  // F#), and on the third the kettle rocks east and throws him over the held note onto the war-drum's first bar line.
  const out: Landing[] = [
    { b: 160, x: -0.5, drum: 1 },
    { b: 161, x: -0.5, drum: 1, arc: 0.2 },
    { b: 162, x: -0.5, drum: 1, arc: 0.3 },
    { b: 164, x: 5.35, drum: 2 },
  ]
  // The war-drum, every beat from 165 to 173, dead in the middle of the skin, 1.75 cells or more from each drummer:
  // out of reach of their clubs as they come down either side of him.
  for (let b = 165; b <= 173; b++) {
    const i = b - 164
    const j = 2 * (b - 1 - B0)
    // The hop that lands on b starts on b - 1: its height is that note's, growing with the crescendo.
    // Under the drummers' shoulders (their arms swing out level over him between blows): no higher than 0.56.
    const arc = (0.24 + 0.025 * PITCH[j % 32]) * (1 + 0.04 * i)
    out.push({ b, x: 5.35 + (0.1 * i) / 9, drum: 2, arc })
  }
  // Across to the great drum: a high throw, clear over the war-drum's east drummer and under the stalactites.
  out.push({ b: 176, x: 12.0, drum: 3, arc: 3.55 })
  // Phrase 11's backbeats: a long bound east into the gap, then in place, each higher, clear over the drummers'
  // heads. The paired blows come every two beats, so the drummers' arms swing out level at shoulder height just as
  // he tops each hop: every hop tops out over the old drummer's shoulder (2.1 and up). And the hang under the vault
  // for the last bar, onto the burst.
  const hang = beat(189) - beat(185)
  const d3: [number, number, number][] = [
    [179, BURST_AT, 2.0],
    [181, BURST_AT, 2.1],
    [183, BURST_AT, 2.25],
    [185, BURST_AT, 2.4],
    [189, BURST_AT, (HANG_G * hang * hang) / 8],
  ]
  for (const [b, x, arc] of d3) out.push({ b, x, drum: 3, arc })
  return out
}
export const LANDINGS: readonly Landing[] = landings()

/** The fortissimo's blow (beat 189, 100.83): the great drum's skin bursts under him at BURST_X. */
export const BURST_B = 189
export const BURST = beat(BURST_B)
export const BURST_X = BURST_AT
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

/**
 * The drummers stand at the ends of the drums' back rims, never in the middle of a skin where he bounces: two on
 * the war-drum (the east end's first, then the west end's, so the kettle's throw from the west never crosses one
 * climbing), three on the great drum. There the east end's (a young one) comes up first, a bar before he is thrown
 * across; the biggest and oldest climbs up on the west side of the burst's gap just after he has bounded over its
 * place (it climbs while he is high, and joins on its first blow, the backbeat); the last stands beside it at the
 * west end. So for the last bars he bounces alone on the open skin over the
 * shaft, the young one's clubs coming down on his east, the old one's on his west. The old one stands where its
 * arm and club (0.82 of its height from the shoulder, swung out level and up on every blow) never reach his column.
 * Five drummers, about one a bar but the bar of the throw.
 */
export const DRUMMERS: readonly Drummer[] = [
  { x: 7.2, drum: 2, size: 1.45, seed: 3, up: 164 },
  { x: 3.6, drum: 2, size: 1.5, seed: 8, up: 168 },
  { x: 16.45, drum: 3, size: 1.3, seed: 11, up: 172 },
  { x: 12.65, drum: 3, size: 2.15, seed: 14, hide: TROLL.old, up: 181 },
  { x: 11.65, drum: 3, size: 1.7, seed: 5, up: 184 },
]
/** How long a drummer takes to climb up the drum's back, seconds. */
export const CLIMB = 0.95

/**
 * How far every landing keeps from every drummer that is up or climbing (cells, centre to centre): his hops land
 * on clear skin between their hanging fists, never among their legs. The console says so if a landing breaks it.
 */
export const CLEAR = 0.8
for (const l of LANDINGS) {
  for (const d of DRUMMERS) {
    if (d.drum !== l.drum || beat(l.b) < beat(d.up) - CLIMB) continue
    if (Math.abs(l.x - d.x) < CLEAR) console.warn(`mountain king: drum landing on beat ${l.b} at ${l.x} is within ${CLEAR} of the drummer at ${d.x}`)
  }
}

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
