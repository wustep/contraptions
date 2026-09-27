import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import type { ShellSpot } from '../seams'
import { HANNAH_BY } from '../seams'
import { stub } from '../stub'
import { HOUSE } from '../worlds'
import { HANNAH_AGE } from '../worlds'

/**
 * The lake house, inside (the HOUSE builder's): the long room of glass over the lake, where the cradle is at dawn,
 * the bed by the window, the television at night, and the cradle again at the end. STUB: replace everything here,
 * keeping the export names the score imports.
 */

/** Every cell the room claims, so the stage draws it whenever any of it is in view. */
export const HOUSE_CELLS: Pt[] = box(-12, -8, 16, 3, 2)

/** The room's standing drawing (walls, window, lake beyond, light by show time). */
export const houseSet = scenery<null>({
  name: 'house-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(HOUSE.wall)
    p.rect(-12 * c.k, -8 * c.k, 28 * c.k, 8.13 * c.k)
    p.fill(HOUSE.floor)
    p.rect(-12 * c.k, 0.13 * c.k, 28 * c.k, 3 * c.k)
    p.fill(HOUSE.lake)
    p.rect(-6 * c.k, -5 * c.k, 14 * c.k, 3 * c.k)
    p.pop()
  },
})

/** Where each of the room's legs starts (the ball comes in at (-0.5, 0) from it), in the house's world cells. */
export const DAWN_AT: Pt = [0, 0]
export const BED_AT: Pt = [0, 0]
export const NEWS_AT: Pt = [0, 0]
export const HOME_AT: Pt = [0, 0]

/** The shell on the television at the cut (house world cells): its centre and height. */
export const TV_SHELL: ShellSpot = { c: [1.8, -1.0], h: 0.42 }

export const dawn = stub('dawn', 0.6, 0, { hannah: HANNAH_BY })
export const bed = stub('bed', 0.6, 0, { hannah: HANNAH_BY })
export const news = stub('news', 0.4, 0)
export const home = stub('home', 0.6, 0, { ian: [0.36, 0] })

/** When Hannah goes, on the swell: her ball fades out of the bed between these show times (the one time she leaves
 * the picture in shot). */
export const GONE: [number, number] = [93.861, 96]

/** Every strike of the house's parts. */
export const HOUSE_HITS: number[] = []

void HANNAH_AGE
