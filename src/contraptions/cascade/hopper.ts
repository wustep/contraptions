import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, lerp, seg } from '../../core/ease'
import { TOKEN, drawElevator, drop, dropTime, fallIn, floor, heading, rideOf, rideToken, rollOut, since, token, tokenColor, until, type Beat, type Pt } from './parts'

/**
 * A V-funnel over the line: one ball sits in the throat, the gate slides,
 * it drops onto the rail and rolls off. Not a stack of totes — a magazine
 * with a mouth at the top and a single seat.
 */
const FIRE = 0.3
const THROAT = 0.055
const MOUTH = 0.3
const GATE = -0.04
const SEAT = GATE - 0.03 - TOKEN / 2
const DROP = dropTime(-SEAT)

export const hopper = defineContraption<Beat>({
  name: 'hopper',
  label: 'Hopper',
  tags: ['ball'],
  role: 'source',
  outlets: ['E', 'W', 'S'],
  inlets: ['N'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const w = until(u, FIRE)
    const ball = tokenColor(s)
    const fromAbove = s.flow?.in === 'N'
    const open =
      t < 0.06 ? 1
      : t < 0.16 ? 1 - easeInOutCubic(seg(t, 0.06, 0.16))
      : w <= DROP + 0.03 ? easeOutCubic(1 - seg(w, DROP, DROP + 0.03))
      : 0

    const ride = rideOf(s)
    const dumping = !!ride || s.flow?.out === 'S'
    floor(p, k, ink, weight, s, dumping ? 0.18 : 0)

    p.push()
    p.scale(heading(s.flow), 1)
    outline(p, ink, weight)
    p.line(-MOUTH * k, -0.46 * k, -THROAT * k, GATE * k)
    p.line(MOUTH * k, -0.46 * k, THROAT * k, GATE * k)
    p.line(-MOUTH * k, -0.46 * k, MOUTH * k, -0.46 * k)

    if (dumping) {
      p.pop()
      drawElevator(p, k, ink, weight, s, u)
      clipCell(p, k, () => {
        const at = rideToken(s, u, FIRE)
        if (at) token(p, k, ink, weight, ball, at)
        else if (w <= DROP) token(p, k, ink, weight, ball, [0, drop(SEAT, -SEAT, 1 - w / DROP)])
      })
      p.push()
      p.scale(heading(s.flow), 1)
    } else {
    clipCell(p, k, () => {
      const out = rollOut(s, u, FIRE)
      if (out) token(p, k, ink, weight, ball, out)
      const incoming = fromAbove ? fallIn(s, u, FIRE) : null
      if (incoming) token(p, k, ink, weight, ball, incoming)
      else {
        const bottom: Pt = w <= DROP ? [0, drop(SEAT, -SEAT, 1 - w / DROP)] : [0, lerp(SEAT - TOKEN * 0.4, SEAT, easeOutCubic(seg(t, 0.02, 0.12)))]
        token(p, k, ink, weight, ball, bottom)
      }
    })
    }

    outline(p, ink, weight)
    p.line(-THROAT * k, (GATE + 0.05) * k, 0.36 * k, (GATE + 0.05) * k)
    solid(p, ink, weight, s.color)
    p.rect(open * 0.22 * k, GATE * k, 0.24 * k, 0.06 * k)
    p.pop()
  },
})
