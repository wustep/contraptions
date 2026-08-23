import type { Contraption } from '../core/types'

import { abacus } from './abacus'
import { boxStep } from './box-step'
import { bouncingBalls } from './bouncing-balls'
import { bubble } from './bubble'
import { conveyor } from './conveyor'
import { dominoes } from './dominoes'
import { elevator } from './elevator'
import { flip } from './flip'
import { gear } from './gear'
import { hammer } from './hammer'
import { metronome } from './metronome'
import { orbit } from './orbit'
import { pendulum } from './pendulum'
import { pinwheel } from './pinwheel'
import { pipe } from './pipe'
import { piston } from './piston'
import { pulse } from './pulse'
import { quadFade } from './quad-fade'
import { rain } from './rain'
import { ratchet } from './ratchet'
import { seesaw } from './seesaw'
import { slopeBall } from './slope-ball'
import { spring } from './spring'
import { sweep } from './sweep'
import { traffic } from './traffic'
import { wavy } from './wavy'
import { windmill } from './windmill'

/**
 * The registry. Adding a contraption is: write the file, add it here.
 * `npm run new <name>` scaffolds both halves.
 */
export const registry: Contraption<any>[] = [
  abacus,
  bouncingBalls,
  boxStep,
  bubble,
  conveyor,
  dominoes,
  elevator,
  flip,
  gear,
  hammer,
  metronome,
  orbit,
  pendulum,
  pinwheel,
  pipe,
  piston,
  pulse,
  quadFade,
  rain,
  ratchet,
  seesaw,
  slopeBall,
  spring,
  sweep,
  traffic,
  wavy,
  windmill,
]

export const byName = (name: string): Contraption<any> | undefined =>
  registry.find((c) => c.name === name)

export const allTags = (): string[] =>
  [...new Set(registry.flatMap((c) => c.tags ?? []))].sort()
