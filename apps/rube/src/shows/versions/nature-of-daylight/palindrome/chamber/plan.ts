import { laneAt, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { route, type Way } from '../kit'
import { BLAST, SEAM, nearestBeat } from '../music'
import { throwFor } from '../physics'

/**
 * The chamber's clock and its geometry, in the shell's world cells (y down; a ball on the floor has its centre at
 * y = 0, the floor's face at y = R). Everything the chamber draws and every lane it builds reads from here, so the
 * drawing and the lanes cannot disagree.
 *
 * The chamber is seen in section: a long dark room of stone running left to right, the tunnel they came up by at its
 * left, and at its right end the glass, a pane standing from the floor up into the dark. Beyond it is the heptapods'
 * white: their fog, where they come and write. The language is a machine she drives: she rolls onto a plate by the
 * glass and her board flips up, and the same plate slips a catch that sends the last word she has read down a rail
 * along the back wall, a card with their ink on it, to hang in a row with the others.
 */

/* ------------------------------------------------------------------ the room */

/** The glass: its face on the chamber side, and its thickness. Beyond `FAR` is the heptapods' fog. */
export const GX = 7
export const GT = 0.28
export const FAR = GX + GT
/** The floor's face. */
export const FLOOR = R
/** Where the tall chamber begins: left of this is the low tunnel they came up by. */
export const JAMB = -0.9
/** The tunnel's ceiling, and the chamber's (lost in the dark). */
export const LINTEL = -2.7
export const CEILING = -11

/** Where her centre is when she touches the glass (flush against it), and when she stands on the plate. */
export const TOUCH = GX - R - 0.002
export const PLATE = 5.8
/**
 * Her board: a pale board on two short legs, hinged at its foot on the floor beside the plate. It lies flat until she
 * presses the plate, then flips up to stand facing the glass, and falls flat again after she steps off.
 */
export const BOARD = { x: 4.95, w: 0.8, h: 0.6, legs: 0.3 }
/** Where she stands to begin with (the threshold), where she comes to rest before the glass, and Ian beside her. */
export const THRESHOLD = 0
export const REST = 5.6
export const IAN_BY = -0.42
/** Ian's place while she works the machine: behind her board. */
export const IAN_HOME = 3.6

/* ------------------------------------------------------------------ the rail */

/**
 * The rail along the back wall over their heads, running from a slot through the glass down to its far end. A word
 * that comes through the slot hangs on a card by the glass until the catch is slipped; then it runs down the rail and
 * stops against the words before it.
 */
export const RAIL = { x0: 2.85, x1: GX, y1: -2.2, fall: 0.06 }
export const railY = (x: number): number => RAIL.y1 + (RAIL.x1 - x) * RAIL.fall
/** A card's side, and the places a card hangs: by the slot, and in the row (the first furthest down the rail). */
export const CARD = 0.62
export const WAIT = 6.63
export const ROW: number[] = [3.28, 3.95, 4.62, 5.29, 5.96, WAIT]
/** Where a card's middle is, hung from the rail at x. */
export const cardY = (x: number): number => railY(x) + 0.1 + CARD / 2
/** The slot through the glass. */
export const SLOT: Pt = [GX + GT / 2, railY(GX) + 0.02]
/** Seconds a word takes from the glass in through the slot to its card. */
export const INTO = 0.9

/* ------------------------------------------------------------------ the clock */

const b = (t: number): number => nearestBeat(t)

export const T = {
  /** Contact: from the threshold in the dark. */
  in: SEAM.contact,
  /** The glass's first light, as she comes in; full on the next chord, when she has come up to it. */
  kindle: SEAM.contact,
  wake: b(135.442),
  /** They come out of the white. */
  abbott: b(137.381),
  costello: b(141.224),
  /** The first try: the board held up, in her suit. Nothing. */
  board0: b(144.208),
  /** The suit comes off. */
  suit: b(145.165),
  /** Her touch, and the palm. */
  palm: b(149.171),
  /** Ian follows her lead. */
  ianSuit: b(150.181),
  /** The first logogram. */
  first: b(153.06),
  /** She reads the row back, card by card; her question goes up on her board; she puts it to them. */
  readback: b(190.943),
  question: b(192.789),
  put: b(194.81),
  /** The answer: "weapon". */
  weapon: b(196.795),
  out: SEAM.dark,
  /** The bomb: Abbott strikes the glass on the seam's hard beat. */
  bomb: SEAM.bomb,
  slam: SEAM.bomb,
  find: b(218.424),
  frantic: b(220.375),
  blast: BLAST,
  /** A long shard comes down; the last of the glass goes and the white comes in. */
  shard: b(227.167),
  flood: b(229.129),
  fog: SEAM.fog,
}

/** Her board up, each time she lands on the plate; and when she steps off it again. */
export const BOARDS: { t: number; off: number }[] = [
  { t: T.board0, off: b(146.141) + 0.2 },
  { t: b(157.211), off: b(158.134) },
  { t: b(164.792), off: b(165.692) },
  { t: b(173.441), off: b(174.428) },
  { t: b(181.133), off: b(182.149) },
  { t: b(188.012), off: 189.4 },
  { t: T.question, off: b(193.817) },
]

/** Her touches at the glass after the palm: each one is answered. */
export const TOUCHES: number[] = [b(161.025), b(169.61), b(177.186), b(185.08), T.put, T.weapon]

/* ------------------------------------------------------------------ their writing */

export type Writer = 'abbott' | 'costello'
export interface Logo {
  seed: number
  /** Show time the ink starts, and how long it takes to close. */
  born: number
  form: number
  who: Writer
  c: Pt
  R: number
  /** Its size on its card. */
  r: number
  /** When it goes in through the slot; when its card is sent down the rail (null: it stays by the slot); when it lands. */
  slotIn: number
  release: number | null
  land: number
  row: number
}

const logo = (seed: number, born: number, form: number, who: Writer, c: Pt, R: number, r: number, slotIn: number, release: number | null, land: number, row: number): Logo => ({ seed, born, form, who, c, R, r, slotIn, release, land, row })

/**
 * Six words. The first, big, after the palm; then one answer to each of her touches, and at the last both of them at
 * once. Each goes in through the slot once it has closed, and her next board sends it down the rail, landing on the
 * next beat.
 */
export const LOGOS: Logo[] = [
  logo(1014, T.first, 2.3, 'abbott', [9.35, -3.3], 1.5, 0.24, 155.9, b(157.211), b(158.134), 0),
  logo(1021, b(161.025), 1.6, 'abbott', [8.3, -1.95], 0.85, 0.2, 163.0, b(164.792), b(165.692), 1),
  logo(1042, b(169.61), 1.6, 'costello', [8.5, -2.3], 0.8, 0.23, 171.7, b(173.441), b(174.428), 2),
  logo(1063, b(177.186), 1.5, 'abbott', [8.25, -1.9], 0.82, 0.19, 179.3, b(181.133), b(182.149), 3),
  logo(1091, b(185.08), 1.2, 'abbott', [8.2, -1.95], 0.78, 0.22, 186.6, b(188.012), b(189.005), 4),
  logo(1105, b(185.08), 1.3, 'costello', [10.2, -3.2], 0.95, 0.21, 188.45, null, 188.45 + INTO, 5),
]

/** "Weapon": the conversation's last logogram, a ring with a hard spike flung out, low on the glass before her. */
export const WEAPON = { seed: 1168, born: T.weapon, form: 0.3, c: [8.5, -1.25] as Pt, R: 0.8 }

/** Abbott's frantic writing before the blast: a jagged ring in bursts on the beats. */
export const FRANTIC = { seed: 1203, c: [9.4, -3.1] as Pt, R: 1.35, bursts: [b(219.417), b(220.375), b(221.362), b(222.348)] }

/* ------------------------------------------------------------------ the heptapods */

export interface Stand {
  x: number
  y: number
  s: number
  fog: number
  lean: number
  alpha: number
}
const smooth = (t: number, a: number, b2: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b2 - a)))
  return u * u * (3 - 2 * u)
}
const lerp = (a: number, b2: number, u: number): number => a + (b2 - a) * u

