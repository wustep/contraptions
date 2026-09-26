import type { BallState, Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { credits } from './credits'
import { bound as sparkBound, flame, veil, type FlameState, type VeilState } from './fx'
import { box, lay, standing, type Chain, type Link } from './kit'
import { CODA, DOORS, DURATION, FESTIVAL, LAST, LOFT_SEAM } from './music'
import { SparkShow, type Leg, type Riders, type WorldSet } from './show'
import { SPARK, type WorldKey } from './worlds'
import { room, ROOM_CELLS } from './loft/set'
import { hearth, HEARTH_CELLS } from './loft/hearth'
import { sneak } from './loft/sneak'
import { stove } from './loft/stove'
import { home, HOME_AT } from './loft/home'
import { glassworks, GLORY_AT } from './glass/glassworks'
import { balloons, BURNER_AT } from './regatta/balloons'
import { night } from './railway/night'
import { express } from './railway/express'
import { fireworks } from './railway/fireworks'
import { dashGlass, dashRegatta } from './dash'

/**
 * The whole show, in order: which world has the spark from when to when, and who has it inside each world. Every
 * part is told its slot and builds to it; this file only says the order, the seams and the doors, which are all on
 * the music (`music.ts`).
 *
 *   0        the loft at night. The candle on the bench, the cat asleep by the stove.
 *   4.36     statement 1, pianissimo: the spark slips off its wick and sneaks west along the bench, the drying rack
 *   31.19    (LOFT-B) the dipping wheel, the floor, past the cat, up to the stove; into the fire
 *   58.02    DOOR. Statement 2: out of the glory hole into the glassworks, by day
 *   82.05    DOOR. Out of a burner into the balloon regatta at sunset; up from balloon to balloon
 *   101.95   DOOR. Statement 3, fortissimo: out of the smokestack of the night express, which runs away
 *   124.01   the festival: thrown into the fireworks field; the fuses; the coda's 23 chords are the finale
 *   147.0    silence: smoke, and the spark all but out in the ash
 *   148.24   the roll: it flares, and dashes home back through three fires (148.33, 148.40, 148.49)
 *   149.515  onto its wick. 149.815: the stove door bangs, the cat wakes, looks, and sleeps. The credits, in silence.
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's entry cell, in the world's own cells. */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  {
    key: 'loft',
    world: 'loft',
    // The spark starts on its wick: the first part's entry (-0.5, 0) is the wick (`WICK` in `loft/layout.ts`).
    at: [0, 0],
    links: [
      { part: sneak, end: LOFT_SEAM },
      { part: stove, end: DOORS.glass },
    ],
  },
  { key: 'glass', world: 'glassworks', at: [0, 0], links: [{ part: glassworks, end: DOORS.regatta }] },
  { key: 'regatta', world: 'regatta', at: [0, 0], links: [{ part: balloons, end: DOORS.railway }] },
  {
    key: 'railway',
    world: 'railway',
    at: [0, 0],
    links: [
      { part: express, end: FESTIVAL },
      { part: fireworks, end: DOORS.back[0] },
    ],
  },
  { key: 'back-regatta', world: 'regatta', at: [BURNER_AT[0] + 0.5, BURNER_AT[1]], links: [{ part: dashRegatta, end: DOORS.back[1] }] },
  { key: 'back-glass', world: 'glassworks', at: [GLORY_AT[0] + 0.5, GLORY_AT[1]], links: [{ part: dashGlass, end: DOORS.back[2] }] },
  { key: 'home', world: 'loft', at: HOME_AT, links: [{ part: home, end: DURATION }] },
]

/**
 * The camera takes the show's biggest hits in the body: on each it pushes in a little, at once, and eases back. Only
 * the great ones: the doors into statements 2 and 3, the coda's heaviest chords, and the two last.
 */
const PUNCHES: [number, number][] = [
  [DOORS.glass, 0.5],
  [DOORS.railway, 0.9],
  ...CODA.filter((c) => c.s >= 6).map((c) => [c.t, 0.7] as [number, number]),
  [LAST[0], 0.6],
  [LAST[1], 1],
]
function punch(t: number): number {
  let v = 0
  for (const [at, s] of PUNCHES) {
    const u = t - at
    if (u < 0 || u > 1.5) continue
    v += 0.045 * s * (1 - Math.exp(-u / 0.018)) * Math.exp(-u / 0.32)
  }
  return v
}

export function compose(): { show: SparkShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: SPARK, ghost: false, id: 0 }
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
  chains.forEach((chain, i) => {
    for (const r of chain.riders) riders.push({ ...r, leg: i })
  })

  // Every world's own scenery, drawn under its parts: the loft's room and hearth, the railway's night.
  const cellsOf = (world: WorldKey): Pt[] => {
    const cells = new Map<string, Pt>()
    for (const leg of legs) if (leg.world === world) for (const placed of leg.placed) for (const c of placed.cells) cells.set(`${c[0]},${c[1]}`, c)
    return [...cells.values()]
  }
  const sets: Partial<Record<WorldKey, WorldSet>> = {
    loft: {
      scenery: [standing(room, 0, 0, ROOM_CELLS, null, DURATION), standing(hearth, 0, 0, HEARTH_CELLS, null, DURATION)],
      after: [],
    },
    railway: { scenery: [standing(night, 0, 0, cellsOf('railway'), null, DURATION)], after: [] },
  }

  // Over everything in every world: the veil of fire at a door, then the spark's flame. The credits' dark over the loft.
  const bound: { state: FlameState | VeilState }[] = []
  for (const world of new Set(legs.map((l) => l.world))) {
    const set = (sets[world] ??= { scenery: [], after: [] })
    const cells = world === 'loft' ? [...ROOM_CELLS, ...cellsOf(world)] : cellsOf(world)
    const v: VeilState = { show: null, world }
    const f: FlameState = { show: null, world }
    bound.push({ state: v }, { state: f })
    set.after.push(standing(veil(), 0, 0, cells, v, DURATION) as Placed)
    set.after.push(standing(flame(), 0, 0, cells, f, DURATION) as Placed)
  }
  sets.loft!.after.push(standing(credits, 0, 0, box(-30, -14, 16, 13, 2), null, DURATION))

  const show = new SparkShow(legs, sets, DURATION, riders)
  for (const b of bound) b.state.show = show
  sparkBound.show = show

  // The camera: one director per leg, each following the spark only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the door: a match cut on the spark.
  const cams: ((t: number) => Framing)[] = []
  legs.forEach((leg, i) => {
    const chain = chains[i]
    const keys: Shot[] = chain.shots.filter((s) => s.t > leg.from + 1e-6 && s.t <= leg.to + 1e-6)
    // The first frame is the first leg's own opening framing (a part's first key), held from zero.
    if (i === 0) keys.unshift(keys.length ? { ...keys[0], t: 0 } : { t: 0, cells: 6 })
    else {
      const f = cams[i - 1](leg.from)
      const [sx, sy] = show.shift(i - 1, i)
      keys.unshift({ t: leg.from, cells: f.cells, hold: [f.x + sx, f.y + sy], w: 1 })
    }
    if (keys.length === 1) keys.push({ t: Math.min(leg.to, leg.from + 1.2), cells: 5 })
    const where = (s: number): Pt => show.where(Math.max(leg.from, Math.min(leg.to - 1e-6, s)))
    cams.push(director(where, keys, DURATION))
  })
  const camera = (t: number): Framing => {
    const f = cams[show.owner(t)](t)
    return { ...f, cells: f.cells * (1 - punch(t)) }
  }
  return { show, camera }
}
