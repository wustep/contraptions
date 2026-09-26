import type p5 from 'p5'
import { mixHex, R, type Pt, type Seg } from '../../../../../parts'
import { drawBomber, drawWarship, drawWings } from '../cast'
import { alpha, box, carried, frame, hash, part, smooth, type Company, type PartShot } from '../kit'
import { bar, downbeats, onset, SEAM } from '../music'
import { SEAMS } from '../seams'
import { HOUSES, outside, RAID_AT, TOWN_AT } from '../town/town'
import { HOWL_BIRD, TOWN, WASTES } from '../worlds'
import { ash, beam, bomb, embers, fire, flak, glow, rgba, skyGlow, smoke, sparks, wobble, type Smoke } from './raid-fx'

/**
 * The town at war (205.86 → 237.0): the war builder's.
 *
 * Night. The hat shop's street, the one Sophie walked out of at dawn, under the bombers. She comes out of the shop's
 * door hurrying to the street's fire engine (a hand pump on two wheels) and works it through the raid: the war comes
 * down over her, low over the roofs, and the camera cuts between the sky's events and her answering them (event, then
 * reaction, on the downbeats), out to a wide only for the tear and the warship's end. She is the war's hero: she
 * glances up, ducks, freezes and is blown back, lit warm by the fire in the crater against a wall kept dark.
 *
 *   the build (quickening, bars of 1.4 → 1.2 s)
 *   205.86   out of the door into the street, a bomb bursting far off as she steps out; she hurries to the engine, a
 *            footfall a beat, and meets its push bar on 208.61
 *   208.61   → 215.92: she pushes it up the street toward the fires, a push a beat, and stops it; behind her the lights
 *            of the houses go out, a house a beat (208.61 → 210.81); the far warship's stick bursts beyond the roofs
 *   212.99   Howl comes in out of the dark and tears through the lead bomber (212.99, 213.20); it falls burning
 *            beyond the roofs (214.67); a searchlight from the street's far end finds him low over the roofs across
 *            from her (215.29), flak beside him; she stops the engine and glances up at him (a hop back, 216.78)
 *   217.62   a bomber dives low along the street at her and, pulling up, tosses its bomb on the downbeat: she darts
 *            back behind the engine's end
 *   218.42   Howl strikes it aside with his wing right over her head; it bursts in the street further up (218.88) and
 *            she ducks, a short skid back
 *   the waltz again, loud (bars of 1.1 s)
 *   220.11   the fire in the crater takes the house behind it; she steps up to the engine and springs onto its brake
 *   221.51   she lands on it as the great warship's bay opens over the far roofs, and freezes there a bar, looking up
 *   222.65   → 230.38: she pumps, a stroke a bar: down on the one with her weight (a pulse of water over onto the fire,
 *            steam off it, the crater's fire dying back), the brake springing back up by the three and throwing her
 *            up off it; over her the great warship's bay opens (221.51) and its stick walks down the roofs toward the
 *            shop, a bomb a downbeat (222.65 → 228.19); Howl strikes its bow (225.24), tears at its bay (229.63)
 *   230.75   flak throws him: she steps down off the brake (230.75 → 231.10)
 *   231.81   he goes into the bay from below and it blows, and the blast throws her back a step; again (232.15): the
 *            second wide; the ship climbs away burning, he goes up after it
 *   232.15   she runs home: a footfall a beat, slowing into the doorway, at rest inside it at 237.0 (the cut to the
 *            castle's room)
 *
 * Frame: the town's, moved to `RAID_AT` (the street just outside the shop's door). The houses across the street and
 * the shop are the town builder's (`town.ts`: this part reads its `HOUSES` so the fires are in their roofs and
 * windows); everything here is the war's and is drawn only in this slot.
 */

/* ------------------------------------------------------------------ the clock */

const B = SEAM.raid
const E = SEAM.hearth
const b = (n: number, pos = 1) => bar('build', n, pos)
const r = (n: number, pos = 1) => bar('return', n, pos)
/** The measured onset nearest `t` (at least 0.2 strong): every time below is the recording's own, never rounded. */
const at = (t: number) => onset(t, 0.2)

/** The burst far off that greets her at the door. */
const DOOR_BURST = b(5)
/** Bombs beyond the roofs while she is in the street close: their flashes light it. */
const FAR_FLASHES = [at(207.662), at(208.022)]
/** The street's lights go out, a house a beat, from the one across from the shop outward. */
const BLACKOUT = [b(7), b(7, 2), b(7, 3), b(8), b(8, 2), b(8, 3)]
/** The far warship's stick of bombs, bursting beyond the roofs. */
const FAR_STICK = [b(9), b(9, 2), b(9, 3)]
/** Howl tears through the lead bomber, and it falls burning beyond the roofs. */
const TEAR = [at(212.985), at(213.2)] as const
const CRASH = b(11, 3)
/** A searchlight finds him; flak beside him. */
const CAUGHT = at(215.29)
/** The bomber's bomb: let go low over the street on the downbeat, struck aside, bursting in the street. */
const RELEASE = b(14)
const TURNED = at(218.424)
const STREET = b(15)
/** The fire in the crater takes the house behind it. */
const CATCH = at(220.114)
/** The great warship's bay opens, and it lays its stick down the roofs a bomb a bar. */
const BAY_OPEN = r(2)
const STICK = [r(3), r(4), r(5), r(6), r(7), r(8)]
/** Howl and the ship. */
const BOW = at(225.239)
const DOORS = at(229.628)
const FLUNG = at(230.748)
const BLOWN = at(231.805)
const AGAIN = at(232.153)

/* ------------------------------------------------------------------ the street */

/** The town set's origin in this frame. */
const OX = RAID_AT[0]
const GROUND = TOWN_AT.ground
/** Where she is at rest inside the door at the cut. */
const INSIDE: Pt = [TOWN_AT.wall[0] - OX - 0.5, 0]
/** Where the street ends (the alley's mouth): past it the set has only sky, and here the town beyond is burning. */
const STREET_END = TOWN_AT.street[1] - OX

interface Window {
  x: number
  y: number
  w: number
  h: number
  /** Lit when the war comes (the set's own choice, followed here), and a dormer's (no mullions). */
  lit: boolean
  dormer: boolean
  /** How long after the house is hit the fire reaches it (top down). */
  delay: number
  /** Directly behind where she stands and pumps: it only ever smoulders, so she is never a pale dot on lit glass. */
  hush: boolean
}
interface Front {
  x0: number
  x1: number
  xc: number
  eaves: number
  ridge: number
  windows: Window[]
}

/** The stretch of the street's wall behind her from the burst to the ship's end (she ducks, climbs and pumps there). */
const HUSH: [number, number] = [3.0, 6.6]
/**
 * The houses across the street, as the town set draws them, in this frame: their roofs and every window, and which
 * windows the set lights at night (`town.ts` lights an upper window when hash(house + 20, window) > 0.3, the ground
 * floor's when hash(house + 30, 1) > 0.4, and every dormer). The blackout and the fires are drawn over them.
 */
const FRONTS: Front[] = HOUSES.map((h, i) => {
  const eaves = h.floors[h.floors.length - 1]
  const top = h.floors.length - 2
  const windows: Window[] = h.wins.map((w, j) => {
    const floor = h.floors.findIndex((f) => f < w.y + w.h + 0.6) - 1
    return { x: w.x - OX, y: w.y, w: w.w, h: w.h, lit: hash(i + 20, j) > 0.3, dormer: false, delay: 0.3 + 0.7 * (top - floor), hush: false }
  })
  const gx = h.door > h.x0 + h.w / 2 ? h.x0 + 0.35 : h.x0 + h.w - 1.05
  if (gx + 0.7 < h.x0 + h.w && gx > h.x0)
    windows.push({ x: gx - OX, y: GROUND - 2.1, w: 0.7, h: 1.2, lit: hash(i + 30, 1) > 0.4, dormer: false, delay: 0.3 + 0.7 * (top + 1), hush: gx - OX + 0.35 > HUSH[0] && gx - OX + 0.35 < HUSH[1] })
  if (h.w > 2.6) {
    const dy = eaves + (h.ridge - eaves) * 0.42
    windows.push({ x: h.x0 + h.w / 2 - 0.18 - OX, y: dy + 0.05, w: 0.36, h: 0.45, lit: true, dormer: true, delay: 0, hush: false })
  }
  return { x0: h.x0 - OX, x1: h.x0 + h.w - OX, xc: h.x0 + h.w / 2 - OX, eaves, ridge: h.ridge, windows }
})
/** The night's glass of a dark window, as the set tones it (its night shade, `toner` in `town.ts`). */
const SHADE = mixHex(TOWN.night, '#3A3052', 0.35)
const DARK_GLASS = mixHex(mixHex(TOWN.slateDark, TOWN.canal, 0.25), SHADE, 0.68)
const DARK_DORMER = mixHex(mixHex(TOWN.slateDark, TOWN.canal, 0.3), SHADE, 0.68)
/** Where a bomb comes through a roof: over the house's middle, down a little from the ridge. */
const roofOf = (j: number): Pt => {
  const f = FRONTS[j]
  return [f.xc, f.ridge + 0.38 * (f.eaves - f.ridge)]
}

/* ------------------------------------------------------------------ motion */

interface Key {
  t: number
  p: Pt
  /** Velocity at the key (cells a second); left out, it is the one the keys either side give. */
  v?: Pt
  /** A different velocity leaving the key: a blow, sharp. */
  out?: Pt
}

/** A path through timed keys, cubic between them (Hermite), with its velocity: smooth, except where a key says `out`. */
function path(keys: Key[]): (t: number) => { p: Pt; v: Pt } {
  const n = keys.length
  const vin: Pt[] = []
  const vout: Pt[] = []
  for (let i = 0; i < n; i++) {
    let v = keys[i].v
    if (!v) {
      const a = keys[Math.max(0, i - 1)]
      const c = keys[Math.min(n - 1, i + 1)]
      const dt = Math.max(1e-6, c.t - a.t)
      v = [(c.p[0] - a.p[0]) / dt, (c.p[1] - a.p[1]) / dt]
    }
    vin.push(v)
    vout.push(keys[i].out ?? v)
  }
  return (t) => {
    if (t <= keys[0].t) {
      const d = t - keys[0].t
      return { p: [keys[0].p[0] + vout[0][0] * d, keys[0].p[1] + vout[0][1] * d], v: vout[0] }
    }
    if (t >= keys[n - 1].t) {
      const d = t - keys[n - 1].t
      return { p: [keys[n - 1].p[0] + vin[n - 1][0] * d, keys[n - 1].p[1] + vin[n - 1][1] * d], v: vin[n - 1] }
    }
    let i = 0
    while (i + 1 < n && keys[i + 1].t <= t) i++
    const a = keys[i]
    const c = keys[i + 1]
    const H = c.t - a.t
    const u = (t - a.t) / H
    const u2 = u * u
    const u3 = u2 * u
    const m0 = vout[i]
    const m1 = vin[i + 1]
    const h00 = 2 * u3 - 3 * u2 + 1
    const h10 = u3 - 2 * u2 + u
    const h01 = -2 * u3 + 3 * u2
    const h11 = u3 - u2
    const d00 = (6 * u2 - 6 * u) / H
    const d10 = 3 * u2 - 4 * u + 1
    const d01 = (-6 * u2 + 6 * u) / H
    const d11 = 3 * u2 - 2 * u
    const p: Pt = [h00 * a.p[0] + h10 * H * m0[0] + h01 * c.p[0] + h11 * H * m1[0], h00 * a.p[1] + h10 * H * m0[1] + h01 * c.p[1] + h11 * H * m1[1]]
    const v: Pt = [d00 * a.p[0] + d10 * m0[0] + d01 * c.p[0] + d11 * m1[0], d00 * a.p[1] + d10 * m0[1] + d01 * c.p[1] + d11 * m1[1]]
    return { p, v }
  }
}

/** A step from 0 to 1 at `s` = 0, critically damped: sharp, no overshoot. */
const step = (s: number, tau = 0.04): number => (s <= 0 ? 0 : 1 - Math.exp(-s / tau) * (1 + s / tau))
/** A damped shake after `s` = 0. */
const ring = (s: number, a: number, w: number, tau: number): number => (s <= 0 ? 0 : a * Math.exp(-s / tau) * Math.sin(w * s))

/** How many bars in (build and return downbeats), fractional: what the great ship's oars beat to. */
const ONES = [...downbeats('build', 1, 15), ...downbeats('return', 1, 17)]
function bars(t: number): number {
  if (t <= ONES[0]) return (t - ONES[0]) / 1.35
  for (let i = 0; i + 1 < ONES.length; i++) if (t < ONES[i + 1]) return i + (t - ONES[i]) / (ONES[i + 1] - ONES[i])
  return ONES.length - 1 + (t - ONES[ONES.length - 1]) / 1.1
}

const G = 12
const fallFrom = (p0: Pt, v0: Pt, u: number): Pt => [p0[0] + v0[0] * u, p0[1] + v0[1] * u + 0.5 * G * u * u]

/* ------------------------------------------------------------------ the far warship and its stick */

/** The far warship: small and hazed, crossing right to left over the roofs through the build. */
const W1 = { y: -14.0, s: 1.1, v: -2.4 }
const w1x = (t: number) => 10.5 + W1.v * (t - 210.257)
const W1_FALL = 0.78
/** Where its stick comes down, beyond the low roof in the middle of the row. */
const FAR_Y = -8.8
const farBombs = FAR_STICK.map((land) => {
  const rel = land - W1_FALL
  const p0: Pt = [w1x(rel) - 0.1, W1.y + 0.5]
  const xL = p0[0] + W1.v * W1_FALL
  const v0: Pt = [W1.v, (FAR_Y - p0[1] - 0.5 * G * W1_FALL * W1_FALL) / W1_FALL]
  return { rel, land, p0, v0, xL }
})

/* ------------------------------------------------------------------ the bombers */

/**
 * The flight comes in low, but over the roofs, never in front of them: the camera looks up at it from the street (a
 * frame of sky with the roofline along its foot), so each bomber is a black shape against the fire-lit smoke.
 */
const LOW = 0.4
/** A flight of four coming in low from the right: [x at 207, height, phase]. */
const FLIGHT: [number, number, number][] = [
  [25.5, -12.0 + LOW, 0],
  [28.2, -13.0 + LOW, 1.3],
  [32.7, -11.8 + LOW, 2.1],
  [35.0, -12.8 + LOW, 0.7],
]
const FLIGHT_V = -2.2
const BOMBER_SIZE = 2.1
/** The fleet against the burning sky: nearly black, a breath of the iron's blue in it. */
const FLEET_DARK = mixHex('#0F0D16', WASTES.warship, 0.16)
const inFormation = (i: number, t: number): Pt => [FLIGHT[i][0] + FLIGHT_V * (t - 207), FLIGHT[i][1] + 0.22 * Math.sin(1.4 * t + FLIGHT[i][2])]

/** The lead bomber after Howl tears it: knocked over, spinning, trailing smoke, down beyond the roofs. */
const LEAD_DOWN: Pt = [13.6, -7.3]
const leadFall = (() => {
  const [x0, y0] = inFormation(0, TEAR[1])
  const T = CRASH - TEAR[1]
  const vx = (LEAD_DOWN[0] - x0) / T
  const vy = -0.4
  const g = (2 * (LEAD_DOWN[1] - y0 - vy * T)) / (T * T)
  return (t: number): { p: Pt; ang: number } => {
    const u = Math.max(0, t - TEAR[1])
    return { p: [x0 + vx * u, y0 + vy * u + 0.5 * g * u * u], ang: 0.4 * u + 1.1 * u * u }
  }
})()