/** Abbott: out of the white on his chord, near the glass; in the bomb reeling back into the fog. */
export function abbott(t: number): Stand {
  const come = smooth(t, T.abbott - 0.2, T.abbott + 3.1)
  const loom = smooth(t, T.abbott - 0.1, T.abbott + 0.9)
  const reel = smooth(t, T.blast, T.blast + 2.6)
  const x = lerp(13.4, 11.4, come) + 3.4 * reel
  const fog = Math.min(0.96, lerp(0.95, 0.2, come) + 0.7 * reel)
  const agitated = t > T.bomb - 1 && t < T.blast ? 0.06 * Math.sin((t - T.bomb) * 5.3) : 0
  return { x, y: 3.2, s: 8.6, fog, lean: agitated + 0.55 * reel * (1 - 0.3 * reel), alpha: loom * (1 - 0.55 * reel) }
}
export function costello(t: number): Stand {
  const come = smooth(t, T.costello - 0.2, T.costello + 3.3)
  const loom = smooth(t, T.costello - 0.1, T.costello + 0.9)
  const back = smooth(t, T.blast, T.blast + 3)
  return { x: lerp(15.8, 13.9, come) + 1.8 * back, y: 1.3, s: 7.2, fog: Math.min(0.95, lerp(0.95, 0.5, come) + 0.35 * back), lean: -0.05, alpha: loom * (1 - 0.5 * back) }
}

