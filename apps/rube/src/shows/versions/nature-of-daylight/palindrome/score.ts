import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { credits } from './credits'
import { frame, lay, scenery, standing, type Chain, type Link } from './kit'
import { BLAST, DURATION, PEAK, SEAM } from './music'
import { FIRST, SEAMS } from './seams'
import { PalindromeShow, type Leg, type Riders, type Spans, type WorldSet } from './show'
import { LOUISE, type WorldKey } from './worlds'
import { houseSet, HOUSE_CELLS, DAWN_AT, BED_AT, NEWS_AT, HOME_AT, TV_SHELL, dawn, bed, news, home } from './house/house'
import { lawnSet, LAWN_CELLS, SWING_AT, SEES_AT, swing, sees } from './lawn/lawn'
import { valleySet, VALLEY_CELLS, ARRIVE_AT, GOING_AT, SHELL_CUT, arrive, going } from './valley/valley'
import { chamberSet, CHAMBER_CELLS, CONTACT_AT, BOMB_AT, contact, bomb } from './chamber/chamber'
import { fogSet, FOG_CELLS, FOG_AT, FOG2_AT, fog1, fog2 } from './fog/fog'
import { galaSet, GALA_CELLS, GALA_AT, gala } from './fog/gala'
import { tentSet, TENT_CELLS, DARK_AT, CALL_AT, dark, call } from './twelve/twelve'

/**
 * The whole show, in order: which place has Louise from when to when, and which part has her in each. Every part is
 * told its slot and builds to it; this file only says the order, the seams and the cuts, which are all on the music
 * (`music.ts`, `seams.ts`).
 *
 *   0        the lake house at dawn: Louise beside the cradle, baby Hannah in it (the first frame, and the last)
 *   22.111   the swing by the lake, years on: she pushes Hannah, who grows
 *   71.953   the bed by the window: the cellos; Hannah goes on the swell (93.861)
 *   98.429   the room at night: the television comes on (the news: the shells)
 *   102.110  the double bass: the television's shell becomes the real one over Montana (a match cut on the shell)
 *   129.556  inside: the chamber, the glass, the heptapods; contact; the language
 *   200.626  the bass drops out: the command tent, the twelve links falling one by one
 *   214.657  the chamber: the bomb (223.370)
 *   231.039  white: beyond the glass, the fog, Costello; 250.120 what she sees (the swing, Hannah grown); 257.683 fog
 *   266.124  the gala, years on: Shang tells her what to say
 *   277.647  the tent: the call (288.554); the links stand again, backwards; the ring whole on the loudest (303.827)
 *   311.293  the meadow: the shell goes up into the cloud the way it came down (318.711); daylight; Ian
 *   334.031  the lake house: home; the first frame again from the last B-flat; the credits in the quiet after
 */