/**
 * The third bomber's dive on the street: out of the flight, down low along the street at her (into her frame whole,
 * from the right, never a wing cut by its top), and pulling up it tosses its bomb at her (let go climbing, so it arcs
 * up a little before it falls), and climbs away to the left.
 */
const DIVE = path([
  { t: 207, p: inFormation(2, 207), v: [FLIGHT_V, 0] },
  { t: 215.6, p: inFormation(2, 215.6), v: [FLIGHT_V, 0.2] },
  { t: 216.9, p: [12.8, -4.3], v: [-5.4, 3.0] },
  { t: 217.3, p: [9.2, -2.75], v: [-5.8, 0.4] },
  { t: RELEASE, p: [7.1, -3.3], v: [-3.4, -2.2] },
  { t: 218.2, p: [5.3, -6.0], v: [-2.8, -4.6] },
  { t: 219.3, p: [2.5, -10.6], v: [-2.5, -3.6] },
  { t: 220.5, p: [-1.6, -14.6], v: [-4.0, -2.4] },
  { t: 222.5, p: [-10.5, -17.2], v: [-4.5, -0.6] },
])

/** Where each bomber is, and how it leans, at `t` (null once it is gone). */
function bomber(i: number, t: number): { p: Pt; ang: number; burning?: boolean } | null {
  if (i === 0) {
    if (t < TEAR[1]) return { p: inFormation(0, t), ang: 0.03 * Math.sin(t * 1.7) }
    if (t > CRASH) return null
    const f = leadFall(t)
    return { p: f.p, ang: f.ang, burning: true }
  }
  if (i === 2) {
    const d = DIVE(t)
    // Facing left, a dive tips its nose down: anticlockwise on the screen.
    return { p: d.p, ang: -0.8 * Math.atan2(d.v[1], -d.v[0]) }
  }
  return { p: inFormation(i, t), ang: 0.03 * Math.sin(t * 1.5 + i) }
}

/* ------------------------------------------------------------------ the bomb Howl turns aside */

const BOMB_FROM: Pt = [DIVE(RELEASE).p[0], DIVE(RELEASE).p[1] + 0.14]
const BOMB_V: Pt = [DIVE(RELEASE).v[0], DIVE(RELEASE).v[1]]
/** Where it is when his wing meets it. */
const STRUCK = fallFrom(BOMB_FROM, BOMB_V, TURNED - RELEASE)
/** Where it comes down in the street, and the kick his wing gives it to get there. */
const CRATER: Pt = [10.4, 0.05]
const KICK: Pt = (() => {
  const T = STREET - TURNED
  return [(CRATER[0] - STRUCK[0]) / T, (CRATER[1] - STRUCK[1] - 0.5 * G * T * T) / T]
})()
function theBomb(t: number): { p: Pt; ang: number } | null {
  if (t < RELEASE || t >= STREET) return null
  if (t < TURNED) {
    const u = t - RELEASE
    return { p: fallFrom(BOMB_FROM, BOMB_V, u), ang: Math.atan2(BOMB_V[1] + G * u, BOMB_V[0]) }
  }
  const u = t - TURNED
  // Struck, it tumbles.
  return { p: fallFrom(STRUCK, KICK, u), ang: Math.atan2(KICK[1] + G * u, KICK[0]) + 7 * u }
}

/* ------------------------------------------------------------------ the great warship */

/**
 * The great warship over the roofs through the waltz: its keel's height and size. High enough that, looking up from
 * the street, the whole of it (mast to oars) stands clear over the roofline, the hat shop's tall gable too, black
 * against the burning sky; its stick takes a second to come down through the roofs.
 */
const SHIP_LOW = -1.8
const W2 = { y: -14.2 + SHIP_LOW, s: 2.4 }
/** Its bomb bay, in the drawing's own units (before it is turned to face left): the opening's middle and half-width. */
const BAY = { x: 0.2, y: 0.36, w: 0.34 }
/** The stick: the roofs across the street, from the far end to the one across from the shop, a bomb a bar. */
const STICK_ROOFS: Pt[] = [5, 4, 3, 2, 1, 0].map(roofOf)
const STICK_FALL = 1.0
/** The ship is over each roof (a little past it: the bombs keep its way) as it lets that one go. */
const W2X = path([
  { t: 214.5, p: [55, 0], v: [-6.6, 0] },
  { t: 218.9, p: [30.5, 0], v: [-5.0, 0] },
  { t: STICK[0] - STICK_FALL, p: [STICK_ROOFS[0][0] + 1.88, 0], v: [-2.7, 0] },
  { t: STICK[5] - STICK_FALL, p: [STICK_ROOFS[5][0] + 1.88, 0], v: [-2.0, 0] },
  { t: DOORS, p: [0.4, 0], v: [-0.8, 0] },
  { t: BLOWN, p: [-0.8, 0], v: [-0.4, 0] },
  { t: 238, p: [-2.5, 0], v: [-0.25, 0] },
])
/** How the ship rides: its origin, its roll (radians, nose up +), and its drawing's clock (the oars beat a bar). */
function ship(t: number): { x: number; y: number; roll: number; oars: number } {
  const x = W2X(t).p[0]
  const shake = ring(t - BOW, 0.04, 16, 0.4) + ring(t - DOORS, 0.03, 18, 0.35)
  const lurch = 0.45 * step(t - BLOWN, 0.05) * Math.exp(-Math.max(0, t - BLOWN) / 0.6)
  const climb = 12 * Math.pow(smooth(t, BLOWN + 0.3, BLOWN + 4.6), 1.2)
  const y = W2.y + 0.14 * Math.sin(t * 0.9) + lurch - climb
  const roll = 0.012 * Math.sin(t * 0.7) + shake + 0.16 * smooth(t, BLOWN, BLOWN + 1.6) + ring(t - BLOWN, 0.05, 11, 0.5)
  // The oars' clock: one stroke a bar, the bow's stroke down on the one.
  const oars = (2 * Math.PI * bars(t) + Math.PI / 2) / 2.2
  return { x, y, roll, oars }
}
/** A point of the ship's own (drawing units, as it is drawn before facing left) in this frame. */
function onShip(t: number, lx: number, ly: number): Pt {
  const s = ship(t)
  const x = -lx * W2.s
  const y = ly * W2.s
  const c = Math.cos(s.roll)
  const n = Math.sin(s.roll)
  return [s.x + x * c - y * n, s.y + x * n + y * c]
}
const shipPt = (t: number, lx: number, ly: number, dx = 0, dy = 0): Pt => {
  const [x, y] = onShip(t, lx, ly)
  return [x + dx, y + dy]
}
/** How open its bay doors are (0 shut, 1 hanging): they swing open on the waltz's second downbeat. */
const bayOpen = (t: number) => step(t - BAY_OPEN, 0.07) + ring(t - BAY_OPEN, 0.12, 13, 0.3)

/** Each of the stick's bombs: out of the bay and down through its roof, on its downbeat. */
const stickBombs = STICK.map((land, i) => {
  const rel = land - STICK_FALL
  const p0 = onShip(rel, BAY.x, BAY.y + 0.05)
  const [xL, yL] = STICK_ROOFS[i]
  const v0: Pt = [(xL - p0[0]) / STICK_FALL, (yL - p0[1] - 0.5 * G * STICK_FALL * STICK_FALL) / STICK_FALL]
  return { rel, land, p0, v0 }
})

/* ------------------------------------------------------------------ fires */

/** When each house across the street is hit, and so burns: the stick's bombs, from the far end to the shop's. */
const HIT: number[] = FRONTS.map((_, j) => STICK[5 - j])
/** The house behind the crater: its ground floor takes fire from the street first. */
const CRATER_HOUSE = FRONTS.findIndex((f) => CRATER[0] >= f.x0 && CRATER[0] < f.x1)

interface Site {
  /** The flames' base: its middle, and its width. */
  x: number
  y: number
  w: number
  /** When it flares (the strike), how tall the flare is, and how tall it burns after. */
  t: number
  flare: number
  burn: number
  seed: number
  /** Beyond the roofs: dimmer, hazed. */
  far?: boolean
  /** Already burning when we come (the raid began before). */
  before?: boolean
  /** The house across the street it burns in (`FRONTS`): the stick's roofs. */
  house?: number
}

const SITES: Site[] = [
  // Burning beyond the roofs when she comes out: the raid began before.
  { x: 0.9, y: -8.4, w: 1.4, t: 196, flare: 1.2, burn: 0.9, seed: 1, far: true, before: true },
  // The far stick.
  ...farBombs.map((fb, i): Site => ({ x: fb.xL, y: FAR_Y, w: 1.3, t: fb.land, flare: 2.0, burn: 0.75, seed: 10 + i, far: true })),
  // The lead bomber, down beyond the roofs.
  { x: LEAD_DOWN[0], y: LEAD_DOWN[1], w: 1.4, t: CRASH, flare: 2.2, burn: 0.9, seed: 20, far: true },
  // The great ship's stick through the roofs across the street.
  ...STICK_ROOFS.map(([x, y], i): Site => ({ x, y, w: 1.35, t: STICK[i], flare: 2.8, burn: 1.15, seed: 30 + i, house: 5 - i })),
]

/** How tall a site's flames are at `t`: nothing before its flare, up at once, settling, and growing as it burns. */
function flames(s: Site, t: number): number {
  if (s.before) return s.burn * (0.9 + 0.1 * wobble(t * 0.7, s.seed))
  const u = t - s.t
  if (u < 0) return 0
  const settle = s.burn + (s.flare - s.burn) * Math.exp(-u / 0.7)
  return step(u, 0.05) * settle * (1 + 0.25 * smooth(u, 2, 14))
}

/** Each site's smoke. */
const SMOKES: Smoke[] = SITES.map((s) => ({
  x: s.x,
  y: s.y - 0.4,
  t0: s.before ? s.t : s.t + 0.05,
  rate: s.far ? 3.2 : 4.5,
  rise: s.far ? 1.1 : 1.35,
  wind: 0.16,
  size: s.far ? 0.62 : 0.75,
  life: s.far ? 7 : 7.5,
  seed: s.seed,
  // Beyond the roofs the smoke stands dark against the burning sky; over the street's roofs it is lit from the fire.
  lit: s.far ? 0.4 : 0.7,
  a: s.far ? 0.32 : 0.42,
}))

/** The crater's smoke, after the street burst. */
const CRATER_SMOKE: Smoke = { x: CRATER[0], y: GROUND - 0.3, t0: STREET, rate: 5.5, rise: 1.5, wind: 0.14, size: 0.7, life: 7.5, seed: 50, lit: 0.8, a: 0.44 }
/** The lead bomber's trail as it falls. */
const LEAD_TRAIL: Smoke = {
  x: 0,
  y: 0,
  t0: TEAR[1],
  t1: CRASH,
  rate: 14,
  rise: 0.35,
  wind: 0.05,
  size: 0.24,
  life: 3.5,
  seed: 60,
  lit: 0.4,
  a: 0.5,
  at: (t) => leadFall(t).p,
}
/** The ship's wound: smoke from its bay once it has blown, trailing as it climbs away. */
const SHIP_TRAIL: Smoke = {
  x: 0,
  y: 0,
  t0: BLOWN,
  rate: 12,
  rise: 0.25,
  wind: 0.08,
  size: 0.6,
  life: 4.5,
  seed: 70,
  lit: 0.8,
  a: 0.5,
  at: (t) => onShip(t, BAY.x, BAY.y),
}

/**
 * The street's debris: broken cobbles and roof slate thrown by the burst, landing, and lying where they fall. Dark,
 * flat and sharp-cornered, never round or pale (a pale lump on the cobbles reads as another ball), and all of it lands
 * well up the street from her: the few thrown toward the shop fall short, a cell and more from the engine.
 */
