import { garden } from '../../../pieces/garden'
import { additions, type Shelf } from '../../staging'
import { beetle } from './beetle'
import { birdbath } from './birdbath'
import { flytrap } from './flytrap'
import { mimosa } from './mimosa'
import { mower } from './mower'
import { rake } from './rake'
import { stump } from './stump'
import { web } from './web'
import { woodpecker } from './woodpecker'

/**
 * Waiting to join Forest. New pieces first, in the order they were made;
 * then the ones a craft pass took out of the garden, newest cut first,
 * each as it stood on the day it went.
 */
export const shelf: Shelf = additions(garden, [
  [woodpecker, 'new', 'the pecking-bird toy: the ball stops on a tray off a loose collar on a pole, a woodpecker sprung off its other side; the bird nods and the collar judders down the pole, a rock and a drop, the beak knocking, a floor or two; the collar lands on its stop, the tray tips, and the ball rolls off, on or back'],
  [flytrap, 'new', 'a Venus flytrap on a tall stalk gapes at the path\u2019s end; the ball stops on its lower lobe, the dome snaps down and the teeth lace shut in front of it; the stalk bows over under the weight and lowers the trap a floor, the head coming round if the ball is to go on; it gapes again and the ball rolls out down its chin'],
  [mimosa, 'new', 'a sensitive plant holds a frond back over two cells of path; the ball brushes its lowest leaflets and the touch runs along the rib ahead of it, pair after pair folding shut, and the frond droops at its joint behind the ball; it lifts and opens again long after'],
  [beetle, 'new', 'a dung beetle stands on a heap of earth lying across the path, too steep for the ball; as the ball comes its wing cases go up and it drones down over the ball\u2019s head onto the path behind it; the ball runs up the heap, stops short of the top and rolls back down into the beetle\u2019s hind feet; up on its forelegs and walking backwards, it rolls the ball up the slope, a shove a step, and heaves it over the top; the ball runs away down the far side and the beetle backs up onto its heap'],
  [birdbath, 'restored', 'a dish on a pedestal: over the rim, a splash, across half sunk, out over the lip. Cut in #61: a half-sunk ball in a dish never sat right; turf took its cell.'],
  [stump, 'restored', 'an axe left in a stump tears out and its handle flings the ball up a floor. Cut in #59: the spade\u2019s throw again, and it never read as an axe; the fountain took its cells.'],
  [web, 'restored', 'a spider\u2019s web takes the ball, stretches, snaps and lets it through a floor down. Cut in #59: thirty lines of web and a torn one hanging after; the slide took its cells.'],
  [rake, 'restored', 'a rake lying tines up: the ball stops on the tines and the handle comes over and cracks it on. Cut in #40: it had no silhouette; the gate took its cells.'],
  [mower, 'restored', 'a reel mower spins up and a blade throws the ball out over its grass box. Cut in #37 as not among the garden\u2019s best.'],
])