interface LegPlan {
  key: string
  world: WorldKey
  /** The first part's origin, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
  at: Pt
  links: Link[]
}

const PLAN = (): LegPlan[] => [
  { key: 'dawn', world: 'house', at: DAWN_AT, links: [{ part: dawn, end: SEAM.swing }] },
  { key: 'swing', world: 'house', at: SWING_AT, links: [{ part: swing, end: SEAM.bed }] },
  { key: 'bed', world: 'house', at: BED_AT, links: [{ part: bed, end: SEAM.news }] },
  { key: 'news', world: 'house', at: NEWS_AT, links: [{ part: news, end: SEAM.arrival }] },
  { key: 'arrival', world: 'valley', at: ARRIVE_AT, links: [{ part: arrive, end: SEAM.contact }] },
  { key: 'contact', world: 'shell', at: CONTACT_AT, links: [{ part: contact, end: SEAM.dark }] },
  { key: 'dark', world: 'tent', at: DARK_AT, links: [{ part: dark, end: SEAM.bomb }] },
  { key: 'bomb', world: 'shell', at: BOMB_AT, links: [{ part: bomb, end: SEAM.fog }] },
  { key: 'fog', world: 'fog', at: FOG_AT, links: [{ part: fog1, end: SEAM.sees }] },
  { key: 'sees', world: 'house', at: SEES_AT, links: [{ part: sees, end: SEAM.fog2 }] },
  { key: 'fog2', world: 'fog', at: FOG2_AT, links: [{ part: fog2, end: SEAM.gala }] },
  { key: 'gala', world: 'gala', at: GALA_AT, links: [{ part: gala, end: SEAM.call }] },
  { key: 'call', world: 'tent', at: CALL_AT, links: [{ part: call, end: SEAM.going }] },
  { key: 'going', world: 'valley', at: GOING_AT, links: [{ part: going, end: SEAM.home }] },
  { key: 'home', world: 'house', at: HOME_AT, links: [{ part: home, end: DURATION }] },
]

/**
 * The white-out (the director's): the blast's dust in the chamber, lit by the broken glass, swelling to white, and
 * the fog beyond the glass coming out of it. A veil of white over everything, up to full at the cut and down after
 * it; the cut happens inside it, so the place changes where nothing can be seen.
 */
const VEILS: { at: number; up: number; down: number; color: string }[] = [{ at: SEAM.fog, up: 1.4, down: 1.6, color: '#F1F3F0' }]
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

/** Each place's standing scenery, and what is drawn over everything (the veil, the credits' shade). */
const SETS = (): Partial<Record<WorldKey, WorldSet>> => ({
  house: {
    scenery: [standing(houseSet, 0, 0, HOUSE_CELLS, null, DURATION), standing(lawnSet, 0, 0, LAWN_CELLS, null, DURATION)],
    after: [standing(credits, 0, 0, HOUSE_CELLS, null, DURATION)],
  },
  valley: { scenery: [standing(valleySet, 0, 0, VALLEY_CELLS, null, DURATION)], after: [] },
  shell: { scenery: [standing(chamberSet, 0, 0, CHAMBER_CELLS, null, DURATION)], after: [standing(veil, 0, 0, CHAMBER_CELLS, null, DURATION)] },
  fog: { scenery: [standing(fogSet, 0, 0, FOG_CELLS, null, DURATION)], after: [standing(veil, 0, 0, FOG_CELLS, null, DURATION)] },
  gala: { scenery: [standing(galaSet, 0, 0, GALA_CELLS, null, DURATION)], after: [] },
  tent: { scenery: [standing(tentSet, 0, 0, TENT_CELLS, null, DURATION)], after: [] },
})

/**
 * The camera takes a few of the show's great moments in the body: on each it pushes in a little, at once (18 ms), and
 * eases back slowly (τ 1 s, gone to nothing by 3.5 s): the hit is sharp, the recovery long and damped.
 */
export const PUNCHES: [number, number][] = [
  // The blast in the chamber.
  [BLAST, 0.9],
  // The ring whole again, on the loudest bar.
  [PEAK, 0.55],
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

export function compose(): { show: PalindromeShow; camera: (t: number) => Framing } {
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

  const show = new PalindromeShow(legs, SETS(), DURATION, riders, company.sort((a, b) => a.from - b.from))

  // The camera: one director per leg, each following the ball only inside its own leg, and each leg opening on
  // exactly the framing the last one closed on, carried by the cut: a match cut on Louise. Inside a leg, at a seam
  // between two parts, the incoming part's keys win: the outgoing part's keys after its own slot are dropped.
  //
  // A follow sees her carried on past either end of its leg at the speed she crosses the cut. Where she crosses a cut
  // moving, the leg opens on a follow, offset so the framing is exactly the one carried across; where she crosses at
  // rest, it opens on a hold of that framing. The cut into the valley is carried on the shell, not on her: the
  // television's picture of it and the real one are the same size in the same place on the screen.
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
      // The show's first frame: FIRST, held on her where she starts. The last scene settles on it again.
      keys.unshift({ t: 0, cells: FIRST.cells, hold: [a0[0] + FIRST.frame[0], a0[1] + FIRST.frame[1]], w: 1 })
    } else {
      const prev = cams[i - 1](leg.from)
      const seam = Object.values(SEAMS).find((m) => Math.abs(m.t - leg.from) < 1e-3)
      if (seam?.shell) {
        // The television's shell onto the real one: the same place and size on the screen.
        const s = SHELL_CUT.h / TV_SHELL.h
        const cells = prev.cells * s
        const hold: Pt = [SHELL_CUT.c[0] - (TV_SHELL.c[0] - prev.x) * s, SHELL_CUT.c[1] - (TV_SHELL.c[1] - prev.y) * s]
        keys.unshift({ t: leg.from, cells, hold, w: 1 })
      } else {
        const scale = seam?.open ? seam.open / prev.cells : 1
        // Where she was on the screen, as the last leg left her: (her - centre) / cells.
        const her = show.at(leg.from - 1e-6)
        const onScreen: Pt = [(her.x - prev.x) / prev.cells, (her.y - prev.y) / prev.cells]
        const cells = prev.cells * scale
        const carried: Pt = [a0[0] - onScreen[0] * cells, a0[1] - onScreen[1] * cells]
        if (Math.hypot(vIn[0], vIn[1]) > 0.05) {
          const [fx, fy] = follower(where, DURATION)(leg.from)
          keys.unshift({ t: leg.from, cells, off: [carried[0] - fx, carried[1] - fy], w: 0 })
        } else keys.unshift({ t: leg.from, cells, hold: carried, w: 1 })
      }
    }
    if (keys.length === 1) keys.push({ t: Math.min(leg.to, leg.from + 1.2), cells: keys[0].cells })
    for (const k of keys) if (k.cut && k.t > leg.from + 1e-6) show.cameraCuts.push(k.t)
    cams.push(director(where, keys, DURATION))
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
