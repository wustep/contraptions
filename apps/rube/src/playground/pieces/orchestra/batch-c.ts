import type { Beat } from '../../staging'
import { accordion } from './accordion'
import { grand } from './grand'
import { musicbox } from './musicbox'
import { score } from './score'
import { staff } from './staff'
import { xylophone } from './xylophone'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [accordion, 'onto the upper end of an accordion stood on end with its bellows drawn out; they sigh shut under the weight, every fold at once, and the ball goes down with them a floor or two; the leaving side closes home first and tips it off, on or back'],
  [grand, 'off the rail onto the raised edge of a grand piano\u2019s open lid; the prop skids out and the lid comes down with the ball running down it; boom, the piano drops on its legs and every key jumps; on along the closed lid and off its hinge end a floor down'],
  [xylophone, 'a xylophone stood up as steps: out along the top bar and off its end, down the ends of four longer bars, each dipping on its rail and shivering as it rings, a bounce lower and slower each time; onto the rail a floor down'],
  [musicbox, 'onto a ledge on the great pinned cylinder of a music box, up against the brass; the spring lets go, the key turns, and the cylinder carries it up the near side and onto the top, a floor up; the pins going down the far side pluck the comb\u2019s tooth one by one'],
  [score, 'off the rail\u2019s end onto the right-hand page of a great score open on a desk a floor down; the thud jumps a catch and the sprung leaf turns with the ball on it and throws it over the spine; down on the left-hand page already rolling back, and off the book\u2019s edge; the leaf floats over after it'],
  [staff, 'a staff, and the ball is the note: off the top line onto three strings in turn, each stretched to a V under it and twanging straight behind; F, A, C, E going down a floor, on or back'],
]
