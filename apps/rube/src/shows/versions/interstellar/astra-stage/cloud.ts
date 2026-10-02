import type { Pt } from '../../../../parts'
import { alpha, frame, scenery, smooth } from './kit'
import { cut, PAINT, thread } from './stagecraft'
export interface CloudState {
  deck: number; punch: number
  rocket: (t: number) => { base: [number, number]; lean: number }
  length: number
}
export const WHITE = '#EEE0C1'
export const cloud = scenery<CloudState>({
  name: 'cloud', draw: () => {},
  over: (p, s, { k, t }) => {
    const f = frame(p, k)
    if (f.y1 > s.deck - 2 && f.y0 < s.deck + 2) {
      const pose = s.rocket(t)
      const x = pose.base[0]
      const open = smooth(t, s.punch - 0.4, s.punch + 0.65)
      for (let layer = 0; layer < 3; layer++) {
        const y = s.deck - 1.4 + layer * 0.6
        for (const side of [-1, 1]) {
          const edge = x + side * (0.35 + open * (0.5 + layer * 0.1))
          const outer = side < 0 ? f.x0 - 3 : f.x1 + 3
          const pts: Pt[] = [[outer, y + 1.5], [outer, y]]
          for (let i = 0; i <= 12; i++) { const xx = outer + (edge - outer) * i / 12; pts.push([xx, y + (i % 2) * 0.24]) }
          pts.push([edge, y + 1.5])
          cut(p, k, pts, [PAINT.apricot, PAINT.cream, '#FFF1CE'][layer], 0.1)
          thread(p, k, [edge + side * 0.6, y - 8], [edge + side * 0.6, y])
        }
      }
    }
    const d = t - s.punch
    const white = d < 0 ? 1 - smooth(-d, 0.025, 0.26) : 1 - smooth(d, 0.025, 0.34)
    if (white > 0) {
      p.noStroke(); p.fill(alpha(p, WHITE, white))
      p.rect(f.cx * k, f.cy * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    }
  },
})
