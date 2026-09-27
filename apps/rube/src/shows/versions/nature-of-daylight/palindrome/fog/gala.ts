import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'
import { GALA } from '../worlds'

/**
 * The gala, years on (the FOG builder's): champagne light, a crowd, and General Shang, who has come to thank her and
 * tells her what she needs to say. STUB: replace everything here, keeping the export names the score imports.
 */

export const GALA_CELLS: Pt[] = box(-12, -8, 16, 3, 2)

export const galaSet = scenery<null>({
  name: 'gala-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(GALA.room)
    p.rect(-12 * c.k, -8 * c.k, 28 * c.k, 8.13 * c.k)
    p.fill(GALA.floor)
    p.rect(-12 * c.k, 0.13 * c.k, 28 * c.k, 3 * c.k)
    p.pop()
  },
})

export const GALA_AT: Pt = [0, 0]

export const gala = stub('gala', 1, 0, { shang: [0.34, 0] })

export const GALA_HITS: number[] = []
