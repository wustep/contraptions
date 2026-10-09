import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { black } from './credits'
import { box, frame, lay, scenery, standing, type Chain, type Link } from './kit'
import { DURATION, KICK, PEAK, SEAM, bar } from './music'
import { FIRST, SEAMS } from './seams'
import { sleep, sparkInWides, SLEEP_CELLS } from './sleep'
import { KickShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { ORIGIN } from './stack'
import { COBB, type WorldKey } from './worlds'
import { limboSet, LIMBO_CELLS, SHORE_AT, shore, limbo } from './limbo/limbo'
import { parisSet, PARIS_CELLS, PARIS_AT, paris, parisRoll } from './paris/paris'
import { planeSet, PLANE_CELLS, PLANE_AT, WAKE_AT, boarding, waking } from './plane/plane'
import { rainSet, RAIN_CELLS, RAIN_AT, rain, river } from './rain/rain'
import { hotelSet, HOTEL_CELLS, hotel, lift, hotelRoll } from './hotel/hotel'
import { snowSet, SNOW_CELLS, snow, vault } from './snow/snow'
import { homeSet, HOME_CELLS, HOME_AT, home } from './home/home'

/**
 * The whole show, in order: which world has Cobb from when to when, and which part has him in each. Every part is
 * told its slot and builds to it; this file only says the order, the seams and the cuts, which are all on the music
 * (`music.ts`, `seams.ts`, `stack.ts`).
 *
 *   0        limbo's shore at dusk: washed up out of a grey sea; their house among the towers, the top that never stops
 *   30.860   cut, on the strings: Paris, a café table, Ariadne; she folds the street over them; a bridge of mirrors; Mal
 *   61.342   cut, on the pulse (a jolt awake): the plane at night, the silver case between the seats
 *   68.970   a blink: going under; the rain: Fischer's taxi, the freight train, the van, the bridge
 *   91.824   down, on the brass: the hotel; the corridor turns with the van (95.6); weightless as it goes off (107.068)
 *   122.294  down, on the swell: the snow; the mountain, the fortress; Mal's shot; Fischer goes down
 *   152.770  down, on the peak: limbo; the shore again; the city; the house; Mal; he lets her go; the tower
 *   183.247  the kicks, on the summit's four hardest downbeats: the tower's roof (183.247), the fortress (190.869), the
 *            lift (198.485), the van into the river (206.107); up through the river to its surface
 *   213.717  cut, on the release: awake on the plane; morning; the landing; the arrivals hall
 *   244.187  a veil of morning, on the piano: home; the top set spinning (247.990); the children turn; he goes to them
 *   274.617  the last chord: the top wobbles, and the picture cuts to black; the credits in the silence
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the world's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  { key: 'shore', world: 'dream', at: SHORE_AT, links: [{ part: shore, end: SEAM.paris }] },
  { key: 'paris', world: 'paris', at: PARIS_AT, links: [{ part: paris, end: SEAM.plane }] },
  { key: 'plane', world: 'plane', at: PLANE_AT, links: [{ part: boarding, end: SEAM.rain }] },
  {
    key: 'job',
    world: 'dream',
    at: RAIN_AT,
    links: [
      { part: rain, end: SEAM.hotel },
      { part: hotel, end: SEAM.snow },
      { part: snow, end: SEAM.limbo },
      { part: limbo, end: SEAM.vault },
      { part: vault, end: SEAM.lift },
      { part: lift, end: SEAM.river },
      { part: river, end: SEAM.wake },
    ],
  },
  { key: 'wake', world: 'plane', at: WAKE_AT, links: [{ part: waking, end: SEAM.home }] },
  { key: 'home', world: 'home', at: HOME_AT, links: [{ part: home, end: DURATION }] },
]

/* ------------------------------------------------------------------ the director's overlays */

/**
 * The blinks and the veil (the director's): a cut that happens inside something drawn over both sides. Going under
 * (plane → rain) is a **blink**: the frame darkens to black as his eyes close, and opens again on the rain. Home is
 * reached through a **veil** of morning light, the glare off the arrivals hall's glass. The place changes where
 * nothing can be seen, and his place in the frame holds.
 */
const COVERS: { at: number; up: number; down: number; color: string }[] = [
  { at: SEAM.rain, up: 0.9, down: 1.3, color: '#07080D' },
  { at: SEAM.home, up: 0.55, down: 0.95, color: '#FFF7E6' },
]
export const coverAt = (t: number): { a: number; color: string } => {
  for (const v of COVERS) {
    if (t < v.at - v.up || t > v.at + v.down) continue
    const u = t < v.at ? (t - (v.at - v.up)) / v.up : 1 - (t - v.at) / v.down
    const e = Math.max(0, Math.min(1, u))
    return { a: e * e * (3 - 2 * e), color: v.color }
  }
  return { a: 0, color: '#000000' }
}
const cover = scenery<null>({
  name: 'cover',
  draw: () => {},
  over: (p, _s, c) => {
    const { a, color } = coverAt(c.t)
    if (a <= 0.001) return
    const f = frame(p, c.k)
    const col = p.color(color)
    col.setAlpha(255 * a)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(col)
    p.rect((f.x0 - 1) * c.k, (f.y0 - 1) * c.k, (f.x1 - f.x0 + 2) * c.k, (f.y1 - f.y0 + 2) * c.k)
    p.pop()
  },
})

/** A big, sparse claim of cells round a place, so its after-drawings are drawn wherever the camera is. */
const claim = (x0: number, y0: number, x1: number, y1: number): Pt[] => box(x0, y0, x1, y1, 3)

/** Each world's standing scenery, and what is drawn over everything (the dark of sleep, the covers, the black). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  dream: {
    scenery: [
      standing(rainSet, 0, 0, RAIN_CELLS, null, DURATION),
      standing(hotelSet, 0, 0, HOTEL_CELLS, null, DURATION),
      standing(snowSet, 0, 0, SNOW_CELLS, null, DURATION),
      standing(limboSet, 0, 0, LIMBO_CELLS, null, DURATION),
    ],
    after: [standing(sleep, 0, 0, SLEEP_CELLS, null, DURATION), standing(cover, 0, 0, claim(-70, -30, 80, 105), null, DURATION)],
  },
  paris: { scenery: [standing(parisSet, 0, 0, PARIS_CELLS, null, DURATION)], after: [standing(cover, 0, 0, claim(-60, -40, 80, 40), null, DURATION)] },
  plane: { scenery: [standing(planeSet, 0, 0, PLANE_CELLS, null, DURATION)], after: [standing(cover, 0, 0, claim(-60, -40, 80, 40), null, DURATION)] },
  home: {
    scenery: [standing(homeSet, 0, 0, HOME_CELLS, null, DURATION)],
    after: [standing(cover, 0, 0, claim(-60, -40, 80, 40), null, DURATION), standing(black, 0, 0, claim(-60, -40, 80, 40), null, DURATION)],
  },
})

/**
 * The kicks, in the body: on each the camera pushes in at once (18 ms) and eases back slowly (τ 1 s, gone by 3.5 s):
 * the hit is sharp, the recovery long and damped. The river's is the biggest: the van into the water, the last kick.
 */
export const PUNCHES: [number, number][] = [
  // Down into limbo, on the drums.
  [PEAK, 0.4],
  [KICK.limbo, 0.55],
  [KICK.snow, 0.6],
  [KICK.hotel, 0.65],
  [KICK.rain, 0.95],
]
const PUNCH_TAU = 1
const PUNCH_FOR = 3.5
function punch(t: number): number {
  let v = 0
  const floor = Math.exp(-PUNCH_FOR / PUNCH_TAU)
  for (const [at, s] of PUNCHES) {
    const u = t - at
    if (u < 0 || u > PUNCH_FOR) continue
    v += 0.045 * s * (1 - Math.exp(-u / 0.018)) * ((Math.exp(-u / PUNCH_TAU) - floor) / (1 - floor))
  }
  return v
}

/**
 * The director's great wides of the stack (the dream's thesis): the whole dream seen at once, the four levels one under
 * the other in the dark of sleep, each with the kick it holds. On the summit's first downbeat, limbo's kick, the camera
 * cuts out to all four (the tower on the shore, the fortress on the mountain, the lift in its shaft with Arthur's charges,
 * the van hanging off the bridge over the frozen river), and eases in a little while they rise from limbo into the vault;
 * it cuts back in on the paddles (bar 49). Each wide: its span, its keys, and the framing it cuts back in to (a part's
 * key at `to` when there is one; else a follow at `backCells` offset `backOff`).
 */
const STACK_WIDES: { from: number; to: number; keys: Shot[]; backCells: number; backOff: [number, number] }[] = [
  {
    from: KICK.limbo,
    to: bar(49),
    keys: [
      { t: KICK.limbo, cells: 104, hold: [3, 41.5], cut: true },
      { t: bar(49) - 0.02, cells: 95, hold: [2.4, 43.5] },
    ],
    backCells: 5.0,
    backOff: [0.6, -0.4],
  },
]

/** The camera's roll at `t`: Paris's street as it folds over, and the hotel's corridor as it turns (each 0 outside its own stretch). */
export const rollAt = (t: number): number => parisRoll(t) + hotelRoll(t)

/** A screen offset turned by `a` (the camera's roll): what a world offset looks like on the screen. */
const turn = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

export function compose(): { show: KickShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: COBB, ghost: false, id: 0 }
  let begin = 0
  for (const plan of plans) {
    const chain = lay({ col: plan.at[0], row: plan.at[1], begin, ball }, plan.links)
    chains.push(chain)
    ball = chain.next.ball
    begin = chain.next.begin
  }
  // The dream's parts are laid end to end, and each must start where the stack says (`stack.ts`, ORIGIN): say so if not.
  const job = chains[3]
  const origins: [string, Pt][] = [['hotel', ORIGIN.hotel], ['snow', ORIGIN.snow], ['limbo', ORIGIN.limbo], ['vault', ORIGIN.vault], ['lift', ORIGIN.lift], ['river', ORIGIN.river]]
  origins.forEach(([name, o], i) => {
    const pl = job.placed[i + 1]
    if (pl && Math.hypot(pl.col - o[0], pl.row - o[1]) > 1e-6) console.warn(`kick: ${name} is laid at ${pl.col.toFixed(3)},${pl.row.toFixed(3)}, not at its origin ${o[0]},${o[1]}`)
  })

  const legs: Leg[] = plans.map((plan, i) => {
    const chain = chains[i]
    const first = chain.placed[0]
    const last = chain.placed[chain.placed.length - 1]
    return {
      key: plan.key,
      world: plan.world,
      from: first.start,
      to: last.start + last.span,
      placed: chain.placed,
      entry: [first.col - 0.5, first.row],
      exit: [chain.next.col - 0.5, chain.next.row],
    }
  })

  const riders: Riders = []
  const company: Spans = []
  chains.forEach((chain, i) => {
    for (const r of chain.riders) riders.push({ ...r, leg: i })
    for (const s of chain.company) company.push({ ...s, world: legs[i].world })
  })

  const show = new KickShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))
  sparkInWides((t) => show.where(t), STACK_WIDES.map((w) => [w.from, w.to]), legs.filter((l) => l.world === 'dream').map((l) => [l.from, l.to]))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Cobb. Inside a leg, at a seam
  // between two parts, the incoming part's keys win: the outgoing part's keys after its own slot are dropped.
  //
  // A follow sees him carried on past either end of its leg at the speed he crosses the cut. Where he crosses a cut
  // moving, the leg opens on a follow, offset so the framing is exactly the one carried across; where he crosses at
  // rest, it opens on a hold of that framing. Where the camera's roll changes at a cut (out of Paris upside down), what
  // is carried is his place on the screen: the offset is turned into the new roll.
  const cams: ((t: number) => Framing)[] = []
  legs.forEach((leg, i) => {
    const chain = chains[i]
    const slots = chain.placed.map((pl) => [pl.start, pl.start + pl.span] as const)
    let keys: Shot[] = chain.shots.filter((s) => s.t > leg.from + 1e-6 && s.t <= leg.to + 1e-6 && slots.some(([a, b]) => s.t >= a - 1e-6 && s.t <= b + 1e-6))
    // The director's great wides of the stack, in the dream: the parts' keys inside each are dropped, the wide's laid in,
    // and the camera cuts out to it and back in on strikes.
    if (leg.world === 'dream') {
      for (const w of STACK_WIDES) {
        if (w.from < leg.from || w.to > leg.to) continue
        const back = keys.find((k) => Math.abs(k.t - w.to) < 1e-6)
        // The part's own framing on the moment of the cut out is kept a hair before it, so the camera goes on as the
        // part had it right up to the cut.
        const out = keys.find((k) => Math.abs(k.t - w.from) < 1e-6)
        keys = keys.filter((k) => k.t < w.from - 1e-6 || k.t > w.to + 1e-6)
        if (out) keys.push({ ...out, t: w.from - 0.02, cut: false })
        keys.push(...w.keys, back ? { ...back, cut: true } : { t: w.to, cells: w.backCells, off: w.backOff, w: 0, cut: true })
      }
      keys.sort((a, b) => a.t - b.t)
    }
    const a0 = show.where(leg.from)
    const a1 = show.where(Math.min(leg.to - 1e-6, leg.from + 0.02))
    const b1 = show.where(leg.to - 1e-6)
    const b0 = show.where(Math.max(leg.from, leg.to - 0.02))
    const vIn: Pt = [(a1[0] - a0[0]) / 0.02, (a1[1] - a0[1]) / 0.02]
    const vOut: Pt = [(b1[0] - b0[0]) / 0.02, (b1[1] - b0[1]) / 0.02]
    const where = (s: number): Pt => {
      if (s < leg.from) return [a0[0] + vIn[0] * (s - leg.from), a0[1] + vIn[1] * (s - leg.from)]
      if (s > leg.to - 1e-6) return [b1[0] + vOut[0] * (s - leg.to), b1[1] + vOut[1] * (s - leg.to)]
      return show.where(s)
    }
    if (i === 0) {
      // The show's first frame: FIRST, held on him where he starts.
      keys.unshift({ t: 0, cells: FIRST.cells, hold: [a0[0] + FIRST.frame[0], a0[1] + FIRST.frame[1]], w: 1 })
    } else {
      // The last leg's framing at the cut, turned as that leg had it just before.
      const prev = { ...cams[i - 1](leg.from), angle: rollAt(leg.from - 1e-6) }
      const her = show.at(leg.from - 1e-6)
      const onScreen = turn([(her.x - prev.x) / prev.cells, (her.y - prev.y) / prev.cells], prev.angle ?? 0)
      const cells = prev.cells
      const back = turn(onScreen, -rollAt(leg.from))
      const carried: Pt = [a0[0] - back[0] * cells, a0[1] - back[1] * cells]
      if (Math.hypot(vIn[0], vIn[1]) > 0.05) {
        const [fx, fy] = follower(where, DURATION)(leg.from)
        keys.unshift({ t: leg.from, cells, off: [carried[0] - fx, carried[1] - fy], w: 0 })
      } else keys.unshift({ t: leg.from, cells, hold: carried, w: 1 })
    }
    if (keys.length === 1) keys.push({ t: Math.min(leg.to, leg.from + 1.2), cells: keys[0].cells })
    for (const k of keys) if (k.cut && k.t > leg.from + 1e-6) show.cameraCuts.push(k.t)
    const dir = director(where, keys, DURATION)
    cams.push((t) => ({ ...dir(t), angle: rollAt(t) }))
  })
  const camera = (t: number): Framing => {
    const owner = show.owner(t)
    const f = cams[owner](t)
    return { ...f, cells: f.cells * (1 - punch(t)) }
  }
  return { show, camera }
}

/** For the check: the cuts that happen inside a blink or a veil. */
export const COVERED = COVERS.map((c) => c.at)
export { SEAMS }
