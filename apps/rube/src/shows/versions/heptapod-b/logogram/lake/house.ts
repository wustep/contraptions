import type { Pt } from '../../../../../parts'
import { box, frame, scenery } from '../kit'
import { stub } from '../stub'
import { LAKE } from '../worlds'

/**
 * STUB (the lake builder replaces this): the lake house. Its standing set, and the five scenes in it: the prologue,
 * the three visions and the end (which opens on the prologue's first frame).
 */
export const HOUSE_BOX = { x0: -20, y0: -20, x1: 60, y1: 10 }
export const houseSet = scenery<null>({
  name: 'house-set',
  draw: (p, _s, c) => {
    const { k } = c
    const f = frame(p, k)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(LAKE.wall)
    p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    p.fill(LAKE.floor)
    p.rect(f.x0 * k, 0.13 * k, (f.x1 - f.x0) * k, (f.y1 - 0.13) * k)
    p.pop()
  },
})
export const HOUSE_CELLS = box(HOUSE_BOX.x0, HOUSE_BOX.y0, HOUSE_BOX.x1, HOUSE_BOX.y1, 4)
/** Where each scene starts (the part's origin), lake cells. The end starts where the prologue does. */
export const PROLOGUE_AT: Pt = [0, 0]
export const V1_AT: Pt = [20, 0]
export const V2_AT: Pt = [0, 0]
export const V3_AT: Pt = [0, 0]
export const END_AT: Pt = PROLOGUE_AT
export const prologue = stub('prologue', 0.001, 0, { hannah: [-0.34, 0] })
export const vision1 = stub('vision1', 3, 0, { hannah: [0.85, 0] })
export const vision2 = stub('vision2', 0.001, 0, { hannah: [0.4, 0] })
export const vision3 = stub('vision3', 0.001, 0)
export const ending = stub('ending', 0.001, 0, { hannah: [-0.34, 0] })
export const LAKE_HITS: number[] = []
