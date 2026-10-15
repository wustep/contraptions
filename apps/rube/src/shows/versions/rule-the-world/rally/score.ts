import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { credits } from './credits'
import { vignette } from './vignette'
import { bloom } from './bloom'
import { glow, grade } from './fx'
import { crane, finale, FINALE } from './finale'
import { live } from './live'
import { lay, standing, type Chain, type Link } from './kit'
import { BAR, CRASH, DURATION, SEAM, WIN } from './music'
import { sway } from './depth'
import { FIRST, SEAMS } from './seams'
import { RallyShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { MARTY, type WorldKey } from './worlds'
import { storeSet, STORE_CELLS, STORE_AT, store, STORE_PUNCHES } from './store/store'
import { londonSet, LONDON_CELLS, LONDON_AT, open, LONDON_PUNCHES } from './london/london'
import { hotelSet, HOTEL_CELLS, HOTEL_AT, tub, HOTEL_PUNCHES } from './hotel/hotel'
import { alleySet, ALLEY_CELLS, ALLEY_AT, hustle, ALLEY_PUNCHES } from './alley/alley'
import { jerseySet, JERSEY_CELLS, JERSEY_AT, night, JERSEY_PUNCHES } from './jersey/jersey'
import { tokyoSet, TOKYO_CELLS, TOKYO_AT, rematch, TOKYO_PUNCHES } from './tokyo/tokyo'
import { hospitalSet, HOSPITAL_CELLS, HOSPITAL_AT, nursery, HOSPITAL_PUNCHES } from './hospital/hospital'

/**
 * The whole show, in order: which place has Marty from when to when, and which part has him in each. Every part is
 * told its slot and builds to it; this file only says the order and the seams, which are all on the music (`music.ts`,
 * `seams.ts`).
 *
 *   0        the shoe store: the counter, the stockroom with Rachel, Murray's safe, the ticket to London
 *   52.463   cut: London, the British Open: Kletzki beaten, the final lost to Endo
 *   91.016   cut: the hotel: the tub through the floor onto Mishkin, the fire escape
 *   121.001  cut: the bowling alley, as the band drops out: the hustle, with Wally
 *   138.136  cut: Wally's cab, as the guitar comes in: the road, the farmhouse, the barn, the airfield
 *   176.689  cut, on "Everybody wants to rule the -": Tokyo, the exhibition, and the real match
 *   202.391  cut, on "All for freedom and for pleasure": the ward, Rachel, the nursery, his son; the credits
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  { key: 'store', world: 'store', at: STORE_AT, links: [{ part: store, end: SEAM.london }] },
  { key: 'london', world: 'london', at: LONDON_AT, links: [{ part: open, end: SEAM.hotel }] },
  { key: 'hotel', world: 'hotel', at: HOTEL_AT, links: [{ part: tub, end: SEAM.alley }] },
  { key: 'alley', world: 'alley', at: ALLEY_AT, links: [{ part: hustle, end: SEAM.jersey }] },
  { key: 'jersey', world: 'jersey', at: JERSEY_AT, links: [{ part: night, end: SEAM.tokyo }] },
  { key: 'tokyo', world: 'tokyo', at: TOKYO_AT, links: [{ part: rematch, end: SEAM.hospital }] },
  { key: 'hospital', world: 'hospital', at: HOSPITAL_AT, links: [{ part: nursery, end: DURATION }] },
]

/** A big, sparse claim of cells round a place, so its after-drawings (the vignette, the credits' shade) are drawn wherever the camera is. */
const claim = (x0: number, y0: number, x1: number, y1: number): Pt[] => {
  const out: Pt[] = []
  for (let x = x0; x <= x1; x += 3) for (let y = y0; y <= y1; y += 3) out.push([x, y])
  return out
}
const AROUND = claim(-80, -60, 80, 40)
const VIGNETTE = standing(vignette, 0, 0, AROUND, null, DURATION)
/**
 * The show's own light over every place (`fx.ts`, `bloom.ts`): Marty's glow on what is round him, under him; then over
 * everything the blooms at the seams, the grade, and the vignette.
 */
const LIGHT = [glow, bloom, grade].map((piece) => standing(piece, 0, 0, AROUND, null, DURATION)).concat(VIGNETTE)

/** Each place's standing scenery, and what is drawn over everything (the vignette, the credits' shade). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  store: { scenery: [standing(storeSet, 0, 0, STORE_CELLS, null, DURATION)], after: LIGHT },
  london: { scenery: [standing(londonSet, 0, 0, LONDON_CELLS, null, DURATION)], after: LIGHT },
  hotel: { scenery: [standing(hotelSet, 0, 0, HOTEL_CELLS, null, DURATION)], after: LIGHT },
  alley: { scenery: [standing(alleySet, 0, 0, ALLEY_CELLS, null, DURATION)], after: LIGHT },
  jersey: { scenery: [standing(jerseySet, 0, 0, JERSEY_CELLS, null, DURATION)], after: LIGHT },
  tokyo: { scenery: [standing(tokyoSet, 0, 0, TOKYO_CELLS, null, DURATION)], after: LIGHT },
  hospital: {
    scenery: [standing(hospitalSet, 0, 0, HOSPITAL_CELLS, null, DURATION)],
    // The finale's building round the ward (`finale.ts`) goes under the grade, with the credits' shade over all.
    after: [...LIGHT.slice(0, 2), standing(finale, 0, 0, claim(-130, -70, 110, 60), null, DURATION), ...LIGHT.slice(2), standing(credits, 0, 0, AROUND, null, DURATION)],
  },
})

/**
 * The looks the camera takes: on each it pushes in, at once (18 ms), and eases back slowly (τ 1 s, gone by 3.5 s).
 * The tub through the floor and the last point in Tokyo, and the big shots each place asks for (`<PLACE>_PUNCHES`):
 * time and strength, 1 the winning point's.
 */
export const PUNCHES: [number, number][] = ([
  [CRASH, 0.8],
  [WIN, 1.0],
  ...STORE_PUNCHES,
  ...LONDON_PUNCHES,
  ...HOTEL_PUNCHES,
  ...ALLEY_PUNCHES,
  ...JERSEY_PUNCHES,
  ...TOKYO_PUNCHES,
  ...HOSPITAL_PUNCHES,
] as [number, number][]).sort((x, y) => x[0] - y[0])
/** How far the lens leans in at a seam (a share of the frame), and over how long before it and after. */
const LEAN = 0.1
const LEAN_IN = BAR
const LEAN_OUT = 1.6 * BAR
const smoothstep = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}
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

