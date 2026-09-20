import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { blocks } from './blocks'
import { booth } from './booth'
import { bumper } from './bumper'
import { bumpercar } from './bumpercar'
import { changer } from './changer'
import { claw } from './claw'
import { coaster } from './coaster'
import { dunk } from './dunk'
import { ferris } from './ferris'
import { foosball } from './foosball'
import { freefall } from './freefall'
import { gauss } from './gauss'
import { helter } from './helter'
import { hockey } from './hockey'
import { hoops } from './hoops'
import { maze } from './maze'
import { pachinko } from './pachinko'
import { phaser } from './phaser'
import { pins } from './pins'
import { pixel } from './pixel'
import { popcorn } from './popcorn'
import { pusher } from './pusher'
import { pong } from './pong'
import { laneRail } from './rail'
import { shooter } from './shooter'
import { skee } from './skee'
import { slingshot } from './slingshot'
import { slots } from './slots'
import { spinner } from './spinner'
import { stacker } from './stacker'
import { striker } from './striker'
import { ticket } from './ticket'
import { ufo } from './ufo'
import { whack } from './whack'
import { zigzag } from './zigzag'

/**
 * The arcade: neon night. Everything here flashes, scores or pays out:
 * the ball is popped by a bumper, spun through a spinner, kicked up a
 * skee-ball lane, slapped across an air-hockey table, dropped through a
 * pachinko field and down a ticket machine, lifted by a claw and by a
 * high striker, and swapped for a token by a change machine. It is shot
 * up a pinball lane, is tossed by a mole,
 * thrown through a hoop, and taken round a Ferris wheel and over a
 * coaster's hill; and it goes into the screens: rallied up a Pong court,
 * dropped by a cleared line, drawn in squares and recoloured, lifted by a
 * saucer's beam, pulled down with a one-armed bandit's lever, fired from
 * a Gauss gun, and phased through a brick wall as a ghost.
 *
 *   rail       a lit lane: lamps, strips and chevrons that come on as the ball passes
 *   bumper     the front clips the skirt's rim; the cap slams that instant, +100, out faster
 *   spinner    shoves through a hanging plate, foot riding over the ball, that spins on the ball's way clear of its beam, counting turns in lamps up the post; the score pops as it is flung and ticks up with the turns
 *   changer    into the slot in the cabinet's side; chunk; the dark display lights 01 and a token comes out under the far flap and takes the thread
 *   ticket     the map's last beat, never drawn from the pool: off the rail's end into the hopper; the display counts the run's points down, a ticket a hundred feeds out below, a strip down to the floor; drops out of the prize chute beside the cabinet, one or two floors down
 *   zigzag     down lit tubes, bouncing off a pad onto the next; one or two floors; +10 a pad
 *   pachinko   off a lip, bouncing pin to pin through five rows, each lighting; the jackpot pocket drops its side; out a gate two floors down
 *   skee       a kicker flicks it, up the alley, up the lip and off it the way it was going; a lob over the top and down into the fifty ring a floor up; the rings light as it lands
 *   hockey     onto the air table; a mallet winds up behind and slaps it the length of the table into the goal; the board over the goal lights to 1
 *   claw       into the cabinet, among the prizes on its floor; the claw comes down, closes, lifts, trundles, lets go; a fall onto the wedge at the chute's foot and down its face
 *   striker    onto the puck, which sinks; the latch trips; up the tower on the puck, slowing, to meet the bell with pace still on it, lighting every level on the dark face; ding; the puck cants; one or two floors up
 *   slingshot  into the pouch of a slingshot at the rail's end; its weight slips the catch and the bands whip it up through the fork; a lob a floor up onto a shelf; the score pops off the mouth as the ball leaves
 *   shooter    onto the cup on a plunger's tip; the knob draws down, the spring closing coil on coil; release; up a wire lane, slowing, round the arch and out through a one-way gate that clicks shut; the outer wire lights behind it; one or two floors up
 *   gauss      pulled into a magnet block faster and faster; clack; the far ball of the two on its other face fires off with the thread, through a speed trap that reads what it clocked; the one that came stays on the magnet
 *   pong       a Pong court one or two floors tall: straight lines, one pace, no gravity; the paddles rally the ball up the screen, a blip a hit; the last serves it flat along the top, the other misses, the point goes up, and it leaves by the doorway there
 *   pixel      behind a screen on a stand, and seen on it in squares: a sprite on the screen's grid at the screen's pace; a scanline comes down it and leaves it another colour while the cursor hops along the palette; out the far side that colour for good
 *   blocks     into a falling-blocks well onto a row with one gap, up against the far wall; the piece at the top comes down in ticks and its stem fills the gap; the line flashes and clears, and the ball falls a floor and rolls out, on or back; +100
 *   phaser     a curtain of scanlines turns the ball to a ghost; it rolls straight through a wall of bricks, which go to wireframe where it is; a second curtain makes it solid again
 *   ufo        onto the landing mark; the hatch opens, the beam comes down, and the ball goes up it, one or two floors; the saucer slides out over the rail with it, the beam goes out, and it rolls off
 *   slots      onto the tray on the end of a one-armed bandit's lever; its weight pulls the lever down through a quarter turn, reels spinning and stopping as it comes; seven seven seven on the clunk, and the tray's wall lies along the rail below; coins in the payout tray; +777
 *   whack      across a whack-a-mole deck; moles pop up behind it and a mallet on a gantry comes after them, a beat late; the third pops up under the ball and tosses it over the rim; +10 a mole
 *   hoops      into the cup of a sprung arm; the catch slips and the arm throws it, a high lob down through the rim; the net bulges round it; onto the return ramp and out under the backboard; the board lights to 2
 *   ferris     onto the seat of the low gondola of a little Ferris wheel; half a turn, slowly, every gondola swinging on its pivot; the high seat is level with the rail a floor up and the ball rolls off it
 *   coaster    drops into a car at the station; the chain clacks it up the lift hill, the track lighting behind it; over the crest and down the drop to the floor below; the fins stop the car in sparks and the ball rolls on out of its nose
 *   pusher     onto the shelf of a coin pusher behind three coins; the block comes down behind it and shoves; the coins tip off the lip into the tray a floor down and the ball goes after them, out of the payout mouth
 *   pins       down a polished alley, faster, into ten pins in four ranks; they go up and over into the pit behind the deck; the strike lamp flares; out the back slowed by the hit
 *   popcorn    up the chute into the kettle in a popcorn cart's case, out of sight; the element lights, kernels burst; up out of the open top in a spray of popcorn onto the shelf a floor up
 *   dunk       out along the seat over a dunk tank and into the target paddle at its far end; the paddle teeters over its pivot and falls away, and its tooth slips out from under the seat; the seat drops; a splash, gone under; out of the drain flap onto the rail a floor down
 *   stacker    onto the platform at a light tower's foot; the rows light from the bottom, tick, tick, the platform rising with them; the prize lamp flares and it tilts the ball onto the rail one or two floors up, on or back
 *   foosball   in through one goal mouth onto a foosball pitch; the first rod's man winds back, whips through and kicks it in the back, and spins on right round; the second swings late and kicks the air; out through the far goal mouth; the goal lamp lights
 *   booth      into a photo booth behind a short curtain, seen from the middle down under its hem; a pose; the flash, the curtain white for an instant; it bolts out the far side; the strip drops out of the slot, its portrait in every frame
 *   maze       off the rail's end into a tilting labyrinth two floors tall; along a ledge, through the gap, down, along the next as the board tilts the other way, each ledge lighting; level at the floor and out of the gate, on or back
 *   freefall   into the car at the top of a drop tower; a hoist, a clank, a hold; two floors of free fall past flaring lamps into the brakes; a bounce; the far door drops and it rolls out
 *   helter     along a gangway to the shoulder of a helter-skelter, slowing to the brink; round the tower's front in the chute, out of sight round the back, round the front again lower and faster, and out along the mat at the foot; the lamp on the roof lights
 *   bumpercar  into the seat of a bumper car under a lit grid; sparks at the shoe; across the floor into the parked car, nose to nose, which is shoved back into the rubber kerb and rocks off it; the jolt pitches the ball over both of them onto the rail beyond
 *   portal     the door at either end of a map; the far side is always a new map
 */

