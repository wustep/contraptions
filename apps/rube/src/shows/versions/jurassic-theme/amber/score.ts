import type { BallState, Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, follower, type Shot } from './camera'
import { dawn } from './dawn'
import { dig } from './dig'
import { lab } from './lab'
import { lay, type Chain, type Link } from './kit'
import { BIRDS, CLEAR, DAWN, DURATION, GATES, LAB, LIFT, VALLEY } from './music'
import { AmberShow, type Leg } from './show'
import { valley } from './valley'
import { GRANT, type WorldKey } from './worlds'

/**
 * The four places, laid end to end, and one camera. Each place opens on the framing the last one closed on, carried
 * across the cut, so the cut is a match on Grant. He is at rest at every cut. Inside a place the camera is a few
 * holds: close while a thing happens, wide when the valley has to be believed.
 */

interface Plan {
  key: string
  world: WorldKey
  at: Pt
  links: Link[]
  shots: Shot[]
}

const DIG: Shot[] = [
  { t: 1.4, cells: 4.8, w: 0, off: [0.85, -0.5] },
  { t: 6.3, cells: 5.6, hold: [4.8, -0.7], w: 1 },
  { t: 7.85, cells: 6.8, hold: [5.4, -1.7], w: 1 },
  { t: 11.7, cells: 5.0, hold: [8.05, -0.4], w: 1 },
]

const LAB_SHOTS: Shot[] = [
  { t: 18.3, cells: 5.8, hold: [1.9, -1.2], w: 1 },
  { t: 21.1, cells: 4.8, w: 0, off: [0.9, -0.45] },
  { t: 32.5, cells: 6.6, hold: [17.0, -0.9], w: 1 },
  { t: 45.5, cells: 5.2, hold: [17.05, -0.65], w: 1 },
]

const VALLEY_SHOTS: Shot[] = [
  { t: 54, cells: 18, hold: [16, -7.2], w: 1 },
  { t: 74, cells: 22, hold: [26, -9.2], w: 1 },
  { t: GATES, cells: 24, hold: [28, -10.5], w: 1 },
  { t: 96, cells: 12, w: 0, off: [1.6, -1.2] },
  { t: 108, cells: 24, hold: [30, -13], w: 0.7 },
  { t: 124, cells: 26, hold: [30, -14], w: 0.9 },
  { t: 145, cells: 34, hold: [28, -13.5], w: 1 },
  { t: BIRDS, cells: 36, hold: [26, -14], w: 1 },
  { t: 174, cells: 36, hold: [26, -13.5], w: 1 },
]

const DAWN_SHOTS: Shot[] = [
  { t: 182.4, cells: 11, hold: [0.35, -1.15], w: 1 },
  { t: LIFT, cells: 9.2, hold: [0.5, -1.35], w: 1 },
  { t: 201.2, cells: 16, w: 0.25, off: [-3.2, 0.4] },
  { t: 216, cells: 18, hold: [7.5, -4.4], w: 1 },
]

function plans(): Plan[] {
  return [
    { key: 'dig', world: 'dig', at: [0, 0], links: [{ part: dig, end: LAB }], shots: DIG },
    { key: 'lab', world: 'lab', at: [0, 0], links: [{ part: lab, end: VALLEY }], shots: LAB_SHOTS },
    { key: 'valley', world: 'valley', at: [0, 0], links: [{ part: valley, end: DAWN }], shots: VALLEY_SHOTS },
    { key: 'dawn', world: 'dawn', at: [0, 0], links: [{ part: dawn, end: DURATION }], shots: DAWN_SHOTS },
  ]
}

const PUNCHES: [number, number][] = [
  [GATES, 0.5],
  [CLEAR, 0.7],
  [BIRDS, 0.85],
  [LIFT, 0.55],
]
const PUNCH_FOR = 1.1
const PUNCH_TAU = 0.4

/** A small zoom on a crest: sharp in, slow out, and gone. Not a flash. */
function punch(t: number): number {
  let v = 0
  const floor = Math.exp(-PUNCH_FOR / PUNCH_TAU)
  for (const [at, s] of PUNCHES) {
    const u = t - at
    if (u < 0 || u > PUNCH_FOR) continue
    v += 0.035 * s * (1 - Math.exp(-u / 0.018)) * ((Math.exp(-u / PUNCH_TAU) - floor) / (1 - floor))
  }
  return v
}

export function compose(): { show: AmberShow; camera: (t: number) => Framing } {
  const list = plans()
  const chains: Chain[] = []
  let ball: BallState = { color: GRANT, ghost: false, id: 0 }
  let begin = 0
  for (const plan of list) {
    const chain = lay({ col: plan.at[0], row: plan.at[1], begin, ball }, plan.links)
    chains.push(chain)
    ball = chain.next.ball
    begin = chain.next.begin
  }

  const legs: Leg[] = list.map((plan, i) => {
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

  const company = chains.flatMap((chain, i) => chain.company.map((s) => ({ ...s, world: legs[i].world })))
  const show = new AmberShow(legs, DURATION, company.sort((a, b) => a.from - b.from))

  const cams: ((t: number) => Framing)[] = []
  legs.forEach((leg, i) => {
    const keys: Shot[] = list[i].shots.filter((s) => s.t > leg.from + 1e-6 && s.t < leg.to - 1e-6)
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
    if (i === 0) keys.unshift({ t: 0, cells: 5.4, hold: [1.35, -0.8], w: 1 })
    else {
      const prev = cams[i - 1](leg.from)
      const her = show.at(leg.from - 1e-6)
      const onScreen: Pt = [(her.x - prev.x) / prev.cells, (her.y - prev.y) / prev.cells]
      const carried: Pt = [a0[0] - onScreen[0] * prev.cells, a0[1] - onScreen[1] * prev.cells]
      if (Math.hypot(vIn[0], vIn[1]) > 0.05) {
        const [fx, fy] = follower(where, DURATION)(leg.from)
        keys.unshift({ t: leg.from, cells: prev.cells, off: [carried[0] - fx, carried[1] - fy], w: 0 })
      } else keys.unshift({ t: leg.from, cells: prev.cells, hold: carried, w: 1 })
    }
    if (keys.length === 1) keys.push({ t: Math.min(leg.to, leg.from + 1.2), cells: keys[0].cells })
    const dir = director(where, keys, DURATION)
    cams.push(dir)
  })

  const camera = (t: number): Framing => {
    const f = cams[show.owner(t)](t)
    return { ...f, cells: f.cells * (1 - punch(t)) }
  }
  return { show, camera }
}
