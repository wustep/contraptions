import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { credits } from './credits'
import { frame, lay, scenery, standing, type Chain, type Link } from './kit'
import { DURATION, PEAK, SEAM } from './music'
import { FIRST, SEAMS } from './seams'
import { QuintessenceShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { WALTER, type WorldKey } from './worlds'
import { negativesSet, NEGATIVES_CELLS, NEGATIVES_AT, CLUES_AT, opening, clues } from './negatives/negatives'
import { dreamSet, DREAM_CELLS, DREAM_AT, leap } from './dream/dream'
import { nuukSet, NUUK_CELLS, NUUK_AT, bar } from './nuuk/nuuk'
import { skySet, SKY_CELLS, SKY_AT, helicopter } from './sky/sky'
import { seaSet, SEA_CELLS, SEA_AT, sea } from './sea/sea'
import { icelandSet, ICELAND_CELLS, ICELAND_AT, road } from './iceland/iceland'
import { homeSet, HOME_CELLS, HOME_AT, piano } from './home/home'
import { himalayaSet, HIMALAYA_CELLS, HIMALAYA_AT, ghostCat } from './himalaya/himalaya'
import { pressSet, PRESS_CELLS, PRESS_AT, press } from './press/press'
import { streetSet, STREET_CELLS, STREET_AT, newsstand } from './street/street'

/**
 * The whole show, in order: which place has Walter from when to when, and which part has him in each. Every part is
 * told its slot and builds to it; this file only says the order, the seams and the covers, which are all on the music
 * (`music.ts`, `seams.ts`).
 *
 *   0        the negatives: the light table in the dark, the strip with frame 25 missing; he sits in its blank
 *   10.363   cut: the daydream, as the band comes in: the leap into the burning building, the three-legged dog
 *   23.74    cut: back in the basement, as if he never moved: Cheryl, the clues, the enlarger, the ship
 *   37.05    cut: through the ship's picture into the bar at Nuuk: the pilot, Cheryl on the little stage, the run
 *   50.41    cut: the helipad; up over the sea; the boat; the jump
 *   70.398   cut: into the sea, as everything over the bass drops out; the shark; hauled up as the band comes back
 *   95.23    cut: through the cake's wrapper into Iceland: the bicycle, the longboard, the eruption, the ash
 *   133.278  cut, under the ash: his mother's room, the piano's curve, on the pulse
 *   146.519  cut: the Himalayas, on the build: the climb, Sean, the ghost cat
 *   191.409  cut: negative 25 on Ted's table, on the peak; the presses run the last issue
 *   226.384  cut: the street, the newsstand, Cheryl; the credits
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  { key: 'opening', world: 'negatives', at: NEGATIVES_AT, links: [{ part: opening, end: SEAM.dream }] },
  { key: 'dream', world: 'dream', at: DREAM_AT, links: [{ part: leap, end: SEAM.office }] },
  { key: 'clues', world: 'negatives', at: CLUES_AT, links: [{ part: clues, end: SEAM.nuuk }] },
  { key: 'nuuk', world: 'nuuk', at: NUUK_AT, links: [{ part: bar, end: SEAM.sky }] },
  { key: 'sky', world: 'sky', at: SKY_AT, links: [{ part: helicopter, end: SEAM.sea }] },
  { key: 'sea', world: 'sea', at: SEA_AT, links: [{ part: sea, end: SEAM.iceland }] },
  { key: 'iceland', world: 'iceland', at: ICELAND_AT, links: [{ part: road, end: SEAM.home }] },
  { key: 'home', world: 'home', at: HOME_AT, links: [{ part: piano, end: SEAM.himalaya }] },
  { key: 'himalaya', world: 'himalaya', at: HIMALAYA_AT, links: [{ part: ghostCat, end: SEAM.press }] },
  { key: 'press', world: 'press', at: PRESS_AT, links: [{ part: press, end: SEAM.street }] },
  { key: 'street', world: 'street', at: STREET_AT, links: [{ part: newsstand, end: DURATION }] },
]

/**
 * The ash: the one cut under a cover (the director's). The volcano's ash comes down over the whole frame on the
 * Iceland side, grey-white, slowly, and lifts off his mother's room on the other: up over `up` seconds to the cut,
 * down over `down` after it. The place changes where nothing can be seen, and his place in the frame holds.
 */
const ASH = { at: SEAM.home, up: 3.2, down: 1.6, color: '#D8D4CC' }
export const ashAt = (t: number): number => {
  if (t < ASH.at - ASH.up || t > ASH.at + ASH.down) return 0
  if (t < ASH.at) {
    const u = (t - (ASH.at - ASH.up)) / ASH.up
    return u * u * (3 - 2 * u)
  }
  const u = (t - ASH.at) / ASH.down
  return Math.pow(1 - u, 2)
}
const ashCut = scenery<null>({
  name: 'ash-cut',
  draw: () => {},
  over: (p, _s, c) => {
    const a = ashAt(c.t)
    if (a <= 0.001) return
    const f = frame(p, c.k)
    const col = p.color(ASH.color)
    col.setAlpha(255 * a)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(col)
    p.rect((f.x0 - 1) * c.k, (f.y0 - 1) * c.k, (f.x1 - f.x0 + 2) * c.k, (f.y1 - f.y0 + 2) * c.k)
    p.pop()
  },
})

/** A big, sparse claim of cells round a place, so its after-drawings (the ash, the credits' shade) are drawn wherever the camera is. */
const claim = (x0: number, y0: number, x1: number, y1: number): Pt[] => {
  const out: Pt[] = []
  for (let x = x0; x <= x1; x += 3) for (let y = y0; y <= y1; y += 3) out.push([x, y])
  return out
}
const AROUND = claim(-80, -60, 80, 40)

/** Each place's standing scenery, and what is drawn over everything (the ash, the credits' shade). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  negatives: { scenery: [standing(negativesSet, 0, 0, NEGATIVES_CELLS, null, DURATION)], after: [] },
  dream: { scenery: [standing(dreamSet, 0, 0, DREAM_CELLS, null, DURATION)], after: [] },
  nuuk: { scenery: [standing(nuukSet, 0, 0, NUUK_CELLS, null, DURATION)], after: [] },
  sky: { scenery: [standing(skySet, 0, 0, SKY_CELLS, null, DURATION)], after: [] },
  sea: { scenery: [standing(seaSet, 0, 0, SEA_CELLS, null, DURATION)], after: [] },
  iceland: { scenery: [standing(icelandSet, 0, 0, ICELAND_CELLS, null, DURATION)], after: [standing(ashCut, 0, 0, AROUND, null, DURATION)] },
  home: { scenery: [standing(homeSet, 0, 0, HOME_CELLS, null, DURATION)], after: [standing(ashCut, 0, 0, AROUND, null, DURATION)] },
  himalaya: { scenery: [standing(himalayaSet, 0, 0, HIMALAYA_CELLS, null, DURATION)], after: [] },
  press: { scenery: [standing(pressSet, 0, 0, PRESS_CELLS, null, DURATION)], after: [] },
  street: { scenery: [standing(streetSet, 0, 0, STREET_CELLS, null, DURATION)], after: [standing(credits, 0, 0, AROUND, null, DURATION)] },
})

/**
 * The looks the camera takes: on each it pushes in, at once (18 ms), and eases back slowly (τ 1 s, gone by 3.5 s).
 * Only two: the negative laid on Ted's table on the peak, and the press's first sheet a bar later. Nothing else in
 * this film is loud enough to earn one.
 */
export const PUNCHES: [number, number][] = [
  [PEAK, 1.0],
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

export function compose(): { show: QuintessenceShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: WALTER, ghost: false, id: 0 }
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

  const show = new QuintessenceShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Walter. Inside a leg, at a seam
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
      const him = show.at(leg.from - 1e-6)
      const onScreen: Pt = [(him.x - prev.x) / prev.cells, (him.y - prev.y) / prev.cells]
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

/** For the check: the one cut under a cover, the ash. */
export const COVERED = [ASH.at]
/** For the builders: what each cut asks of them. */
export { SEAMS }
