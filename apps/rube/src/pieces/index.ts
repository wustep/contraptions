import type { Piece } from '../parts'
import { bell } from './bell'
import { bellows } from './bellows'
import { cannon } from './cannon'
import { dominoes } from './dominoes'
import { drop } from './drop'
import { hammer } from './hammer'
import { lift } from './lift'
import { loop } from './loop'
import { portal } from './portal'
import { plainRail } from './rail'
import { scoop } from './scoop'
import { seesaw } from './seesaw'
import { toaster } from './toaster'

/**
 * The whole catalog: thirteen pieces, chosen over the eighty-odd toys in the
 * repo's other catalogs and rewritten for one ball on one thread. Fewer than
 * fifteen by design — every one of these is a beat the ball is seen to
 * cause, and polishing this set beats adding to it.
 *
 *   rail      a plain cell, so the beats have room to land
 *   hammer    wait on the anvil, blow, out fast
 *   seesaw    up, over, down faster
 *   bell      punctuation
 *   bellows   trip → hook → weight → puff → go
 *   dominoes  gate → rod → row → lever → cord → gate
 *   drop      lip, tube, flaps, quarter-pipe; down one to three floors
 *   lift      pawl → counterweight → cage; up one to three floors
 *   cannon    match, fuse, bang, flight, landing; over two and up one
 *   loop      round the loop, no mechanism at all
 *   scoop     bucket wheel; down one, facing back
 *   toaster   drop in, glow, pop; up one
 *   portal    in and out of a section; the framed gate is a world's edge
 */
export const catalog: Piece<any>[] = [
  plainRail,
  hammer,
  seesaw,
  bell,
  bellows,
  dominoes,
  drop,
  lift,
  cannon,
  loop,
  scoop,
  toaster,
  portal,
]

export const CATALOG_LIMIT = 15
