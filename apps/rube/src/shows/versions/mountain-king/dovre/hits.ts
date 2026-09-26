/**
 * Every strike of Mountain King, part by part, in show seconds: what `check:shows` holds against the measured
 * recording. A part that strikes exports its list; this only gathers them.
 */
import { GATE_HITS } from './outside/gate'
import { DEEP_HITS } from './deep/deep'
import { COURT_HITS } from './hall/court'
import { WAKE_HITS } from './hall/wake'
import { MINE_HITS } from './under/mine'
import { DRUM_HITS } from './under/drum'
import { GEARS_HITS } from './heart/gears'
import { RUNAWAY_HITS } from './heart/runaway'
import { FALL_HITS } from './finale/fall'
import { BELLS, CRACKS, FLEE, FLOOR_BREAK, HAMMERS, PILLAR_FALL } from './hall/hall-clock'

/**
 * The hall's own collapse in the coda (`hall.ts` draws it for any time): the court freezing at the bells, fleeing on
 * the chord pairs, the pillars cracking, the floor breaking over the chimney, the pillars coming down, and on each
 * hammer blow the throne, the vault's stalactites and the lights. Each is on a chord of the coda.
 */
const HALL_COLLAPSE: number[] = [...new Set([BELLS, ...FLEE, ...CRACKS, FLOOR_BREAK, ...PILLAR_FALL, ...HAMMERS])].sort((a, b) => a - b)

export interface Strikes {
  /** The tune (4.36 to 134): an eighth of the grid (`eighth(j)`, ±30 ms), or a measured onset (±35 ms). */
  tune: Record<string, number[]>
  /** The intro and the coda (before 4.36, from 134.25): a measured onset (±35 ms). */
  free: Record<string, number[]>
}

export const STRIKES: Strikes = {
  tune: {
    gate: GATE_HITS,
    deep: DEEP_HITS,
    court: COURT_HITS,
    wake: WAKE_HITS,
    mine: MINE_HITS,
    drum: DRUM_HITS,
    gears: GEARS_HITS,
    runaway: RUNAWAY_HITS,
  },
  free: {
    fall: FALL_HITS,
    hall: HALL_COLLAPSE,
  },
}
