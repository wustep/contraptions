import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { credits } from './credits'
import { box, frame, lay, scenery, standing, type Chain, type Link } from './kit'
import { CREST, DURATION, FULL_PEAK, PUSH_PEAK, SEAM, TURN } from './music'
import { FIRST, SEAMS } from './seams'
import { LogogramShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { LOUISE, type WorldKey } from './worlds'
import { houseSet, HOUSE_CELLS, PROLOGUE_AT, V1_AT, V2_AT, V3_AT, END_AT, prologue, vision1, vision2, vision3, ending } from './lake/house'
import { valleySet, VALLEY_CELLS } from './valley/set'
import { flight, FLIGHT_AT } from './valley/flight'
import { base } from './valley/base'
import { lift } from './valley/lift'
import { depart, AFTER_AT } from './valley/depart'
import { shaft, rollAt } from './shell/shaft'
import { chamber } from './shell/chamber'
import { fogSet, FOG_CELLS, FOG_AT, fog1, fog2, fog3, fog4 } from './fog/fog'

/**
 * The whole show, in order: which place has Louise from when to when, and which part has her in each. Every part is
 * told its slot and builds to it; this file only says the order, the seams and the cuts, which are all on the music
 * (`music.ts`, `seams.ts`).
 *
 *   0        the lake house at dawn: Louise by the long window, Hannah comes to her (the future, though we do not know)
 *   8.911    white: the cloud over the valley; the helicopter comes out of it, the shell over the meadow
 *   22.059   the pad; the base; the shell's slot opens on the first burst
 *   43.758   the lift rises through the fog into the slot
 *   65.985   cut: inside, the shaft's mouth; gravity turns on the great burst (70.513); the long shaft to the light
 *   85.786   the chamber: the glass lights, the heptapods come out of the fog, contact, the first logogram
 *   130.4    white: through the glass into the fog, on the cue's loudest swell
 *   139.476  cut: Hannah on the grass (the first vision)          142.582  cut: the fog
 *   156.177  cut: Hannah older, by the window                      160.015  cut: the fog
 *   163.126  cut: the window at dusk, no Hannah                    166.243  cut: the fog, the push: she writes
 *   185.330  cut: the valley; the shell goes; Ian comes to her
 *   196.783  cut: the lake house, the first frame again; Hannah comes to her; the credits in the quiet
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  { key: 'prologue', world: 'lake', at: PROLOGUE_AT, links: [{ part: prologue, end: SEAM.flight }] },
  {
    key: 'arrival',
    world: 'valley',
    at: FLIGHT_AT,
    links: [
      { part: flight, end: SEAM.base },
      { part: base, end: SEAM.lift },
      { part: lift, end: SEAM.shaft },
    ],
  },
  {
    key: 'inside',
    world: 'shell',
    at: [0, 0],
    links: [
      { part: shaft, end: SEAM.chamber },
      { part: chamber, end: SEAM.fog1 },
    ],
  },
  { key: 'fog1', world: 'fog', at: FOG_AT[0], links: [{ part: fog1, end: SEAM.v1 }] },
  { key: 'v1', world: 'lake', at: V1_AT, links: [{ part: vision1, end: SEAM.fog2 }] },
  { key: 'fog2', world: 'fog', at: FOG_AT[1], links: [{ part: fog2, end: SEAM.v2 }] },
  { key: 'v2', world: 'lake', at: V2_AT, links: [{ part: vision2, end: SEAM.fog3 }] },
  { key: 'fog3', world: 'fog', at: FOG_AT[2], links: [{ part: fog3, end: SEAM.v3 }] },
  { key: 'v3', world: 'lake', at: V3_AT, links: [{ part: vision3, end: SEAM.fog4 }] },
  { key: 'fog4', world: 'fog', at: FOG_AT[3], links: [{ part: fog4, end: SEAM.after }] },
  { key: 'after', world: 'valley', at: AFTER_AT, links: [{ part: depart, end: SEAM.end }] },
  { key: 'end', world: 'lake', at: END_AT, links: [{ part: ending, end: DURATION }] },
]

/**
 * The white-outs (the director's): the window's glare swelling into the cloud over the valley, and the glass's light
 * swelling on the cue's loudest moment. A veil of white over everything, up to full at the cut and down after it;
 * the cut happens inside it, so the place changes where nothing can be seen.
 */
const VEILS: { at: number; up: number; down: number; color: string }[] = [
  { at: SEAM.flight, up: 0.55, down: 0.75, color: '#F1F3F0' },
  { at: SEAM.fog1, up: 0.7, down: 0.95, color: '#F4F5F1' },
]
export const veilAt = (t: number): { a: number; color: string } => {
  for (const v of VEILS) {
    if (t < v.at - v.up || t > v.at + v.down) continue
    const u = t < v.at ? (t - (v.at - v.up)) / v.up : 1 - (t - v.at) / v.down
    const e = Math.max(0, Math.min(1, u))
    return { a: e * e * (3 - 2 * e), color: v.color }
  }
  return { a: 0, color: '#FFFFFF' }
}
const veil = scenery<null>({
  name: 'veil',
  draw: () => {},
  over: (p, _s, c) => {
    const { a, color } = veilAt(c.t)
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

/** Each place's standing scenery, and what is drawn over everything (the veils, the credits' shade). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  lake: { scenery: [standing(houseSet, 0, 0, HOUSE_CELLS, null, DURATION)], after: [standing(veil, 0, 0, HOUSE_CELLS, null, DURATION), standing(credits, 0, 0, HOUSE_CELLS, null, DURATION)] },
  valley: { scenery: [standing(valleySet, 0, 0, VALLEY_CELLS, null, DURATION)], after: [standing(veil, 0, 0, VALLEY_CELLS, null, DURATION)] },
  shell: { scenery: [], after: [standing(veil, 0, 0, box(-20, -40, 120, 30, 4), null, DURATION)] },
  fog: { scenery: [standing(fogSet, 0, 0, FOG_CELLS, null, DURATION)], after: [standing(veil, 0, 0, FOG_CELLS, null, DURATION)] },
})

/**
 * The camera takes a few of the show's great moments in the body: on each it pushes in a little, at once (18 ms), and
 * eases back slowly (τ 1 s, gone to nothing by 3.5 s): the hit is sharp, the recovery long and damped.
 */
export const PUNCHES: [number, number][] = [
  // Gravity turns under her.
  [TURN, 0.8],
  // The palm meets her on the glass.
  [FULL_PEAK, 0.55],
  // The great logogram closes, hers and theirs.
  [PUSH_PEAK, 0.7],
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

/** A screen offset turned by `a` (the camera's roll): what a world offset looks like on the screen. */
const turn = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

export function compose(): { show: LogogramShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: LOUISE, ghost: false, id: 0 }
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

  const show = new LogogramShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Louise. Inside a leg, at a seam
  // between two parts, the incoming part's keys win: the outgoing part's keys after its own slot are dropped.
  //
  // A follow sees her carried on past either end of its leg at the speed she crosses the cut. Where she crosses a cut
  // moving, the leg opens on a follow, offset so the framing is exactly the one carried across; where she crosses at
  // rest, it opens on a hold of that framing. Where the camera's roll changes at a cut (into the shaft's mouth), what
  // is carried is her place on the screen: the offset is turned into the new roll.
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
    if (i === 0) {
      // The show's first frame: FIRST, held on her where she starts. The last scene opens on it again.
      keys.unshift({ t: 0, cells: FIRST.cells, hold: [a0[0] + FIRST.frame[0], a0[1] + FIRST.frame[1]], w: 1 })
    } else {
      // The last leg's framing at the cut, turned as that leg had it just before (the roll is a function of time, and
      // at the cut into the shaft it is already the incoming leg's).
      const prev = { ...cams[i - 1](leg.from), angle: rollAt(leg.from - 1e-6) }
      const seam = Object.values(SEAMS).find((m) => m.cut && Math.abs(m.t - leg.from) < 1e-3)
      const scale = seam?.open ? seam.open / prev.cells : 1
      // Where she was on the screen, as the last leg left her: (her - centre) / cells, turned by its roll.
      const her = show.at(leg.from - 1e-6)
      const exitAt: Pt = [her.x, her.y]
      const onScreen = turn([(exitAt[0] - prev.x) / prev.cells, (exitAt[1] - prev.y) / prev.cells], prev.angle ?? 0)
      const cells = prev.cells * scale
      const back = turn(onScreen, -rollAt(leg.from))
      const carried: Pt = [a0[0] - back[0] * cells, a0[1] - back[1] * cells]
      if (leg.key === 'end') {
        // The circle: the last scene opens on the show's first frame exactly (the part before frames her to match).
        keys.unshift({ t: leg.from, cells: FIRST.cells, hold: [a0[0] + FIRST.frame[0], a0[1] + FIRST.frame[1]], w: 1 })
      } else if (Math.hypot(vIn[0], vIn[1]) > 0.05) {
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

/** For the check: the cuts that happen inside a white-out. */
export const VEILED = VEILS.map((v) => v.at)
export { CREST }
