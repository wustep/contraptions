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
 * left, and at its right end the glass, a wall of light standing from the floor to the dark overhead. Beyond the glass
 * is the heptapods' white: their fog, where they come and where their ink hangs. What is understood crosses the glass
 * and hangs, lit, in the dark over the humans' heads: the lexicon.
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

/** Where her centre is when she touches the glass, and when she stands on the board's plate. */
export const TOUCH = GX - R - 0.004
export const PLATE = 4.72
/**
 * Her board: a pale board on two short legs, hinged at its foot on the floor beside the plate. It lies flat until a
 * ball presses the plate, then flips up to stand facing the glass, and falls flat again after the ball steps off.
 */
export const BOARD = { x: 3.98, w: 0.9, h: 0.6, legs: 0.3 }
/** Where she stands to begin with (the threshold), where she comes to rest before the glass, and Ian beside her. */
export const THRESHOLD = 0
export const REST = 5.6
export const IAN_BY = -0.42

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
  /** The last: "weapon". */
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

/** The language: her board up (and what was on the glass lifts off, read) and her touch (and they answer). */
export const BOARDS: { t: number; who: 'louise' | 'ian' }[] = [
  { t: T.board0, who: 'louise' },
  { t: b(157.211), who: 'louise' },
  { t: b(164.792), who: 'louise' },
  { t: b(173.441), who: 'louise' },
  // Faster, fuller: Ian takes the plate, and she stays at the glass.
  { t: b(181.133), who: 'ian' },
  { t: b(185.08), who: 'ian' },
  { t: b(188.012), who: 'ian' },
  { t: b(190.943), who: 'ian' },
  { t: b(192.789), who: 'ian' },
  { t: b(194.81), who: 'ian' },
]

/** Her touches at the glass after the palm: each one is answered. */
export const TOUCHES: number[] = [b(161.025), b(169.61), b(177.186), b(181.133), b(182.149), b(185.08), b(188.012), b(189.005), b(190.943), b(192.789), T.weapon]

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
  /** When it lifts off, read, and where it goes to hang in the lexicon (index into LEXICON), or null (it stays). */
  lift: number | null
  slot: number
  /** Turned as it hangs, radians. */
  turn: number
}

/** Where each writes, beyond the glass: Abbott low and near, Costello high and further back. */
const SPOT: Record<Writer, Pt[]> = {
  abbott: [
    [9.35, -3.3],
    [8.75, -2.05],
    [9.05, -2.75],
    [8.85, -1.85],
  ],
  costello: [
    [13.3, -7.2],
    [13.7, -6.5],
    [13.0, -7.5],
    [13.6, -6.8],
  ],
}

/**
 * The lexicon: where each read logogram hangs in the dark over the chamber, and how big. The first near the glass and
 * large; the rest spreading back over the room and up into its height, smaller as they go, never two the same size.
 */
export const LEXICON: { c: Pt; R: number }[] = [
  { c: [5.35, -4.5], R: 0.98 },
  { c: [3.3, -5.6], R: 0.72 },
  { c: [1.45, -4.15], R: 0.84 },
  { c: [5.25, -6.95], R: 0.52 },
  { c: [-0.3, -5.75], R: 0.64 },
  { c: [2.35, -7.1], R: 0.46 },
  { c: [-1.95, -4.1], R: 0.7 },
  { c: [6.55, -5.95], R: 0.36 },
  { c: [0.55, -7.45], R: 0.42 },
  { c: [-2.1, -6.9], R: 0.52 },
  { c: [3.9, -7.9], R: 0.34 },
  { c: [-3.6, -5.4], R: 0.58 },
]

