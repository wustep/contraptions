import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'
import { SHELL } from '../worlds'

/**
 * Inside the shell (the CHAMBER builder's): the chamber and the glass: contact, the language, and the bomb.
 * STUB: replace everything here, keeping the export names the score imports.
 */

export const CHAMBER_CELLS: Pt[] = box(-10, -14, 24, 4, 2)

export const chamberSet = scenery<null>({
  name: 'chamber-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(SHELL.wall)
    p.rect(-10 * c.k, -14 * c.k, 34 * c.k, 14.13 * c.k)
    p.fill(SHELL.floor)
    p.rect(-10 * c.k, 0.13 * c.k, 34 * c.k, 4 * c.k)
    p.fill(SHELL.glow)
    p.rect(8 * c.k, -10 * c.k, 10 * c.k, 10 * c.k)
    p.pop()
  },
})

export const CONTACT_AT: Pt = [0, 0]
export const BOMB_AT: Pt = [0, 0]

export const contact = stub('contact', 6, 0, { ian: [-0.42, 0] })
export const bomb = stub('bomb', 1, 0, { ian: [-0.42, 0] })

export const CHAMBER_HITS: number[] = []
