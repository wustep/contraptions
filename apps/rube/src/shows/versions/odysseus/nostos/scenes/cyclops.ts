import { region, smooth, smoother, standing } from '../draw'
import { BEAT, M } from '../music'
import { G, fly, flightFor, rest, ride, roll, type Move, type Pt } from '../path'
import type { Scene } from '../scene'
import { END, HELM, WINDOWS, glide, seat } from '../voyage'
import { floatAt, onShip, type ShipLook } from '../world/ship'
import { drawArm, drawBody, drawEye, drawRidge, drawRock, PREY, SPLASH_AT, thrownRock, type GiantLight } from './cyclops/giant'
import { drawFire, drawIsland, drawSplash, EMBER, FIRELIT, fireAt, INK, openAt } from './cyclops/island'
import { FLOOR, LEDGE, MOOR, PILLAR, RIDGE, STEP, T, ground } from './cyclops/plan'
import { carries, drawSheep, FLOCK, REST_X, setCarrying, under } from './cyclops/sheep'
import { drawClub, onClub } from './cyclops/stake'

/**
 * The Cyclops (140 → 187.234: the lament's last answer, the low voices coming in under it, their swell, and the pulse's
 * arrival). The three ships come in under a black island and lie off its shelf; the cave opens in its face like a door
 * in a doll's house. The flock goes in and the men after it, past a long dark heap inside the door; the heap's hand drags
 * the boulder into the mouth on the low voices' entry, and its one eye opens in the dark beside two of them. He heaves
 * up by his fire, and takes them. As he sleeps sitting up, the others climb his heap of fallen rock and roll onto the
 * butt of his club, which lies over a stone with its point in his fire; on the swell the hero drops from the pillar onto
 * its end and the point comes up into the eye. Blind, he grinds the boulder out and sits in the door feeling his flock
 * go under his hand, a man in the wool of each; the ships put out, and from the ridge he throws a piece of his hill
 * after them, which falls short among them as the pulse begins.
 *
 * Every hop, strike and pat is on a measured onset (`cyclops/plan.ts`, T).
 */

const [FROM, TO] = WINDOWS.cyclops
const R = 0.13
const r = 0.13 * 0.86

/* ------------------------------------------------------------------ the ships */

const x0 = (() => {
  const inn = glide([[FROM, 30, 4], [T.moored, MOOR[0], 0]])
  const out = glide([[T.away, MOOR[0], 0], [TO, 150, 4.5]])
  return (t: number) => (t < T.moored ? inn(t) : t < T.away ? MOOR[0] : out(t))
})()
const x1 = (() => {
  const inn = glide([[FROM, 24, 4], [T.moored + 0.3, MOOR[1], 0]])
  const out = glide([[T.under, MOOR[1], 0], [TO, 143, 4.5]])
  return (t: number) => (t < T.moored + 0.3 ? inn(t) : t < T.under ? MOOR[1] : out(t))
})()
const x2 = (() => {
  const inn = glide([[FROM, 18, 4], [T.moored + 0.6, MOOR[2], 0]])
  const out = glide([[T.under, MOOR[2], 0], [TO, 136, 4.5]])
  return (t: number) => (t < T.moored + 0.6 ? inn(t) : t < T.under ? MOOR[2] : out(t))
})()

/**
 * The ships' look: in under sail, the sail spilled and taken in and the mast lowered as they lie off the shelf, as
 * ships of the time did in harbour; out again under oars, pulling on the pulse's comb (as the giants' fjord takes them
 * on, rowing), with the mast stepped and the sail set.
 */
function look(arrive: number, leave: number): (t: number) => Partial<ShipLook> {
  return (t) => ({
    sail: 1 - smooth(t, arrive - 1.9, arrive - 1.1) + smooth(t, leave + 1.0, leave + 2.6),
    mastDown: smoother(t, arrive - 1.2, arrive + 0.1) - smoother(t, leave + 0.1, leave + 1.3),
    stroke: t >= leave ? (t - 188.35) / BEAT : undefined,
  })
}

const pose0 = (t: number) => floatAt(x0(t), t)
const deck = (t: number, local: Pt): Pt => onShip(pose0(t), local)