const CHIPS = Array.from({ length: 12 }, (_, i) => {
  const back = i < 3
  const reach = back ? 0.7 + 1.1 * hash(i, 2, 91) : 0.9 + 3.6 * hash(i, 2, 91)
  const vy = -(3.2 + 4.6 * hash(i, 3, 91))
  const T = (-2 * vy) / G
  const size = 0.08 + 0.09 * hash(i, 4, 91)
  // An irregular flat shard: four or five corners, longer than it is tall.
  const corners = hash(i, 6, 91) < 0.5 ? 4 : 5
  const shape: Pt[] = Array.from({ length: corners }, (_, c) => {
    const a = (2 * Math.PI * (c + 0.35 * hash(i, 10 + c, 91))) / corners
    const r = size * (0.65 + 0.45 * hash(i, 20 + c, 91))
    return [r * 1.5 * Math.cos(a), r * 0.7 * Math.sin(a)]
  })
  return { vx: ((back ? -1 : 1) * reach) / T, vy, T, size, shape, spin: (hash(i, 5, 91) - 0.5) * 14, rest: (hash(i, 7, 91) - 0.5) * 0.5 }
})
/** Rubble's colour: the cobbles' dark in the night, darker than the street it lies on. */
const RUBBLE = mixHex(TOWN.cobbleDark, TOWN.night, 0.72)
function shard(p: p5, k: number, shape: Pt[]): void {
  p.beginShape()
  for (const [x, y] of shape) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ Howl */

/** Howl the bird, from out of the dark over the roofs to up into the smoke after the ship. */
const HOWL_KEYS: Key[] = [
  { t: 212.15, p: [27.0, -16.2 + LOW], v: [-11, 3.0] },
  { t: TEAR[0], p: [inFormation(0, TEAR[0])[0] + 0.75, inFormation(0, TEAR[0])[1] + 0.05], v: [-8.5, 0.7] },
  { t: TEAR[1], p: [inFormation(0, TEAR[1])[0] - 0.95, inFormation(0, TEAR[1])[1] + 0.1], v: [-8.0, -0.3], out: [-5.5, -4.2] },
  // Over the roofs across from her, two cells over the tallest ridge, where the searchlight finds him against the
  // burning sky.
  { t: b(11), p: [8.6, -13.0], v: [-2.8, -0.6] },
  { t: 214.6, p: [7.0, -12.9], v: [-0.6, 0.2] },
  { t: CAUGHT, p: [7.4, -12.5], v: [1.2, 0.5] },
  { t: b(12, 3), p: [8.3, -12.2], v: [1.2, 0.4], out: [-0.8, 3.0] },
  { t: 216.573, p: [7.5, -10.9], v: [-1.4, 1.2] },
  // He stoops on the diving bomber, down past the eaves into the street, and meets its bomb over her head.
  { t: 217.15, p: [5.4, -7.6], v: [-3.0, 5.8] },
  { t: RELEASE, p: [3.3, -4.0], v: [0.2, 5.0] },
  { t: TURNED, p: [STRUCK[0] - 0.26, STRUCK[1] - 0.1], v: [3.0, 5.6], out: [5.5, -5.5] },
  { t: 219.3, p: [9.0, -6.6], v: [3.6, -3.4] },
  { t: 220.4, p: [11.8, -9.4 + SHIP_LOW * 0.5], v: [2.0, -2.2] },
  { t: 221.6, p: [13.4, -10.9 + SHIP_LOW], v: [0.4, -0.8] },
  { t: 222.8, p: [12.0, -10.5 + SHIP_LOW], v: [-2.2, 0.3] },
  { t: 223.9, p: [8.6, -10.9 + SHIP_LOW], v: [-3.4, -0.8] },
  { t: BOW, p: shipPt(BOW, 2.75, 0.2, 0.2, 0.35), v: [-3.2, -1.4], out: [1.4, 2.6] },
  { t: 226.3, p: [3.9, -11.0 + SHIP_LOW], v: [0.6, 0.4] },
  { t: 227.3, p: [3.4, -11.3 + SHIP_LOW], v: [-1.2, -0.4] },
  { t: 228.3, p: [1.6, -11.6 + SHIP_LOW], v: [-1.4, -0.4] },
  { t: DOORS, p: shipPt(DOORS, BAY.x - BAY.w, BAY.y + 0.1, 0.1, 0.3), v: [-0.6, -1.6], out: [1.6, 1.8] },
  { t: 230.3, p: [1.3, -11.8 + SHIP_LOW], v: [0.5, 0.7] },
  { t: FLUNG, p: [1.4, -11.6 + SHIP_LOW], v: [0.2, -0.2], out: [-3.2, 3.0] },
  { t: 231.2, p: [-0.2, -11.0 + SHIP_LOW], v: [-2.0, -0.4] },
  { t: BLOWN, p: shipPt(BLOWN, BAY.x, BAY.y, 0, 0.35), v: [-0.8, -4.2], out: [0.8, -6.5] },
  { t: 232.6, p: [-0.5, -16.4 + SHIP_LOW], v: [0.4, -4.4] },
  { t: 233.5, p: [-0.1, -21.2 + SHIP_LOW], v: [0.4, -5.8] },
]
const HOWL = path(HOWL_KEYS)
const HOWL_FROM = HOWL_KEYS[0].t
const HOWL_TO = HOWL_KEYS[HOWL_KEYS.length - 1].t
/** He is losing himself to the bird: his wings grow as he fights. */
const wingScale = (t: number) => 1.65 + 0.45 * smooth(t, 219, 231.8)
/** His blows: each a jolt through his wings, sharp and damped. */
const HOWL_BLOWS = [...TEAR, TURNED, BOW, DOORS, BLOWN]
/**
 * The feathers he sheds: black, a few at each blow and more as the night goes on (the bird taking him), each let go
 * where he is and falling slowly, rocking side to side, turning. [born, seed].
 */
const FEATHERS: [number, number][] = (() => {
  const out: [number, number][] = []
  for (const blow of HOWL_BLOWS) for (let i = 0; i < 4; i++) out.push([blow + 0.02 * i, out.length])
  for (let t = 219; t < HOWL_TO - 0.3; t += 0.9 - 0.5 * smooth(t, 222, 231)) out.push([t, out.length])
  return out
})()

/** The flak bursts: [time, x, y, size]. */
const FLAK: [number, number, number, number][] = [
  [at(212.341), 16.0, -14.6 + LOW, 1.1],
  [b(11), 9.8, -12.4, 1.2],
  [b(12, 3), 9.1, -12.8, 1.2],
  [at(216.573), 13.4, -13.4, 1],
  [FLUNG, 2.05, -11.1 + SHIP_LOW, 1.35],
]

/* ------------------------------------------------------------------ Sophie and the fire engine */

/**
 * The street's fire engine: a hand pump (a squat wooden tank of water banded in copper, on four small wheels; the pump
 * beam over it, a see-saw with a handle bar across each end; a hose to a brass branch pipe). She pushes it from behind
 * by its push handle (her middle this far behind its middle), and then works it from the beam's left end, which she
 * rides: her height on it with the beam up and down, the pivot's height, and her x from the engine's middle.
 */
/** The engine is drawn in its own units, this many cells each. */
const ES = 1.3
const PUSH_OFF = 1.28
/** The wheels' radius (cells): they turn by the way the engine has come. */
const WHEEL = 0.21 * ES
/** The beam's pivot is level with her end at rest, so it rests level and rocks down under her, up again. */
const BRAKE = { up: -1.944, down: -1.112, pivot: -1.944 + 0.176, reach: 0.9 * ES }
/** How far above her middle the brake's end is when she is on it (her radius and half the pole). */
const SEAT = 0.176
/** Where she sits on the brake, and its pole's resting height at her end. */
const restEnd = BRAKE.up + SEAT

interface Journey {
  keys: Key[]
  /** Footfalls and hops: [from, to, height], added to the keys' way. */
  bobs: [number, number, number][]
  hits: number[]
  /** The engine's middle where it stands when she comes out, and where she pushes it to. */
  x0: number
  x1: number
  /** When she pushes it (from, to), and when she rides its brake (from, to). */
  push: [number, number]
  ride: [number, number]
}

/**
 * Her way: out of the door hurrying, a footfall a beat, to the fire engine standing in the street; she pushes it up the
 * street toward the fires, a push a beat, and stops it; the bomber dives at her and she darts back behind it; the burst
 * throws her back; when the house behind the crater takes fire she climbs onto the engine's brake and pumps, a stroke
 * a bar on the downbeats, the water on the fire, while the warship's stick walks down the roofs toward the shop;
 * when the flak throws Howl she steps down off it; she looks up at him as the ship blows; and runs home, a footfall a
 * beat, into the doorway, at rest inside it at the cut.
 */
function journey(): Journey {
  const keys: Key[] = []
  const bobs: [number, number, number][] = []
  const hits: number[] = []
  let x = -0.5
  let v = SEAMS.raid.v[0]
  let t: number = B
  keys.push({ t, p: [x, 0], v: [v, 0] })
  /** On the ground to `t1`, the speed changing evenly from the last key's to `vin` (so the keys' curve is exact); on with `vout`. */
  const go = (t1: number, vin: number, vout = vin, arc = 0, hit = true) => {
    x += ((t1 - t) * (v + vin)) / 2
    if (arc) bobs.push([t, t1, arc])
    keys.push({ t: t1, p: [x, 0], v: [vin, 0], out: vout !== vin ? [vout, 0] : undefined })
    t = t1
    v = vout
    if (hit) hits.push(t1)
  }
  // Out of the door and down the street, a footfall a beat, to the engine standing there; she meets its push bar on
  // the one, and it gives.
  for (const [at, speed] of [
    [b(5, 2), 1.02],
    [b(5, 3), 1.0],
    [b(6), 0.96],
    [b(6, 2), 0.92],
    [b(6, 3), 0.86],
  ] as const)
    go(at, speed, speed, 0.06)
  go(b(7), 0.78, 0.5, 0.05)
  const x0 = x + PUSH_OFF
  // She pushes it up the street, a push a beat (a surge, and it slows on her), and stops it.
  const pushes: number[] = []
  for (let n = 7; n <= 12; n++) for (let pos = 1; pos <= 3; pos++) if (n > 7 || pos > 1) pushes.push(b(n, pos))
  pushes.forEach((at, i) => (i < pushes.length - 1 ? go(at, 0.32, 0.6, 0.035) : go(at, 0, 0, 0.035)))
  const x1 = x + PUSH_OFF
  const push: [number, number] = [b(7), pushes[pushes.length - 1]]
  // The searchlight has him over the roofs: she glances up, a small hop back off the engine, and settles, looking up.
  keys.push({ t: b(13, 2), p: [x, 0], v: [0, 0], out: [-0.75, 0] })
  hits.push(b(13, 2))
  t = b(13, 2)
  v = -0.75
  go(b(13, 3), 0, 0, 0.13)
  // The bomber dives on the street and lets its bomb go at her: she darts back from the engine. His wing turns it
  // aside over her, and as it bursts up the street she ducks, a short skid back, low.
  // (Short: back behind the engine's end, no further, so the close on her holds the crater's fire too.)
  t = RELEASE
  keys.push({ t, p: [x, 0], v: [0, 0], out: [-1.3, 0] })
  hits.push(RELEASE)
  v = -1.3
  go(TURNED, -0.9, -0.25, 0.12)
  go(STREET, 0, -0.9, 0, false)
  go(at(219.312), -0.3, -0.3, 0.04)
  go(bar('return', 0, 2), 0, 0, 0, false)
  // The house behind the crater takes fire. She steps up to the engine and springs onto its brake.
  go(r(1), 0, 0.9, 0, true)
  go(r(1, 2), 1.0)
  const LX = x1 - BRAKE.reach
  const H0 = r(2) - r(1, 2)
  // A true flight onto the brake's end (gravity 12): up off the cobbles, landing on it as it is up, coming down.
  const vy0 = (BRAKE.up - 0.5 * G * H0 * H0) / H0
  let fall = vy0 + G * H0
  keys[keys.length - 1].out = [(LX - x) / H0, vy0]
  // She lands on the beam as the great ship's bay opens over the roofs, and freezes there: the beam gives a little
  // under her and comes back level, and she stands on it looking up for a bar. On the next one she drives it down
  // from rest (a breath of lift first, the wind-up).
  keys.push({ t: r(2), p: [LX, BRAKE.up], v: [0, fall] })
  hits.push(r(2))
  keys.push({ t: r(2) + 0.24, p: [LX, BRAKE.up + 0.15], v: [0, 0] })
  // The beam back level under her on the bar's three: she stands on it, frozen, looking up (the cut back to her).
  keys.push({ t: r(2, 3), p: [LX, BRAKE.up], v: [0, 0] })
  hits.push(r(2, 3))
  fall = 0.8
  // Pumping: a stroke a bar. Down on the one with her weight (the water goes), the brake bottoming on the two; it
  // springs back up by the three and throws her up off it, and she comes down on it again on the next one: a true
  // flight, so her way is smooth all through.
  for (let n = 3; n <= 10; n++) {
    keys.push({ t: r(n), p: [LX, BRAKE.up], v: [0, fall] })
    hits.push(r(n))
    keys.push({ t: r(n, 2), p: [LX, BRAKE.down], v: [0, 0] })
    if (n === 10) break
    const up = (G * (r(n + 1) - r(n, 3))) / 2
    keys.push({ t: r(n, 3), p: [LX, BRAKE.up], v: [0, -up] })
    fall = up
  }
  const ride: [number, number] = [r(2), r(10, 2)]
  // The flak throws Howl: she steps down off the brake, back from the engine, and looks up at him (up on her toes, a
  // little toward him) as the ship blows.
  const off = r(10, 3) - r(10, 2)
  keys[keys.length - 1].out = [-1.78, 1.0]
  x = LX - 1.78 * off
  keys.push({ t: r(10, 3), p: [x, 0], v: [-1.78, (2 * -BRAKE.down) / off - 1.0], out: [-0.7, 0] })
  hits.push(r(10, 3))
  t = r(10, 3)
  v = -0.7
  go(r(11), 0, 0, 0.04)
  // The ship blows: she ducks, a short skid back a step, lifted off her feet, and she lands on its second.
  go(BLOWN, 0, -1.7, 0, false)
  go(AGAIN, -0.45, -0.45, 0.1, false)
  // Home: gathering, a footfall a beat, slowing into the doorway, at rest inside it.
  const steps: number[] = []
  for (let n = 12; n <= 15; n++) for (let pos = 1; pos <= 3; pos++) steps.push(r(n, pos))
  const lastStep = steps[steps.length - 1]
  const gather = steps[0] - t
  const run = (x - INSIDE[0] + (gather * v) / 2) / (gather / 2 + (lastStep - steps[0]) + (E - lastStep) / 2)
  steps.forEach((at, i) => go(at, -run, -run, i === 0 ? 0.05 : 0.07))
  go(E, 0, 0, 0, false)
  keys[keys.length - 1].p = [INSIDE[0], 0]
  return { keys, bobs, hits, x0, x1, push, ride }
}

const JOURNEY = journey()
const WAY = path(JOURNEY.keys)
/** Where she is at `t` (this frame). */
function sophieAt(t: number): Pt {
  const [x, y] = WAY(t).p
  const bob = JOURNEY.bobs.find(([a, c]) => t > a && t < c)
  return bob ? [x, y - bob[2] * Math.sin((Math.PI * (t - bob[0])) / (bob[1] - bob[0]))] : [x, y]
}
/**
 * The camera's looks up from the street (each a cut on a strike, and back on one): the sky's war over the roofline,
 * and the close on Howl as he stoops. She is in the street under the frame's foot, out of the picture, so her ball is
 * hidden while it lasts (each under 2 s).
 */
const LOOKS: [number, number][] = [
  [b(10), b(11, 2)],
  [b(12), b(12, 3)],
  [RELEASE, TURNED],
  [BAY_OPEN, r(2, 3)],
  [r(10, 3), r(12)],
]
const looking = (t: number) => LOOKS.some(([a, c]) => t >= a && t < c)
/** Her lane: the same way, sampled finely between the times where it turns, so it lands on them exactly. */
function lane(): Seg[] {
  const cuts = [...JOURNEY.keys.map((q) => q.t), ...JOURNEY.bobs.flatMap(([a, c]) => [a, c]), ...LOOKS.flat()]
    .filter((q) => q >= B && q <= E)
    .sort((a, c) => a - c)
    .filter((q, i, all) => i === 0 || q - all[i - 1] > 1e-6)
  const segs: Seg[] = []
  for (let i = 1; i < cuts.length; i++) {
    const [a, c] = [cuts[i - 1], cuts[i]]
    segs.push(...carried(sophieAt, a, c, Math.max(1, Math.ceil((c - a) * 60)), looking((a + c) / 2)))
  }
  return segs
}
const SOPHIE = { hits: JOURNEY.hits }
const LANE = lane()

/** The engine's middle at `t`: standing, pushed (her own way, so it never leaves her hands), and standing again. */
function engineX(t: number): number {
  if (t <= JOURNEY.push[0]) return JOURNEY.x0
  if (t >= JOURNEY.push[1]) return JOURNEY.x1
  return sophieAt(t)[0] + PUSH_OFF
}
/** The height of the brake's left end at `t`: under her while she rides it; up at rest; after she steps off, springing back up. */
function brakeEnd(t: number): number {
  const [r0, r1] = JOURNEY.ride
  if (t >= r0 && t <= r1) return Math.max(restEnd, sophieAt(t)[1] + SEAT)
  if (t > r1) return BRAKE.down + SEAT + (BRAKE.up - BRAKE.down) * step(t - r1, 0.09) + ring(t - r1 - 0.25, 0.05, 15, 0.25)
  return restEnd
}
/** How hard the water comes at `t` (0..1): as fast as she drives the brake down. */
function flow(t: number): number {
  const [r0, r1] = JOURNEY.ride
  if (t < r0 || t > r1) return 0
  return Math.max(0, Math.min(1, WAY(t).v[1] / 2.1))
}

/** The water: from the branch pipe's nozzle (engine units) into the fire in the crater, `JET_T` seconds on the way. */
const JET_T = 0.55
const NOZZLE: Pt = [1.18, -1.05]
/** The branch pipe's other end, where the hose comes up to it and the clamp holds it at the tank's front corner. */
const BRANCH: Pt = [0.86, -0.9]
const JET_AT: Pt = [CRATER[0] - 0.05, GROUND - 0.4]
const nozzle = (): Pt => [JOURNEY.x1 + NOZZLE[0] * ES, GROUND + NOZZLE[1] * ES]
const JET_V: Pt = (() => {
  const [nx, ny] = nozzle()
  return [(JET_AT[0] - nx) / JET_T, (JET_AT[1] - ny - 0.5 * G * JET_T * JET_T) / JET_T]
})()
/** How much water has reached the fire by `t` (0..1): the crater's fire and the ground floor over it die back under it. */
const DOUSED = (() => {
  const out: number[] = []
  let sum = 0
  for (let q = 0; q * (1 / 60) <= E + 2 - JOURNEY.ride[0]; q++) {
    sum += flow(JOURNEY.ride[0] + q / 60) / 60
    out.push(sum)
  }
  return out
})()
function doused(t: number): number {
  const q = Math.floor((t - JET_T - JOURNEY.ride[0]) * 60)
  if (q < 0) return 0
  return Math.min(1, DOUSED[Math.min(DOUSED.length - 1, q)] / 1.6)
}

/* ------------------------------------------------------------------ the strikes */

/** Every strike of this part, in show seconds. */
export const RAID_HITS: number[] = [
  DOOR_BURST,
  ...FAR_FLASHES,
  ...BLACKOUT,
  ...FAR_STICK,
  ...FLAK.map((f) => f[0]),
  ...TEAR,
  CRASH,
  CAUGHT,
  RELEASE,
  TURNED,
  STREET,
  CATCH,
  BAY_OPEN,
  ...STICK,
  BOW,
  DOORS,
  BLOWN,
  AGAIN,
  ...SOPHIE.hits,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, c) => a - c)

