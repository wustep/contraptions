import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'
import { TENT } from '../worlds'

/**
 * The command tent at night (the TWELVE builder's): the ring of twelve screens, one for every shell on Earth. The
 * links fall one by one when the bass drops out; at the call they stand again, in the order they fell, backwards.
 * STUB: replace everything here, keeping the export names the score imports.
 */

export const TENT_CELLS: Pt[] = box(-12, -10, 20, 3, 2)

export const tentSet = scenery<null>({
  name: 'tent-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(TENT.canvas)
    p.rect(-12 * c.k, -10 * c.k, 32 * c.k, 10.13 * c.k)
    p.fill(TENT.floor)
    p.rect(-12 * c.k, 0.13 * c.k, 32 * c.k, 3 * c.k)
    p.pop()
  },
})

export const DARK_AT: Pt = [0, 0]
export const CALL_AT: Pt = [0, 0]

export const dark = stub('dark', 1, 0, { ian: [-0.42, 0] })
export const call = stub('call', 2, 0)

/**
 * The links: each screen but Montana's (0) falls dark once, after the bass drops out (FALLS), and stands again at the
 * call (RISES), in the order they fell, backwards; the ring is whole on the loudest bar (PEAK).
 */
export const FALLS: { screen: number; t: number }[] = Array.from({ length: 11 }, (_, i) => ({ screen: i + 1, t: 201 + i }))
export const RISES: { screen: number; t: number }[] = Array.from({ length: 11 }, (_, i) => ({ screen: 11 - i, t: 289 + i * 1.4 }))

export const TWELVE_HITS: number[] = []