/* ------------------------------------------------------------------ helpers */

/** A ball of radius `rr` on the ground at `x` (shelf or floor), its middle off the ground along the ground's normal. */
function on(x: number, rr: number): Pt {
  const dy = ground(x + 0.05) - ground(x - 0.05)
  const slope = Math.atan2(dy, 0.1)
  return [x + rr * Math.sin(slope), ground(x) - rr * Math.cos(slope)]
}
const floorAt = (x: number, rr: number): Pt => [x, FLOOR - rr]

/** A hop from `a` to `b` landing at `t1`, peaking `h` over the higher end: its moves start at `t1 - flight time`. */
function hopTo(a: Pt, b: Pt, t1: number, h: number): Move {
  const T0 = flightFor(a, b, h)
  return fly(a, b, t1 - T0, t1)
}

/** A roll along the ground from `xa` to `xb` (floor or shelf), from `t0` to `t1`. */
function along(xa: number, xb: number, t0: number, t1: number, rr: number, ease: 'inout' | 'in' | 'out' | 'none' = 'inout'): Move {
  const xs = [xa]
  for (const k of [92.4, 93.6, 94.8, 95.9, 96.6]) if ((k - xa) * (k - xb) < 0) xs.push(k)
  xs.push(xb)
  xs.sort((p, q) => (xb > xa ? p - q : q - p))
  return roll(xs.map((x) => on(x, rr)), t0, t1, ease)
}

/** The corners of a roll's line: its points at even steps of its own time (a roll's line is straight between them). */
function sample(m: Move, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) out.push(m.at(m.t0 + ((m.t1 - m.t0) * i) / n))
  return out
}

/** A path for one ball from its moves: each begins where the last left it, so `start` is threaded through. */
class Way {
  readonly moves: Move[] = []
  constructor(public at: Pt, public t: number) {}
  push(m: Move): this {
    this.moves.push(m)
    this.at = m.at(m.t1)
    this.t = m.t1
    return this
  }
  wait(until: number, extra: Partial<Move> = {}): this {
    if (until > this.t + 1e-6) this.push(rest(this.at, this.t, until, extra))
    return this
  }
  hop(b: Pt, land: number, h: number): this {
    const m = hopTo(this.at, b, land, h)
    this.wait(m.t0)
    return this.push(fly(this.at, b, m.t0, m.t1))
  }
  /** Along the ground to `x`, from exactly where the ball is (riding out of the wool, it is a hair off the ground's normal). */
  rollTo(x: number, t1: number, rr: number, ease: 'inout' | 'in' | 'out' | 'none' = 'inout'): this {
    const m = along(this.at[0], x, this.t, t1, rr, ease)
    const pts = sample(m, 24)
    pts[0] = this.at
    return this.push(roll(pts, this.t, t1, ease))
  }
}

/* ------------------------------------------------------------------ the hero and his men */

/** Entering the mouth: hop from the deck up into it (the ship lies right under it), then in along the floor. */
const ENTER = { hero: 148.75, men: [148.9, 149.05, 149.2, 149.35, 149.5, 149.65] }
const LAND_X = { hero: 98.3, men: [98.1, 97.9, 97.7, 97.5, 97.3, 97.1] }
const STOP_X = { hero: 101.9, men: [101.55, 101.2, 100.85, 100.5, 100.15, 99.8] }
/** Creeping in toward the embers: the five behind his club's stone, the two curious ones on to the fire. */
const CREEP_X = { hero: 108.6, men: [108.25, 107.9, 107.55, 107.2, 105.55, 105.2] }
/** Hiding at the back once he is up: by the step. */
const HIDE_X = { hero: 113.9, men: [113.55, 113.2, 112.85, 112.5] }
/** Their places on the club's butt (cells from the stone), and when each gets there. */
const CLUB_S = { hero: -1.42, men: [-1.14, -0.9, -0.66, -0.42] }
/** The climb: [step landing, ledge landing] for men 3, 2, 1, 0 (the first up goes nearest the stone). */
const CLIMB: Record<number, [number, number, number]> = {
  3: [T.climb[0], T.climb[2], T.onA],
  2: [T.climb[1], 166.18, T.onA],
  1: [166.65, T.climb[4], T.onB],
  0: [T.climb[3], T.climb[5], T.onB],
}
/** Off the club, along the floor, and the ewe (or ram) each goes under: man 3 under the first out. */
const OFF_X = { hero: 110.9, men: [110.6, 110.3, 110.0, 109.7] }
const SHEEP_OF = { hero: 4, men: [3, 2, 1, 0] }

