import type { Performance } from '../../../registry'
import { performance as liftoff } from '../liftoff'
import { pixelate } from './look'

/**
 * Voyage, in pixels: the same machine, camera, cuts, credits and music as Liftoff (the take is that performance, not a
 * copy of it), with every frame put through `pixelate` once it is painted.
 */
export const performance: Performance = { ...liftoff, finish: pixelate }