/* ------------------------------------------------------------------ the searchlights */

interface Lamp {
  x: number
  y: number
  /** Its sweep: middle angle, swing, speed, phase. */
  mid: number
  swing: number
  w: number
  ph: number
}
/**
 * Three searchlights sweeping the smoke; the third finds Howl. It stands at the street's far end, in the burning
 * quarter, so when it finds him low over the roofs its beam crosses the street's sky on a long diagonal up to him.
 */
const LAMPS: Lamp[] = [
  { x: 20.5, y: -8.5, mid: -Math.PI / 2 - 0.4, swing: 0.3, w: 0.33, ph: 0.4 },
  { x: -3.6, y: -12.6, mid: -Math.PI / 2 + 0.24, swing: 0.3, w: 0.27, ph: 2.2 },
  { x: 18.2, y: -0.6, mid: -Math.PI / 2 - 0.22, swing: 0.3, w: 0.41, ph: 4.1 },
]
/** What a searchlight finds and holds: which lamp, on what, swinging onto it by `at`, losing it from `until`. */
const FINDS: {
  lamp: number
  from: number
  at: number
  until: number
  lose: number
  on: (t: number) => Pt
}[] = [
  { lamp: 2, from: CAUGHT - 0.45, at: CAUGHT, until: b(12, 3) + 0.1, lose: 1.3, on: (t) => HOWL(Math.max(HOWL_FROM, Math.min(HOWL_TO, t))).p },
  { lamp: 0, from: BAY_OPEN - 0.5, at: BAY_OPEN, until: r(5), lose: 1.6, on: (t) => onShip(t, BAY.x, BAY.y) },
]
function lampAngle(i: number, t: number): number {
  const L = LAMPS[i]
  let a = L.mid + L.swing * Math.sin(L.w * t + L.ph) + 0.06 * Math.sin(L.w * 2.7 * t)
  for (const find of FINDS) {
    if (find.lamp !== i) continue
    const hold = smooth(t, find.from, find.at) * (1 - smooth(t, find.until, find.until + find.lose))
    if (hold <= 0) continue
    const [x, y] = find.on(t)
    a += (Math.atan2(y - L.y, x - L.x) - a) * hold
  }
  return a
}

/* ------------------------------------------------------------------ drawing */

/** The searchlights' beams, and the pale patch where one holds what it has found. */
function drawLamps(p: p5, k: number, t: number): void {
  for (let i = 0; i < LAMPS.length; i++) beam(p, k, LAMPS[i].x, LAMPS[i].y, lampAngle(i, t), 34, 0.1 * (0.92 + 0.08 * wobble(t * 7, i)))
  for (const find of FINDS) {
    const hold = smooth(t, find.at - 0.1, find.at) * (1 - smooth(t, find.until, find.until + find.lose * 0.5))
    if (hold <= 0.01) continue
    const [x, y] = find.on(t)
    glow(p, k, x, y, 1.2, TOWN.glow, 0.22 * hold)
  }
}

/** The flashes: how much the whole picture is lit for a moment by a burst. */
function flashAt(t: number): number {
  let a = 0
  const add = (when: number, peak: number, tau = 0.18) => {
    if (t >= when && t < when + 6 * tau) a += peak * Math.exp(-(t - when) / tau)
  }
  add(DOOR_BURST, 0.16, 0.3)
  for (const s of FAR_FLASHES) add(s, 0.11, 0.24)
  for (const s of FAR_STICK) add(s, 0.045)
  add(CRASH, 0.06)
  // The burst in the street is close, but the dark is kept: its fire lights her, the flash only warms the frame.
  add(STREET, 0.14, 0.2)
  add(CATCH, 0.05)
  for (const s of STICK) add(s, 0.07)
  add(BLOWN, 0.16, 0.25)
  add(AGAIN, 0.08)
  return a
}

type Frame = ReturnType<typeof frame>

/** The war's night: a deep indigo, over the town's own night. */
const INDIGO = '#14163A'
/**
 * The night of the raid, laid over the whole set (the town's sky, its walls and roofs, the street) before anything of
 * the war is drawn: deepest over the roofs, where the war is, and lighter down at the street, where the fires light
 * it. It deepens as the town's lights go out. The fires, the lit windows, the war and her engine are drawn over it;
 * she is drawn over everything, so she reads, pale, against the dark. It covers the whole frame: no edge anywhere.
 */
function drawNight(p: p5, k: number, t: number, f: Frame): void {
  const a = 0.78 + 0.22 * smooth(t, BLACKOUT[0] - 0.4, BLACKOUT[5] + 0.6)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const g = ctx.createLinearGradient(0, -17 * k, 0, (GROUND + 1) * k)
  for (const [y, v] of [
    [-17, 0.84],
    [-11.5, 0.76],
    [-8, 0.66],
    [-4, 0.52],
    [-1, 0.42],
    [GROUND + 1, 0.36],
  ] as const)
    g.addColorStop((y + 17) / (GROUND + 18), rgba(INDIGO, v * a))
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  ctx.restore()
}

/** The shop's side of the street in this frame: its house's east wall (the street's houses start here), its west end. */
const SHOP_EAST = TOWN_AT.wall[1] - OX
const SHOP_WEST = TOWN_AT.shop[0] - 0.4 - OX

/**
 * The shop's floor where the set cuts it open, seen from the street: the town draws it as the workroom's boards over
 * the cellar's dark, which under the raid's night stood a step darker than the cobbles beside it, a slab. Drawn before
 * the night, so the night goes over it as it goes over the cobbles: the pavement one tone from the shop to the street.
 */
function drawShopFloor(p: p5, k: number, t: number): void {
  const tone = outside(t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const g = ctx.createLinearGradient(SHOP_WEST * k, 0, SHOP_EAST * k, 0)
  const col = tone(mixHex(TOWN.cobble, TOWN.cobbleDark, 0.3))
  g.addColorStop(0, rgba(col, 0.72))
  g.addColorStop(0.9, rgba(col, 0.72))
  g.addColorStop(1, rgba(col, 0.55))
  ctx.fillStyle = g
  ctx.fillRect(SHOP_WEST * k, (GROUND + 0.02) * k, (SHOP_EAST - SHOP_WEST) * k, 0.48 * k)
  ctx.restore()
}

/**
 * The shop's house (its cut-open workroom too) and the houses west of it, in the raid's night. Plain plaster with no
 * fire in it and no smoke over it, beside the burning street it read as a paler panel with a ruled edge down the
 * shop's east wall. A little more of the night over it, feathered out across that wall so there is no edge; the
 * street's smoke drifting over its roof and upper storey and on across the wall; and, once the house next door burns,
 * that fire's light on the shop's east end.
 */
function drawShopSide(p: p5, k: number, t: number, f: Frame): void {
  if (f.x0 > SHOP_EAST + 2.5) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const a = 0.16 + 0.06 * smooth(t, BLACKOUT[0] - 0.4, BLACKOUT[5] + 0.6)
  const g = ctx.createLinearGradient((SHOP_EAST - 1.2) * k, 0, (SHOP_EAST + 1.8) * k, 0)
  g.addColorStop(0, rgba(INDIGO, a))
  g.addColorStop(0.5, rgba(INDIGO, a * 0.45))
  g.addColorStop(1, rgba(INDIGO, 0))
  ctx.fillStyle = g
  const x1 = Math.min(f.x1, SHOP_EAST + 1.8)
  // Down to the ground line: the floor's front below it is the pavement, one tone with the cobbles (`drawShopFloor`).
  ctx.fillRect(f.x0 * k, f.y0 * k, (x1 - f.x0) * k, (Math.min(f.y1, GROUND) - f.y0) * k)
  ctx.restore()
  // The street's smoke over its roof and upper storey: long soft banks of every size, drifting slowly east and on
  // over the seam into the street's own smoke; lit a little from under where they are low.
  const thick = 0.1 + 0.14 * smooth(t, 209, 214) + 0.08 * smooth(t, 222, 229)
  for (let i = 0; i < 14; i++) {
    const span = 26
    const x = ((((hash(i, 1, 81) * span + 0.22 * t) % span) + span) % span) + SHOP_WEST - 6
    const r = 1.1 + 1.3 * hash(i, 2, 81)
    if (x + r * 1.6 < f.x0 || x - r * 1.6 > f.x1) continue
    const y = -6.2 - 7.5 * hash(i, 3, 81) + 0.3 * Math.sin(t * 0.35 + i)
    const low = Math.max(0, Math.min(1, (y + 11) / 5))
    // Thinning out past the house next door's middle, so the bank has no end of its own.
    const fade = 1 - smooth(x, SHOP_EAST + 1, SHOP_EAST + 4)
    puff(p, k, x, y, r, mixHex(mixHex(TOWN.smoke, TOWN.nightHigh, 0.45), TOWN.ember, 0.25 * low), thick * (0.6 + 0.4 * hash(i, 4, 81)) * fade, 0.5)
  }
  // The house next door burning (the stick's last bomb): its fire's light on the shop's east end, flickering.
  const next = t - HIT[0]
  if (next > 0) {
    const fl = 0.8 + 0.2 * wobble(t * 6.1, 7)
    const heat = smooth(next, 0.1, 1.6) * fl
    glow(p, k, SHOP_EAST - 0.2, FRONTS[0].eaves - 0.6, 3.6, TOWN.fire, 0.1 * heat, 1.3)
    glow(p, k, SHOP_EAST - 0.4, GROUND - 2.4, 2.8, TOWN.ember, 0.08 * heat, 1)
  }
}

function drawSky(p: p5, k: number, t: number, f: Frame): void {
  // The town burning under the roofs lights the smoke just over them, more as the night goes on; above that the
  // night is indigo.
  const burning = 0.1 + 0.12 * smooth(t, 206, 232)
  skyGlow(p, k, f.x0, f.x1, -7.6, 6.5, TOWN.ember, burning)
  skyGlow(p, k, f.x0, f.x1, -8.6, 3.5, TOWN.fire, burning * 0.5)
  // Over the roofline (clipped to the sky, so the roofs stand black against it): the burning town's light, up from
  // behind the ridges and fading into the night, stronger as the town burns.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const back = 0.1 + 0.16 * smooth(t, 209, 214) + 0.06 * smooth(t, 222, 231)
  p.push()
  clipAboveRoofs(ctx, k, f)
  // The town beyond the roofs goes down into the night first (its gables caught the glow and stood paler than the
  // sky, a ghost roofline over the real one), so only the street's own roofs stand against the light.
  const veil = ctx.createLinearGradient(0, -5.2 * k, 0, -15 * k)
  veil.addColorStop(0, rgba(INDIGO, 0.9))
  veil.addColorStop(0.6, rgba(INDIGO, 0.78))
  veil.addColorStop(1, rgba(INDIGO, 0))
  ctx.fillStyle = veil
  ctx.fillRect(f.x0 * k, -15 * k, (f.x1 - f.x0) * k, 9.8 * k)
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, -7.4 * k, 0, -19 * k)
  g.addColorStop(0, rgba(TOWN.fire, back * 0.9))
  g.addColorStop(0.18, rgba(TOWN.ember, back))
  g.addColorStop(0.55, rgba(TOWN.ember, back * 0.4))
  g.addColorStop(1, rgba(TOWN.ember, 0))
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, -19 * k, (f.x1 - f.x0) * k, 11.6 * k)
  p.pop()
  // The smoke over the town: long low banks drifting left, each a heap of soft puffs of uneven size, dark on top and
  // lit orange underneath by the fires below, the lower banks the more.
  for (let i = 0; i < 18; i++) {
    const w = 3.0 + 3.2 * hash(i, 1, 7)
    const span = 70
    const x = ((((hash(i, 2, 7) * span - 0.35 * t - 20) % span) + span) % span) - 24
    if (x + w + 2 < f.x0 || x - w - 2 > f.x1) continue
    const y = -11.4 - 6 * hash(i, 3, 7) + 0.3 * Math.sin(t * 0.3 + i)
    const lit = Math.max(0, Math.min(1, (y + 18.5) / 7))
    const a = 0.2 + 0.12 * hash(i, 4, 7)
    const n = 3 + Math.floor(3 * hash(i, 5, 7))
    for (let j = 0; j < n; j++) {
      const u = n === 1 ? 0.5 : j / (n - 1)
      const px = x - w + 2 * w * u + 0.5 * (hash(i, 10 + j, 7) - 0.5)
      const r = (0.55 + 0.6 * hash(i, 20 + j, 7)) * (0.55 + 0.45 * Math.sin(Math.PI * (0.15 + 0.7 * u))) * 1.5
      const py = y - 0.25 * r * hash(i, 30 + j, 7)
      puff(p, k, px, py, r, mixHex(TOWN.smoke, TOWN.nightHigh, 0.35), a, 0.55)
      puff(p, k, px + 0.3 * (hash(i, 40 + j, 7) - 0.5), py + 0.42 * r, r * 1.05, mixHex(TOWN.ember, TOWN.fire, 0.25), a * 0.6 * lit * (0.4 + 0.6 * smooth(t, 209, 214)), 0.5)
    }
  }
}

/** A soft round volume of smoke: dense at its middle, gone at its edge. Never outlined. */
function puff(p: p5, k: number, x: number, y: number, r: number, hex: string, a: number, squash = 0.85): void {
  if (a <= 0.004 || r <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, squash)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.55, rgba(hex, a * 0.75))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/**
 * Past the street's end the set has only sky: here, the town beyond is burning. A bank of smoke from the cobbles up
 * over the roofs, dense and lit orange at its foot, dark and billowing at its top, rolling slowly up; the fire along
 * its foot and its light on the cobbles.
 */
