import type p5 from 'p5'
import { defineContraption } from '../../core/define'
import { clipBox, outline } from '../../core/draw'
import { mod } from '../../core/ease'
import type { Contraption, DrawCtx, SetupCtx } from '../../core/types'
import type { Side } from '../../core/types'
import { bell } from './bell'
import { counter } from './counter'
import { cup } from './cup'
import { dominoes } from './dominoes'
import { flag } from './flag'
import { flap } from './flap'
import { hopper } from './hopper'
import { jack } from './jack'
import { lamp } from './lamp'
import { paddle } from './paddle'
import { laneAt, laneTime } from '../../core/lane'
import { FLOOR, LANE_Y, LINK, rollLane, token, type Beat, type Pt } from './parts'
import { seesaw } from './seesaw'
import { toaster } from './toaster'

/**
 * Three of the set's own machines hard-wired into one sentence: the hopper
 * lets a ball go, it crosses the middle machine and sets it off, and the
 * machine at the end reacts — read left to right like a comic.
 *
 * The ball is drawn once, by the strip, and each member is told it is chained
 * so it draws only its own side of the hand-off.
 */

/** A member machine, where it sits in the footprint, and when it fires. */
interface Member {
  piece: Contraption<Beat>
  state: Beat
  at: Pt
  fire: number
  /** 1 west → east, -1 the other way. Members draw one hand and are mirrored. */
  hand: number
}

const RELAYS: Contraption<Beat>[] = [seesaw, paddle, dominoes, flap, counter]
const SINKS: Contraption<Beat>[] = [bell, cup, lamp, flag, toaster, jack]

const other = (side: Side | null): Side | null => (side === 'E' ? 'W' : side === 'W' ? 'E' : side)

/**
 * Stand a member up at `at`, chained from `inSide` to `outSide`, firing at
 * `fire`. Machines draw one hand — west → east — so a member the ball crosses
 * the other way is set up canonically and mirrored when it is drawn, exactly
 * as the lane world does it.
 */
export function member(ctx: SetupCtx, piece: Contraption<Beat>, at: Pt, fire: number, inSide: Side | null, outSide: Side | null, color: string): Member {
  const state = piece.setup({ ...ctx, size: ctx.size, w: ctx.size, h: ctx.size, rng: ctx.rng.fork(piece.name), color: ctx.rng.pick(ctx.theme.colors) })
  const hand = inSide === 'E' || outSide === 'W' ? -1 : 1
  state.flow =
    hand < 0 ? { in: other(inSide), out: other(outSide), color } : { in: inSide, out: outSide, color }
  return { piece, state, at, fire, hand }
}

/**
 * Where a member holds the ball at one end of its lane, in strip units. A
 * sentence has no world to run a lane for it, so it asks the two machines that
 * keep a ball — the feeder's throat, the ending's seat — where theirs sits,
 * and parks the ball there for the rest of the loop. Without it the ball pops
 * out of a cup that was built to hold one.
 */
export function laneEnd(m: Member, end: 'in' | 'out'): Pt {
  const ctx = { in: end === 'out' ? ('W' as const) : null, out: end === 'in' ? ('E' as const) : null, emit: 0.2, floorY: LANE_Y }
  const lane = m.piece.lane?.(ctx, m.state) ?? rollLane(ctx)
  const at = laneAt(lane, end === 'in' ? 0 : laneTime(lane))
  return [m.at[0] + m.hand * at.x, m.at[1] + at.y]
}

/**
 * Draw a member in its own cell, on its own clock: its `fireAt` lands on
 * `fire`. `over` is a second pass, run after the strip's own ball, for the
 * parts that stand in front of it.
 */
export function drawMember(p: p5, m: Member, ctx: DrawCtx, pass: 'draw' | 'over' = 'draw'): void {
  const fn = pass === 'draw' ? m.piece.draw : m.piece.over
  if (!fn) return
  const k = ctx.size
  p.push()
  p.translate(m.at[0] * k, m.at[1] * k)
  p.scale(m.hand, 1)
  fn.call(m.piece, p, m.state, { ...ctx, w: k, h: k, u: mod(ctx.u - m.fire + (m.piece.fireAt ?? 0), 1) })
  p.pop()
}

export const strip = defineContraption<Beat & { members: Member[] }>({
  name: 'strip',
  label: 'Strip',
  tags: ['ball', 'sentence'],
  span: [3, 1],
  rotations: [0],
  setup: (ctx) => {
    const { color, rng } = ctx
    const relay = rng.pick(RELAYS)
    const sink = rng.pick(SINKS)
    return {
      color,
      members: [
        member(ctx, hopper, [-1, 0], 0.3, null, 'E', color),
        member(ctx, relay, [0, 0], 0.3 + LINK, 'W', 'E', color),
        member(ctx, sink, [1, 0], 0.3 + LINK * 2, 'W', null, color),
      ],
    }
  },
  draw: (p, s, ctx) => {
    const { size: k, w, h, u, ink, weight } = ctx
    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      p.line(-w / 2, FLOOR * k, w / 2, FLOOR * k)
      for (const m of s.members) drawMember(p, m, ctx)
      // One ball for the whole loop: waiting in the hopper's throat, crossing
      // on the release, then at rest in whatever the ending holds it with.
      const first = s.members[0].fire
      const tail = s.members[s.members.length - 1]
      const throat = laneEnd(s.members[0], 'in')
      const rest = laneEnd(tail, 'out')
      const f = (u - first) / (tail.fire - first)
      const at: Pt =
        u < first ? throat
        : u > tail.fire ? rest
        : [-1 + (rest[0] + 1) * f, rest[1] * f]
      token(p, k, ink, weight, s.color, at)
      for (const m of s.members) drawMember(p, m, ctx, 'over')
    })
  },
})