/* ------------------------------------------------------------------ her path, and Ian's */

const toSegs = (ways: Way[]): Seg[] => route(ways)
const at = (t: number, x: number, ease?: Seg['ease'], y = 0): Way => ({ at: t, p: [x, y], ease })

/** Louise in contact, show times, world cells. */
function contactWays(): Way[] {
  const w: Way[] = []
  w.push(at(T.in, THRESHOLD))
  // In from the threshold, slowly, as the glass comes up; she arrives as it wakes.
  w.push(at(T.wake, 4.05, 'inout'))
  // Abbott: she draws back a little, then comes on again; Costello: again.
  w.push(at(T.abbott, 4.1, 'inout'))
  w.push(at(T.abbott + 0.75, 3.88, 'out'))
  w.push(at(T.costello, 4.02, 'inout'))
  w.push(at(T.costello + 0.7, 3.93, 'out'))
  w.push(at(b(143.215), 4.0, 'inout'))
  // The first try: onto the plate, the board up.
  w.push(at(T.board0, PLATE, 'inout'))
  w.push(at(T.suit, PLATE))
  // The suit falls away; she goes to the glass alone, slowly.
  w.push(at(b(146.141), PLATE))
  w.push(at(T.palm, TOUCH, 'inout'))
  // The palm: she stays pressed to it, eases off, and presses again; the first logogram: she draws back to see it,
  // Ian beside her.
  w.push(at(T.palm + 1.25, TOUCH - 0.12, 'inout'))
  w.push(at(T.palm + 2.35, TOUCH, 'inout'))
  w.push(at(T.first - 0.25, TOUCH))
  w.push(at(b(154.059), TOUCH - 0.3, 'inout'))
  w.push(at(b(155.109), TOUCH - 0.3))
  // The machine, on the chords: back onto the plate (her board, and the word sent down the rail), forward to the
  // glass (her touch, and their answer).
  const legs: [number, number, number][] = [
    [b(155.109), BOARDS[1].t, PLATE],
    [BOARDS[1].off, TOUCHES[0], TOUCH],
    [b(162.029), BOARDS[2].t, PLATE],
    [BOARDS[2].off, TOUCHES[1], TOUCH],
    [b(170.62), BOARDS[3].t, PLATE],
    [BOARDS[3].off, TOUCHES[2], TOUCH],
    [b(178.149), BOARDS[4].t, PLATE],
    [BOARDS[4].off, TOUCHES[3], TOUCH],
    [b(186.073), BOARDS[5].t, PLATE],
  ]
  for (const [a, t, x] of legs) {
    if (w[w.length - 1].at < a - 1e-6) w.push(at(a, w[w.length - 1].p[0]))
    w.push(at(t, x, 'inout'))
  }
  // She reads the row back: down under it, and back along it as the cards light, onto the plate: her question.
  w.push(at(BOARDS[5].off, PLATE))
  w.push(at(T.readback, 4.6, 'inout'))
  w.push(at(T.question, PLATE, 'inout'))
  // She puts it to them at the glass; eases back; touches again: "weapon".
  w.push(at(BOARDS[6].off, PLATE))
  w.push(at(T.put, TOUCH, 'inout'))
  w.push(at(b(195.75), TOUCH - 0.3, 'inout'))
  w.push(at(T.weapon, TOUCH, 'in'))
  // Its spike strikes the glass before her face and she is pushed back; she comes to rest before it.
  w.push(at(T.weapon + 0.32, TOUCH))
  w.push({ at: T.weapon + 2.5, p: [REST, 0], ramp: [(2 * (TOUCH - REST)) / 2.18, 0] })
  w.push(at(T.out, REST))
  return w
}

