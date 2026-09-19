import { themeByName, type Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { balloon } from './balloon'
import { bell } from './bell'
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
 * The workshop: the atelier the show began in. Brass, oil, paper and
 * gravity — the classic Rube Goldberg vocabulary, thirty-four pieces chosen
 * over the eighty-odd toys in the repo's other catalogs and rewritten for
 * one ball on one thread. Every one is a beat the ball is seen to cause.
 *
 *   rail      a plain cell, so the beats have room to land
 *   hammer    wait on the anvil, a wedge comes down, out fast
 *   seesaw    up, over, down faster
 *   bell      the clapper shoved ahead to the lip and slipped under; punctuation
 *   dominoes  gate → striker → row → button → wire → coil → gate
 *   drop      lip, tube, flaps, quarter-pipe; down one to three floors
 *   lift      pawl → counterweight → cage; up one to three floors
 *   cannon    match, fuse, bang, flight, landing; over two and up one
 *   loop      round the loop, no mechanism at all
 *   scoop     a bucket wheel, four cups on a hub; the ball rides its seat; down one, facing back
 *   toaster   drop in; seen through the window between the elements as they glow and the timer runs down; pop; up one
 *   crane     magnet down, blink, up, across a gap in the rail, think, drop
 *   rocket    button, sputter, flame, sled to the chock, ball pops out over it
 *   pendulum  tongue → cord → hook → a wrecking ball on a real clock
 *   trapdoor  weight → lever → bolt → the floor gives way; down one
 *   trampoline  the rail stops; a pit, a bounce, the biggest arc in the show
 *   funnel    round and down a glass bowl, in view the whole way; down one
 *   conveyor  switch → motor → cleats carry the ball up a floor, slowly
 *   paddle    a wheel kicked round once; a relay
 *   balloon   pin → sandbag → the balloon rises the mast; up one or two
 *   plunger   pawl → spring → a kicker up through the rail onto the ball's back → across a cell with no rail at all
 *   stairs    four steps down, off each lip, a tap on each tread
 *   switchback  ramps down to bumpers that turn the ball; one or two floors
 *   zipline   a cup on a trolley runs a wire down a floor and over two
 *   tipper    a counterweighted tray creeps under the ball, tips over and dumps it a floor down
 *   drawbridge  plate → pawl → chain → the bridge falls across the gap
 *   gears     plate → pawl → three gears run → a cord hauls the gate up
 *   trapeze   a basket swings the ball across two cells of nothing
 *   trebuchet the counterweight drops, the arm comes over, the ball flies
 *   screw     an Archimedes' screw carries the ball up a floor in a glass tube
 *   flipper   a drooping pinball bat whips the ball a floor up onto a shelf
 *   painter   the ball stops under two nozzles; they spray, it leaves a new colour
 *   cradle    a Newton's cradle: the ball stops dead, the far ball takes the thread and flies
 *   inverter  gravity flips inside the field where the floor stops; the ball rides the ceiling and drops back
 *   portal    the door at either end of a map; the far side is always a new map
 */

/**
 * Paper, brass and oil: the palettes the workshop is painted in. Two, and
 * both of them paper: the original's cool sheet with its five bright inks,
 * and a warm one in brass and oxblood. A world keeps only palettes that
 * differ in their paper and their mood rather than in a reshuffle of hues,
 * and that keep the house style — a bright flat fill inside heavy ink on a
 * ground. The inverted drafting-table sheet went for both reasons: its
 * fills were all pale, so nothing on it read as coloured, and a dark sheet
 * belongs to the arcade, the one world that is night.
 */
const THEMES: Theme[] = [
  themeByName('okazz'),
  {
    name: 'atelier',
    label: 'Atelier',
    bg: '#F1EBDD',
    ink: '#2B2620',
    colors: ['#D9A441', '#A63D2F', '#3F5F7A', '#5E7A4E', '#F6F1E6'],
    note: 'brass and oxblood on warm paper',
  },
]

export const workshop: World = {
  name: 'workshop',
  label: 'Workshop',
  note: 'the atelier: brass, oil, paper and gravity',
  themes: THEMES,
  backdrops: ['plain', 'dots', 'rules', 'plain'],
  tastes: {
    mixed: { painter: 1.3, cradle: 1.3, inverter: 1.2 },
    bench: {
      hammer: 1.7, dominoes: 1.6, seesaw: 1.3, bell: 1.2, pendulum: 1.6, conveyor: 1.5, paddle: 1.4,
      drawbridge: 1.5, tipper: 1.4, gears: 1.7, cradle: 1.2, cannon: 0.5, loop: 0.5, toaster: 0.7, rocket: 0.5, crane: 0.8,
    },
    vertical: {
      drop: 1.6, lift: 1.5, toaster: 1.4, scoop: 1.4, trapdoor: 1.6, funnel: 1.6, balloon: 1.5, trampoline: 1.3,
      stairs: 1.5, switchback: 1.6, zipline: 1.4, tipper: 1.3, screw: 1.5, flipper: 1.3, painter: 1.2, 'drop-deep': 2.2, 'lift-tall': 2.2, loop: 0.6, rocket: 0.6, plunger: 0.6,
    },
    ballistic: {
      cannon: 2, loop: 1.8, toaster: 1.3, seesaw: 1.3, hammer: 1.1, plunger: 1.9, rocket: 1.8, trampoline: 1.6, crane: 1.3,
      zipline: 1.3, trapeze: 1.6, trebuchet: 1.9, flipper: 1.5, inverter: 1.4, dominoes: 0.6, conveyor: 0.5,
    },
  },
  pieces: [
    plainRail,
    hammer,
    seesaw,
    bell,
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
  ],
}
