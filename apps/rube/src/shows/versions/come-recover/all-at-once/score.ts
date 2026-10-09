import type { BallState, Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { eyes, type EyesState, type Gaze } from './fx'
import { box, lay, standing, type Chain, type Link } from './kit'
import { DURATION, JUMPS, ONSETS } from './music'
import { MultiverseShow, type Flicker, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { EVELYN, type WorldKey } from './worlds'
import { credits, endShade } from './credits'
import { room, shade } from './home/set'
import { laundromat } from './home/laundromat'
import { dryer } from './home/dryer'
import { premiere } from './star/premiere'
import { DROP } from './star/premiere-clock'
import { dummies } from './dojo/dummies'
import { fingers } from './hotdog/fingers'
import { raccacoonie } from './hibachi/raccacoonie'
import { surf } from './multi/surf'
import { bagel, BAGEL } from './void/bagel'
import { pull, PULL_AT } from './void/pull'
import { mosaic } from './multi/mosaic'
import { kindness, KINDNESS_AT } from './home/kindness'
import { ledge } from './rocks/ledge'
import { JOY_EYE, peak, PEAK_AT } from './void/peak'
import { finale, FINALE_AT } from './home/finale'
import { BACK, DEVELOPED, EJECT, onCamera, photoAt } from './home/finale-plan'

/**
 * The whole show, in order: which world has the ball from when to when, and who has it inside each world. Every
 * part is told its slot and builds to it; this file only says the order, the seams and the jumps, which are all on
 * the music (`music.ts`).
 *
 *   0        EVERYTHING. The laundromat at night: the chord, the silence, the machines, the taxes, the dryer.
 *   57.95    EVERYWHERE. Out of the dryer's door into the premiere: the red carpet, and the alley in the rain.
 *   86.30    the dojo, on the flurry
 *   97.15    hot dog fingers
 *   106.73   Raccacoonie's kitchen
 *   120.95   the surf: a world a hit
 *   127.79   the dark, Jobu, and the everything bagel; the pulse from 142
 *   165.62   ALL AT ONCE. Into the bagel, and every world at once
 *   191.22   the great hit: the googly eye, home, and kindness
 *   200.16   the drop: the rocks, the edge, the long way down
 *   241.76   the brink of the bagel, the catch, and the peak: pulled back out
 *   264.14   home, through a washer's window, the family, the last hits, and the credits over the quiet
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's entry cell, in the world's own cells. */
  at: Pt
  links: Link[]
}

/** Where each leg starts in its world. The laundromat's three are places in one room (`home/set.ts`). */
const PLAN = (): LegPlan[] => [
  {
    key: 'laundromat',
    world: 'home',
    at: [0, 0],
    links: [
      { part: laundromat, end: 34.331 },
      { part: dryer, end: JUMPS.premiere },
    ],
  },
  { key: 'premiere', world: 'premiere', at: [0, 0], links: [{ part: premiere, end: JUMPS.dojo }] },
  { key: 'dojo', world: 'dojo', at: [0, 0], links: [{ part: dummies, end: JUMPS.hotdog }] },
  { key: 'hotdog', world: 'hotdog', at: [0, 0], links: [{ part: fingers, end: JUMPS.hibachi }] },
  { key: 'hibachi', world: 'hibachi', at: [0, 0], links: [{ part: raccacoonie, end: JUMPS.surf }] },
  { key: 'surf', world: 'multi', at: [0, 0], links: [{ part: surf, end: JUMPS.void }] },
  { key: 'pull', world: 'void', at: PULL_AT, links: [{ part: pull, end: JUMPS.mosaic }] },
  { key: 'mosaic', world: 'multi', at: [0, 60], links: [{ part: mosaic, end: JUMPS.eye }] },
  { key: 'kindness', world: 'home', at: KINDNESS_AT, links: [{ part: kindness, end: JUMPS.rocks }] },
  { key: 'rocks', world: 'rocks', at: [0, 0], links: [{ part: ledge, end: JUMPS.brink }] },
  { key: 'peak', world: 'void', at: PEAK_AT, links: [{ part: peak, end: JUMPS.home }] },
  { key: 'home', world: 'home', at: FINALE_AT, links: [{ part: finale, end: DURATION }] },
]

/** The world-wide scenery of each world: skies, rooms, weather. Parts fill these as they are built. */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  // The laundromat: one room, its walls, fixtures and lights, which every home leg happens in.
  home: {
    scenery: [standing(room, 0, 0, box(-12, -8, 44, 4, 2), null, DURATION)],
    // The dark under the end credits' words.
    after: [standing(credits, 0, 0, box(-12, -8, 44, 4, 2), null, DURATION)],
  },
  // Jobu's bagel, where the pull draws everything in and the peak spins it all back out.
  void: { scenery: [standing(bagel, BAGEL.at[0], BAGEL.at[1], box(BAGEL.at[0] - 24, BAGEL.at[1] - 24, BAGEL.at[0] + 24, BAGEL.at[1] + 24, 2), null, DURATION)], after: [] },
})

/**
 * The flickers before a jump: the next world shows through for a frame or two just after the onsets before it, the
 * way a jump starts to bleed through in the film. Two, the second a little longer than the first. Each starts 60 ms
 * after its onset, so the leg going out is seen striking it first.
 *
 * Two, not more: with the jump itself, each flicker is a swing of the whole frame's light, and between a bright world
 * and a dark one three flickers and the cut made three and a half flashes in a second, past the three a second that
 * is safe for a viewer sensitive to flashing. Two and the cut stay under it.
 */
