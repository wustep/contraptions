import { box, frame, scenery } from '../kit'
import { drawShell } from '../cast'
import { VALLEY } from '../worlds'
import { BELLY, MEADOW, SHELL_H, SHELL_W, SHELL_X } from './geo'

/**
 * STUB (the valley builder replaces this): the valley's standing set. A flat sky, a flat meadow and the shell.
 */
export const VALLEY_BOX = { x0: -140, y0: -190, x1: 140, y1: 40 }

export const valleySet = scenery<null>({
  name: 'valley-set',
  draw: (p, _s, c) => {
    const { k } = c
    const f = frame(p, k)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(VALLEY.sky)
    p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (MEADOW - f.y0) * k)
    p.fill(VALLEY.meadow)
    p.rect(f.x0 * k, MEADOW * k, (f.x1 - f.x0) * k, (f.y1 - MEADOW + 1) * k)
    p.translate(SHELL_X * k, BELLY * k)
    drawShell(p, k, { t: c.t, h: SHELL_H, w: SHELL_W, slot: c.t > 36 ? 1 : 0 })
    p.pop()
  },
})

export const VALLEY_CELLS = box(VALLEY_BOX.x0, VALLEY_BOX.y0, VALLEY_BOX.x1, VALLEY_BOX.y1, 4)