function drawQuarter(p: p5, k: number, t: number, f: Frame): void {
  if (f.x1 < STREET_END - 3) return
  const x0 = STREET_END - 0.4
  const step = 1.5
  const cols = Math.ceil((f.x1 + 3 - x0) / step)
  // (No flat backdrop behind it: a rectangle's edge is a straight cut through soft smoke. The town past the street's
  // end, the sky builder's, shows through between the puffs, which is the quarter burning.)
  // The body: puffs on a loose grid, breathing.
  for (let c = 0; c < cols; c++) {
    const edge = Math.min(1, (c + 0.6) / 2.2)
    for (let row = 0; row < 9; row++) {
      const x = x0 + c * step + 0.5 * (hash(c, row, 43) - 0.5) + 0.2 * Math.sin(t * 0.5 + c + row)
      const up = row / 8
      const y = GROUND - 0.6 - row * 1.55 - 0.9 * hash(row, c, 44) - 0.25 * Math.sin(t * 0.4 + c * 1.3 + row)
      const r = 1.5 + 0.9 * hash(c, row, 45) + 0.4 * up
      const lit = Math.max(0, 1 - up * 1.6)
      const col = mixHex(mixHex(TOWN.smoke, TOWN.nightHigh, 0.3 * up), TOWN.ember, 0.55 * lit)
      const a = (0.95 - 0.55 * up) * edge * (row === 8 ? 0.5 : 1)
      puff(p, k, x, y, r, col, a)
    }
  }
  // The top: billows rolling up out of it and thinning into the sky.
  for (let i = 0; i < cols * 2; i++) {
    const life = 7
    const age = (((t / life + hash(i, 1, 46)) % 1) + 1) % 1
    const x = x0 + 0.8 + hash(i, 2, 46) * (f.x1 + 2 - x0) - 0.4 * age
    const y = -10.5 - 1.5 * hash(i, 3, 46) - age * 6
    const r = 1.2 + 1.2 * hash(i, 4, 46) + 1.4 * age
    puff(p, k, x, y, r, mixHex(TOWN.smoke, TOWN.nightHigh, 0.25 + 0.3 * age), 0.55 * Math.sin(Math.PI * age))
  }
  // Fire along its foot, and its light on the cobbles and up the smoke: soft pools of it, no edge anywhere.
  for (let i = 0; i < cols + 2; i++) {
    const x = x0 - 1 + i * 1.5 + 0.4 * hash(i, 8, 41)
    glow(p, k, x, GROUND - 0.6, 2.6 + 0.6 * hash(i, 9, 41), TOWN.fire, 0.16 * Math.min(1, (i + 0.5) / 2.5), 0.7)
  }
  for (let i = 0; i < 8; i++) {
    const x = x0 + 0.7 + i * 1.6 + 0.4 * hash(i, 5, 41)
    if (x > f.x1 + 2) break
    const h = (1.0 + 1.1 * hash(i, 7, 41)) * (0.85 + 0.15 * wobble(t * 1.3, i))
    fire(p, k, x, GROUND + 0.1, 1.4 + 0.6 * hash(i, 6, 41), h, { t, seed: 200 + i, lean: 0.2, light: 0.95 })
  }
}

/** The lights of the houses across the street going out, and then the fire in their windows. */
function drawWindows(p: p5, k: number, W: number, ink: string, t: number): void {
  FRONTS.forEach((f, j) => {
    const out = BLACKOUT[j]
    const hit = HIT[j]
    f.windows.forEach((w, n) => {
      // The fire reaches it from the roof down; the crater's house burns from its ground floor too.
      const fromRoof = t - (hit + w.delay + 0.5 * hash(j, n, 19))
      const low = j === CRATER_HOUSE && w.y > GROUND - 2.5
      const fromStreet = low ? t - CATCH : -1
      const burn = Math.max(fromRoof, fromStreet)
      // The ground floor over the crater is the one her water reaches: its fire dies back to smouldering.
      const wet = low ? doused(t) : 0
      const dark = !w.lit || t >= out + 0.012 * n
      // Still lit (the night's veil went over the set's own lit glass): lit again here until its house goes dark.
      const litNow = w.lit && !dark
      if (burn < 0 && !(w.lit && dark) && !litNow) return
      p.push()
      p.rectMode(p.CORNER)
      if (burn >= 0) {
        // Fire inside: the glass orange and flickering, a flash as it catches, and its light out on the wall.
        // Rooms burn unevenly: some roaring, some smouldering behind smoke-dark glass.
        // (Behind her it only smoulders, dark: the wall she stands against stays night, so she reads against it.)
        const hush = w.hush ? 0.35 : 1
        const heat = (0.35 + 0.65 * hash(j, n, 17)) * (1 - 0.75 * wet) * hush
        const fl = 0.5 + 0.5 * wobble(t * (7 + 5 * hash(n, j, 18)) + n, j * 3 + n)
        const flash = Math.exp(-burn / 0.2) * hush
        p.noStroke()
        const glass =
          heat < 0.55
            ? mixHex(DARK_GLASS, TOWN.ember, (0.3 + 0.25 * fl) * hush)
            : mixHex(TOWN.ember, mixHex(TOWN.fire, TOWN.fireHot, 0.3 * fl), (heat - 0.5) * 1.6 * (0.55 + 0.45 * fl))
        p.fill(mixHex(glass, TOWN.fireHot, 0.6 * flash))
        p.rect(w.x * k, w.y * k, w.w * k, w.h * k)
        glow(p, k, w.x + w.w / 2, w.y + w.h / 2, 0.9 + 0.5 * flash, TOWN.fire, ((0.06 + 0.12 * heat * fl) * step(burn, 0.1) + 0.25 * flash) * hush)
        // Flames licking out of the hottest upper windows once it has taken hold.
        if (!w.dormer && w.y < GROUND - 2.5 && heat > 0.55 && burn > 0.8)
          fire(p, k, w.x + w.w / 2, w.y + 0.12, w.w * 0.95, 0.6 * heat * smooth(burn, 0.8, 2.4) * (0.8 + 0.2 * fl), { t, seed: j * 11 + n, lean: 0.25 })
      } else {
        p.noStroke()
        p.fill(litNow ? TOWN.glow : w.dormer ? DARK_DORMER : DARK_GLASS)
        p.rect(w.x * k, w.y * k, w.w * k, w.h * k)
        if (litNow) glow(p, k, w.x + w.w / 2, w.y + w.h / 2, 0.8, TOWN.glow, 0.1)
      }
      if (!w.dormer) {
        p.stroke(alpha(p, ink, 0.55))
        p.strokeWeight(W * 0.45)
        p.line((w.x + w.w / 2) * k, w.y * k, (w.x + w.w / 2) * k, (w.y + w.h) * k)
        p.line(w.x * k, (w.y + w.h * 0.45) * k, (w.x + w.w) * k, (w.y + w.h * 0.45) * k)
      }
      p.pop()
    })
    // The lamps going out: the last of their light on the wall, gone in a breath.
    const since = t - out
    if (since >= 0 && since < 0.5) for (const w of f.windows) if (w.lit) glow(p, k, w.x + w.w / 2, w.y + w.h / 2, 0.6, TOWN.glow, 0.25 * (1 - since / 0.5))
  })
}

function drawFarShip(p: p5, k: number, W: number, ink: string, t: number): void {
  const x = w1x(t)
  if (x < -30 || x > 40) return
  const haze = mixHex(WASTES.warship, TOWN.nightHigh, 0.45)
  p.push()
  p.translate(x * k, W1.y * k)
  p.rotate(0.01 * Math.sin(t * 0.8))
  drawWarship(p, k * W1.s, W * 0.6, ink, { t, face: -1, color: haze, light: 0.85 })
  p.pop()
  glow(p, k, x, W1.y + 0.6, 3.0, TOWN.ember, 0.08, 0.35)
  // Its bombs, falling beyond the roofs.
  for (const fb of farBombs) {
    if (t < fb.rel || t >= fb.land) continue
    const u = t - fb.rel
    const [bx, by] = fallFrom(fb.p0, fb.v0, u)
    const fade = 1 - smooth(u, W1_FALL * 0.75, W1_FALL)
    bomb(p, k, W, ink, bx, by, Math.atan2(fb.v0[1] + G * u, fb.v0[0]), 0.8, 0.8 * fade)
  }
}

function drawBombers(p: p5, k: number, W: number, ink: string, t: number): void {
  for (let i = 0; i < FLIGHT.length; i++) {
    const bm = bomber(i, t)
    if (!bm) continue
    const [x, y] = bm.p
    if (x < -30 || x > 40) continue
    p.push()
    p.translate(x * k, y * k)
    p.rotate(bm.ang)
    drawBomber(p, k * BOMBER_SIZE, W * 0.8, ink, { t: t + i * 0.37, face: -1, color: FLEET_DARK })
    p.pop()
    glow(p, k, x, y + 0.25, 1.1, TOWN.ember, 0.12, 0.5)
    if (bm.burning) {
      glow(p, k, x, y, 1.1, TOWN.fire, 0.35)
      fire(p, k, x + 0.3, y + 0.05, 0.45, 0.55, { t, seed: 80, lean: 0.8 })
    }
  }
}

function drawStreetBurst(p: p5, k: number, W: number, ink: string, t: number): void {
  const u = t - STREET
  if (u < 0) return
  const [cx] = CRATER
  // The crater: a dark pit in the cobbles, its lip heaved up.
  const open = step(u, 0.04)
  p.push()
  const mouth = (close: boolean) => {
    p.beginShape()
    p.vertex((cx - 0.95 * open) * k, (GROUND - 0.02) * k)
    p.bezierVertex(
      (cx - 0.7 * open) * k,
      (GROUND + 0.42 * open) * k,
      (cx + 0.7 * open) * k,
      (GROUND + 0.42 * open) * k,
      (cx + 0.95 * open) * k,
      (GROUND - 0.02) * k,
    )
    p.endShape(close ? p.CLOSE : undefined)
  }
  p.noStroke()
  p.fill(mixHex(TOWN.cobbleDark, TOWN.night, 0.75))
  mouth(true)
  p.noFill()
  p.stroke(alpha(p, ink, 0.9))
  p.strokeWeight(W * 0.8)
  mouth(false)
  // The lip: slabs of the street heaved up and tipped at the crater's edges.
  p.fill(RUBBLE)
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(W * 0.45)
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1
    const x = cx + side * (0.9 + 0.22 * (i % 3) + 0.1 * hash(i, 1, 93)) * open
    const s = 0.11 + 0.05 * hash(i, 2, 93)
    p.push()
    p.translate(x * k, (GROUND - s * 0.35) * k)
    p.rotate(side * (0.3 + 0.3 * hash(i, 3, 93)))
    shard(p, k, [
      [-s * 0.8, s * 0.4],
      [-s * 0.55, -s * 0.45],
      [s * 0.7, -s * 0.3],
      [s * 0.8, s * 0.4],
    ])
    p.pop()
  }
  // The thrown cobbles: up, over and down, and lying flat where they fall.
  for (const c of CHIPS) {
    const s = Math.min(u, c.T)
    const x = cx + c.vx * s
    const y = GROUND - 0.1 + c.vy * s + 0.5 * G * s * s
    // Landed, it tips over flat (a quick settle, no bounce).
    const a0 = c.spin * c.T
    const flat = Math.round(a0 / Math.PI) * Math.PI + c.rest
    const ang = u < c.T ? c.spin * s : a0 + (flat - a0) * step(u - c.T, 0.05)
    p.push()
    p.translate(x * k, Math.min(y, GROUND - c.size * 0.3) * k)
    p.rotate(ang)
    shard(p, k, c.shape)
    p.pop()
  }
  p.pop()
  // The fireball: up at once, rolling up and out, settling to a fire in the crater that burns on, until her water
  // beats it down: it ducks under each stroke's water as it lands, and comes back a little less each time.
  const wet = (1 - 0.72 * doused(t)) * (1 - 0.42 * landing(t))
  const tall = step(u, 0.04) * (0.6 + 2.6 * Math.exp(-u / 0.45)) * wet
  const width = (0.9 + 1.4 * Math.exp(-u / 0.6) + 0.5 * smooth(u, 0, 0.3)) * (0.7 + 0.3 * wet)
  glow(p, k, cx, GROUND - 1.2, 3.2 + 3 * Math.exp(-u / 0.4), TOWN.fire, (0.16 + 0.5 * Math.exp(-u / 0.25)) * wet)
  fire(p, k, cx, GROUND + 0.05, width, tall * (1 + 0.2 * smooth(u, 2, 14)), { t, seed: 90, lean: 0.1 })
  sparks(p, k, cx, GROUND - 0.4, u, 22, 7, 94)
}

/** The shop's roof, as `town.ts` draws it (its eaves over the second storey, the ridge 5.4 over them, 0.4 overhang). */
const SHOP_EAVES = TOWN_AT.ceil - 0.32 - 5.6
const SHOP_RIDGE = SHOP_EAVES - 5.4

/** The roof's triangle of the house across the street `j`, as `town.ts` draws it. */
const roofTri = (j: number): Pt[] => {
  const f = FRONTS[j]
  return [
    [f.x0 - 0.25, f.eaves + 0.05],
    [f.xc, f.ridge],
    [f.x1 + 0.25, f.eaves + 0.05],
  ]
}

/** The line of the street's roofs against the sky at `x` (the highest roof there); Infinity where no roof stands. */
function roofTop(x: number): number {
  let y = Infinity
  const gable = (x0: number, x1: number, eaves: number, ridge: number, over: number) => {
    const a = x0 - over
    const b = x1 + over
    const m = (x0 + x1) / 2
    if (x < a || x > b) return
    const u = x < m ? (x - a) / (m - a) : (b - x) / (b - m)
    y = Math.min(y, eaves + (ridge - eaves) * u)
  }
  for (const f of FRONTS) gable(f.x0, f.x1, f.eaves + 0.05, f.ridge, 0.25)
  gable(SHOP_WEST, SHOP_EAST, SHOP_EAVES + 0.1, SHOP_RIDGE, 0.4)
  return y
}

/** Clip to the sky over the street's roofs, so what is drawn beyond them goes down behind their line. */
function clipAboveRoofs(ctx: CanvasRenderingContext2D, k: number, f: Frame): void {
  const xs: number[] = []
  const n = Math.ceil((f.x1 - f.x0) / 0.1)
  for (let i = 0; i <= n; i++) xs.push(f.x0 + ((f.x1 - f.x0) * i) / n)
  // The ridges and eaves exactly, so the line never nibbles a corner.
  for (let j = 0; j < FRONTS.length; j++) for (const [x] of roofTri(j)) if (x > f.x0 && x < f.x1) xs.push(x)
  for (const x of [SHOP_WEST - 0.4, (SHOP_WEST + SHOP_EAST) / 2, SHOP_EAST + 0.4]) if (x > f.x0 && x < f.x1) xs.push(x)
  xs.sort((a, b) => b - a)
  ctx.beginPath()
  ctx.moveTo(f.x0 * k, (f.y0 - 1) * k)
  ctx.lineTo(f.x1 * k, (f.y0 - 1) * k)
  for (const x of xs) ctx.lineTo(x * k, Math.min(f.y1 + 1, roofTop(x)) * k)
  ctx.closePath()
  ctx.clip()
}

const polyPath = (ctx: CanvasRenderingContext2D, k: number, pts: Pt[]) => {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
}

/**
 * The town burning beyond the roofs: the far fires and their smoke go down behind the street's roofline (the raid is
 * drawn over the set, so without it they floated as bars of flame on the near roofs), each seated a little below that
 * line so only its tongues and its glow come up over it.
 */