/** Ian in contact. */
function ianContactWays(): Way[] {
  const w: Way[] = []
  const x0 = THRESHOLD + IAN_BY
  w.push(at(T.in, x0))
  w.push(at(T.wake + 0.15, 4.05 + IAN_BY, 'inout'))
  w.push(at(T.abbott + 0.1, 3.66, 'inout'))
  w.push(at(T.abbott + 0.9, 3.44, 'out'))
  w.push(at(T.costello + 0.1, 3.58, 'inout'))
  w.push(at(T.costello + 0.8, 3.5, 'out'))
  w.push(at(b(143.215), 3.3, 'inout'))
  // She has taken her suit off: he starts after her, and stops.
  w.push(at(T.suit + 0.3, 3.3))
  w.push(at(T.suit + 1.3, 3.55, 'out'))
  w.push(at(T.ianSuit - 0.4, 3.45, 'inout'))
  // His suit off, he comes up beside her at the glass for the first logogram, and they draw back from it together.
  w.push(at(T.ianSuit + 0.55, 3.45))
  w.push(at(T.first - 0.25, TOUCH - 0.29, 'inout'))
  w.push(at(b(154.059), TOUCH - 0.59, 'inout'))
  w.push(at(T.first + 1.55, TOUCH - 0.59))
  w.push(at(T.first + 3.55, IAN_HOME, 'inout'))
  // While she works the machine he reads what it brings them: as each word is sent down the rail he rolls with it,
  // and is under it on the beat it lands. (Behind her board, drifting a tenth of a cell, he and she read as parked
  // through the longest stretch of the film: her trips from plate to glass are a cell.) The fourth hangs over her
  // plate, so he stops short of it; on the fifth he goes back along the row ahead of her, for she reads it back.
  for (const l of LOGOS) {
    if (l.release === null || l.row > 3) continue
    w.push(at(l.release, w[w.length - 1].p[0]))
    w.push(at(l.land, Math.min(ROW[l.row], PLATE - 0.5), 'inout'))
  }
  w.push(at(BOARDS[5].t, w[w.length - 1].p[0]))
  w.push(at(T.readback - 0.3, IAN_HOME, 'inout'))
  // After "weapon": he comes to her side.
  w.push(at(T.weapon + 0.4, IAN_HOME))
  w.push(at(T.weapon + 2.6, REST + IAN_BY, 'inout'))
  w.push(at(T.out, REST + IAN_BY))
  return w
}