function writings(): Logo[] {
  const out: Logo[] = []
  let a = 0
  let c = 0
  let slot = 0
  const add = (born: number, who: Writer, form: number, R: number, seed: number, turn: number) => {
    const spot = who === 'abbott' ? SPOT.abbott[a++ % SPOT.abbott.length] : SPOT.costello[c++ % SPOT.costello.length]
    out.push({ seed, born, form, who, c: spot, R, lift: null, slot: -1, turn })
  }
  // The first: Abbott, after the palm, big and slow.
  add(T.first, 'abbott', 2.3, 1.5, 1014, 0)
  // The slow exchange: Abbott answers each of her touches.
  add(TOUCHES[0], 'abbott', 1.9, 1.3, 1021, 0.4)
  add(TOUCHES[1], 'abbott', 1.8, 1.25, 1042, -0.3)
  add(TOUCHES[2], 'abbott', 1.6, 1.3, 1063, 0.9)
  // Faster, fuller: Costello writes too.
  add(TOUCHES[3], 'costello', 1.3, 1.1, 1077, 0.2)
  add(TOUCHES[4], 'abbott', 1.2, 1.2, 1091, -0.6)
  add(TOUCHES[5], 'costello', 1.1, 1.05, 1105, 1.1)
  add(TOUCHES[6], 'abbott', 1.0, 1.2, 1112, 0.5)
  add(TOUCHES[7], 'costello', 0.9, 1.0, 1126, -0.2)
  add(TOUCHES[8], 'abbott', 0.9, 1.15, 1133, 0.8)
  add(TOUCHES[9], 'costello', 0.9, 1.05, 1147, -0.9)
  // Each board lifts off whatever has closed on the glass: read.
  for (const board of BOARDS) {
    for (const l of out) {
      if (l.lift !== null || l.born + l.form > board.t - 0.05) continue
      l.lift = board.t
      l.slot = slot++
    }
  }
  return out
}
export const LOGOS: Logo[] = writings()

/** "Weapon": the conversation's last logogram, a ring with a hard spike flung out, low on the glass before her. */
export const WEAPON = { seed: 1168, born: T.weapon, form: 0.3, c: [8.95, -1.45] as Pt, R: 0.98 }

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
  const x = lerp(14.4, 12.3, come) + 3.4 * reel
  const fog = Math.min(0.96, lerp(0.95, 0.2, come) + 0.7 * reel)
  const agitated = t > T.bomb - 1 && t < T.blast ? 0.06 * Math.sin((t - T.bomb) * 5.3) : 0
  return { x, y: 1.35, s: 8.0, fog, lean: agitated + 0.55 * reel * (1 - 0.3 * reel), alpha: loom * (1 - 0.55 * reel) }
}
export function costello(t: number): Stand {
  const come = smooth(t, T.costello - 0.2, T.costello + 3.3)
  const loom = smooth(t, T.costello - 0.1, T.costello + 0.9)
  const back = smooth(t, T.blast, T.blast + 3)
  return { x: lerp(18.8, 16.9, come) + 1.8 * back, y: 2.0, s: 8.6, fog: Math.min(0.95, lerp(0.95, 0.4, come) + 0.4 * back), lean: -0.05, alpha: loom * (1 - 0.5 * back) }
}

/* ------------------------------------------------------------------ her path, and Ian's */

const toSegs = (ways: Way[]): Seg[] => route(ways)
const at = (t: number, x: number, ease?: Seg['ease'], y = 0): Way => ({ at: t, p: [x, y], ease })

