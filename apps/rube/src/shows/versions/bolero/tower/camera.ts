import type { Framing } from '../../../registry'
import { STATEMENTS, bar } from './music'
import { TOWER, lapOf, statementsOn } from './plan'
import { where } from './ball'
import { smooth } from './look'

/**
 * The camera, first pass: close on the drum for its two bars alone, up with the ball to the first storey, and then
 * the storey the ball is on, framed to its width and leaning a little toward the ball, rising with it to the next.
 */

function storeyFocus(n: number): { x: number; y: number; cells: number } {
  const st = TOWER[n]
  return { x: 0, y: (st.top + st.floor) / 2, cells: Math.max(st.w * 0.62, st.floor - st.top + 1.4) }
}

function raw(t: number): { x: number; y: number; cells: number } {
  const w = where(t)
  const drum = { x: -0.25, y: -0.75, cells: 3.2 }
  if (t < bar(3)) return drum
  const first = storeyFocus(0)
  if (t < STATEMENTS[0].t) {
    const u = smooth(t, bar(3), STATEMENTS[0].t)
    return { x: drum.x + (first.x - drum.x) * u, y: drum.y + (first.y - drum.y) * u, cells: drum.cells + (first.cells - drum.cells) * u }
  }
  const k = Math.max(0, Math.min(STATEMENTS.length - 1, w.k))
  const n = lapOf(k).storey
  const f = storeyFocus(n)
  let focus = f
  if (w.phase === 'ride' && k + 1 < STATEMENTS.length) {
    const m = lapOf(k + 1).storey
    if (m !== n) {
      const g = storeyFocus(m)
      const from = STATEMENTS[statementsOn(m)[0]].t - 5
      const u = smooth(t, from, from + 5)
      focus = { x: f.x + (g.x - f.x) * u, y: f.y + (g.y - f.y) * u, cells: f.cells + (g.cells - f.cells) * u }
    }
  }
  return { x: focus.x + (w.p[0] - focus.x) * 0.12, y: focus.y, cells: focus.cells }
}

export function camera(t: number): Framing {
  let x = 0
  let y = 0
  let c = 0
  let sum = 0
  for (let j = -10; j <= 10; j++) {
    const wgt = 1 - Math.abs(j) / 11
    const r = raw(t + j * 0.08)
    x += r.x * wgt
    y += r.y * wgt
    c += Math.log(r.cells) * wgt
    sum += wgt
  }
  return { x: x / sum, y: y / sum, cells: Math.exp(c / sum) }
}
