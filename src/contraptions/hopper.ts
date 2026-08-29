import { defineContraption } from '../core/define'
import { clipCell, outline, solid } from '../core/draw'
import { easeInOutCubic, easeOutCubic, lerp, seg } from '../core/ease'
import { TOKEN, drop, dropTime, floor, heading, rollOut, since, token, tokenColor, until, type Beat, type Pt } from './parts'

/**
 * A magazine of balls above the line: the gate slides out from under the
 * bottom one, it drops onto the floor at the centre and rolls off down the
 * run, and the stack shuffles down a place for the next go.
 */
const FIRE = 0.3
/** Half-width of the throat. */
const THROAT = 0.19
/** The gate's centre line, and the bottom ball resting on it. */
const GATE = -0.17
const SEAT = GATE - 0.035 - TOKEN / 2
/** The drop from the seat to the floor. */
const DROP = dropTime(-SEAT)

export const hopper = defineContraption<Beat>({
  name: 'hopper',
  label: 'Hopper',
  tags: ['ball'],
  role: 'source',
  outlets: ['E', 'W', 'S'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const w = until(u, FIRE)
    const ball = tokenColor(s)
    // Open just long enough for the ball to clear, then slide home; and open
    // again just ahead of the next drop.
    const open =
      t < 0.06 ? 1
      : t < 0.16 ? 1 - easeInOutCubic(seg(t, 0.06, 0.16))
      : w <= DROP + 0.03 ? easeOutCubic(1 - seg(w, DROP, DROP + 0.03))
      : 0

    floor(p, k, ink, weight, s)

    p.push()
    p.scale(heading(s.flow), 1)
    // The magazine: a throat that flares to a mouth at the top of the cell.
    outline(p, ink, weight)
    for (const x of [-THROAT, THROAT]) {
      p.line(x * k, -0.3 * k, x * k, (GATE - 0.06) * k)
      p.line(x * k, -0.3 * k, x * 1.8 * k, -0.5 * k)
    }

    clipCell(p, k, () => {
      // The ball that just went, rolling away — unless the wire has it.
      const out = rollOut(s, u, FIRE)
      if (out) token(p, k, ink, weight, ball, out)
      // The bottom ball: settling into the seat after the shuffle, then dropping when the gate goes.
      const bottom: Pt = w <= DROP ? [0, drop(SEAT, -SEAT, 1 - w / DROP)] : [0, lerp(SEAT - TOKEN, SEAT, easeOutCubic(seg(t, 0.02, 0.12)))]
      token(p, k, ink, weight, ball, bottom)
      // The next one, fed in from above.
      token(p, k, ink, weight, ball, [0, lerp(SEAT - TOKEN * 2.4, SEAT - TOKEN, easeOutCubic(seg(t, 0.25, 0.42)))])
    })

    // The gate and the guide it slides out along.
    outline(p, ink, weight)
    p.line(-THROAT * k, (GATE + 0.05) * k, 0.44 * k, (GATE + 0.05) * k)
    solid(p, ink, weight, s.color)
    p.rect(open * 0.3 * k, GATE * k, 0.34 * k, 0.07 * k)
    p.pop()
  },
})
