import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { credits } from './credits'
import { frame, lay, scenery, standing, type Chain, type Link } from './kit'
import { CALL1, DURATION, SEAM, SPLASH, STOP, WASH } from './music'
import { FIRST, SEAMS } from './seams'
import { MagnumShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { DEREK, type WorldKey } from './worlds'
import { awardsSet, AWARDS_CELLS, AWARDS_AT, awards } from './awards/awards'
import { spaSet, SPA_CELLS, SPA_AT, spa } from './spa/spa'
import { clubSet, CLUB_CELLS, CLUB_AT, walkoff } from './club/walkoff'
import { derelicteSet, DERELICTE_CELLS, runway } from './derelicte/runway'
import { towerSet, TOWER_CELLS } from './derelicte/tower'
import { DERELICTE_AT } from './derelicte/geo'
import { centerSet, CENTER_CELLS, CENTER_AT, center } from './center/center'

/**
 * The whole show, in order: which place has Derek from when to when, and which part has him in each. Every part is
 * told its slot and builds to it; this file only says the order, the seams and the cuts, which are all on the music
 * (`music.ts`, `seams.ts`).
 *
 *   0        the awards: Male Model of the Year, and Derek is sure it is his; the drums come in and it is Hansel's
 *   27.394   flash: Mugatu's day spa, on the hook: pampered down a line of treatments, then taught to strike on a song
 *   83.552   flash: the underground walk-off, Derek and Hansel under the lasers; friends after
 *   116.820  cut: Derelicte, on the count-in: the needle drops, and Derek walks; Hansel climbs to the booth; the plug
 *            (182.817); the star; Magnum on the splash out of the silence (186.474)
 *   202.095  flash: the Derek Zoolander Center for Kids Who Can't Read Good, a center for ants, made three times bigger
 *            three times; the credits
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  { key: 'awards', world: 'awards', at: AWARDS_AT, links: [{ part: awards, end: SEAM.spa }] },
  { key: 'spa', world: 'spa', at: SPA_AT, links: [{ part: spa, end: SEAM.club }] },
  { key: 'club', world: 'club', at: CLUB_AT, links: [{ part: walkoff, end: SEAM.derelicte }] },
  { key: 'derelicte', world: 'derelicte', at: DERELICTE_AT, links: [{ part: runway, end: SEAM.center }] },
  { key: 'center', world: 'center', at: CENTER_AT, links: [{ part: center, end: DURATION }] },
]

/**
 * The flash cuts (the director's): three of the cuts happen inside a press camera's flash, the fashion world's own
 * punctuation. White up in a tenth of a second to the cut, and down over the next two thirds; the place changes where
 * nothing can be seen, and his place in the frame holds.
 */
const FLASHES: { at: number; up: number; down: number; color: string }[] = Object.values(SEAMS)
  .filter((s) => s.flash)
  .map((s) => ({ at: s.t, up: 0.1, down: 0.66, color: '#FFFBF2' }))
export const flashCutAt = (t: number): number => {
  for (const f of FLASHES) {
    if (t < f.at - f.up || t > f.at + f.down) continue
    if (t < f.at) {
      const u = (t - (f.at - f.up)) / f.up
      return u * u
    }
    const u = (t - f.at) / f.down
    return Math.pow(1 - u, 2.2)
  }
  return 0
}
const flashCut = scenery<null>({
  name: 'flash-cut',
  draw: () => {},
  over: (p, _s, c) => {
    const a = flashCutAt(c.t)
    if (a <= 0.001) return
    const f = frame(p, c.k)
    const col = p.color(FLASHES[0].color)
    col.setAlpha(255 * a)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(col)
    p.rect((f.x0 - 1) * c.k, (f.y0 - 1) * c.k, (f.x1 - f.x0 + 2) * c.k, (f.y1 - f.y0 + 2) * c.k)
    p.pop()
  },
})

/** A big, sparse claim of cells round a place, so its after-drawings (the flash, the credits) are drawn wherever the camera is. */
const claim = (x0: number, y0: number, x1: number, y1: number): Pt[] => {
  const out: Pt[] = []
  for (let x = x0; x <= x1; x += 3) for (let y = y0; y <= y1; y += 3) out.push([x, y])
  return out
}

/** Each place's standing scenery, and what is drawn over everything (the flash cuts, the credits' shade). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  awards: { scenery: [standing(awardsSet, 0, 0, AWARDS_CELLS, null, DURATION)], after: [standing(flashCut, 0, 0, claim(-60, -40, 60, 30), null, DURATION)] },
  spa: { scenery: [standing(spaSet, 0, 0, SPA_CELLS, null, DURATION)], after: [standing(flashCut, 0, 0, claim(-60, -40, 60, 30), null, DURATION)] },
  club: { scenery: [standing(clubSet, 0, 0, CLUB_CELLS, null, DURATION)], after: [standing(flashCut, 0, 0, claim(-60, -40, 60, 30), null, DURATION)] },
  derelicte: {
    scenery: [standing(derelicteSet, 0, 0, DERELICTE_CELLS, null, DURATION), standing(towerSet, DERELICTE_AT[0], DERELICTE_AT[1], TOWER_CELLS.map(([x, y]) => [x + DERELICTE_AT[0], y + DERELICTE_AT[1]] as Pt), null, DURATION)],
    after: [standing(flashCut, 0, 0, claim(-60, -40, 60, 30), null, DURATION)],
  },
  center: { scenery: [standing(centerSet, 0, 0, CENTER_CELLS, null, DURATION)], after: [standing(flashCut, 0, 0, claim(-60, -40, 60, 30), null, DURATION), standing(credits, 0, 0, claim(-60, -40, 60, 30), null, DURATION)] },
})

/**
 * The looks the camera takes in the body: on each it pushes in, at once (18 ms), and eases back slowly (τ 1 s, gone
 * by 3.5 s): the hit is sharp, the recovery long and damped. Magnum is the biggest thing in the show.
 */
export const PUNCHES: [number, number][] = [
  // Blue Steel, at the runway's end, on the first sung call.
  [CALL1, 0.6],
  // The surge's wash: the march becomes a charge.
  [WASH, 0.5],
  // The plug: the band stops dead.
  [STOP, 0.7],
  // Magnum.
  [SPLASH, 1.6],
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

export function compose(): { show: MagnumShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: DEREK, ghost: false, id: 0 }
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

  const show = new MagnumShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Derek. Inside a leg, at a seam
  // between two parts, the incoming part's keys win: the outgoing part's keys after its own slot are dropped.
  //
  // A follow sees him carried on past either end of its leg at the speed he crosses the cut. Where he crosses a cut
  // moving, the leg opens on a follow, offset so the framing is exactly the one carried across; where he crosses at
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
    if (i === 0) {
      // The show's first frame: FIRST, held on him where he starts.
      keys.unshift({ t: 0, cells: FIRST.cells, hold: [a0[0] + FIRST.frame[0], a0[1] + FIRST.frame[1]], w: 1 })
    } else {
      // The last leg's framing at the cut, carried: where he was on the screen, as the last leg left him.
      const prev = cams[i - 1](leg.from)
      const her = show.at(leg.from - 1e-6)
      const onScreen: Pt = [(her.x - prev.x) / prev.cells, (her.y - prev.y) / prev.cells]
      const cells = prev.cells
      const carried: Pt = [a0[0] - onScreen[0] * cells, a0[1] - onScreen[1] * cells]
      if (Math.hypot(vIn[0], vIn[1]) > 0.05) {
        const [fx, fy] = follower(where, DURATION)(leg.from)
        keys.unshift({ t: leg.from, cells, off: [carried[0] - fx, carried[1] - fy], w: 0 })
      } else keys.unshift({ t: leg.from, cells, hold: carried, w: 1 })
    }
    if (keys.length === 1) keys.push({ t: Math.min(leg.to, leg.from + 1.2), cells: keys[0].cells })
    for (const k of keys) if (k.cut && k.t > leg.from + 1e-6) show.cameraCuts.push(k.t)
    const dir = director(where, keys, DURATION)
    cams.push(dir)
  })
  const camera = (t: number): Framing => {
    const owner = show.owner(t)
    const f = cams[owner](t)
    return { ...f, cells: f.cells * (1 - punch(t)) }
  }
  return { show, camera }
}

/** For the check: the cuts that happen inside a flash. */
export const FLASHED = FLASHES.map((f) => f.at)
