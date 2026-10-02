import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, scenery, smooth } from '../kit'
import { board, cut, PAINT, thread, treeFlat } from '../stagecraft'

export const HORIZON = 1.13
export const CLOUD_BASE = -26

/** Far flats track more slowly than the floor. Their supports stay attached to their edges. */
export const sky = scenery<{ cloud: number }>({
  name: 'sky',
  draw: (p, _s, { k, t }) => {
    const f = frame(p, k)
    p.noStroke()
    p.fill(mixHex(PAINT.night, PAINT.blue, smooth(t, 0, 16)))
    p.rect(f.cx * k, f.cy * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    const up = smooth(-f.cy, 6, 25)
    const hy = f.cy + (HORIZON - f.cy) * 0.35
    if (up < 1) {
      for (let layer = 0; layer < 3; layer++) {
        const shift = f.cx * (0.85 - layer * 0.15)
        const ground = hy + layer * 0.48
        const pts: [number, number][] = [[f.x0 - 3, f.y1 + 3]]
        for (let x = Math.floor(f.x0 - shift) - 3; x < f.x1 - shift + 4; x += 1.1) {
          pts.push([x + shift, ground - 0.25 - (Math.sin(x * 0.7 + layer) + 1) * (0.3 + layer * 0.1)])
        }
        pts.push([f.x1 + 4, f.y1 + 3])
        cut(p, k, pts, [PAINT.coral, PAINT.clay, PAINT.apricot][layer], 0.08)
      }
      const shift = f.cx * 0.5
      for (let i = Math.floor((f.x0 - shift) / 4) - 1; i < (f.x1 - shift) / 4 + 1; i++) {
        const x = i * 4 + shift
        treeFlat(p, k, x, hy + 0.3, 0.8)
        // Rectangular feet and diagonal braces disclose the scenic flats.
        board(p, k, x + 0.4, hy + 0.32, 0.58, 0.12, PAINT.clay)
        thread(p, k, [x + 0.15, hy - 0.4], [x + 0.8, hy + 0.32])
      }
    }
    // Fixed fly rails continue up alongside the launch route, never across a contact.
    for (let x = Math.floor(f.x0 / 12) * 12; x < f.x1 + 12; x += 12) {
      board(p, k, x, f.y0 - 2, 0.16, f.y1 - f.y0 + 4, PAINT.clay, 0.04)
      thread(p, k, [x + 0.3, f.y0 - 2], [x + 0.3, f.y1 + 2])
    }
  },
})

/** A single hard window-shaped pool opens with the piano; no drifting atmosphere. */
export const dawn = scenery<null>({
  name: 'dawn', draw: () => {},
  over: (p: p5, _s, { k, t }) => {
    const dark = 1 - smooth(t, 0.4, 5.6)
    if (dark <= 0) return
    const f = frame(p, k)
    p.noStroke()
    p.fill(alpha(p, PAINT.night, dark * 0.5))
    p.rect(f.cx * k, f.cy * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  },
})
