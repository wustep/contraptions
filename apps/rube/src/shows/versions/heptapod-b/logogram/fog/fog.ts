import type { Pt } from '../../../../../parts'
import { box, frame, scenery } from '../kit'
import { stub } from '../stub'
import { FOG } from '../worlds'

/** STUB (the fog builder replaces this): beyond the glass. The set, and four stretches of the ball among the ink. */
export const FOG_BOX = { x0: -30, y0: -40, x1: 140, y1: 30 }
export const fogSet = scenery<null>({
  name: 'fog-set',
  draw: (p, _s, c) => {
    const { k } = c
    const f = frame(p, k)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(FOG.white)
    p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    p.pop()
  },
})
export const FOG_CELLS = box(FOG_BOX.x0, FOG_BOX.y0, FOG_BOX.x1, FOG_BOX.y1, 4)
/** Where each of the four fog stretches starts (the part's origin), fog cells. */
export const FOG_AT: [Pt, Pt, Pt, Pt] = [[0, 0], [20, 0], [40, 0], [60, 0]]
export const fog1 = stub('fog1', 6, 0)
export const fog2 = stub('fog2', 10, 0)
export const fog3 = stub('fog3', 3, 0)
export const fog4 = stub('fog4', 16, 0)
export const FOG_HITS: number[] = []
