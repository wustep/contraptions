import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'
import { easeOutBack, easeOutQuad } from '../core/ease'

/**
 * A crossing barrier that drops when its machine fires and lifts back out of
 * the way as the signal decays.
 *
 * The boom spends most of the loop standing straight up, so its length is set
 * by that pose and not by the horizontal one: the pivot sits low enough that
 * `pivotY - BOOM` still clears the top of the cell. Sizing it for the barred
 * position instead sent it half a cell into the machine above.
 */
const PIVOT_X = -0.3
const PIVOT_Y = 0.08
const BOOM = 0.56

export const gate = defineContraption({
  name: 'gate',
  label: 'Gate',
  tags: ['signal', 'strike'],
  // Gravity gives this one an up.
  rotations: [0],
  role: 'sink',
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight, fired }) => {
    void u
    const pivotX = size * PIVOT_X
    const pivotY = size * PIVOT_Y
    const boom = size * BOOM
    const post = size * 0.09
    const bar = size * 0.12
    // Slam down on the signal, then ease back up as it decays.
    const down = fired > 0 ? easeOutBack(Math.min(1, fired * 1.6)) : 0
    const angle = -Math.PI / 2 + (Math.PI / 2) * easeOutQuad(down)

    outline(p, ink, weight)
    floorRail(p, size)
    // Box column, so the pivot is carried by something with mass.
    p.line(pivotX - post / 2, size / 2, pivotX - post / 2, pivotY)
    p.line(pivotX + post / 2, size / 2, pivotX + post / 2, pivotY)
    p.line(pivotX - post / 2, pivotY, pivotX + post / 2, pivotY)
    // The rest the boom comes down onto, just short of its tip.
    p.line(size * 0.2, size / 2, size * 0.2, size * 0.03)
    p.line(size * 0.13, size * 0.03, size * 0.27, size * 0.03)

    p.push()
    p.translate(pivotX, pivotY)
    p.rotate(angle)
    outline(p, ink, weight)
    p.fill(s.color)
    p.rect(boom / 2, 0, boom, bar)
    // Stripes, the way a real boom is marked.
    for (const at of [0.34, 0.6, 0.86]) {
      p.line(boom * at, -bar / 2, boom * at - bar * 0.5, bar / 2)
    }
    // Counterweight on the short side.
    p.fill(s.color)
    p.rect(-size * 0.1, 0, size * 0.12, size * 0.18)
    p.pop()

    solid(p, ink, weight, s.color)
    p.circle(pivotX, pivotY, size * 0.11)
  },
})
