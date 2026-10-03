import type { Piece } from '../../../../parts'
import type { Performance } from '../../../registry'
import { performance as liftoff } from '../liftoff'
import { compose } from '../liftoff/score'
import { pixelate } from './look'
import { farmSky, voidSky } from './sky'

/**
 * Voyage, in pixels: Liftoff's machine, camera, cuts, credits and music, composed again so that its skies can be the
 * pixel take's own (`sky.ts`) without touching Voyage's, and every frame put through `pixelate` once it is painted.
 * The timeline is the same function of the same score, so every strike and every cut is where Voyage's is.
 */
const { show, camera } = compose()
const skies: Record<string, Piece<any>> = { sky: farmSky, void: voidSky }
for (let i = 0; i < 4; i++) {
  for (const placed of show.universe(i).pieces) {
    const swap = skies[placed.piece.name]
    if (swap) placed.piece = swap
  }
}

export const performance: Performance = { ...liftoff, show, camera, finish: pixelate, pixels: true }
