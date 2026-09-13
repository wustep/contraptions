import type { Piece } from '../parts'
import { balloon } from './balloon'
import { bell } from './bell'
import { bellows } from './bellows'
import { cannon } from './cannon'
import { conveyor } from './conveyor'
import { crane } from './crane'
import { dominoes } from './dominoes'
import { drop } from './drop'
import { funnel } from './funnel'
import { hammer } from './hammer'
import { lift } from './lift'
import { loop } from './loop'
import { paddle } from './paddle'
import { pendulum } from './pendulum'
import { plunger } from './plunger'
import { portal } from './portal'
import { plainRail } from './rail'
import { rocket } from './rocket'
import { scoop } from './scoop'
import { seesaw } from './seesaw'
import { toaster } from './toaster'
import { trampoline } from './trampoline'
import { trapdoor } from './trapdoor'

/**
 * The whole catalog: twenty-three pieces, chosen over the eighty-odd toys in
 * the repo's other catalogs and rewritten for one ball on one thread. Every
 * one of these is a beat the ball is seen to cause, and polishing the set
 * beats adding to it.
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
 *   crane     magnet down, blink, up, along the beam, think, drop
 *   rocket    button, sputter, flame, sled to the buffer, ball flies on
 *   pendulum  tongue → cord → hook → a wrecking ball on a real clock
 *   trapdoor  weight → lever → bolt → the floor gives way; down one
 *   trampoline  the rail stops; a pit, a bounce, the biggest arc in the show
 *   funnel    round and down, behind and in front, through the neck; down one
 *   conveyor  switch → motor → cleats carry the ball up a floor, slowly
 *   paddle    a wheel kicked round once; a relay
 *   balloon   pin → sandbag → the balloon rises the mast; up one or two
 *   plunger   pawl → spring → across a cell with no rail at all
 *   portal    in and out of a section; the gate with the beam is a world's edge
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
  crane,
  rocket,
  pendulum,
  trapdoor,
  trampoline,
  funnel,
  conveyor,
  paddle,
  balloon,
  plunger,
  portal,
]

export const CATALOG_LIMIT = 25
