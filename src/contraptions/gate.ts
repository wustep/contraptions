import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'
import { easeOutBack, easeOutQuad } from '../core/ease'

/**
 * A crossing barrier that drops when its machine fires and lifts back out of
 * the way as the signal decays.
 *
 * The boom is a filled bar with a counterweight behind the pivot and a box
 * column under it — an outline arm on a single-line post read as a stray
 * diagonal at cell size rather than as a mechanism.
 */
export const gate = defineContraption({
  name: 'gate',
  label: 'Gate',
  tags: ['signal', 'strike'],
  role: 'sink',
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight, fired }) => {
    void u
    const pivotX = -size * 0.28
    const pivotY = -size * 0.02
    const boom = size * 0.66
    const post = size * 0.09
    const bar = size * 0.13
    // Slam down on the signal, then ease back up as it decays.
    const down = fired > 0 ? easeOutBack(Math.min(1, fired * 1.6)) : 0
    const angle = -Math.PI / 2 + (Math.PI / 2) * easeOutQuad(down)

    outline(p, ink, weight)
    floorRail(p, size)
    // Box column, so the pivot is carried by something with mass.
    p.line(pivotX - post / 2, size / 2, pivotX - post / 2, pivotY)
    p.line(pivotX + post / 2, size / 2, pivotX + post / 2, pivotY)
    p.line(pivotX - post / 2, pivotY, pivotX + post / 2, pivotY)
    // The rest the boom comes down onto.
    p.line(size * 0.34, size / 2, size * 0.34, size * 0.14)
    p.line(size * 0.26, size * 0.14, size * 0.42, size * 0.14)

    p.push()
    p.translate(pivotX, pivotY)
    p.rotate(angle)
    outline(p, ink, weight)
    p.fill(s.color)
    p.rect(boom / 2, 0, boom, bar)
    // Stripes, the way a real boom is marked.
    for (const at of [0.32, 0.58, 0.84]) {
      p.line(boom * at, -bar / 2, boom * at - bar * 0.5, bar / 2)
    }
    // Counterweight on the short side.
    p.fill(s.color)
    p.rect(-size * 0.11, 0, size * 0.13, size * 0.19)
    p.pop()

    solid(p, ink, weight, s.color)
    p.circle(pivotX, pivotY, size * 0.12)
  },
})