/** The blast's throw: a flight from `x` at `t` with velocity v, a bounce, and a roll that slows to rest at `end`. */
function thrown(w: Way[], x: number, t: number, v: Pt, bounce: Pt, end: number): void {
  const T1 = (-2 * v[1]) / 12
  const land = throwFor({ at: t, p: [x, 0] }, v, T1)
  land.p = [land.p[0], 0]
  w.push(land)
  const T2 = (-2 * bounce[1]) / 12
  const hop = throwFor(land, bounce, T2)
  hop.p = [hop.p[0], 0]
  w.push(hop)
  const dur = end - hop.at
  const dist = (-bounce[0] * dur) / 2
  w.push({ at: end, p: [hop.p[0] - dist, 0], ramp: [-bounce[0], 0] })
}

function bombWays(): Way[] {
  const w: Way[] = []
  w.push(at(T.bomb, REST))
  // Abbott strikes the glass: she flinches back.
  w.push(at(T.slam + 0.32, REST - 0.15, 'out'))
  w.push(at(T.slam + 1.6, REST - 0.1, 'inout'))
  // Something is wrong: she edges toward the glass on the find, and back.
  w.push(at(T.find + 0.9, REST - 0.02, 'inout'))
  w.push(at(T.frantic + 0.8, REST - 0.12, 'inout'))
  w.push(at(T.blast, REST - 0.1, 'inout'))
  // Thrown back down the chamber: an arc, a bounce, a roll to rest.
  thrown(w, REST - 0.1, T.blast, [-4.2, -4.0], [-2.0, -1.4], T.shard)
  w.push(at(T.fog, w[w.length - 1].p[0]))
  return w
}

function ianBombWays(): Way[] {
  const w: Way[] = []
  const x0 = REST + IAN_BY
  w.push(at(T.bomb, x0))
  w.push(at(T.slam + 0.36, x0 - 0.16, 'out'))
  w.push(at(T.slam + 1.7, x0 - 0.1, 'inout'))
  w.push(at(T.blast, x0 - 0.1))
  // Thrown as she is, a little beyond her: he lands in the frame and comes to rest there, down, not gone. (Thrown
  // further, he rolled out of the frame by himself, and from then to the meadow he read as killed.)
  thrown(w, x0 - 0.1, T.blast, [-4.6, -4.2], [-2.2, -1.4], T.shard + 0.25)
  w.push(at(T.fog, w[w.length - 1].p[0]))
  return w
}

/** A lane of world-cell ways, moved into a part's frame. */
export function laneOf(ways: Way[], origin: Pt): Lane {
  const moved = ways.map((w) => ({ ...w, p: [w.p[0] - origin[0], w.p[1] - origin[1]] as Pt }))
  return { segs: toSegs(moved), fire: 0 }
}

export const WAYS = {
  contact: contactWays(),
  bomb: bombWays(),
  ianContact: ianContactWays(),
  ianBomb: ianBombWays(),
}

const world = (ways: Way[]): { lane: Lane; t0: number; t1: number } => ({ lane: { segs: toSegs(ways), fire: 0 }, t0: ways[0].at, t1: ways[ways.length - 1].at })
const LANES = {
  contact: world(WAYS.contact),
  bomb: world(WAYS.bomb),
  ianContact: world(WAYS.ianContact),
  ianBomb: world(WAYS.ianBomb),
}

/** Louise at show time `t` (world cells), while she is in the chamber; null outside. */
export function louiseAt(t: number): Pt | null {
  for (const key of ['contact', 'bomb'] as const) {
    const L = LANES[key]
    if (t >= L.t0 - 1e-6 && t <= L.t1 + 1e-6) {
      const q = laneAt(L.lane, t - L.t0)
      return [q.x, q.y]
    }
  }
  return null
}
/** Ian at show time `t` (world cells), while he is in the chamber; null outside. */
export function ianAt(t: number): Pt | null {
  for (const key of ['ianContact', 'ianBomb'] as const) {
    const L = LANES[key]
    if (t >= L.t0 - 1e-6 && t <= L.t1 + 1e-6) {
      const q = laneAt(L.lane, t - L.t0)
      return [q.x, q.y]
    }
  }
  return null
}

