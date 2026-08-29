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
import { FLOOR, LINK, SPEED, token, type Beat, type Pt } from './parts'
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
}

const RELAYS: Contraption<Beat>[] = [seesaw, paddle, dominoes, flap, counter]
const SINKS: Contraption<Beat>[] = [bell, cup, lamp, flag, toaster, jack]

/** Stand a member up at `at`, chained from `inSide` to `outSide`, firing at `fire`. */
export function member(ctx: SetupCtx, piece: Contraption<Beat>, at: Pt, fire: number, inSide: Side | null, outSide: Side | null, color: string): Member {
  const state = piece.setup({ ...ctx, size: ctx.size, w: ctx.size, h: ctx.size, rng: ctx.rng.fork(piece.name), color: ctx.rng.pick(ctx.theme.colors) })
  state.flow = { in: inSide, out: outSide, color }
  return { piece, state, at, fire }
}

/** Draw a member in its own cell, on its own clock: its `fireAt` lands on `fire`. */
export function drawMember(p: p5, m: Member, ctx: DrawCtx): void {
  const k = ctx.size
  p.push()
  p.translate(m.at[0] * k, m.at[1] * k)
  m.piece.draw(p, m.state, { ...ctx, w: k, h: k, u: mod(ctx.u - m.fire + (m.piece.fireAt ?? 0), 1) })
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
      // The ball, from the hopper's hand-off to the last machine's.
      const first = s.members[0].fire
      const last = s.members[s.members.length - 1].fire
      if (u >= first && u < last) token(p, k, ink, weight, s.color, [-1 + (u - first) * SPEED, 0])
    })
  },
})