const STEP_X = 111.75
const LEDGE_X = 110.3
const PILLAR_TOP: Pt = [(PILLAR.x0 + PILLAR.x1) / 2, PILLAR.top - R]

/** Everyone hops at the boulder's thud. */
function startle(w: Way): void {
  const at = w.at
  w.wait(M.ground)
  w.push(fly(at, at, M.ground, M.ground + 2 * Math.sqrt((2 * 0.07) / G)))
}

function heroPath(): Move[] {
  const w = new Way(deck(ENTER.hero, HELM), ENTER.hero)
  w.hop(floorAt(LAND_X.hero, R), ENTER.hero + flightFor(deck(ENTER.hero, HELM), floorAt(LAND_X.hero, R), 0.25), 0.25)
  w.rollTo(STOP_X.hero, 150.6, R, 'out')
  startle(w)
  w.wait(151.75).rollTo(CREEP_X.hero, 155.0, R)
  w.wait(157.0).rollTo(HIDE_X.hero, 159.0, R)
  // Up: the step, the ledge, the pillar; and down from it onto the club's end on the swell.
  w.hop([STEP_X, STEP.top - R], 166.65, 0.18)
  w.hop([LEDGE_X + 0.25, LEDGE.top - R], 167.15, 0.18)
  w.hop(PILLAR_TOP, 167.91, 0.12)
  w.hop(onClub(T.drop, CLUB_S.hero, R), T.drop, 0.22)
  // Riding the club down; off its butt to the floor; along the floor under the ram.
  w.push(ride((t) => onClub(t, CLUB_S.hero, R), T.drop, T.rear))
  w.push(roll([w.at, onClub(T.rear, -1.62, R), floorAt(OFF_X.hero, R)], T.rear, 170.95, 'inout'))
  w.wait(172.2).rollTo(REST_X[4], 175.75, R)
  // Under the ram, out under his hand; out of the wool as it clears the mouth, down the shelf, and the jump for the ship.
  w.push(ride((t) => under(4, t, R), 175.75, 179.85))
  w.rollTo(95.3, 180.4, R, 'in')
  w.hop(deck(T.aboard, HELM), T.aboard, 0.45)
  return w.moves
}

function manPath(m: number): Move[] {
  const s = seat(m)
  const t0 = ENTER.men[m]
  const w = new Way(deck(t0, s), t0)
  const land = floorAt(LAND_X.men[m], r)
  w.hop(land, t0 + flightFor(deck(t0, s), land, 0.25), 0.25)
  w.rollTo(STOP_X.men[m], 150.6 + 0.09 * m, r, 'out')
  startle(w)
  if (m >= 4) {
    // The two who go on to the fire: there when the eye opens, and the hand.
    w.wait(151.75 + 0.3 * (m - 4)).rollTo(CREEP_X.men[m], 155.0, r)
    w.wait(T.grab - 0.05)
    w.push(rest(w.at, T.grab - 0.05, T.gone, { hidden: true }))
    return w.moves
  }
  w.wait(151.75 + 0.12 * m).rollTo(CREEP_X.men[m], 155.0, r)
  w.wait(157.0 + 0.1 * (3 - m)).rollTo(HIDE_X.men[m], 159.0 + 0.15 * (3 - m), r)
  const [step, ledge, club] = CLIMB[m]
  w.hop([STEP_X - 0.2 * (m % 2), STEP.top - r], step, 0.16)
  w.hop([LEDGE_X - 0.1 * (m % 2), LEDGE.top - r], ledge, 0.16)
  // Along the ledge and onto the club's butt, to its place: arriving as the club takes the weight.
  const onto = Math.max(ledge + 0.08, club - 0.62)
  w.wait(onto)
  w.push(roll([w.at, [LEDGE.x0 + 0.05, LEDGE.top - r], onClub(club, -1.5, r), onClub(club, CLUB_S.men[m], r)], onto, club, 'inout'))
  w.push(ride((t) => onClub(t, CLUB_S.men[m], r), club, T.rear + 0.12 * (3 - m)))
  w.push(roll([w.at, onClub(w.t, -1.62, r), floorAt(OFF_X.men[m], r)], w.t, 171.1 + 0.12 * (3 - m), 'inout'))
  // Along the floor to its ewe, under it, out under his hand.
  const sheep = SHEEP_OF.men[m]
  w.wait(171.4 + 0.18 * (3 - m)).rollTo(REST_X[sheep], 175.5 + 0.05 * (3 - m), r)
  const clear = clearsMouth(sheep)
  w.push(ride((t) => under(sheep, t, r), w.t, clear))
  w.rollTo(94.25, clear + 0.5, r, 'in')
  w.hop(deck(clear + 1.1, s), clear + 1.1, 0.4)
  return w.moves
}

