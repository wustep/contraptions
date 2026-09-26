import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { credits } from './credits'
import { box, lay, standing, type Chain, type Link } from './kit'
import { CLIMAX, CURSE, DURATION, HEART, SEAM, SLOW } from './music'
import { CastleShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { SOPHIE_YOUNG, type WorldKey } from './worlds'
import { town, TOWN_BOX, CURSE_AT, RAID_AT } from './town/town'
import { room, ROOM_BOX, ROOM_ORIGIN } from './castle/room'
import { sky } from './wastes/sky'
import { shop } from './town/shop'
import { alley } from './sky/alley'
import { skywalk } from './sky/skywalk'
import { curse } from './town/curse'
import { hills } from './wastes/hills'
import { walk } from './wastes/walk'
import { morning, MORNING_AT } from './castle/morning'
import { field } from './flowers/field'
import { raid } from './war/raid'
import { hearth, HEARTH_AT } from './plank/hearth'
import { plank, PLANK_AT } from './plank/plank'
import { flight } from './finale/flight'

/**
 * The whole show, in order: which place has Sophie from when to when, and which part has her in each. Every part is
 * told its slot and builds to it; this file only says the order, the seams and the cuts, which are all on the music
 * (`music.ts`, `seams.ts`).
 *
 *   0        the town at dawn: the hat shop on the music box and the theme, out into the street
 *   38.28    the alley on the held D: the soldiers, Howl, the blob men, the breath
 *   49.035   the waltz: the walk on the air over the town, down to the café's balcony
 *   85.8     cut: the hat shop at night, the Witch of the Waste, the curse (101.31)
 *   107.9    cut: out of the shop's door, old, into the hills; Turnip Head; the castle out of the fog
 *   121.15   the castle comes; she rides it into the night
 *   151.998  cut: through its door into its room: Calcifer, Markl, the dial, Howl, breakfast
 *   178.051  cut: through the door onto the flower fields; the slow waltz; the fleet on the far sky
 *   205.86   cut: back through the door into the town at war
 *   237      cut: through the shop's door into the room, shaking; Calcifer lifted out of the grate
 *   243.635  cut: the castle falls apart round her; the plank on legs; the heart (272.37); the cliff; the cadenza
 *   292.734  Calcifer comes back and the castle flies; the last chord (302.24); the credits over the sky
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

/** Where each leg starts in its place. The town's three and the room's two are places in one set. */
const PLAN = (): LegPlan[] => [
  {
    key: 'morning',
    world: 'town',
    at: [0, 0],
    links: [
      { part: shop, end: SEAM.alley },
      { part: alley, end: SEAM.skywalk },
      { part: skywalk, end: SEAM.curse },
    ],
  },
  { key: 'curse', world: 'town', at: CURSE_AT, links: [{ part: curse, end: SEAM.hills }] },
  {
    key: 'castle',
    world: 'wastes',
    at: [0, 0],
    links: [
      { part: hills, end: SEAM.walk },
      { part: walk, end: SEAM.morning },
    ],
  },
  { key: 'room', world: 'room', at: [ROOM_ORIGIN[0] + MORNING_AT[0], ROOM_ORIGIN[1] + MORNING_AT[1]], links: [{ part: morning, end: SEAM.field }] },
  { key: 'field', world: 'flowers', at: [0, 0], links: [{ part: field, end: SEAM.raid }] },
  { key: 'raid', world: 'town', at: RAID_AT, links: [{ part: raid, end: SEAM.hearth }] },
  { key: 'hearth', world: 'room', at: [ROOM_ORIGIN[0] + HEARTH_AT[0], ROOM_ORIGIN[1] + HEARTH_AT[1]], links: [{ part: hearth, end: SEAM.plank }] },
  {
    key: 'plank',
    world: 'wastes',
    at: PLANK_AT,
    links: [
      { part: plank, end: SEAM.flight },
      { part: flight, end: DURATION },
    ],
  },
]

/** Each place's standing scenery: skies, rooms, the town; and what is drawn over everything (the credits' shade). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  town: { scenery: [standing(town, 0, 0, box(TOWN_BOX.x0, TOWN_BOX.y0, TOWN_BOX.x1, TOWN_BOX.y1, 2), null, DURATION)], after: [] },
  wastes: {
    scenery: [standing(sky, 0, 0, box(-40, -80, 560, 20, 2), null, DURATION)],
    after: [standing(credits, 0, 0, box(PLANK_AT[0] - 40, -120, PLANK_AT[0] + 160, 20, 2), null, DURATION)],
  },
  room: {
    scenery: [standing(room, ROOM_ORIGIN[0], ROOM_ORIGIN[1], box(ROOM_ORIGIN[0] + ROOM_BOX.x0, ROOM_ORIGIN[1] + ROOM_BOX.y0, ROOM_ORIGIN[0] + ROOM_BOX.x1, ROOM_ORIGIN[1] + ROOM_BOX.y1), null, DURATION)],
    after: [],
  },
})

/**
 * The camera takes the show's biggest hits in the body: on each it pushes in a little, at once, and eases back.
 * Only the great ones.
 */
const PUNCHES: [number, number][] = [
  [CURSE, 0.8],
  [SLOW, 0.5],
  [CLIMAX, 1],
  [HEART, 0.7],
]
function punch(t: number): number {
  let v = 0
  for (const [at, s] of PUNCHES) {
    const u = t - at
    if (u < 0 || u > 1.6) continue
    v += 0.045 * s * (1 - Math.exp(-u / 0.018)) * Math.exp(-u / 0.34)
  }
  return v
}

export function compose(): { show: CastleShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: SOPHIE_YOUNG, ghost: false, id: 0 }
  let begin = 0
  for (const plan of plans) {
    const chain = lay({ col: plan.at[0], row: plan.at[1], begin, ball }, plan.links)
    chains.push(chain)
    ball = chain.next.ball
    begin = chain.next.begin
  }
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

  const show = new CastleShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Sophie. Inside a leg, at a seam
  // between two parts, the incoming part's keys win: the outgoing part's keys after its own slot are dropped.
  //
  // A follow sees her carried on past either end of its leg at the speed she crosses the cut (so it neither slows to a
  // stop on the cut nor starts from one). Where she crosses a cut moving, the leg opens on a follow, offset so the
  // framing is exactly the one carried across: the camera goes on at her speed through the cut. Where she crosses at
  // rest, it opens on a hold of that framing.
  const cams: ((t: number) => Framing)[] = []
  legs.forEach((leg, i) => {
    const chain = chains[i]
    const slots = chain.placed.map((pl) => [pl.start, pl.start + pl.span] as const)
    const keys: Shot[] = chain.shots.filter((s) => s.t > leg.from + 1e-6 && s.t <= leg.to + 1e-6 && slots.some(([a, b]) => s.t >= a - 1e-6 && s.t <= b + 1e-6))
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
    if (i === 0) keys.unshift(keys.length ? { ...keys[0], t: 0 } : { t: 0, cells: 5 })
    else {
      const f = cams[i - 1](leg.from)
      const [sx, sy] = show.shift(i - 1, i)
      const carried: Pt = [f.x + sx, f.y + sy]
      if (Math.hypot(vIn[0], vIn[1]) > 0.05) {
        const [fx, fy] = follower(where, DURATION)(leg.from)
        keys.unshift({ t: leg.from, cells: f.cells, off: [carried[0] - fx, carried[1] - fy], w: 0 })
      } else keys.unshift({ t: leg.from, cells: f.cells, hold: carried, w: 1 })
    }
    if (keys.length === 1) keys.push({ t: Math.min(leg.to, leg.from + 1.2), cells: 5 })
    cams.push(director(where, keys, DURATION))
  })
  const camera = (t: number): Framing => {
    const owner = show.owner(t)
    const f = cams[owner](t)
    return { ...f, cells: f.cells * (1 - punch(t)) }
  }
  return { show, camera }
}
