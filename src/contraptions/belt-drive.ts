import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { mod } from '../core/ease'

/** Two pulleys and a belt, with one marked link you can follow around. */
export const beltDrive = defineContraption({
  name: 'belt-drive',
  label: 'Belt Drive',
  tags: ['spin', 'mesh'],
  span: [2, 1],
  setup: ({ color, rng }) => ({ color, dir: rng.sign(), spokes: rng.pick([3, 4]) }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const r = h * 0.3
    const cx = w / 2 - r * 1.2
    const run = cx * 2
    const arc = Math.PI * r
    const perim = run * 2 + arc * 2
    const rot = u * Math.PI * 2 * s.dir

    outline(p, ink, weight)
    p.line(-cx, -r, cx, -r)
    p.line(-cx, r, cx, r)
    p.arc(cx, 0, r * 2, r * 2, -Math.PI / 2, Math.PI / 2)
    p.arc(-cx, 0, r * 2, r * 2, Math.PI / 2, Math.PI * 1.5)

    for (const x of [-cx, cx]) {
      p.push()
      p.translate(x, 0)
      p.rotate(rot)
      outline(p, ink, weight)
      p.circle(0, 0, r * 1.5)
      for (let i = 0; i < s.spokes; i++) {
        p.line(0, 0, r * 0.75, 0)
        p.rotate((Math.PI * 2) / s.spokes)
      }
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(x, 0, size * 0.13)
    }

    // Walk the marked link around the belt: top run, right pulley, bottom run,
    // left pulley.
    const d = mod(u * s.dir, 1) * perim
    let mx = 0
    let my = 0
    if (d < run) {
      mx = -cx + d
      my = -r
    } else if (d < run + arc) {
      const a = -Math.PI / 2 + ((d - run) / arc) * Math.PI
      mx = cx + r * Math.cos(a)
      my = r * Math.sin(a)
    } else if (d < run * 2 + arc) {
      mx = cx - (d - run - arc)
      my = r
    } else {
      const a = Math.PI / 2 + ((d - run * 2 - arc) / arc) * Math.PI
      mx = -cx + r * Math.cos(a)
      my = r * Math.sin(a)
    }
    solid(p, ink, weight, s.color)
    p.circle(mx, my, size * 0.16)
  },
})
