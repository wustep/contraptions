import { frame, scenery, smooth } from '../kit'
import { board, cut, PAINT, thread } from '../stagecraft'

/** Space is a deep blue fly tower: a few huge suspended card planes, never a galaxy wash. */
export const voidSky = scenery<{ deck: number; leave: number }>({
  name: 'void-sky',
  draw: (p, s, { k, t }) => {
    const f = frame(p, k)
    p.noStroke()
    p.fill(PAINT.night)
    p.rect(f.cx * k, f.cy * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    const shift = f.cx * 0.88
    const y = f.cy * 0.9
    for (let i = Math.floor((f.x0 - shift) / 14) - 1; i < (f.x1 - shift) / 14 + 1; i++) {
      const x = i * 14 + shift
      cut(p, k, [[x, y - 14], [x + 5, y - 14], [x + 5, y - 1.8], [x + 2, y - 0.6], [x, y - 2]], PAINT.blue, 0.14)
      thread(p, k, [x + 5.15, y - 15], [x + 5.15, y - 1])
      board(p, k, x + 5, y - 1, 0.3, 0.09, PAINT.cream, 0.02)
    }
    const earth = 1 - smooth(t, s.leave - 3, s.leave)
    if (earth > 0 && Math.abs(s.deck - f.cy) < 22) {
      cut(p, k, [[f.x0 - 3, s.deck + 0.8], [f.cx, s.deck - 0.4], [f.x1 + 3, s.deck + 0.8], [f.x1 + 3, s.deck + 4], [f.x0 - 3, s.deck + 4]], PAINT.coral, 0.18)
    }
  },
})
