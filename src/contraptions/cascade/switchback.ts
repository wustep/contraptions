import { defineContraption } from '../../core/define'
import { clipBox, outline } from '../../core/draw'
import { bell } from './bell'
import { bellows } from './bellows'
import { cup } from './cup'
import { flag } from './flag'
import { hopper } from './hopper'
import { lamp } from './lamp'
import { paddle } from './paddle'
import { FLOOR, LINK, SPEED, token, type Beat, type Pt } from './parts'
import { seesaw } from './seesaw'
import { drawMember, member } from './strip'
import { toaster } from './toaster'

/**
 * Four of the set's own machines in a square, hard-wired: the hopper lets a
 * ball go along the top, it sets off the machine in the corner and drops off
 * the end of the floor onto the one below, which sends it back along the
 * bottom into the ending — the strip's sentence with a drop in the middle,
 * read round the square.
 */
const TOP: Contraption[] = [seesaw, paddle]
const BOTTOM: Contraption[] = [paddle, bellows]
const SINKS: Contraption[] = [bell, cup, lamp, flag, toaster]
type Contraption = typeof seesaw

const START = 0.3

export const switchback = defineContraption<Beat & { members: ReturnType<typeof member>[] }>({
  name: 'switchback',
  label: 'Switchback',
  tags: ['ball', 'sentence'],
  span: [2, 2],
  rotations: [0],
  setup: (ctx) => {
    const { color, rng } = ctx
    return {
      color,
      members: [
        member(ctx, hopper, [-0.5, -0.5], START, null, 'E', color),
        member(ctx, rng.pick(TOP), [0.5, -0.5], START + LINK, 'W', 'S', color),
        member(ctx, rng.pick(BOTTOM), [0.5, 0.5], START + LINK * 2, 'N', 'W', color),
        member(ctx, rng.pick(SINKS), [-0.5, 0.5], START + LINK * 3, 'E', null, color),
      ],
    }
  },
  draw: (p, s, ctx) => {
    const { size: k, w, h, u, ink, weight } = ctx
    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      // The upper floor runs out at the corner machine; the lower one starts under it.
      p.line(-w / 2, (-0.5 + FLOOR) * k, 0.5 * k, (-0.5 + FLOOR) * k)
      p.line(0.5 * k, (0.5 + FLOOR) * k, -w / 2, (0.5 + FLOOR) * k)
      for (const m of s.members) drawMember(p, m, ctx)

      const t = u - START
      let at: Pt | null = null
      if (t >= 0 && t < LINK) at = [-0.5 + t * SPEED, -0.5]
      else if (t >= LINK && t < LINK * 2) at = [0.5, -0.5 + (t - LINK) * SPEED]
      else if (t >= LINK * 2 && t < LINK * 3) at = [0.5 - (t - LINK * 2) * SPEED, 0.5]
      if (at) token(p, k, ink, weight, s.color, at)
    })
  },
})
