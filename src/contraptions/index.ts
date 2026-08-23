import type { Contraption } from '../core/types'

import { abacus } from './abacus'
import { bell } from './bell'
import { beltDrive } from './belt-drive'
import { bouncingBalls } from './bouncing-balls'
import { boxStep } from './box-step'
import { bubble } from './bubble'
import { conveyor } from './conveyor'
import { dominoes } from './dominoes'
import { drip } from './drip'
import { elevator } from './elevator'
import { flip } from './flip'
import { gantry } from './gantry'
import { gate } from './gate'
import { gear } from './gear'
import { hammer } from './hammer'
import { lamp } from './lamp'
import { marbleRun } from './marble-run'
import { metronome } from './metronome'
import { newtonsCradle } from './newtons-cradle'
import { orbit } from './orbit'
import { orrery } from './orrery'
import { pendulum } from './pendulum'
import { pendulumWave } from './pendulum-wave'
import { pinwheel } from './pinwheel'
import { pipe } from './pipe'
import { piston } from './piston'
import { pulse } from './pulse'
import { quadFade } from './quad-fade'
import { ratchet } from './ratchet'
import { seesaw } from './seesaw'
import { slopeBall } from './slope-ball'
import { spring } from './spring'
import { sweep } from './sweep'
import { tippingBucket } from './tipping-bucket'
import { traffic } from './traffic'
import { wavy } from './wavy'
import { windmill } from './windmill'

/**
 * The registry. Adding a contraption is: write the file, add it here.
 * `npm run new <name>` scaffolds both halves.
 */
export const registry: Contraption<any>[] = [
  abacus,
  bell,
  beltDrive,
  bouncingBalls,
  boxStep,
  bubble,
  conveyor,
  dominoes,
  drip,
  elevator,
  flip,
  gantry,
  gate,
  gear,
  hammer,
  lamp,
  marbleRun,
  metronome,
  newtonsCradle,
  orbit,
  orrery,
  pendulum,
  pendulumWave,
  pinwheel,
  pipe,
  piston,
  pulse,
  quadFade,
  ratchet,
  seesaw,
  slopeBall,
  spring,
  sweep,
  tippingBucket,
  traffic,
  wavy,
  windmill,
]

export const byName = (name: string): Contraption<any> | undefined =>
  registry.find((c) => c.name === name)

export const allTags = (): string[] =>
  [...new Set(registry.flatMap((c) => c.tags ?? []))].sort()
