import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { bumper } from './bumper'
import { changer } from './changer'
import { claw } from './claw'
import { hockey } from './hockey'
import { pachinko } from './pachinko'
import { laneRail } from './rail'
import { skee } from './skee'
import { slingshot } from './slingshot'
import { spinner } from './spinner'
import { striker } from './striker'
import { ticket } from './ticket'
import { zigzag } from './zigzag'

/**
 * The arcade: neon night. Everything here flashes, scores or pays out:
 * the ball is popped by a bumper, spun through a spinner, kicked up a
 * skee-ball lane, slapped across an air-hockey table, dropped through a
 * pachinko field and down a ticket machine, lifted by a claw and by a
 * high striker, and swapped for a token by a change machine.
 *
 *   rail       a lit lane: lamps, strips and chevrons that come on as the ball passes
 *   bumper     the front clips the skirt's rim; the cap slams that instant, +100, out faster
 *   spinner    shoves through a hanging plate, foot riding over the ball, that spins on the ball's way, counting turns in lamps
 *   changer    into the slot in the cabinet's side; chunk; a token comes out under the far flap and takes the thread
 *   ticket     off the rail's end into the hopper; tickets feed out below; drops out of the prize chute beside the cabinet, one or two floors down
 *   zigzag     down lit tubes to pads that turn the ball; one or two floors; +10 a pad
 *   pachinko   off a lip, bouncing pin to pin through five rows, each lighting; the jackpot pocket drops its side; out a gate two floors down
 *   skee       a kicker, up the alley, off the lip, into the fifty ring a floor up
 *   hockey     onto the air table; a mallet winds up behind and slaps it the length of the table into the goal
 *   claw       into the cabinet; the claw comes down, closes, lifts, trundles, lets go
 *   striker    onto the puck, which sinks; the latch trips; up the tower on the puck to the bell; ding; the puck cants; one or two floors up
 *   slingshot  into a saucer against the band; the kicker draws back and fires; flung a floor up onto a shelf
 *   portal     the door at either end of a map; the far side is always a new map
 */

/** Signs after rain: the palettes the arcade is painted in. All of them dark. */
const THEMES: Theme[] = [
  {
    name: 'neon',
    label: 'Neon',
    bg: '#0D0B1E',
    ink: '#F4F0FF',
    colors: ['#FF2A6D', '#05D9E8', '#FFE900', '#7CFF6B', '#B967FF'],
    note: 'signs after rain',
  },
  {
    name: 'cabinet',
    label: 'Cabinet',
    bg: '#160E1A',
    ink: '#F7E9F0',
    colors: ['#FF7A1A', '#2BD1C4', '#FFD23F', '#FF4F9A', '#7B61FF'],
    note: 'the side art of an old cabinet',
  },
  {
    name: 'crt',
    label: 'CRT',
    bg: '#07110D',
    ink: '#D8F3DC',
    colors: ['#39FF88', '#F9F871', '#FF6E6E', '#5FD3FF', '#FFB86B'],
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
    pinball: { bumper: 1.8, spinner: 1.7, zigzag: 1.5, slingshot: 1.7, skee: 1.3, claw: 0.5, ticket: 0.7, hockey: 0.7, striker: 0.8 },
    midway: { claw: 1.7, ticket: 1.6, changer: 1.4, striker: 1.6, hockey: 1.3, pachinko: 1.2, 'lift-tall': 1.8, 'drop-deep': 1.8, bumper: 0.6, spinner: 0.7 },
    jackpot: { pachinko: 1.8, skee: 1.6, hockey: 1.5, striker: 1.3, zigzag: 1.3, changer: 1.2, slingshot: 1.2, spinner: 0.6, claw: 0.7 },
  },
  pieces: [laneRail, bumper, spinner, changer, ticket, zigzag, pachinko, skee, hockey, claw, striker, slingshot, portal],
}
