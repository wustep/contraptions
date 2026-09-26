import type { BallState, Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { box, lay, standing, type Chain, type Link } from './kit'
import { CUT, DURATION, SEAM } from './music'
import { LifeShow, type Leg, type Spans, type WorldSet } from './show'
import { CARL, type WorldKey } from './worlds'
import { cast, type CastState } from './cast'
import { credits } from './credits'
import { churchSet, CHURCH_BOX } from './church/church'
import { wedding, WEDDING_AT } from './church/wedding'
import { funeral, FUNERAL_AT } from './church/funeral'
import { front, FRONT_BOX } from './house/front'
import { fixup, FIXUP_AT } from './house/fixup'
import { alone, ALONE_AT, ALONE_TIE } from './house/alone'
import { hillSet, HILL_BOX } from './hill/hill'
import { clouds, CLOUDS_AT } from './hill/clouds'
import { climb, CLIMB_AT } from './hill/climb'
import { clinicSet, CLINIC_BOX } from './clinic/clinic'
import { doctor, DOCTOR_AT } from './clinic/doctor'
import { hospital, HOSPITAL_AT } from './clinic/hospital'
import { inside, INSIDE_BOX } from './inside/inside'
import { nursery, NURSERY_AT } from './inside/nursery'
import { yard, YARD_AT } from './inside/yard'
import { jar } from './inside/jar'
import { ties } from './inside/ties'

/**
 * The whole show, in order: which place has Carl from when to when, and which part has him inside each place. Every
 * part is told its slot and builds to it; this file only says the order, the places and the cuts, which are all on
 * the music (`music.ts`), and what the two of them are doing at each cut (`seams.ts`).
 *
 *   0        the church: a flash, the Wedding March, the kiss on bar 1 of the waltz, the families
 *   21.577   the house: fixing it up, on the waltz; the mailbox; the armchairs
 *   49.644   the hill: the clouds, and the baby in them
 *   63.251   the nursery upstairs; the music box runs down with the music
 *   73.456   the doctor's office: the held note
 *   84.376   the house, one long take: Ellie alone in the yard, the book (100.357), the jar (103.288), the ties (140.655),
 *            the tickets
 *   167.706  the hill, years later: the climb, the fall
 *   180.413  the hospital: the balloon
 *   189.452  the church, empty
 *   201.944  home, alone. The credits over the house.
 */

/** Where the house's inside (the doll's house) stands in the house world's cells: far from its street side. */
export const INSIDE_AT: Pt = [400, 0]

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's entry cell, in the world's own cells. */
  at: Pt
  links: Link[]
}

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

const PLAN = (): LegPlan[] => [
  { key: 'wedding', world: 'church', at: WEDDING_AT, links: [{ part: wedding, end: CUT.house }] },
  { key: 'fixup', world: 'house', at: FIXUP_AT, links: [{ part: fixup, end: CUT.hill }] },
  { key: 'clouds', world: 'hill', at: CLOUDS_AT, links: [{ part: clouds, end: CUT.nursery }] },
  { key: 'nursery', world: 'house', at: add(INSIDE_AT, NURSERY_AT), links: [{ part: nursery, end: CUT.doctor }] },
  { key: 'doctor', world: 'clinic', at: DOCTOR_AT, links: [{ part: doctor, end: CUT.yard }] },
  {
    key: 'house',
    world: 'house',
    at: add(INSIDE_AT, YARD_AT),
    links: [
      { part: yard, end: SEAM.jar },
      { part: jar, end: SEAM.ties },
      { part: ties, end: CUT.climb },
    ],
  },
  { key: 'climb', world: 'hill', at: CLIMB_AT, links: [{ part: climb, end: CUT.hospital }] },
  { key: 'hospital', world: 'clinic', at: HOSPITAL_AT, links: [{ part: hospital, end: CUT.funeral }] },
  { key: 'funeral', world: 'church', at: FUNERAL_AT, links: [{ part: funeral, end: CUT.home }] },
  { key: 'alone', world: 'house', at: ALONE_AT, links: [{ part: alone, end: DURATION }] },
]

