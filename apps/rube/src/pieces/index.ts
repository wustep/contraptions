import type { Piece } from '../parts'
import { balloon } from './balloon'
import { bell } from './bell'
import { bellows } from './bellows'
import { cannon } from './cannon'
import { conveyor } from './conveyor'
import { cradle } from './cradle'
import { crane } from './crane'
import { drawbridge } from './drawbridge'
import { dominoes } from './dominoes'
import { drop } from './drop'
import { flipper } from './flipper'
import { funnel } from './funnel'
import { gears } from './gears'
import { hammer } from './hammer'
import { inverter } from './inverter'
import { lift } from './lift'
import { loop } from './loop'
import { paddle } from './paddle'
import { painter } from './painter'
import { pendulum } from './pendulum'
import { plunger } from './plunger'
import { portal } from './portal'
import { plainRail } from './rail'
import { rocket } from './rocket'
import { scoop } from './scoop'
import { screw } from './screw'
import { seesaw } from './seesaw'
import { stairs } from './stairs'
import { switchback } from './switchback'
import { tipper } from './tipper'
import { toaster } from './toaster'
import { trampoline } from './trampoline'
import { trapdoor } from './trapdoor'
import { trapeze } from './trapeze'
import { trebuchet } from './trebuchet'
import { zipline } from './zipline'

/**
 * The whole catalog: thirty-six pieces, chosen over the eighty-odd toys in
 * the repo's other catalogs and rewritten for one ball on one thread. Every
 * one of these is a beat the ball is seen to cause, and polishing the set
 * beats adding to it.
 *
 *   rail      a plain cell, so the beats have room to land
 *   hammer    wait on the anvil, a wedge comes down, out fast
 *   seesaw    up, over, down faster
 *   bell      punctuation
 *   bellows   trip → hook → weight → puff → go
 *   dominoes  gate → striker → row → button → wire → coil → gate
 *   drop      lip, tube, flaps, quarter-pipe; down one to three floors
 *   lift      pawl → counterweight → cage; up one to three floors
 *   cannon    match, fuse, bang, flight, landing; over two and up one
 *   loop      round the loop, no mechanism at all
 *   scoop     a bucket wheel, four cups on a hub; the ball rides its seat; down one, facing back
 *   toaster   drop in, glow, pop; up one
 *   crane     magnet down, blink, up, across a gap in the rail, think, drop
 *   rocket    button, sputter, flame, sled to the buffer, ball flies on
 *   pendulum  tongue → cord → hook → a wrecking ball on a real clock
 *   trapdoor  weight → lever → bolt → the floor gives way; down one
 *   trampoline  the rail stops; a pit, a bounce, the biggest arc in the show
 *   funnel    round and down a glass bowl, in view the whole way; down one
 *   conveyor  switch → motor → cleats carry the ball up a floor, slowly
 *   paddle    a wheel kicked round once; a relay
 *   balloon   pin → sandbag → the balloon rises the mast; up one or two
 *   plunger   pawl → spring → across a cell with no rail at all
 *   stairs    four steps down, off each lip, a tap on each tread
 *   switchback  ramps down to bumpers that turn the ball; one or two floors
 *   zipline   a cup on a trolley runs a wire down a floor and over two
 *   tipper    a counterweighted tray tips over and dumps the ball a floor down
 *   drawbridge  plate → pawl → chain → the bridge falls across the gap
 *   gears     plate → pawl → three gears run → a cord hauls the gate up
 *   trapeze   a basket swings the ball across two cells of nothing
 *   trebuchet the counterweight drops, the arm comes over, the ball flies
 *   screw     an Archimedes' screw carries the ball up a floor in a glass tube
 *   flipper   a drooping pinball bat whips the ball a floor up onto a shelf
 *   painter   the ball stops under two nozzles; they spray, it leaves a new colour
 *   cradle    a Newton's cradle: the ball stops dead, the far ball takes the thread and flies
 *   inverter  gravity flips where the floor stops; the ball rides the ceiling and drops back
 *   portal    the door at either end of a map; the far side is always a new map
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
  stairs,
  switchback,
  zipline,
  tipper,
  drawbridge,
  gears,
  trapeze,
  trebuchet,
  screw,
  flipper,
  painter,
  cradle,
  inverter,
  portal,
]

export const CATALOG_LIMIT = 45
