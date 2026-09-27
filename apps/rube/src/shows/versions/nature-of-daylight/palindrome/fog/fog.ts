import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'
import { FOG } from '../worlds'

/**
 * Beyond the glass (the FOG builder's): alone with Costello in the white; what she is shown.
 * STUB: replace everything here, keeping the export names the score imports.
 */

export const FOG_CELLS: Pt[] = box(-14, -14, 30, 6, 2)

export const fogSet = scenery<null>({
  name: 'fog-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(FOG.white)
    p.rect(-14 * c.k, -14 * c.k, 44 * c.k, 20 * c.k)
    p.pop()
  },
})

export const FOG_AT: Pt = [0, 0]
export const FOG2_AT: Pt = [6, 0]

export const fog1 = stub('fog1', 2, 0)
export const fog2 = stub('fog2', 1, 0)

export const FOG_HITS: number[] = []
