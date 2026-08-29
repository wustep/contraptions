import type { Contraption } from '../../core/types'

import { balloon } from './balloon'
import { bigTop } from './big-top'
import { bucketLift } from './bucket-lift'
import { bunting } from './bunting'
import { cannon } from './cannon'
import { carousel } from './carousel'
import { catapult } from './catapult'
import { confetti } from './confetti'
import { curtain } from './curtain'
import { cymbals } from './cymbals'
import { drumroll } from './drumroll'
import { dunkTank } from './dunk-tank'
import { ferris } from './ferris'
import { globe } from './globe'
import { gong } from './gong'
import { highDive } from './high-dive'
import { highStriker } from './high-striker'
import { hoop } from './hoop'
import { jackInTheBox } from './jack-in-the-box'
import { juggler } from './juggler'
import { lift } from './lift'
import { marquee } from './marquee'
import { monkeyBars } from './monkey-bars'
import { spotlight } from './spotlight'
import { teeterboard } from './teeterboard'
import { tightrope } from './tightrope'
import { trampoline } from './trampoline'
import { trapeze } from './trapeze'
import { well } from './well'

/**
 * The registry: the acts of the circus. Adding one is: write the file, add it
 * here. `npm run new <name>` scaffolds both halves. The shared vocabulary —
 * performers, flights, knocks, hoops, bells — lives in `circus.ts`.
 */
export const registry: Contraption<any>[] = [
  balloon,
  bigTop,
  bucketLift,
  bunting,
  cannon,
  carousel,
  catapult,
  confetti,
  curtain,
  cymbals,
  drumroll,
  dunkTank,
  ferris,
  globe,
  gong,
  highDive,
  highStriker,
  hoop,
  jackInTheBox,
  juggler,
  lift,
  marquee,
  monkeyBars,
  spotlight,
  teeterboard,
  tightrope,
  trampoline,
  trapeze,
  well,
]

export const byName = (name: string): Contraption<any> | undefined =>
  registry.find((c) => c.name === name)

export const allTags = (): string[] =>
  [...new Set(registry.flatMap((c) => c.tags ?? []))].sort()
