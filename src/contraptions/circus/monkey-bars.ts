import { defineContraption } from '../../core/define'
import { clipCell, outline } from '../../core/draw'
import { pendulum as pendulumTable, swing } from '../../core/physics'
import { P, block, ground, knob, performer, stroke } from './circus'

/**
 * The acrobat swings from the first rung, lets go at the top of the swing
 * exactly where the next rung is, swings on from that one, and at the far
 * end turns round and comes back the same way.
 */
const RUNGS = [-0.42, -0.14, 0.14, 0.42]
const BAR_Y = -0.4
const ARM = 0.45
/** The swing that carries the hand from one rung to the next. */
const AMP = Math.asin((RUNGS[1] - RUNGS[0]) / 2 / ARM)

export const monkeyBars = defineContraption({
  name: 'monkey-bars',
  label: 'Monkey Bars',
  tags: ['aerial'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  setup: ({ color }) => ({ color, table: pendulumTable(AMP) }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Three swings out, three swings back. Each is half a pendulum period,
    // apex to apex, so the hand-off happens at the dwell.
    const out = u < 0.5
    const t = (out ? u : u - 0.5) * 2
    const j = Math.min(2, Math.floor(t * 3))
    const f = t * 3 - j
    const rung = out ? RUNGS[j] : RUNGS[3 - j]
    const angle = (out ? -1 : 1) * swing(s.table, 0.5 * f)
    const x = rung + ARM * Math.sin(angle)
    const y = BAR_Y + ARM * Math.cos(angle)

    clipCell(p, k, () => {
    outline(p, ink, weight)
    ground(p, k, 1)
    stroke(p, k, -0.5, -0.5, 0.5, -0.5)
    block(p, k, ink, weight, s.color, 0, BAR_Y, 1, 0.06)
    for (const r of RUNGS) knob(p, k, ink, weight, s.color, r, BAR_Y + 0.04, 0.06)

    outline(p, ink, weight)
    stroke(p, k, rung, BAR_Y + 0.04, x, y - P / 2 + 0.03)
    performer(p, k, ink, weight, s.color, x, y)
    })
  },
})