function drawFarFires(p: p5, k: number, t: number, f: Frame): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // (p5's push and pop round the clip: the fires inside it set p5 fills, and p5's pop re-reads its cached fill.)
  p.push()
  clipAboveRoofs(ctx, k, f)
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i]
    if (!s.far) continue
    const h = flames(s, t)
    if (h <= 0.01) continue
    const top = roofTop(s.x)
    const y = Number.isFinite(top) ? Math.max(s.y, top + 0.3) : s.y
    const hh = h * 1.15 + (y - s.y) * 0.5
    const u = t - s.t
    glow(p, k, s.x, y - 0.4 * hh, 1.4 + 1.1 * hh, TOWN.fire, 0.1 * Math.min(1.6, hh), 0.8)
    if (!s.before && u < 0.5) glow(p, k, s.x, y - 0.8, 4.5, TOWN.fireHot, 0.35 * Math.exp(-u / 0.12) * 0.7)
    fire(p, k, s.x, y, s.w * (0.8 + 0.2 * Math.min(1, h)), hh, { t, seed: s.seed, lean: 0.14, light: 0.7 })
    if (!s.before) sparks(p, k, s.x, y - 0.4, u, 10, 5.5, s.seed)
  }
  for (let i = 0; i < SITES.length; i++) if (SITES[i].far) smoke(p, k, SMOKES[i], t)
  p.pop()
}

/**
 * A roof burning across the street, seated in its roof: the bomb's ragged hole in the slates, charred at its rim and
 * lit orange from inside; the slates round it warmed, and the roof's own edges catching the light near it; the flames
 * coming up out of the hole (their base hidden under its lower lip, so never a ruled line), over the ridge and into the
 * night.
 */
function drawRoofFire(p: p5, k: number, W: number, s: Site, t: number): void {
  const h = flames(s, t)
  if (h <= 0.01 || s.house === undefined) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const tri = roofTri(s.house)
  const u = t - s.t
  const fl = 0.78 + 0.22 * wobble(t * 5.3, s.seed)
  const heat = Math.min(1.3, h) * fl
  // The roof's half-width at the hole's height; the hole a little inside it.
  const across = (s.y - tri[1][1]) / (tri[0][1] - tri[1][1])
  const half = across * (tri[2][0] - tri[0][0]) * 0.5
  const hw = Math.min(0.62, 0.8 * half) * (0.3 + 0.7 * smooth(u, 0, 0.12))
  const hh = 0.19 + 0.05 * hash(s.seed, 1, 83)
  const cy = s.y + 0.08
  const hole: Pt[] = Array.from({ length: 11 }, (_, i) => {
    const a = (2 * Math.PI * (i + 0.4 * (hash(i, s.seed, 84) - 0.5))) / 11
    // Jagged: every other corner bitten in, so its lip is broken slates, never a smooth curve.
    const r = (i % 2 ? 0.62 : 0.86) + 0.34 * hash(i, s.seed, 85)
    return [s.x + hw * r * Math.cos(a), cy + hh * (0.7 + 0.45 * hash(i, s.seed, 86)) * Math.sin(a)]
  })
  // The warmed slates, and the hole: both inside the roof.
  ctx.save()
  polyPath(ctx, k, tri)
  ctx.clip()
  glow(p, k, s.x, cy, 1.9, TOWN.ember, 0.26 * heat, 0.75)
  glow(p, k, s.x, cy - 0.1, 0.9, TOWN.fire, 0.18 * heat, 0.7)
  ctx.save()
  ctx.translate(s.x * k, cy * k)
  ctx.scale(1.12, 1.2)
  ctx.translate(-s.x * k, -cy * k)
  polyPath(ctx, k, hole)
  ctx.fillStyle = rgba(mixHex('#1C110E', TOWN.ember, 0.2), 0.5)
  ctx.fill()
  ctx.restore()
  polyPath(ctx, k, hole)
  const g = ctx.createRadialGradient(s.x * k, (cy + 0.05) * k, 0, s.x * k, (cy + 0.05) * k, hw * 1.1 * k)
  g.addColorStop(0, rgba(TOWN.fireHot, 0.95))
  g.addColorStop(0.5, rgba(TOWN.fire, 0.92))
  g.addColorStop(1, rgba(mixHex(TOWN.ember, '#1C110E', 0.35), 0.95))
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  // The roof's edges catching the light, strongest nearest the fire.
  ctx.save()
  const e = ctx.createRadialGradient(s.x * k, cy * k, 0, s.x * k, cy * k, 2.3 * k)
  e.addColorStop(0, rgba(TOWN.fire, Math.min(0.8, 0.55 * heat)))
  e.addColorStop(1, rgba(TOWN.fire, 0))
  ctx.strokeStyle = e
  ctx.lineWidth = W * 1.1
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(tri[0][0] * k, tri[0][1] * k)
  ctx.lineTo(tri[1][0] * k, tri[1][1] * k)
  ctx.lineTo(tri[2][0] * k, tri[2][1] * k)
  ctx.stroke()
  ctx.restore()
  // Its light into the night, and the flash as it catches.
  glow(p, k, s.x, cy - 0.4 * h, 1.3 + 1.0 * h, TOWN.fire, 0.13 * Math.min(1.6, h), 0.8)
  if (u < 0.5) glow(p, k, s.x, cy - 0.8, 4.5, TOWN.fireHot, 0.35 * Math.exp(-u / 0.12))
  // The flames, up out of the hole: clipped along its lower lip.
  const lip = hole.filter(([, y]) => y >= cy).sort((a, b) => b[0] - a[0])
  p.push()
  ctx.beginPath()
  ctx.moveTo((s.x - 4) * k, (cy - 9) * k)
  ctx.lineTo((s.x + 4) * k, (cy - 9) * k)
  ctx.lineTo((s.x + 4) * k, cy * k)
  ctx.lineTo((s.x + hw * 1.3) * k, cy * k)
  for (const [x, y] of lip) ctx.lineTo(x * k, y * k)
  ctx.lineTo((s.x - hw * 1.3) * k, cy * k)
  ctx.lineTo((s.x - 4) * k, cy * k)
  ctx.closePath()
  ctx.clip()
  fire(p, k, s.x, cy + hh * 0.7, hw * 2.1, h, { t, seed: s.seed, lean: 0.14, light: 1 })
  p.pop()
  sparks(p, k, s.x, cy - 0.3, u, 16, 5.5, s.seed)
}

function drawShip(p: p5, k: number, W: number, ink: string, t: number): void {
  const s = ship(t)
  if (s.x < -30 || s.x > 60) return
  const night = FLEET_DARK
  p.push()
  p.translate(s.x * k, s.y * k)
  p.rotate(s.roll)
  drawWarship(p, k * W2.s, W, ink, { t: s.oars, face: -1, color: night })
  // The bomb bay under the keel: an opening, its two doors hinged at its ends and swinging down, and in it the
  // noses of what is left of the stick. (Drawn in the drawing's own units: turned as it turns itself.)
  p.scale(-1, 1)
  const K = k * W2.s
  const open = Math.max(0, Math.min(1.15, bayOpen(t)))
  const blown = t >= BLOWN
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(mixHex(TOWN.nightHigh, TOWN.fire, Math.min(1, open * 0.55 + (blown ? 0.4 : 0))))
  p.rectMode(p.CORNER)
  p.rect((BAY.x - BAY.w) * K, (BAY.y - 0.05) * K, 2 * BAY.w * K, 0.1 * K)
  const left = STICK.filter((l) => t < l - STICK_FALL).length
  p.fill(WASTES.ironDark)
  for (let i = 0; i < left && !blown; i++) {
    const bx = BAY.x - BAY.w + 0.08 + i * ((2 * BAY.w - 0.16) / 5)
    p.ellipse(bx * K, (BAY.y + 0.03) * K, 0.06 * K, 0.09 * K)
  }
  // The doors: the one Howl tears (on the ship's stern side) hangs further and swings; the blast takes both.
  p.fill(night)
  const torn = step(t - DOORS, 0.05)
  for (const side of [-1, 1] as const) {
    if (blown) break
    const hx = BAY.x + side * BAY.w
    const extra = side < 0 ? torn * 0.55 + ring(t - DOORS, 0.25, 12, 0.5) : 0
    const a = side * (open * 1.2) + side * extra
    p.push()
    p.translate(hx * K, (BAY.y + 0.05) * K)
    p.rotate(a)
    p.rect(side > 0 ? -BAY.w * K : 0, 0, BAY.w * K, 0.035 * K)
    p.pop()
  }
  p.pop()
  // Lit from under by the burning town.
  const [ux, uy] = onShip(t, 0, 0.5)
  glow(p, k, ux, uy, 8.5, TOWN.ember, 0.1 + 0.07 * smooth(t, 222, 231), 0.28)
  // The bow, where Howl strikes it first: a small fire that stays.
  if (t >= BOW) {
    const [fx, fy] = onShip(t, 2.55, -0.1)
    fire(p, k, fx, fy, 0.55, 0.4 + 0.2 * Math.exp(-(t - BOW) / 0.4), { t, seed: 101, lean: 0.4 })
    sparks(p, k, fx, fy, t - BOW, 14, 4.5, 102)
  }
  if (t >= DOORS) {
    const [dx, dy] = onShip(t, BAY.x - BAY.w, BAY.y + 0.05)
    sparks(p, k, dx, dy, t - DOORS, 16, 4.8, 103)
  }
  // Blown: fire out of the bay, and again along the hull.
  if (blown) {
    const u = t - BLOWN
    const [bx, by] = onShip(t, BAY.x, BAY.y + 0.1)
    glow(p, k, bx, by, 4.5 + 3 * Math.exp(-u / 0.4), TOWN.fire, 0.2 + 0.5 * Math.exp(-u / 0.3))
    fire(p, k, bx, by + 0.55, 1.5, 0.7 + 1.8 * Math.exp(-u / 0.5), { t, seed: 104, lean: -0.3 })
    sparks(p, k, bx, by, u, 26, 7.5, 105)
    if (t >= AGAIN) {
      const [ax, ay] = onShip(t, -1.2, -0.2)
      const v = t - AGAIN
      glow(p, k, ax, ay, 3 + 2 * Math.exp(-v / 0.3), TOWN.fire, 0.12 + 0.35 * Math.exp(-v / 0.3))
      fire(p, k, ax, ay, 0.8, 0.5 + 1.1 * Math.exp(-v / 0.45), { t, seed: 106, lean: -0.3 })
      sparks(p, k, ax, ay, v, 18, 6, 107)
    }
  }
  // The stick in the air.
  for (const sb of stickBombs) {
    if (t < sb.rel || t >= sb.land) continue
    const u = t - sb.rel
    const [x, y] = fallFrom(sb.p0, sb.v0, u)
    bomb(p, k, W, ink, x, y, Math.atan2(sb.v0[1] + G * u, sb.v0[0]), 1.3)
  }
}

function drawHowl(p: p5, k: number, W: number, ink: string, t: number): void {
  if (t < HOWL_FROM || t >= HOWL_TO) return
  const {
    p: [x, y],
    v: [vx, vy],
  } = HOWL(t)
  const speed = Math.hypot(vx, vy)
  // Seen as the film shows him: wings spread wide to either side, tail down, banking into his way; in a fast dive
  // they sweep back and in.
  const heading = -Math.PI / 2 + Math.max(-0.5, Math.min(0.5, vx * 0.07))
  const dive = smooth(vy, 3, 8)
  // He beats his wings climbing and when slow, and holds them in a glide when fast.
  const beat = Math.max(0, Math.min(1, 1 - (speed - 3) / 5)) * (1 - 0.7 * dive)
  const flap = Math.asin(Math.max(-1, Math.min(1, beat * Math.sin(t * 2 * Math.PI * 2.1))))
  let jolt = 0
  for (const blow of HOWL_BLOWS) jolt += ring(t - blow, 0.35, 22, 0.16)
  const S = wingScale(t)
  // The fire's light behind him, so he reads against the dark.
  glow(p, k, x, y + 0.1, 0.75 * S, TOWN.fire, 0.16)
  p.push()
  p.translate(x * k, y * k)
  drawWings(p, k * S, W * 0.9, ink, { t, spread: 1 - 0.3 * dive, flap: flap + jolt - 0.5 * dive, heading })
  p.pop()
}

/** The blasts she hears close: each shakes dust down out of the jetties' beams along the street. */
const SHAKES = [DOOR_BURST, ...FAR_FLASHES]
function drawDust(p: p5, k: number, t: number): void {
  const col = mixHex(TOWN.plasterShade, TOWN.cobble, 0.4)
  SHAKES.forEach((at, s) => {
    const u = t - at
    if (u < 0 || u > 2.4) return
    FRONTS.forEach((f, j) => {
      const beam = HOUSES[j].floors[1]
      // One trickle a house, and only along her stretch of the street.
      if (f.x0 > 7) return
      for (let i = 0; i < 1; i++) {
        const x = f.x0 + 0.4 + (f.x1 - f.x0 - 0.8) * hash(i, j, 60 + s)
        // A soft trickle: overlapping puffs of many sizes, spreading as they fall, thinning out.
        for (let q = 0; q < 9; q++) {
          const v = u - 0.035 * q - 0.12 * hash(i, q, 61 + s)
          if (v < 0) continue
          const y = beam + 0.08 + 1.2 * v * v + 0.3 * v
          if (y > GROUND - 0.1) continue
          const r = (0.05 + 0.1 * hash(q, i, 62 + s)) * (1 + 1.6 * v)
          const a = 0.24 * Math.pow(1 - v / 2.4, 1.5) * (0.5 + 0.5 * hash(q, j, 63))
          puff(p, k, x + 0.08 * Math.sin(v * 4 + q) + 0.05 * (hash(q, i, 64) - 0.5), y, r, col, a, 1)
        }
      }
    })
  })
}

function drawFeathers(p: p5, k: number, W: number, ink: string, t: number): void {
  const edge = mixHex(HOWL_BIRD, TOWN.smoke, 0.5)
  for (const [born, seed] of FEATHERS) {
    const u = t - born
    if (u < 0 || u > 5) continue
    const [x0, y0] = HOWL(born).p
    const drift = 0.35 * u + 0.25 * Math.sin(u * 2.2 + seed)
    const x = x0 + (hash(seed, 1, 31) - 0.5) * 0.6 + drift
    const y = y0 + 0.2 + 0.55 * u + 0.15 * u * u
    const rock = 0.7 * Math.sin(u * 3.1 + seed) + 1.2 * hash(seed, 2, 31)
    const len = 0.22 + 0.12 * hash(seed, 3, 31)
    const fade = 1 - smooth(u, 3.5, 5)
    p.push()
    p.translate(x * k, y * k)
    p.rotate(rock)
    p.stroke(alpha(p, ink, 0.7 * fade))
    p.strokeWeight(W * 0.4)
    p.fill(alpha(p, hash(seed, 4, 31) > 0.5 ? HOWL_BIRD : edge, fade))
    p.beginShape()
    p.vertex(-len * 0.5 * k, 0)
    p.quadraticVertex(0, -len * 0.22 * k, len * 0.5 * k, 0)
    p.quadraticVertex(0, len * 0.16 * k, -len * 0.5 * k, 0)
    p.endShape(p.CLOSE)
    p.pop()
  }
}

