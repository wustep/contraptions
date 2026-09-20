import { garden } from '../../../pieces/garden'
import { additions, type Shelf } from '../../staging'
import { birdbath } from './birdbath'
import { mower } from './mower'
import { rake } from './rake'
import { stump } from './stump'
import { web } from './web'

/**
 * Waiting to join Forest. New pieces first, in the order they were made;
 * then the ones a craft pass took out of the garden, newest cut first,
 * each as it stood on the day it went.
 */
export const shelf: Shelf = additions(garden, [
  [birdbath, 'restored', 'a dish on a pedestal: over the rim, a splash, across half sunk, out over the lip. Cut in #61: a half-sunk ball in a dish never sat right; turf took its cell.'],
  [stump, 'restored', 'an axe left in a stump tears out and its handle flings the ball up a floor. Cut in #59: the spade\u2019s throw again, and it never read as an axe; the fountain took its cells.'],
  [web, 'restored', 'a spider\u2019s web takes the ball, stretches, snaps and lets it through a floor down. Cut in #59: thirty lines of web and a torn one hanging after; the slide took its cells.'],
  [rake, 'restored', 'a rake lying tines up: the ball stops on the tines and the handle comes over and cracks it on. Cut in #40: it had no silhouette; the gate took its cells.'],
  [mower, 'restored', 'a reel mower spins up and a blade throws the ball out over its grass box. Cut in #37 as not among the garden\u2019s best.'],
])