/** When ewe `i` has carried its man out past the mouth's outer edge. */
function clearsMouth(i: number): number {
  let t = T.pats[i]
  while (FLOCK[i].x(t) > 96.0 && t < TO) t += 0.01
  return t
}

/* ------------------------------------------------------------------ the scene */

const light = (t: number): GiantLight => ({ skin: '#1E1916', lit: FIRELIT, fire: fireAt(t) })

const island = standing('cyclops-island', region(84, -30, 145, 4, 3), END, (g) => {
  drawRidge(g, g.t, RIDGE, '#1D1B1B', '#3A3836', INK)
  drawIsland(g, g.t, () => {
    drawBody(g, g.t, light(g.t))
    drawFire(g, g.t)
    drawClub(g, g.t, '#6F5338', '#45331F', INK, EMBER)
  })
})

/** The span each ewe (and the ram) has a man tucked under it: from when he rolls in under it to when he rolls out. */
const TUCKED: [number, number][] = [0, 1, 2, 3, 4].map((i) => (i === 4 ? [175.75, 179.85] : [175.5 + 0.05 * i, clearsMouth(i)]))
setCarrying((i, t) => t >= TUCKED[i][0] && t < TUCKED[i][1])

const flock = standing(
  'cyclops-flock',
  region(90, -12, 116, 2, 2),
  END,
  (g) => {
    for (let i = FLOCK.length - 1; i >= 0; i--) if (!carries(i, g.t)) drawSheep(g, FLOCK[i], g.t, '#D8D0BD', '#2F2925', INK)
  },
  (g) => {
    const open = openAt(g.t)
    for (let i = FLOCK.length - 1; i >= 0; i--) {
      // A ewe with a man in its wool is drawn whole over him; any other, only its near legs over whoever passes.
      if (carries(i, g.t)) drawSheep(g, FLOCK[i], g.t, '#D8D0BD', '#2F2925', INK)
      drawSheep(g, FLOCK[i], g.t, '#D8D0BD', '#2F2925', INK, true)
    }
    if (open) {
      drawArm(g, g.t, light(g.t))
      drawEye(g, g.t, g.t < T.look ? [PREY[0], PREY[1]] : [PREY[0] + 0.4, PREY[1] - 0.2], { white: '#D9D0B4', iris: '#7A6337', pupil: '#120D0A', skin: '#1E1916' })
    }
  },
)

const throwing = standing('cyclops-throw', region(100, -30, 135, 4, 3), END, null, (g) => {
  const rock = thrownRock(g.t, RIDGE)
  if (rock && g.t >= T.hurl) drawRock(g, rock, '#3A3836', INK, (g.t - T.hurl) * 2.2)
  drawSplash(g, g.t, SPLASH_AT, T.splash)
})

let paths: { hero: Move[]; men: Record<number, Move[]> } | null = null
const build = () => ({ hero: heroPath(), men: { 0: manPath(0), 1: manPath(1), 2: manPath(2), 3: manPath(3), 4: manPath(4), 5: manPath(5) } })

