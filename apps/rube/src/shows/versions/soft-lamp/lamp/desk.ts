import { R } from '../../../../parts'

/**
 * Where everything stands, in cells, y down, the desk's top at y = 0. The ball is a ping-pong ball (R is 2 cm), so a
 * cell is about 15 cm: the window is 60 cm across, the books 18 to 24 cm, the headphones' cup 9 cm.
 *
 * Left to right: the window over the desk, with its sill; under the sill's right end, three books stacked into a
 * stair that steps down to the right; past them the headphones, set down on the desk with the near cup lying cushion
 * up and the band arched over to the far one; and over it all, from the right, the lamp.
 *
 * The ball's way round is the machine: along the sill in front of the rain, off its end onto the top book, down the
 * stair to the cup, and, when the drums leave, lobbed from the cup back over the books to the sill.
 */

export { R }

/** The desk: its top, and its front edge's face. */
export const DESK = { y: 0, face: 0.28, x0: -12, x1: 12 }

/** The window's outer frame, and the one bar across it and the one up it. */
export const WINDOW = { x0: -3.5, x1: 0.62, y0: -5.5, y1: -1.42, frame: 0.16, mullion: -1.44, transom: -3.55 }

/** The sill: its top, and how far it runs either side of the frame. The ball tips off its right end. */
export const SILL = { y: -1.42, x0: -3.78, x1: 0.9, thick: 0.1 }
/** The ball's height on the sill (its middle). */
export const ON_SILL = SILL.y - R

/** A book: its top's span, its top, and its colour (a spine's colour, muted). */
export interface Book {
  x0: number
  x1: number
  top: number
  bottom: number
  cover: string
  pages: string
}

/**
 * The stair, top step first: each book stands out to the right of the one on it by a step. The bottom one is the
 * thick one, so its top stands a little over the cup's cushion and the last step is a drop into the seat.
 */
export const BOOKS: Book[] = [
  { x0: 0.34, x1: 1.4, top: -0.92, bottom: -0.66, cover: '#4B5B6B', pages: '#D9CDB5' },
  { x0: 0.2, x1: 1.86, top: -0.66, bottom: -0.4, cover: '#7A4A37', pages: '#DCD0B8' },
  { x0: 0.06, x1: 2.3, top: -0.4, bottom: 0, cover: '#6E6150', pages: '#E3D8C2' },
]

/**
 * The headphones, set down: the near cup lying on its back with its cushion up (the ball's seat), the band rising from
 * its far side in an arch, and the far cup standing on its edge at the band's other end, cushion toward the near one.
 * The near cup: its middle, half width, the cushion's top, and how deep its hollow is. It lies a little in front of the
 * bottom book's end, so the ball going over that book's edge comes down in the hollow.
 */
export const CUP = { x: 2.52, halfW: 0.36, top: -0.34, hollow: 0.06 }
/** Where the ball rests in the cup (its middle). */
export const IN_CUP = { x: CUP.x, y: CUP.top + CUP.hollow - R }
/** The far cup, standing: its middle, half its thickness, and its height. */
export const FAR_CUP = { x: 4.22, halfW: 0.2, h: 0.78 }
/** The band's arch: how high its top is. */
export const BAND_TOP = -1.28

/** The lamp: its base on the desk, its elbow, the head's hinge, and where the shade points. */
export const LAMP = {
  base: { x: 5.45, w: 0.62 },
  elbow: { x: 5.05, y: -2.45 },
  hinge: { x: 3.3, y: -2.72 },
  /** The point on the desk the shade looks at: the middle of the pool. */
  aim: { x: 2.1, y: 0 },
  /** The pool of light on the desk: its middle and half width. */
  pool: { x: 2.0, half: 2.3 },
}

/**
 * The plant on the sill's left end, in a small clay pot: the stop the ball comes back off. Its pot's middle, half
 * width and height; the ball touches it with its middle at `contact`.
 */
export const POT = { x: -3.45, halfW: 0.24, h: 0.42 }
export const CONTACT = POT.x + POT.halfW * 0.86 + R

/** The mug: its middle, half width, height. It stands under the sill, left of the books. */
export const MUG = { x: -2.35, halfW: 0.3, h: 0.64 }

/** The ball's gravity, cells a second a second: a soft, slow world, but every drop a real drop. */
export const G = 4.6

/**
 * Each thing's box, cells (x0, y0, x1, y1), round all of it that is drawn: what a held frame must show whole or not at
 * all (`camera.ts`; the check holds every held frame to it).
 */
export const PROPS: Record<string, [number, number, number, number]> = {
  mug: [MUG.x - MUG.halfW - 0.28, -MUG.h, MUG.x + MUG.halfW, 0],
  plant: [POT.x - 0.45, SILL.y - POT.h - 0.8, POT.x + 0.4, SILL.y],
  books: [BOOKS[2].x0, BOOKS[0].top, BOOKS[2].x1, 0],
  cup: [CUP.x - CUP.halfW, CUP.top, CUP.x + CUP.halfW + 0.1, 0],
  'far cup': [FAR_CUP.x - FAR_CUP.halfW - 0.05, -FAR_CUP.h, FAR_CUP.x + FAR_CUP.halfW, 0],
  'lamp base': [LAMP.base.x - LAMP.base.w / 2, -0.2, LAMP.base.x + LAMP.base.w / 2, 0],
  shade: [LAMP.hinge.x - 0.45, LAMP.hinge.y - 0.2, LAMP.hinge.x + 0.1, -1.95],
}