export function compose(): { show: RallyShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: MARTY, ghost: false, id: 0 }
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

  const show = new RallyShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Marty. Inside a leg, at a seam
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
  // The lens over the authored camera. At every seam it leans in on him over the bar before the downbeat, as the place
  // he is leaving gathers in on him, and opens back out over the bars after, as the next place blooms out of him
  // (`bloom.ts`): a push-in and a pull-back about where he is on the screen, so he holds still in the frame while the
  // world goes in and out round him, and the match cut is kept exactly (both sides have the same lean at the seam).
  const leans = legs.slice(1).map((leg, i) => {
    const before = cams[i](leg.from - 1e-6)
    const him = show.at(leg.from - 1e-6)
    return { at: leg.from, o: [(him.x - before.x) / before.cells, (him.y - before.y) / before.cells] as Pt }
  })
  const lean = (t: number): { s: number; o: Pt } | null => {
    for (const l of leans) {
      if (t >= l.at - LEAN_IN && t < l.at) return { s: 1 - LEAN * smoothstep((t - (l.at - LEAN_IN)) / LEAN_IN), o: l.o }
      if (t >= l.at && t < l.at + LEAN_OUT) return { s: 1 - LEAN * (1 - smoothstep((t - l.at) / LEAN_OUT)), o: l.o }
    }
    return null
  }
  // Over the credits the crane takes the camera from its last framing on the glass (`finale.ts`).
  const last = cams[cams.length - 1]
  const landing = last(FINALE)
  const camera = (t: number): Framing => {
    const owner = show.owner(t)
    const f = t > FINALE ? crane(t, landing) : cams[owner](t)
    let cells = f.cells * (1 - punch(t))
    let { x, y } = f
    const l = lean(t)
    if (l) {
      x += l.o[0] * cells * (1 - l.s)
      y += l.o[1] * cells * (1 - l.s)
      cells *= l.s
    }
    // And never quite still: the slow float of a camera on a crane, a few thousandths of the frame, from the first
    // frame's hold outwards.
    const b = smoothstep(t / 3)
    x += cells * 0.006 * b * sway(t, 1, 11)
    y += cells * 0.004 * b * sway(t, 2, 13.5)
    cells *= 1 + 0.008 * b * sway(t, 3, 17)
    return { ...f, x, y, cells }
  }
  live.show = show
  live.camera = camera
  return { show, camera }
}

/** For the builders: what each cut asks of them. */
export { SEAMS }
