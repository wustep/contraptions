import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import type { ShellSpot } from '../seams'
import { stub } from '../stub'
import { VALLEY } from '../worlds'

/**
 * Montana (the VALLEY builder's): the meadow, the camp, and the shell that comes down out of the cloud on the double
 * bass and goes back up into it at the end. STUB: replace everything here, keeping the export names the score imports.
 */

export const VALLEY_CELLS: Pt[] = box(-60, -90, 90, 6, 4)

export const valleySet = scenery<null>({
  name: 'valley-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(VALLEY.sky)
    p.rect(-60 * c.k, -90 * c.k, 150 * c.k, 90.13 * c.k)
    p.fill(VALLEY.meadow)
    p.rect(-60 * c.k, 0.13 * c.k, 150 * c.k, 6 * c.k)
    p.fill(VALLEY.shell)
    p.ellipse(20 * c.k, -45 * c.k, 22 * c.k, 60 * c.k)
    p.pop()
  },
})

/** Where the arrival and the going start, in the valley's world cells. */
export const ARRIVE_AT: Pt = [0, 0]
export const GOING_AT: Pt = [30, 0]

/** The real shell at the cut in (valley world cells): its centre and height. */
export const SHELL_CUT: ShellSpot = { c: [20, -45], h: 60 }

/**
 * The shell over the valley at show time `t`: its centre and height (valley world cells), and how much of it has gone
 * to vapour. It comes down out of the cloud over SHELL_DOWN and goes back up into it over SHELL_UP, the same path
 * backwards (the check holds it to that), gone when the high violins stop (RELEASE).
 */
export const SHELL_DOWN: [number, number] = [102.11, 110]
export const SHELL_UP: [number, number] = [310.82, 318.711]
export function shellAt(t: number): ShellSpot & { vapour: number } {
  void t
  return { ...SHELL_CUT, vapour: 0 }
}

export const arrive = stub('arrive', 6, 0, { cells: 12 })
export const going = stub('going', 2, 0, { cells: 8 })

export const VALLEY_HITS: number[] = []