/** The splash's swell under ships 1 and 2: a heave that runs out from it and dies. */
function heave(x: number, t: number): number {
  const s = t - T.splash
  if (s <= 0) return 0
  const d = Math.abs(x - SPLASH_AT)
  const arrive = d / 7
  if (s < arrive) return 0
  // Gone by the time the pulse takes the ships on, so they leave this window riding the plain swell.
  const fade = 1 - smooth(t, TO - 1.4, TO - 0.05)
  return -0.32 * Math.sin((s - arrive) * 4.2) * Math.exp(-(s - arrive) / 0.9) * Math.exp(-d / 12) * fade
}

export const cyclops: Scene = {
  key: 'cyclops',
  from: FROM,
  to: TO,
  weather: [
    [143.5, 0.12],
    [149.5, 0.06],
    [183.6, 0.1],
    [185.8, 0.38],
  ],
  ships: {
    0: { pose: (t) => floatAt(x0(t), t), look: look(T.moored, T.away) },
    1: { pose: (t) => floatAt(x1(t), t, heave(x1(t), t)), look: look(T.moored + 0.3, T.under) },
    2: { pose: (t) => floatAt(x2(t), t, heave(x2(t), t)), look: look(T.moored + 0.6, T.under) },
  },
  // Built when the score first asks, after it has set the weather the ships ride on (their decks are where the hops land).
  get hero() {
    return (paths ??= build()).hero
  },
  get men() {
    return (paths ??= build()).men
  },
  deaths: { 4: T.gone, 5: T.gone },
  shots: [
    { t: 141.6, cells: 24, off: [7, -5] },
    { t: 143.4, cells: 40, at: [78, -9.5] },
    { t: 146.6, cells: 36, at: [84, -8.4] },
    { t: T.cutIn - 0.05, cells: 34, at: [86, -8.0] },
    // On a soft accent, in at the mouth: the cave cut open.
    { t: T.cutIn, cells: 6.2, at: [98.4, -3.7], cut: true },
    { t: 149.4, cells: 5.6, at: [98.6, -3.7] },
    { t: 151.0, cells: 5.4, at: [99.6, -3.8] },
    { t: 152.3, cells: 5.4, at: [99.8, -3.8] },
    { t: 154.6, cells: 4.8, at: [104.2, -3.7] },
    { t: 156.3, cells: 4.8, at: [104.3, -3.8] },
    { t: 158.4, cells: 7.8, at: [104.6, -5.3] },
    { t: 161.0, cells: 6.8, at: [104.8, -5.0] },
    { t: 163.4, cells: 7.6, at: [104.7, -5.6] },
    { t: 165.0, cells: 5.0, at: [111.4, -4.5] },
    { t: 167.8, cells: 5.2, at: [110.6, -4.7] },
    { t: 168.6, cells: 6.6, at: [107.8, -5.1] },
    { t: 169.8, cells: 6.6, at: [107.8, -5.1] },
    // Out and up with him as he rears, the hand over the eye: the whole of his agony against his own firelight.
    { t: 171.3, cells: 9.4, at: [104.5, -6.45] },
    { t: 172.9, cells: 9.1, at: [104.0, -6.3] },
    { t: 174.2, cells: 7.0, at: [101.6, -4.6] },
    { t: 176.0, cells: 4.6, at: [98.6, -3.4] },
    { t: 179.2, cells: 5.0, at: [97.4, -2.9] },
    { t: 180.4, cells: 8, at: [99, -3.0] },
    { t: T.cutOut - 0.05, cells: 8.2, at: [99.3, -3.0] },
    // As he lands aboard, out on a cut: the island whole, and up it to him on the ridge with the rock over his head,
    // and down with the rock to the sea.
    { t: T.cutOut, cells: 32, at: [110.5, -11.5], cut: true },
    { t: 181.7, cells: 34, at: [112, -12.5] },
    { t: 182.6, cells: 30, at: [116.5, -24.5] },
    { t: 183.05, cells: 30, at: [116.8, -24.0] },
    // Out as the rock comes down, never losing him: the whole of him over the ridge and the ships under him in one frame
    // as it lands among them.
    { t: 184.0, cells: 38, at: [118.2, -16.4] },
    { t: 186.4, cells: 20, off: [2.5, -2.8] },
  ],
  back: [island],
  mid: [flock],
  front: [throwing],
}