export const FLICKERS_A_JUMP = 2
function flickersBefore(leg: number, at: number, n = FLICKERS_A_JUMP, lead = 0.9): Flicker[] {
  const near = ONSETS.filter((o) => o.t > at - lead && o.t < at - 0.12 && o.s >= 0.3).map((o) => o.t + 0.06)
  const times = (near.length >= 2 ? near : [at - 0.3, at - 0.14]).slice(-n)
  return times.map((t, i) => ({ from: t, to: Math.min(t + 0.045 + 0.02 * i, at - 0.02), leg })).filter((f) => f.to - f.from > 0.03)
}

/**
 * The camera takes the show's biggest hits in the body: on each it pushes in a little, at once, and eases back.
 * Only the great ones, and never in the rocks' silence.
 */
const PUNCHES: [number, number][] = [
  [12.794, 1],
  [95.422, 0.6],
  [97.152, 0.7],
  [106.731, 0.6],
  [112.71, 0.9],
  [120.953, 0.8],
  [165.616, 0.7],
  [191.216, 1],
  [248.949, 0.8],
  [290.992, 0.9],
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

export function compose(): { show: MultiverseShow; camera: (t: number) => Framing } {
  const plans = PLAN()
  const chains: Chain[] = []
  let ball: BallState = { color: EVELYN, ghost: false, id: 0 }
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
    const from = first.start
    const to = last.start + last.span
    return {
      key: plan.key,
      world: plan.world,
      from,
      to,
      placed: chain.placed,
      entry: [first.col - 0.5, first.row],
      exit: [chain.next.col - 0.5, chain.next.row],
    }
  })

  // The flickers: before every jump but four. The first builds in the dryer's own glass instead, the surf's worlds
  // collapse into her on their own before the dark, the fold home on the great hit is the mosaic's own (its panels
  // flip there), and the drop into the rocks' silence is a clean cut.
  const flickers: Flicker[] = []
  legs.forEach((leg, i) => {
    if (i === 0 || leg.key === 'premiere' || leg.key === 'pull' || leg.key === 'kindness' || leg.key === 'rocks') return
    // Into the surf, one: the dark kitchen into a bright world, and then a new world on every hit, which is
    // flashing enough on its own. Measured by quarters of the frame, two there came to the three a second.
    flickers.push(...flickersBefore(i, leg.from, leg.key === 'surf' ? 1 : FLICKERS_A_JUMP))
  })

  const riders: Riders = []
  const company: Spans = []
  chains.forEach((chain, i) => {
    for (const r of chain.riders) riders.push({ ...r, leg: i })
    for (const s of chain.company) company.push({ ...s, world: legs[i].world })
  })

  // Every world's scenery, and the googly eyes over everything in every world.
  const sets = SETS()
  // The family portrait: from her hurrying back beside Joy, all three look into the lens through the flash; then
  // down at the photograph as it comes out and flutters to the floor, until it has developed.
  const lens = onCamera(0.5, 0)
  const PORTRAIT: Gaze[] = [
    { from: BACK - 0.05, to: EJECT + 0.15, at: () => lens },
    { from: EJECT + 0.15, to: DEVELOPED + 0.6, at: (t) => photoAt(t)?.at ?? null },
  ]
  const specs = [
    // He watches Joy go out of the shop, and her mother not look up; in the alley he watches Evelyn go, from the cover
    // giving under her until the jump out of that world; and for the portrait he looks into the lens, and then down
    // at the photograph as it comes, as the others do.
    { who: 'waymond' as const, from: 0, gaze: [{ from: 27.4, to: 30.3, at: 'joy' as const }, { from: DROP - 0.1, to: JUMPS.dojo }, ...PORTRAIT] },
    { who: 'evelyn' as const, from: JUMPS.eye, arrive: true, burst: true, gaze: PORTRAIT },
    // Joy's lands with a light of her own: smaller than her mother's, and in her violet, lifted toward white.
    { who: 'joy' as const, from: JOY_EYE, arrive: true, burst: { color: '#C9B2F2', size: 0.62, strength: 0.6 }, gaze: PORTRAIT },
  ]
  const eyePiece = eyes()
  const eyeStates: EyesState[] = []
  // In each world the eyes claim every cell its parts claim, so they are drawn wherever a ball can be. In the
  // laundromat they are lit as the room is.
  for (const world of new Set(legs.map((l) => l.world))) {
    const cells = new Map<string, Pt>()
    for (const leg of legs) if (leg.world === world) for (const placed of leg.placed) for (const c of placed.cells) cells.set(`${c[0]},${c[1]}`, c)
    const set = (sets[world] ??= { scenery: [], after: [] })
    // In the laundromat they are lit as the room is, and go down into the dark with it at the end.
    const state: EyesState = { show: null, specs, shade: world === 'home' ? (hex, x, y, t) => endShade(shade(hex, x, y, t), t) : undefined }
    eyeStates.push(state)
    set.after.push(standing(eyePiece, 0, 0, [...cells.values()], state, DURATION) as Placed)
  }

  const show = new MultiverseShow(legs, sets, flickers, DURATION, riders, company.sort((a, b) => a.from - b.from))
  for (const state of eyeStates) state.show = show

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the jump: a match cut on the ball.
  const cams: ((t: number) => Framing)[] = []
  legs.forEach((leg, i) => {
    const chain = chains[i]
    const keys: Shot[] = chain.shots.filter((s) => s.t > leg.from + 1e-6 && s.t <= leg.to + 1e-6)
    // The first frame is the first leg's own opening framing (a part's first key), held from zero.
    if (i === 0) keys.unshift(keys.length ? { ...keys[0], t: 0 } : { t: 0, cells: 4.6 })
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
    const owner = show.owner(t)
    const f = cams[owner](t)
    const [ox, oy] = show.offset(t)
    return { ...f, x: f.x + ox, y: f.y + oy, cells: f.cells * (1 - punch(t)) }
  }
  return { show, camera }
}
