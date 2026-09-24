/**
 * Every strike of Liftoff, part by part, in show seconds: what `check:shows`
 * holds against the measured onsets of the recording. A part that strikes
 * exports its list; this only gathers them.
 */
import { DUST_NOTES, PORCH_STEPS, SHELF_NOTES, STAIR_NOTES, TOY_NOTES } from './earth/house'
import { ROW_NOTES } from './earth/field'
import { YARD_HITS } from './earth/yard'
import { TRUCK_BEATS, TRUCK_NOTES, TRUCK_ORGAN } from './earth/truck'
import { GANTRY_HITS } from './earth/gantry'
import { COMBINE_HITS } from './earth/combine'
import { GATE_HITS } from './earth/gate'
import { ROCKET_HITS } from './rocket'
import { EDMUNDS_HITS } from './act2/edmunds'
import { UNDOCK_HITS } from './act2/undock'
import { HUB_HITS } from './act2/hub'
import { RIM_HITS } from './act2/rim'
import { REPLICA_HITS } from './act2/replica'
import { BALLPARK_HITS } from './act2/ballpark'
import { ENDURANCE_HITS } from './space/endurance'
import { MILLER_HITS, MILLER_TWIN_HITS } from './space/miller'
import { GARGANTUA_HITS } from './space/gargantua'

export interface Strikes {
  /** On the piano's own notes (rubato: ±40 ms). */
  piano: Record<string, number[]>
  /** On the organ's onsets as it gathers (±30 ms). */
  organ: Record<string, number[]>
  /** On the 96 bpm comb, beats or eighths (±26 ms), the drop and the last hit included. */
  comb: Record<string, number[]>
  /** Act II: on No Time for Caution's 60 bpm organ pulse, beats or eighths (±30 ms). */
  cue2: Record<string, number[]>
}

export const STRIKES: Strikes = {
  piano: {
    bookcase: [...SHELF_NOTES, 12.016, 12.283],
    robot: [...TOY_NOTES, ...DUST_NOTES],
    stairs: STAIR_NOTES,
    porch: PORCH_STEPS,
    yard: YARD_HITS,
    cornrow: ROW_NOTES,
    pickup: TRUCK_NOTES,
  },
  organ: {
    pickup: TRUCK_ORGAN,
  },
  comb: {
    pickup: TRUCK_BEATS,
    combine: COMBINE_HITS,
    gate: GATE_HITS,
    gantry: GANTRY_HITS,
    rocket: ROCKET_HITS,
    endurance: ENDURANCE_HITS,
    miller: MILLER_HITS,
    twin: MILLER_TWIN_HITS,
    gargantua: GARGANTUA_HITS,
  },
  cue2: {
    replica: REPLICA_HITS,
    rim: RIM_HITS,
    ballpark: BALLPARK_HITS,
    hub: HUB_HITS,
    undock: UNDOCK_HITS,
    edmunds: EDMUNDS_HITS,
  },
}
