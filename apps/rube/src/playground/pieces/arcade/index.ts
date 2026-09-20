import { arcade } from '../../../pieces/arcade'
import { additions, type Shelf } from '../../staging'
import { flume } from './flume'
import { targets } from './targets'

/**
 * Waiting to join the Arcade. New pieces first, in the order they were
 * made; then the ones a craft pass took out of the arcade, newest cut
 * first, each as it stood on the day it went. The shelf borrows the ticket
 * machine with the rail and the door, so a run of staged beats is still
 * paid out.
 */
export const shelf: Shelf = additions(arcade, [
  [flume, 'restored', 'a log flume: the ball rides a log down a chute and is pitched out at the splash. Cut in #61: a log on trestles, fiddly and hard to read; the helter-skelter took its cells.'],
  [targets, 'restored', 'a bank of three drop targets knocked down in turn, and reset. Cut in #37 as not among the arcade\u2019s best.'],
])
