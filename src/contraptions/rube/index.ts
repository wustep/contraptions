import type { Contraption } from '../../core/types'

import { balloon } from '../cascade/balloon'
import { bell } from '../cascade/bell'
import { bellows } from '../cascade/bellows'
import { belt } from '../cascade/belt'
import { counter } from '../cascade/counter'
import { cup } from '../cascade/cup'
import { dominoes } from '../cascade/dominoes'
import { flag } from '../cascade/flag'
import { flap } from '../cascade/flap'
import { fuse } from '../cascade/fuse'
import { hammer } from '../cascade/hammer'
import { hopper } from '../cascade/hopper'
import { jack } from '../cascade/jack'
import { knocker } from '../cascade/knocker'
import { lamp } from '../cascade/lamp'
import { lift } from '../cascade/lift'
import { paddle } from '../cascade/paddle'
import { rail } from '../cascade/rail'
import { seesaw } from '../cascade/seesaw'
import { tipper } from '../cascade/tipper'
import { toaster } from '../cascade/toaster'
import { well } from '../cascade/well'
import { catchPipe } from './catch'
import { chute } from './chute'
import { shaft } from './shaft'
import { tube } from './tube'

/**
 * The Rube Goldberg catalog: the cascade's one-cell beats — its feeders,
 * stations, endings and elevator — plus the pieces a wandering path needs
 * that a snake never does: a shaft for elevators deeper than two cells, and
 * a chute, tube and catch for a ball that simply falls.
 *
 * The cascade's multi-cell sentences (strip, switchback, cradle) are not
 * here: the path is one cell wide by construction.
 */
export const registry: Contraption<any>[] = [
  balloon,
  bell,
  bellows,
  belt,
  counter,
  cup,
  dominoes,
  flag,
  flap,
  fuse,
  hammer,
  hopper,
  jack,
  knocker,
  lamp,
  lift,
  paddle,
  rail,
  seesaw,
  tipper,
  toaster,
  well,
  shaft,
  chute,
  tube,
  catchPipe,
]