/* ------------------------------------------------------------------ the machine's parts */

/** A damped spring's step response, 0 at `u` = 0 to 1, overshooting a little. */
export function step(u: number, w = 7, z = 0.42): number {
  if (u <= 0) return 0
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + ((z * w) / wd) * Math.sin(wd * u))
}

/**
 * The board's flip: 0 lying flat, 1 standing (a little past on the way up, and a bounce when it falls). It stands when
 * she lands on the plate and falls after she steps off.
 */
export function flipAt(t: number): number {
  let v = 0
  for (const bd of BOARDS) {
    v += step(t - bd.t, 9, 0.38)
    v -= fall(t - bd.off)
  }
  // The blast slams it flat, if it was not.
  if (t >= T.blast) v *= Math.exp(-(t - T.blast) / 0.05)
  return v < 0 ? -0.5 * v : v
}
/** A board falling flat: slow to start, quick at the end, from 0 to 1. */
function fall(u: number): number {
  if (u <= 0) return 0
  return Math.min(1, (u / 0.55) ** 2) + (u > 0.55 ? -0.18 * Math.exp(-(u - 0.55) / 0.12) * Math.sin(((u - 0.55) / 0.12) * 2.2) : 0)
}
/** How far the plate is pressed, 0 to 1. */
export function plateAt(t: number): number {
  let v = 0
  for (const bd of BOARDS) v += smooth(t, bd.t - 0.12, bd.t) - smooth(t, bd.off - 0.1, bd.off + 0.12)
  return Math.max(0, Math.min(1, v))
}

/** How far each suit is open: 0 worn, 1 fallen away. */
export const suitOf = (who: 'louise' | 'ian', t: number): number => Math.max(0, t - (who === 'louise' ? T.suit : T.ianSuit))

/** The glass's light, 0 dark to 1 full; the heptapods' white behind it follows it. */
export function wakeAt(t: number): number {
  if (t < T.kindle) return 0
  if (t < T.wake) return 0.15 * smooth(t, T.kindle, T.kindle + 0.45) + 0.25 * smooth(t, T.kindle + 0.45, T.wake + 0.2)
  let w = 0.4 + 0.6 * (1 - Math.exp(-(t - T.wake) / 0.45))
  // "Weapon" cools it; the bomb's session is a little lower.
  w -= 0.12 * smooth(t, T.weapon, T.weapon + 0.6) * (t < T.out + 1 ? 1 : 0)
  if (t >= T.bomb - 1) {
    w = 0.9 + 0.1 * Math.exp(-Math.max(0, t - T.slam) / 0.3) * (t >= T.slam ? 1 : 0)
    if (t >= T.blast) {
      // Broken: the white stays, but its light fails in steps (on the beats, and the long shard's chord), then the
      // rest of the glass goes and it comes in.
      const failing = [b(225.309), b(226.232), T.shard]
      let d = 0
      failing.forEach((ft, i) => {
        const u = t - ft
        if (u >= 0) d += 0.13 * (1 - 0.6 * Math.exp(-u / 0.12) * Math.cos(u * 40)) * (i === 2 ? 1.4 : 1)
      })
      w = 1 - d + 0.6 * smooth(t, T.flood, T.fog)
    }
  }
  return w
}

/** How much of the glass's light reaches a point of the chamber at `x`. */
export const lightAt = (x: number, t: number): number => Math.max(0, Math.min(1, wakeAt(t))) * (0.08 + 0.92 * Math.exp(-Math.max(0, GX - x) / 3.4))

/** The blast's flash, 0 to 1: white at once, held a moment, then going. */
export const flashAt = (t: number): number => {
  if (t < T.blast) return 0
  const u = t - T.blast
  return Math.min(1, u / 0.02) * (u < 0.12 ? 1 : Math.exp(-(u - 0.12) / 0.38))
}

export { smooth, lerp }