/**
 * Signs after rain: the palettes the arcade is painted in. The arcade is
 * the one world that is night, so the cut into it is the loop's one fall
 * of dark and the cut out of it the morning. Two grounds that cannot be
 * mistaken for each other — violet under neon, green under phosphor —
 * rather than two violets a shade apart. Both dark, but neither of them
 * pitch: the paper is a deep tint rather than black, the ink is an
 * off-white rather than white, and the colours sit a step down from full
 * neon, so the ball and the lit parts read without glare and the lines do
 * not buzz against the ground.
 */
const THEMES: Theme[] = [
  {
    name: 'neon',
    label: 'Neon',
    bg: '#15132A',
    ink: '#DCD6EE',
    colors: ['#EF5A86', '#3FC4D2', '#EBD457', '#8DD983', '#B48AEA'],
    note: 'signs after rain',
  },
  {
    name: 'crt',
    label: 'CRT',
    bg: '#0F1B15',
    ink: '#C4DCC8',
    colors: ['#63DB95', '#DEDD80', '#E88585', '#78C6E6', '#E8BC84'],
    note: 'phosphor green and a burnt-in score',
  },
]

export const arcade: World = {
  name: 'arcade',
  label: 'Arcade',
  note: 'neon night: lights, scores and payouts',
  themes: THEMES,
  backdrops: ['stars', 'grid', 'stars'],
  tastes: {
    pinball: {
      bumper: 1.8, spinner: 1.7, slingshot: 1.7, shooter: 1.8, zigzag: 1.5, gauss: 1.4, skee: 1.3, pins: 1.2, maze: 1.2,
      striker: 0.8, hockey: 0.7, whack: 0.7, hoops: 0.7, slots: 0.7, pong: 0.6, blocks: 0.6, ufo: 0.6, coaster: 0.6, claw: 0.5, ferris: 0.5,
      foosball: 0.7, dunk: 0.7, stacker: 0.7, pusher: 0.6, popcorn: 0.6, booth: 0.6, freefall: 0.6, helter: 0.6, bumpercar: 0.6,
    },
    midway: {
      claw: 1.7, ferris: 1.7, coaster: 1.7, striker: 1.6, whack: 1.6, hoops: 1.6, changer: 1.4, hockey: 1.3, pachinko: 1.2, skee: 1.2,
      dunk: 1.7, popcorn: 1.6, freefall: 1.6, helter: 1.6, bumpercar: 1.5, booth: 1.3, pins: 1.2, pusher: 1.2, stacker: 1.2,
      'lift-tall': 1.8, 'drop-deep': 1.8, spinner: 0.7, pixel: 0.7, phaser: 0.7, bumper: 0.6, pong: 0.6, blocks: 0.6, maze: 0.8,
    },
    jackpot: {
      slots: 1.9, pachinko: 1.8, skee: 1.6, hockey: 1.5, changer: 1.4, striker: 1.3, zigzag: 1.3, slingshot: 1.2, gauss: 1.2,
      pusher: 1.8, stacker: 1.7, pins: 1.3, dunk: 1.2,
      claw: 0.7, pong: 0.7, coaster: 0.7, spinner: 0.6, ufo: 0.6, foosball: 0.8, popcorn: 0.7, booth: 0.7, freefall: 0.7, helter: 0.7, bumpercar: 0.6,
    },
    screens: {
      pong: 1.9, blocks: 1.8, ufo: 1.7, pixel: 1.6, phaser: 1.6, gauss: 1.2, changer: 1.2, zigzag: 1.1, booth: 1.3,
      'lift-tall': 1.6, hockey: 0.7, striker: 0.7, skee: 0.7, whack: 0.7, claw: 0.6, hoops: 0.6, coaster: 0.6, ferris: 0.5,
      foosball: 0.8, maze: 0.8, pins: 0.7, pusher: 0.7, dunk: 0.6, popcorn: 0.6, freefall: 0.6, helter: 0.6, bumpercar: 0.6,
    },
  },
  pieces: [
    laneRail, bumper, spinner, changer, ticket, zigzag, pachinko, skee, hockey, claw, striker, slingshot,
    shooter, gauss, pong, pixel, blocks, phaser, ufo, slots, whack, hoops, ferris, coaster,
    pusher, pins, popcorn, dunk, stacker, foosball, booth, maze, freefall, helter, bumpercar,
    portal,
  ],
}
