import type { Beat } from '../../staging'
import { flute } from './flute'
import { gong } from './gong'
import { harp } from './harp'
import { keys } from './keys'
import { metronome } from './metronome'
import { triangle } from './triangle'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [metronome, 'the ball comes to rest before a tall metronome and the clip lets its rod go: tick, tock, tick, and on the fourth beat the felt hammer in its front comes down on the ball’s back and sends it off twice as fast'],
  [keys, 'an octave of piano keys is the rail: each white key goes down under the ball and comes up behind it, a ripple that travels with it; the black keys stand behind'],
  [flute, 'a flute laid across a gap as a bridge: a padded key stands open over every hole, and each snaps shut just before the ball gets to it, worked by the one before, and springs open again behind it'],
  [triangle, 'a triangle hung in the ball’s way: the ball carries it up ahead on its shoulder, goes under, and it swings free a long way over and back, turning on its loop, the steel shivering'],
  [gong, 'a gong in its frame over the line: the ball treads a paddle down, a bell crank throws a beater up into the gong’s foot as the ball goes under, and the gong swings on its cords, shimmering'],
  [harp, 'a glissando: the ball rolls along a harp’s soundbox through its nine strings, taking each a little way with it until it slips and springs back sounding, low to high; a touch slower out'],
]
