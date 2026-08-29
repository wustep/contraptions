import type { Contraption } from '../../core/types'

import { arm } from './arm'
import { auger } from './auger'
import { bell } from './bell'
import { beltRun } from './belt'
import { bin } from './bin'
import { carousel } from './carousel'
import { chute } from './chute'
import { counter } from './counter'
import { dip } from './dip'
import { divert } from './divert'
import { gantry } from './gantry'
import { geneva } from './geneva'
import { hammer } from './hammer'
import { hoist } from './hoist'
import { hopper } from './hopper'
import { lamp } from './lamp'
import { latch } from './latch'
import { lift } from './lift'
import { line } from './line'
import { lineshaft } from './lineshaft'
import { mill } from './mill'
import { press } from './press'
import { punch } from './punch'
import { saw } from './saw'
import { scale } from './scale'
import { spill } from './spill'
import { timer } from './timer'
import { tipper } from './tipper'

/**
 * The registry: one workshop. Feeders let parts go, conveyors carry them
 * bench to bench, stations work them, and endings take them in or announce
 * them. Adding a machine is: write the file, add it here. `npm run new <name>`
 * scaffolds both halves, and `shop.ts` holds the heights and speeds every
 * bench agrees on.
 */
export const registry: Contraption<any>[] = [
  arm,
  auger,
  bell,
  beltRun,
  bin,
  carousel,
  chute,
  counter,
  dip,
  divert,
  gantry,
  geneva,
  hammer,
  hoist,
  hopper,
  lamp,
  latch,
  lift,
  line,
  lineshaft,
  mill,
  press,
  punch,
  saw,
  scale,
  spill,
  timer,
  tipper,
]

export const byName = (name: string): Contraption<any> | undefined =>
  registry.find((c) => c.name === name)

export const allTags = (): string[] =>
  [...new Set(registry.flatMap((c) => c.tags ?? []))].sort()
