import type { Beat } from '../../staging'
import { floe } from './floe'
import { husky } from './husky'
import { paraglider } from './paraglider'
import { sleighbells } from './sleighbells'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [sleighbells, 'under a strap of five sleigh bells slung across the track, brushing the lowest; it lifts and drops back jingling, and the jingle runs out along the strap both ways, bell to bell, and dies'],
  [floe, 'onto the near end of an ice floe lying against the shelf; that end dips, and the floe drifts off across the lead as the ball rolls along it, levelling, then down by the head, and fetches up against the far ice just as the ball reaches its end'],
  [husky, 'off the track\u2019s end into the tray of a small sled; the thump wakes the husky asleep in harness before it; it is up and away, hauls the sled a cell and a half at a gallop, sits back and skids; the sled stops dead in a drift and the ball runs on up the tray\u2019s lip and over onto the track'],
  [paraglider, 'off the track\u2019s end into the sling of a paraglider laid out on the snow; the wing fills, comes up in an arc and stands overhead; up and across under it, swinging, to a ledge one or two floors up, where the sling is set down and the ball rolls out; the wing falls back and hangs from the ledge by its lines'],
]