function drawTheBomb(p: p5, k: number, W: number, ink: string, t: number): void {
  const bm = theBomb(t)
  if (bm) {
    glow(p, k, bm.p[0], bm.p[1], 0.55, TOWN.fire, 0.22)
    bomb(p, k, W, ink, bm.p[0], bm.p[1], bm.ang, 1.5)
  }
  if (t >= TURNED) sparks(p, k, STRUCK[0], STRUCK[1], t - TURNED, 10, 3.5, 99)
}

/** The engine's copper: its bands, and the air vessel between the pump barrels. */
const COPPER = '#B8703E'
/** The engine's far side, in its own units: seen side on and a little from above, the far side is up and to the right. */
const DEPTH: Pt = [0.13, -0.15]
/** The tank: its near face's ends, its floor and its top (engine units, up is minus). */
const TANK = { x0: -0.72, x1: 0.72, y0: -0.26, y1: -0.8 }

/**
 * The fire engine, side on and a little from above: a squat wooden tank of water, planked, banded in copper, on four
 * small spoked wheels; standing up out of its water the copper air vessel with the pivot's iron fork on it, and the
 * two brass pump barrels either side, their rods up to the pump beam; the beam a see-saw over the tank, a pole along
 * each side joined by a handle bar across each end (she rides the left one); the leather hose out of the tank's front,
 * sagging to the cobbles and back up to the brass branch pipe clamped at its front corner, aimed at the fire; the push
 * handle at its back. It rolls as she pushes it, rocks on the burst, and its beam goes as she rides it.
 */
function drawEngine(p: p5, k: number, W: number, ink: string, t: number): void {
  const base = outside(t)
  // In the night with the set: a step toward the indigo, so it stands in the street, not on it.
  const tone = (hex: string) => mixHex(base(hex), INDIGO, 0.18)
  const ex = engineX(t)
  const roll = ring(t - STREET, 0.045, 13, 0.4) + ring(t - JOURNEY.push[0], 0.012, 15, 0.2)
  const wood = tone(TOWN.timber)
  const dark = tone(TOWN.timberDark)
  const copper = tone(COPPER)
  const copperDark = mixHex(copper, dark, 0.45)
  const brass = mixHex(tone(TOWN.gold), TOWN.fire, 0.15)
  const iron = tone(WASTES.ironDark)
  const leather = mixHex(dark, '#2A1A14', 0.5)
  const water = tone(mixHex(TOWN.canal, TOWN.slateDark, 0.55))
  const X = (v: number) => v * k * ES
  const [dx, dy] = DEPTH
  const poly = (pts: Pt[]) => {
    p.beginShape()
    for (const [x, y] of pts) p.vertex(X(x), X(y))
    p.endShape(p.CLOSE)
  }
  /** A bar from a to b, `w` thick (engine units), filled, inked. */
  const bar = (a: Pt, c: Pt, w: number) => {
    const L = Math.hypot(c[0] - a[0], c[1] - a[1])
    const nx = (-(c[1] - a[1]) / L) * (w / 2)
    const ny = ((c[0] - a[0]) / L) * (w / 2)
    poly([
      [a[0] + nx, a[1] + ny],
      [c[0] + nx, c[1] + ny],
      [c[0] - nx, c[1] - ny],
      [a[0] - nx, a[1] - ny],
    ])
  }
  // The beam: its pivot, and its two ends on the near side (her end's height where she has it).
  const py = (BRAKE.pivot - GROUND) / ES
  const lx = -BRAKE.reach / ES
  const ly = (brakeEnd(t) - GROUND) / ES
  const rx = -lx
  const ry = 2 * py - ly
  const beamAt = (x: number) => py + ((ly - py) * x) / lx
  const turn = (ex - JOURNEY.x0) / WHEEL
  const wr = WHEEL / ES
  const wheel = (cx: number, cy: number, far: boolean) => {
    p.push()
    p.translate(X(cx), X(cy))
    p.rotate(turn)
    p.stroke(ink)
    p.strokeWeight(W * 0.8 + 0.05 * k * ES)
    p.noFill()
    p.circle(0, 0, X(2 * wr - 0.05))
    p.stroke(far ? mixHex(iron, INDIGO, 0.4) : iron)
    p.strokeWeight(0.05 * k * ES)
    p.circle(0, 0, X(2 * wr - 0.05))
    if (far) p.stroke(alpha(p, ink, 0.6))
    else p.stroke(ink)
    p.strokeWeight(W * 0.7)
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3
      p.line(0, 0, X((wr - 0.05) * Math.cos(a)), X((wr - 0.05) * Math.sin(a)))
    }
    p.fill(far ? dark : copperDark)
    p.rect(X(-0.045), X(-0.045), X(0.09), X(0.09))
    p.pop()
  }

  p.push()
  p.translate(ex * k, GROUND * k)
  p.rotate(roll)
  p.rectMode(p.CORNER)
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  // The far wheels, behind the tank.
  for (const cx of [-0.44, 0.44]) wheel(cx + dx, -wr + dy * 0.6, true)
  // The tank: its right side, and its top (the water in it, a copper rim round it).
  p.fill(mixHex(wood, dark, 0.55))
  poly([
    [TANK.x1, TANK.y1],
    [TANK.x1 + dx, TANK.y1 + dy],
    [TANK.x1 + dx, TANK.y0 + dy],
    [TANK.x1, TANK.y0],
  ])
  p.fill(water)
  poly([
    [TANK.x0, TANK.y1],
    [TANK.x1, TANK.y1],
    [TANK.x1 + dx, TANK.y1 + dy],
    [TANK.x0 + dx, TANK.y1 + dy],
  ])
  // Standing up out of its water: the two pump barrels, and between them the copper air vessel, domed, with the
  // pivot's iron fork on its crown.
  const mid = (x: number, y: number): Pt => [x + dx / 2, y + dy / 2]
  for (const bx of [-0.45, 0.45]) {
    const [cx, cy] = mid(bx, TANK.y1)
    p.fill(brass)
    p.rect(X(cx - 0.075), X(cy - 0.12), X(0.15), X(0.14))
    p.fill(copperDark)
    p.rect(X(cx - 0.09), X(cy - 0.14), X(0.18), X(0.03))
  }
  const [vx, vy] = mid(0, TANK.y1)
  p.fill(copper)
  p.beginShape()
  p.vertex(X(vx - 0.13), X(vy + 0.02))
  p.vertex(X(vx - 0.13), X(vy - 0.2))
  p.bezierVertex(X(vx - 0.13), X(vy - 0.33), X(vx + 0.13), X(vy - 0.33), X(vx + 0.13), X(vy - 0.2))
  p.vertex(X(vx + 0.13), X(vy + 0.02))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(W * 0.45)
  p.line(X(vx - 0.13), X(vy - 0.12), X(vx + 0.13), X(vy - 0.12))
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  // The standard: an iron A over the vessel, up to the pivot, where the beam balances.
  p.fill(iron)
  for (const side of [-1, 1]) bar([side * 0.26, TANK.y1 - 0.02], [side * 0.03, py], 0.05)
  bar([-0.17, (TANK.y1 + py) / 2 + 0.06], [0.17, (TANK.y1 + py) / 2 + 0.06], 0.04)
  // The tank's near face: planked, a copper band round its top and a copper strap down each corner.
  p.fill(wood)
  p.rect(X(TANK.x0), X(TANK.y1), X(TANK.x1 - TANK.x0), X(TANK.y0 - TANK.y1))
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(W * 0.45)
  for (const y of [-0.44, -0.62]) p.line(X(TANK.x0 + 0.06), X(y), X(TANK.x1 - 0.06), X(y))
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(copper)
  p.rect(X(TANK.x0), X(TANK.y1), X(TANK.x1 - TANK.x0), X(0.07))
  p.rect(X(TANK.x0), X(TANK.y1), X(0.07), X(TANK.y0 - TANK.y1))
  p.rect(X(TANK.x1 - 0.07), X(TANK.y1), X(0.07), X(TANK.y0 - TANK.y1))
  // The barrels' rods, up to the beam between its two poles.
  p.strokeWeight(W * 0.7)
  for (const bx of [-0.45, 0.45]) {
    const [cx, cy] = mid(bx, TANK.y1)
    p.line(X(cx), X(cy - 0.12), X(cx), X(beamAt(cx)))
  }
  p.strokeWeight(W * 0.8)
  // The beam, a see-saw on the pivot; a handle bar across each end, going back into the picture (she rides the left).
  p.fill(dark)
  for (const [ex0, ey0] of [
    [lx, ly],
    [rx, ry],
  ] as Pt[])
    bar([ex0 - dx * 0.35, ey0 - dy * 0.35], [ex0 + dx * 1.35, ey0 + dy * 1.35], 0.07)
  p.fill(wood)
  bar([lx - 0.05, ly - (0.05 * (ry - ly)) / (rx - lx)], [rx + 0.05, ry + (0.05 * (ry - ly)) / (rx - lx)], 0.06)
  p.fill(brass)
  p.rect(X(-0.045), X(py - 0.045), X(0.09), X(0.09))
  // The push handle at its back, where her hands go.
  p.fill(dark)
  p.rect(X(-0.86), X(-0.58), X(0.15), X(0.05))
  p.rect(X(-0.91), X(-0.62), X(0.06), X(0.5))
  // The hose: out of the tank's front low down (a brass coupling), sagging to the cobbles, and up again to the branch
  // pipe; leather, thick and soft.
  const hose = () => {
    p.beginShape()
    p.vertex(X(0.74), X(-0.4))
    p.bezierVertex(X(0.95), X(-0.38), X(0.98), X(-0.05), X(1.12), X(-0.05))
    p.bezierVertex(X(1.3), X(-0.05), X(1.12), X(-0.62), X(BRANCH[0] + 0.02), X(BRANCH[1] + 0.03))
    p.endShape()
  }
  p.noFill()
  p.strokeWeight(W * 0.8 + 0.075 * k * ES)
  hose()
  p.stroke(leather)
  p.strokeWeight(0.075 * k * ES)
  hose()
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(brass)
  p.rect(X(0.72), X(-0.45), X(0.06), X(0.1))
  // The clamp: an iron bracket off the tank's front corner holding the branch pipe.
  p.fill(iron)
  bar([TANK.x1 - 0.02, TANK.y1 + 0.02], [BRANCH[0] + 0.03, BRANCH[1] - 0.01], 0.035)
  // The branch pipe: brass, tapering to the nozzle, along the water's way out.
  const bl = Math.hypot(NOZZLE[0] - BRANCH[0], NOZZLE[1] - BRANCH[1])
  const ux = (NOZZLE[0] - BRANCH[0]) / bl
  const uy = (NOZZLE[1] - BRANCH[1]) / bl
  p.fill(brass)
  poly([
    [BRANCH[0] - uy * 0.05, BRANCH[1] + ux * 0.05],
    [NOZZLE[0] - uy * 0.022, NOZZLE[1] + ux * 0.022],
    [NOZZLE[0] + uy * 0.022, NOZZLE[1] - ux * 0.022],
    [BRANCH[0] + uy * 0.05, BRANCH[1] - ux * 0.05],
  ])
  p.fill(copperDark)
  bar([BRANCH[0] - ux * 0.02, BRANCH[1] - uy * 0.02], [BRANCH[0] + ux * 0.05, BRANCH[1] + uy * 0.05], 0.13)
  // The near wheels.
  for (const cx of [-0.44, 0.44]) wheel(cx, -wr, false)
  p.pop()
  // The crater's fire lights its near side, the side she works it from turned to the fire.
  const heat = craterLight(t)
  if (heat > 0) {
    glow(p, k, ex + 1.2, GROUND - 0.7, 1.8, TOWN.fire, 0.16 * heat, 0.8)
    glow(p, k, ex - 0.2, GROUND - 1.4, 1.5, TOWN.ember, 0.07 * heat, 0.9)
  }
}

/** How strongly the crater's fire lights the street near it (0..1): up with the burst, down under her water, flickering. */
function craterLight(t: number): number {
  const u = t - STREET
  if (u < 0) return 0
  return step(u, 0.04) * (1 - 0.55 * doused(t)) * (1 - 0.3 * landing(t)) * (0.88 + 0.12 * wobble(t * 5.1, 11))
}

/**
 * The fire's light on her: a soft warm pool on the cobbles from the crater to her feet, and a warm rim on the side of
 * her turned to it (before the burst, a fainter one from the burning quarter up the street). Drawn over her, inside her
 * outline, so her silver takes the light without a second shape anywhere near her.
 */
function drawPool(p: p5, k: number, t: number): void {
  const heat = craterLight(t)
  if (heat <= 0) return
  const [sx] = sophieAt(t)
  const mid = (sx + CRATER[0]) / 2
  glow(p, k, mid, GROUND + 0.05, Math.max(3.2, (CRATER[0] - sx) * 0.62 + 1.4), TOWN.fire, 0.2 * heat, 0.16)
  glow(p, k, sx + 0.35, GROUND + 0.05, 1.4, TOWN.ember, 0.16 * heat, 0.2)
}
/** The wall behind where she ducks, climbs and pumps: in the smoke's shadow, so her silver reads against dark. */
function drawShade(p: p5, k: number, t: number): void {
  const a = 0.3 * smooth(t, STREET - 0.4, STREET + 1.2) * (1 - smooth(t, 232.2, 234))
  if (a <= 0.004) return
  puff(p, k, (HUSH[0] + HUSH[1]) / 2 - 0.2, GROUND - 1.9, 2.9, mixHex(INDIGO, TOWN.smoke, 0.25), a, 0.62)
}
function drawRim(p: p5, k: number, W: number, t: number): void {
  if (looking(t)) return
  const [sx, sy] = sophieAt(t)
  const crater = craterLight(t)
  const street = 0.45 * smooth(t, 207, 209.5) * (1 - smooth(t, 233.5, 235.5))
  const a = Math.max(0.85 * crater, 0.4 * street)
  if (a <= 0.01) return
  // The light comes from the crater once it burns, before that from the quarter burning up the street.
  const lx = crater > 0.05 ? CRATER[0] : STREET_END + 2
  const ly = GROUND - 0.7
  const d = Math.hypot(lx - sx, ly - sy) || 1
  const ux = (lx - sx) / d
  const uy = (ly - sy) / d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.arc(sx * k, sy * k, Math.max(0, R * k - W * 0.45), 0, 2 * Math.PI)
  ctx.clip()
  const cx = (sx + ux * R * 1.15) * k
  const cy = (sy + uy * R * 1.15) * k
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25 * k)
  g.addColorStop(0, rgba(TOWN.fireHot, a))
  g.addColorStop(0.45, rgba(TOWN.fire, a * 0.7))
  g.addColorStop(1, rgba(TOWN.fire, 0))
  ctx.fillStyle = g
  ctx.fillRect((sx - R) * k, (sy - R) * k, 2 * R * k, 2 * R * k)
  ctx.restore()
}

/** The water reaching the fire now (0..1): each stroke's pulse as it lands, and a breath after. */
const landing = (t: number): number => Math.max(flow(t - JET_T), 0.75 * flow(t - JET_T - 0.14), 0.45 * flow(t - JET_T - 0.3))

