import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'
import { easeOutBack, easeOutQuad } from '../core/ease'

/** A barrier that drops when its machine fires, then lifts back out of the way. */
export const gate = defineContraption({
  name: 'gate',
  label: 'Gate',
  tags: ['signal', 'strike'],
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight, fired }) => {
    void u
    const pivotX = -size * 0.36
    const pivotY = size * 0.1
    const arm = size * 0.68
    // Slam down on the signal, then ease back up as it decays.
    const down = fired > 0 ? easeOutBack(Math.min(1, fired * 1.6)) : 0
    const angle = -Math.PI / 2 + (Math.PI / 2) * easeOutQuad(down)

    outline(p, ink, weight)
    floorRail(p, size)
    p.line(pivotX, size / 2, pivotX, pivotY)
    p.line(size * 0.34, size / 2, size * 0.34, size * 0.22)

    p.push()
    p.translate(pivotX, pivotY)
    p.rotate(angle)
    outline(p, ink, weight)
    p.fill(s.color)
    p.rect(arm / 2, 0, arm, size * 0.11)
    p.pop()

    solid(p, ink, weight, s.color)
    p.circle(pivotX, pivotY, size * 0.13)
  },
})
