import type p5 from 'p5'
import { streak } from '../cast'
import { ARIADNE } from '../worlds'
import { drawCafe, drawCafeAir } from './paris-cafe'
import { drawFold } from './paris-fold'
import { drawMirrors, drawNearMirror } from './paris-mirror'
import { ariAt, STRIKE } from './paris-geo'
import type { Pen } from './paris-pen'

type Frame = { x0: number; y0: number; x1: number; y1: number }

/** The part's drawing, handed show time: the fold (the leaf, the pit, the lever, the curve), the mirrors, the café. */
export function drawParis(p: p5, k: number, t: number, ink: string, w: number, f: Frame): void {
  const pen: Pen = { p, k, ink, w }
  p.push()
  drawFold(pen, t, f)
  drawMirrors(pen, t)
  drawCafe(pen, t, f)
  p.pop()
}

/** Over the balls: the blasts' dust and light, and the near mirror's frame round the picture. */
export function drawParisOver(p: p5, k: number, t: number, ink: string, w: number, f: Frame): void {
  const pen: Pen = { p, k, ink, w }
  p.push()
  drawCafeAir(pen, t, f)
  drawNearMirror(pen, t)
  // Mal's blow: the streak of Ariadne thrown up out of the dream.
  streak(p, k, ariAt, STRIKE, t, ARIADNE)
  p.pop()
}