/**
 * The water: out of the nozzle on each stroke (as fast as she drives the beam down) and over onto the fire in the
 * crater. Never a line: a stream of drops, each let go with its own small error of speed and aim, so it holds together
 * as it leaves the nozzle and breaks up along its way into drops of every size and a mist, lit by the fire as it
 * comes to it; where it strikes, steam, a plume on each stroke.
 */
function drawJet(p: p5, k: number, t: number): void {
  const [r0, r1] = JOURNEY.ride
  if (t < r0 || t > r1 + JET_T + 2.6) return
  const [nx, ny] = nozzle()
  const water = mixHex(mixHex(TOWN.canal, TOWN.plaster, 0.5), INDIGO, 0.1)
  const steam = mixHex(mixHex(TOWN.plasterShade, TOWN.smoke, 0.3), TOWN.fire, 0.12)
  const warm = (x: number) => Math.max(0, Math.min(1, (x - nx) / (JET_AT[0] - nx)))
  // The steam first, so the water strikes into it: puffs off either side of where it lands, wide and flat, rising
  // fast and leaning with the wind, thin; the most on the stroke's pulse.
  for (let s = Math.max(r0, t - JET_T - 2.4); s <= Math.min(r1, t - JET_T); s += 0.04) {
    const q = flow(s)
    if (q < 0.05) continue
    const age = t - (s + JET_T)
    if (age < 0 || age >= 2.4) continue
    const u = age / 2.4
    const n = Math.round(s * 25)
    const side = hash(n, 1, 71) - 0.5
    const x = JET_AT[0] + 1.0 * side + (0.35 + 0.4 * side) * age
    const y = JET_AT[1] - 0.1 - 1.6 * age * (1 - 0.3 * u)
    puff(p, k, x, y, 0.35 + 0.8 * Math.sqrt(u), steam, 0.2 * q * Math.pow(1 - u, 1.4) * Math.min(1, age / 0.12), 0.55)
  }
  const EMIT = 1 / 80
  const LIFE = JET_T * 1.2
  // The mist: soft and faint, along the back half of the way and over the fire where it lands.
  for (let s = Math.ceil((t - LIFE) / EMIT) * EMIT; s <= t; s += EMIT * 3) {
    const q = flow(s)
    const a = t - s
    if (q < 0.05 || a < JET_T * 0.35) continue
    const n = Math.round(s / EMIT)
    const vx = JET_V[0] * (1 + 0.1 * (hash(n, 7, 81) - 0.5))
    const vy = JET_V[1] + 1.2 * (hash(n, 8, 81) - 0.5)
    const x = nx + vx * a
    const y = Math.min(GROUND - 0.2, ny + vy * a + 0.5 * G * a * a) - 0.3 * Math.max(0, a - JET_T)
    const r = 0.12 + 0.35 * (a / LIFE) + 0.1 * hash(n, 9, 81)
    puff(p, k, x, y, r, mixHex(water, TOWN.fireHot, 0.3 * warm(x)), 0.1 * q * (1 - smooth(a, JET_T, LIFE)), 0.7)
  }
  // The drops: streaks along their way (never beads), of every size, translucent.
  p.push()
  p.strokeCap(p.ROUND)
  for (let s = Math.ceil((t - LIFE) / EMIT) * EMIT; s <= t; s += EMIT) {
    const q = flow(s)
    if (q < 0.04) continue
    const a = t - s
    const n = Math.round(s / EMIT)
    for (let j = 0; j < 3; j++) {
      const h1 = hash(n, j, 83)
      const h2 = hash(n, j, 89)
      const h3 = hash(n, j, 97)
      const vx = JET_V[0] * (1 + 0.22 * (h1 - 0.5))
      const vy = JET_V[1] + 2.0 * (h2 - 0.5)
      const x = nx + vx * a
      const y = ny + vy * a + 0.5 * G * a * a
      // Into the fire, or onto the cobbles, and gone.
      if (y > GROUND - 0.04 || a > LIFE) continue
      const vyn = vy + G * a
      const sp = Math.hypot(vx, vyn)
      const len = sp * (0.018 + 0.03 * h3) * (a < 0.06 ? 1.8 : 1)
      // Whole as it leaves the nozzle, breaking up along the way: the thin ones go to mist first.
      const size = (0.014 + 0.055 * h3 * h3 * h1) * (0.55 + 0.7 * q) * (1 + 0.8 * (1 - smooth(a, 0, 0.12)))
      const thin = 1 - smooth(a, JET_T * (0.55 + 0.5 * h3), LIFE)
      const op = (0.18 + 0.4 * h3) * Math.min(1, q * 2.2) * thin
      if (op < 0.02) continue
      p.stroke(alpha(p, mixHex(water, TOWN.fireHot, 0.4 * warm(x)), op))
      p.strokeWeight(size * k)
      p.line((x - (vx / sp) * len) * k, (y - (vyn / sp) * len) * k, x * k, y * k)
    }
  }
  p.pop()
}

export const raid = part<{ begin: number }>(
  {
    name: 'raid',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      if (t < B - 0.6 || t > E + 0.8) return
      const { k, ink, weight: W } = c
      const f = frame(p, k)
      p.push()
      drawShopFloor(p, k, t)
      drawNight(p, k, t, f)
      drawShopSide(p, k, t, f)
      drawSky(p, k, t, f)
      drawFarShip(p, k, W, ink, t)
      // Beyond the roofs: fires and their smoke, and the burning quarter past the street's end.
      drawFarFires(p, k, t, f)
      drawQuarter(p, k, t, f)
      drawLamps(p, k, t)
      // The houses across the street: their lights out, then their fire; the roofs burning, and their smoke.
      drawWindows(p, k, W, ink, t)
      drawShade(p, k, t)
      drawDust(p, k, t)
      for (let i = 0; i < SITES.length; i++) if (!SITES[i].far) drawRoofFire(p, k, W, SITES[i], t)
      for (let i = 0; i < SITES.length; i++) if (!SITES[i].far) smoke(p, k, SMOKES[i], t)
      embers(p, k, 0, STREET_END, -8, t, B - 3, 6, 5)
      // The sky's war.
      drawShip(p, k, W, ink, t)
      smoke(p, k, SHIP_TRAIL, t)
      drawBombers(p, k, W, ink, t)
      smoke(p, k, LEAD_TRAIL, t)
      for (const [ft, fx, fy, fs] of FLAK) flak(p, k, fx, fy, t - ft, Math.round(ft * 10), fs)
      drawFeathers(p, k, W, ink, t)
      drawHowl(p, k, W, ink, t)
      drawTheBomb(p, k, W, ink, t)
      // The street.
      drawStreetBurst(p, k, W, ink, t)
      drawPool(p, k, t)
      smoke(p, k, CRATER_SMOKE, t)
      embers(p, k, CRATER[0] - 1, CRATER[0] + 1, GROUND - 0.5, t, STREET, 5, 6)
      // Her shadow on the cobbles, so she stands out of them; the fire engine she works, and its water.
      const [sx, sy] = sophieAt(t)
      if (!looking(t)) puff(p, k, sx, GROUND - 0.01, 0.34, TOWN.nightHigh, 0.5 * (1 - smooth(-sy, 0.1, 1.6)), 0.22)
      drawEngine(p, k, W, ink, t)
      drawJet(p, k, t)
      ash(p, k, f, t, 1)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      if (t < B - 0.6 || t > E + 0.8) return
      const { k, weight: W } = c
      const f = frame(p, k)
      drawRim(p, k, W, t)
      // The flashes: the whole picture lit for a moment.
      // The fires' light, flickering, stronger as the street burns: up from the street over the ground floors, never
      // over the sky (a wash over the whole picture made the night beige).
      const flicker = 0.04 + 0.03 * smooth(t, 220, 232) + 0.016 * wobble(t * 6.3, 3)
      skyGlow(p, k, f.x0, f.x1, GROUND + 0.8, 7.5, TOWN.ember, flicker)
      const a = flashAt(t)
      if (a > 0.004) {
        const ctx = p.drawingContext as CanvasRenderingContext2D
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = `rgba(255, 170, 90, ${Math.min(0.4, a).toFixed(4)})`
        ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
        ctx.restore()
      }
      // Smoke drifting down the street toward the shop, low, in front of everything: soft billows lit from under. It
      // thins where she is, so it never veils her.
      const thick = 0.16 + 0.12 * (1 - smooth(t, 207, 210)) + 0.1 * smooth(t, 219, 230)
      const [hx, hy] = sophieAt(t)
      for (let i = 0; i < 18; i++) {
        const span = 40
        const x = ((((hash(i, 2, 9) * span - 0.5 * t) % span) + span) % span) - 12
        const r = 0.7 + 0.9 * hash(i, 1, 9)
        if (x + r < f.x0 || x - r > f.x1) continue
        const y = GROUND - 0.1 - 1.3 * hash(i, 3, 9) + 0.12 * Math.sin(t * 0.8 + i)
        const clear = smooth(Math.hypot(x - hx, (y - hy) * 1.6), r * 0.5, r + 0.9)
        puff(p, k, x, y, r, mixHex(TOWN.smoke, TOWN.ember, 0.3 + 0.2 * hash(i, 4, 9)), thick * (0.6 + 0.4 * hash(i, 5, 9)) * clear, 0.55)
      }
      // A near burst's light comes over the roofs from above.
      const over = flashAt(t)
      if (over > 0.02) glow(p, k, f.cx + 0.2 * (f.x1 - f.x0), f.y0, (f.y1 - f.y0) * 0.9, TOWN.fire, Math.min(0.5, over * 1.6), 0.7)
    },
  },
  (slot) => {
    const howl: Company = {
      who: 'howl',
      from: HOWL_FROM,
      to: HOWL_TO,
      at: (t) => {
        const [x, y] = HOWL(t).p
        return { x, y, color: HOWL_BIRD }
      },
    }
    return {
      cells: box(-14, -26, 30, 5, 2),
      exit: [INSIDE[0] + 0.5, 0] as Pt,
      lane: { segs: LANE, fire: DOOR_BURST - slot.begin },
      state: { begin: slot.begin },
      company: [howl],
    }
  },
  () => {
    // Close on her out of the door and up to the engine, and on her all through; the war over her is seen by looking
    // up, a cut on a strike each way: a frame of sky with the roofline along its foot, the bombers, the warship and
    // Howl black against the burning smoke (her ball hidden while she is under its foot, `LOOKS`). Four looks up: the
    // tear, the searchlight finding him, the bay opening and the ship blowing; and one close on Howl as he stoops
    // through the street and strikes the bomb aside over her head. Her frames are closes (5 cells or less at the
    // raid's heart, 19 px and more at 640x360), their foot at the kerb (a sixth of the frame of cobbles, the Zoom
    // margin) and their top under the eaves, so no roof is ever cut by the frame's edge: the burning roofs are seen
    // whole in the looks up, or from her beam as the fire takes the upper floors.
    /** A hold with her `up` of the way up the frame from its foot, standing at height `y`. */
    const her = (t: number, cells: number, x: number, up: number, y = 0): PartShot => ({ t, cells, hold: [x, y - (0.5 - up) * cells] })
    /** A look up: `cells` tall, the roofline along its foot (the foot at `foot`). */
    const sky = (t: number, cells: number, x: number, foot: number, cut = false): PartShot => ({ t, cells, hold: [x, foot - cells / 2], cut })
    /** Her height while she pumps, between the beam's up and down. */
    const PUMP = -1.5
    const LX = JOURNEY.x1 - BRAKE.reach
    const sx = (t: number) => WAY(t).p[0]
    const UP = 0.19
    return [
      { t: 206.3, cells: 4.7, off: [0.9, -0.82] },
      { t: 207.3, cells: 5.4, hold: [sx(207.3) + 1.2, -0.2 * 5.4] },
      her(208.4, 5.9, sx(208.4) + 1.5, 0.22),
      // Pushing the engine up the street, the lights going out along it behind her, the far stick's flashes on her.
      her(209.9, 6.2, sx(209.9) + 1.8, UP),
      her(b(9), 6.2, sx(b(9)) + 1.8, UP),
      her(212.35, 6.2, sx(212.35) + 1.8, UP),
      // Look up on the downbeat: the flight coming in over the roofline, Howl out of the dark tearing through the
      // lead bomber (212.985, 213.2) and it going down burning behind the roofs.
      sky(b(10), 9.0, 16.2, -7.85, true),
      sky(213.5, 9.2, 15.0, -7.85),
      sky(214.2, 9.3, 14.4, -7.85),
      // Back on her pushing; up again as the searchlight swings onto him (215.29) and the flak bursts beside him.
      { ...her(b(11, 2), 5.6, sx(b(11, 2)) + 1.7, UP), cut: true },
      her(215.05, 5.6, sx(215.05) + 1.7, UP),
      sky(b(12), 6.4, 7.4, -9.35, true),
      sky(215.88, 6.5, 7.9, -9.35),
      // In on her and the engine as she stops it: she glances up at him (216.78).
      { ...her(b(12, 3), 4.8, sx(b(12, 3)) + 1.55, 0.185), cut: true },
      her(217.55, 4.8, 6.85, 0.185),
      // On Howl as the bomber tosses its bomb at her: he stoops into the street and strikes it aside.
      { t: RELEASE, cells: 3.4, hold: [5.55, -0.45 - 1.7], cut: true },
      { t: TURNED - 0.02, cells: 3.35, hold: [5.15, -0.45 - 1.675] },
      // On her as it goes over her head: she ducks, it bursts up the street (218.88) and its fire lights her from the
      // right; the fire takes the house over it; she steps up to the engine and springs onto its beam.
      { ...her(TURNED, 4.9, 6.7, 0.18), cut: true },
      her(219.9, 4.9, 6.7, 0.18),
      her(221.3, 5.0, 7.05, 0.18),
      // Look up as she lands on it: the great warship over the roofs, its bay opening, the searchlight on it.
      sky(BAY_OPEN, 13.0, 17.4, -7.55, true),
      sky(222.2, 13.1, 16.9, -7.55),
      // Back on her, frozen on the beam looking up; she drives it down (222.65), and pumps, a stroke a bar.
      { ...her(r(2, 3), 5.0, LX + 1.9, 0.57, BRAKE.up), cut: true },
      her(r(4), 7.2, LX + 1.8, 0.36, PUMP),
      her(r(5), 8.2, LX + 1.9, 0.33, PUMP),
      // A medium over her as the stick comes down the roofs to the one over her and on to the shop's.
      her(r(6), 11.0, LX + 1.3, 0.33, PUMP),
      her(r(8), 11.0, LX + 0.5, 0.33, PUMP),
      her(r(9), 8.6, LX + 1.4, 0.33, PUMP),
      her(r(10), 9.6, LX + 0.9, 0.345, PUMP),
      // Look up on her step down: Howl goes into the bay and the ship blows (231.805, 232.153) over the hat shop.
      sky(r(10, 3), 13.0, 1.2, -7.55, true),
      sky(232.45, 13.4, 0.9, -7.55),
      // On her, running home.
      { ...her(r(12), 6.2, sx(r(12)) - 1.1, 0.2), cut: true },
      her(233.6, 6.2, sx(233.6) - 1.0, 0.2),
      her(234.6, 5.9, sx(234.6) - 0.6, 0.2),
      her(235.6, 5.4, sx(235.6) - 0.3, 0.21),
      { t: E, cells: SEAMS.hearth.cells, hold: [INSIDE[0] + SEAMS.hearth.frame[0], SEAMS.hearth.frame[1]] },
    ]
  },
)
