import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'
import { FLOOR, bez, floor, rollLane, since, type Beat, type Pt } from './parts'

/**
 * A powder keg with a fuse and a ball sat on its lid: the spark creeps along
 * the fuse for most of the loop, reaches the keg, and the bang is what kicks
 * the ball off down the run, after which the spool pays out a fresh fuse for
 * next time.
 *
 * The ball waits on the lid for exactly `emit` and leaves on the bang, so the
 * head of the line is never empty.
 */
const FIRE = 0.66
/** The fuse runs from the spool to the keg's lid on a cubic. */
const SPOOL: Pt = [-0.34, -0.2]
const C1: Pt = [-0.2, -0.46]
const C2: Pt = [0.34, -0.34]
const LID: Pt = [0.17, 0.11]
const KEG_W = 0.36
/** The lid is the rail's height, so the ball rolls straight off it. */
const KEG_H = 0.5 - FLOOR
/** The bang lasts this long; the fuse is re-laid straight after. */
const BANG = 0.12
const RELAY = 0.3

const along = (f: number): Pt => [bez(SPOOL[0], C1[0], C2[0], LID[0], f), bez(SPOOL[1], C1[1], C2[1], LID[1], f)]

export const fuse = defineContraption<Beat>({
  name: 'fuse',
  label: 'Fuse',
  tags: ['strike', 'pop'],
  role: 'source',
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const jump = t < 0.08 ? 0.05 * Math.sin((t / 0.08) * Math.PI) : 0

    floor(p, k, ink, weight, s)

    clipCell(p, k, () => {
      outline(p, ink, weight)

      // The keg, with its hoops. Its lid is the ball's perch.
      const kegY = 0.5 - KEG_H / 2 - jump
      solid(p, ink, weight, s.color)
      p.rect(0, kegY * k, KEG_W * k, KEG_H * k)
      for (const dy of [-0.09, 0.09]) p.line((-KEG_W / 2) * k, (kegY + dy) * k, (KEG_W / 2) * k, (kegY + dy) * k)

      // The spool, on a stem to the rail.
      outline(p, ink, weight)
      p.line(SPOOL[0] * k, (SPOOL[1] + 0.08) * k, SPOOL[0] * k, FLOOR * k)
      solid(p, ink, weight, s.color)
      p.circle(SPOOL[0] * k, SPOOL[1] * k, 0.16 * k)
      p.fill(ink)
      p.circle(SPOOL[0] * k, SPOOL[1] * k, 0.05 * k)

      // The fuse: what is left of it runs from `f0` to the lid. After the bang
      // it grows back from the lid to the spool; then the spark eats it again.
      const f0 = t < BANG ? null : t < RELAY ? 1 - easeInOutCubic(seg(t, BANG, RELAY)) : seg(t, RELAY, 1)
      if (f0 !== null && f0 < 1) {
        outline(p, ink, weight)
        p.beginShape()
        const n = 24
        for (let i = 0; i <= n; i++) {
          const [x, y] = along(f0 + (1 - f0) * (i / n))
          p.vertex(x * k, y * k)
        }
        p.endShape()
      }
      if (t >= RELAY) {
        const [x, y] = along(f0!)
        p.push()
        p.translate(x * k, y * k)
        p.rotate(u * 50)
        p.stroke(s.color)
        p.strokeWeight(weight)
        for (let i = 0; i < 4; i++) {
          p.line(0, 0, 0.08 * k, 0)
          p.rotate(Math.PI / 2)
        }
        p.pop()
        solid(p, ink, weight, s.color)
        p.circle(x * k, y * k, 0.07 * k)
      }

      // The bang: spokes flung out of the lid, and a ring racing ahead of them.
      if (t < BANG) {
        const f = t / BANG
        p.push()
        p.translate(LID[0] * k, (LID[1] - 0.04) * k)
        p.stroke(s.color)
        p.strokeWeight(weight)
        const r0 = (0.08 + 0.32 * f) * k
        const r1 = r0 + 0.14 * (1 - f) * k
        for (let i = 0; i < 8; i++) {
          p.line(r0, 0, r1, 0)
          p.rotate(Math.PI / 4)
        }
        if (f < 0.6) {
          p.stroke(ink)
          p.noFill()
          p.circle(0, 0, (0.1 + 0.42 * f) * k)
        }
        p.pop()
      }
    })
  },
})