/** A little back from the glass and in again, touching on `t`. */
function tapWays(ways: Way[], taps: number[], from: number): void {
  let last = from
  for (const t of taps) {
    const gap = t - last
    const back = Math.min(0.5, 0.18 + 0.12 * gap)
    const mid = t - Math.min(gap * 0.5, 1.1)
    ways.push(at(Math.max(last + 0.25, mid), TOUCH - back, 'inout'))
    ways.push(at(t, TOUCH, 'in'))
    last = t
  }
}

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
  // The suit falls away; she goes to the glass alone.
  w.push(at(b(146.141), PLATE))
  w.push(at(T.palm, TOUCH, 'inout'))
  // The palm: she stays pressed to it, easing and pressing again; the first logogram: she draws back to see it.
  w.push(at(T.palm + 1.6, TOUCH - 0.05, 'inout'))
  w.push(at(b(152.062), TOUCH, 'inout'))
  w.push(at(b(154.059), TOUCH - 0.42, 'inout'))
  w.push(at(b(155.109), TOUCH - 0.46, 'inout'))
  // The exchange, on the chords: back to the plate (her board), forward to the glass (their answer).
  const legs: [number, number, number][] = [
    [b(155.109), BOARDS[1].t, PLATE],
    [b(158.134), TOUCHES[0], TOUCH],
    [b(162.029), BOARDS[2].t, PLATE],
    [b(165.692), TOUCHES[1], TOUCH],
    [b(170.62), BOARDS[3].t, PLATE],
    [b(174.428), TOUCHES[2], TOUCH],
  ]
  for (const [a, t, x] of legs) {
    if (w[w.length - 1].at < a - 1e-6) w.push(at(a, w[w.length - 1].p[0]))
    w.push(at(t, x, 'inout'))
  }
  // Faster: she stays at the glass, touching, and Ian works the board.
  tapWays(w, TOUCHES.slice(3), TOUCHES[2])
  // "Weapon": its spike strikes the glass before her face and she is pushed back; she comes to rest before it.
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
  w.push(at(b(143.215), 3.2, 'inout'))
  // She has taken her suit off: he starts after her, and stops.
  w.push(at(T.suit + 0.3, 3.2))
  w.push(at(T.suit + 1.3, 3.42, 'out'))
  w.push(at(T.ianSuit - 0.4, 3.3, 'inout'))
  w.push(at(T.ianSuit + 1.2, 3.22, 'inout'))
  // Behind her board while she works it, drifting a little.
  w.push(at(b(166.615), 3.1, 'inout'))
  w.push(at(b(174.428), 3.22, 'inout'))
  // He takes the plate: on it for each of his boards, off it between.
  const ian = BOARDS.filter((x) => x.who === 'ian').map((x) => x.t)
  w.push(at(b(178.149), 3.22))
  let last = b(178.149)
  for (const t of ian) {
    const off = PLATE - 0.34
    const mid = t - Math.min((t - last) * 0.5, 0.9)
    if (last !== b(178.149)) w.push(at(Math.max(last + 0.3, mid), off, 'inout'))
    w.push(at(t, PLATE, 'inout'))
    last = t
  }
  // After "weapon": he comes to her side.
  w.push(at(T.weapon + 0.4, PLATE))
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
  thrown(w, REST - 0.1, T.blast, [-4.6, -4.4], [-2.4, -1.8], T.shard)
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
  thrown(w, x0 - 0.1, T.blast, [-7.4, -5], [-4, -2.4], T.shard - 0.5)
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
 * The board's flip: 0 lying flat, 1 standing (a little past on the way up, and a bounce when it falls). It stands when a
 * ball lands on the plate and falls after the ball steps off.
 */
export function flipAt(t: number): number {
  let v = 0
  for (const bd of BOARDS) {
    v += step(t - bd.t, 9, 0.38)
    v -= fall(t - plateLeft(bd))
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
/** When the ball that pressed the plate for this board steps off it. */
function plateLeft(bd: { t: number; who: 'louise' | 'ian' }): number {
  const next = BOARDS.find((x) => x.t > bd.t + 1e-6)
  if (bd.who === 'louise') {
    // She leaves for the glass about a beat later.
    if (bd.t === T.board0) return b(146.141) + 0.2
    return bd.t + 1.05
  }
  return next ? Math.min(next.t - 0.75, bd.t + 1.0) : bd.t + 1.3
}
/** How far the plate is pressed, 0 to 1. */
export function plateAt(t: number): number {
  let v = 0
  for (const bd of BOARDS) {
    const off = plateLeft(bd)
    v += smooth(t, bd.t - 0.12, bd.t) - smooth(t, off - 0.1, off + 0.12)
  }
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

/** The blast's flash, 0 to 1. */
export const flashAt = (t: number): number => (t < T.blast ? 0 : Math.min(1, (t - T.blast) / 0.04) * Math.exp(-(t - T.blast) / 0.42))

export { smooth, lerp }