const boxed = (b: [number, number, number, number], at: Pt = [0, 0]) => box(at[0] + b[0], at[1] + b[1], at[0] + b[2], at[1] + b[3], 2)

/** Each world's sets: what stands behind the parts for the whole show. The cast is added to each, last. */
const SETS = (): Record<WorldKey, WorldSet> => ({
  church: { scenery: [standing(churchSet, 0, 0, boxed(CHURCH_BOX), null, DURATION)], after: [] },
  house: {
    scenery: [
      standing(front, 0, 0, boxed(FRONT_BOX), null, DURATION),
      standing(inside, INSIDE_AT[0], INSIDE_AT[1], boxed(INSIDE_BOX, INSIDE_AT), null, DURATION),
    ],
    // The soft dark under the end credits' words.
    after: [standing(credits, 0, 0, boxed(FRONT_BOX), null, DURATION)],
  },
  hill: { scenery: [standing(hillSet, 0, 0, boxed(HILL_BOX), null, DURATION)], after: [] },
  clinic: { scenery: [standing(clinicSet, 0, 0, boxed(CLINIC_BOX), null, DURATION)], after: [] },
})

export function compose(): { show: LifeShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: CARL, ghost: false, id: 0 }
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

  const company: Spans = []
  chains.forEach((chain, i) => {
    for (const s of chain.company) company.push({ ...s, world: legs[i].world })
  })
  const poses = chains.flatMap((c) => c.pose)

  // The cast, in every world, after its sets and before its parts' fronts. It claims every cell a part or a set in
  // its world claims, so it is drawn wherever either of them can be.
  const sets = SETS()
  const castState: CastState = { show: null }
  for (const key of Object.keys(sets) as WorldKey[]) {
    const set = sets[key]
    const cells = new Map<string, Pt>()
    for (const placed of [...set.scenery, ...legs.filter((l) => l.world === key).flatMap((l) => l.placed)]) for (const c of placed.cells) cells.set(`${c[0]},${c[1]}`, c)
    set.scenery.push(standing(cast, 0, 0, [...cells.values()], castState, DURATION) as Placed)
  }

  const show = new LifeShow(legs, sets, DURATION, company.sort((a, b) => a.from - b.from), poses)
  castState.show = show
  if (ALONE_TIE) show.tie = { from: ALONE_TIE.from, at: [ALONE_AT[0] + ALONE_TIE.at[0], ALONE_AT[1] + ALONE_TIE.at[1]] }

  // The camera: one director per leg, each following Carl only inside its own leg, and each leg opening on exactly
  // the framing the last one closed on, carried by the cut: a match cut on him.
  const cams: ((t: number) => Framing)[] = []
  legs.forEach((leg, i) => {
    const chain = chains[i]
    const keys: Shot[] = chain.shots.filter((s) => s.t > leg.from + 1e-6 && s.t <= leg.to + 1e-6)
    if (i === 0) keys.unshift(keys.length ? { ...keys[0], t: 0 } : { t: 0, cells: 5 })
    else {
      const f = cams[i - 1](leg.from)
      const [sx, sy] = show.shift(i - 1, i)
      keys.unshift({ t: leg.from, cells: f.cells, hold: [f.x + sx, f.y + sy], w: 1 })
    }
    // Where two parts of one leg each put a key on the same instant, the part being entered wins.
    const clean = keys.filter((s, j) => !keys.some((o, m) => m > j && Math.abs(o.t - s.t) < 1e-6))
    if (clean.length === 1) clean.push({ t: Math.min(leg.to, leg.from + 1.2), cells: 5 })
    const where = (s: number): Pt => show.where(Math.max(leg.from, Math.min(leg.to - 1e-6, s)))
    cams.push(director(where, clean, DURATION))
  })
  const camera = (t: number): Framing => cams[show.owner(t)](t)
  return { show, camera }
}
