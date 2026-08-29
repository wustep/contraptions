import type { Contraption } from '../core/types'

import { balloon } from './balloon'
import { bell } from './bell'
import { bellows } from './bellows'
import { belt } from './belt'
import { counter } from './counter'
import { cradle } from './cradle'
import { cup } from './cup'
import { dominoes } from './dominoes'
import { flag } from './flag'
import { flap } from './flap'
import { fuse } from './fuse'
import { hammer } from './hammer'
import { hopper } from './hopper'
import { jack } from './jack'
import { knocker } from './knocker'
import { lamp } from './lamp'
import { paddle } from './paddle'
import { seesaw } from './seesaw'
import { strip } from './strip'
import { switchback } from './switchback'
import { tipper } from './tipper'
import { toaster } from './toaster'

/**
 * The registry. Adding a contraption is: write the file, add it here.
 * `npm run new <name>` scaffolds both halves.
 */
export const registry: Contraption<any>[] = [
  balloon,
  bell,
  bellows,
  belt,
  counter,
  cradle,
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
  paddle,
  seesaw,
  strip,
  switchback,
  tipper,
  toaster,
]

export const byName = (name: string): Contraption<any> | undefined =>
  registry.find((c) => c.name === name)

export const allTags = (): string[] =>
  [...new Set(registry.flatMap((c) => c.tags ?? []))].sort()
