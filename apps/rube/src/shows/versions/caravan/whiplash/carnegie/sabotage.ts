import type { Pt } from '../../../../../parts'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { POSES, beatPose, blendPose, drawConductor } from '../fletcher'
import type { Companion } from '../kit'
import { CARNEGIE, CHORD, CUTOFF, SOLO, onsetsIn, shout, SHOUT_ORIGIN, SHOUT_PERIOD } from '../music'
import { kitStub, strokesOf, type KitStroke } from '../stub'
import { FLETCHER_HOME, FLOOR, JIM_DOOR, JIM_WINGS, PODIUM } from './stage'

/**
 * STUB (builder: sabotage). Carnegie Hall, 242.34 → 270.52: the last chorus, the band's held chord, the cut-off.
 *
 * Fletcher's sabotage: the wrong chart on Andrew's stand, the band loud, his machine at a loss; he walks off
 * (259.5) to the stage door, where his father holds him (262 to 266, under the band's held chord); he turns back,
 * and is on the throne as Fletcher cuts the band off (269.8); on 270.52 he starts, alone. See dev/BUILD_BRIEF.md.
 *
 * The frame is Carnegie's (`stage.ts`): the ball enters on the snare (-0.5, 0) and leaves there, exit [0, 0].
 * This part has Fletcher and Jim (company) for its slot; at its end Fletcher is at FLETCHER_HOME in POSES.rest and
 * Jim at JIM_WINGS, at rest. It draws Fletcher's rig while it has him (the hall draws it after).
 */

export const SABOTAGE_KIT: KitStroke[] = strokesOf(onsetsIn(CARNEGIE + 0.2, 259.3, 1.2))
export const SABOTAGE_HITS: number[] = SABOTAGE_KIT.map((s) => s.t)

const base = kitStub('sabotage', SABOTAGE_KIT)

export const sabotage = {
  ...base,
  piece: {
    ...base.piece,
    draw: (p, s, c) => {
      const T = c.t + s.begin
      // Stub: Fletcher conducts the chorus on its beat, holds the chord with open hands, and drops them on the cut.
      const pose =
        T < CHORD
          ? beatPose((T - SHOUT_ORIGIN) / SHOUT_PERIOD, 0.8)
          : T < CUTOFF - 0.3
            ? blendPose(beatPose((CHORD - SHOUT_ORIGIN) / SHOUT_PERIOD, 0.8), POSES.ready, easeInOutSine(clamp((T - CHORD) / 0.6)))
            : blendPose(POSES.ready, POSES.rest, easeInOutSine(clamp((T - CUTOFF + 0.3) / 1.2)))
      if (T >= CARNEGIE - 0.001 && T < SOLO + 0.001) drawConductor(p, c, FLETCHER_HOME, pose, { floor: FLOOR - PODIUM.h })
    },
  },
  build: (slot: { begin: number; end: number; hits: number[] }) => {
    const b = base.build(slot)
    const still = (at: Pt) => (): Companion => ({ x: at[0], y: at[1] })
    const jim = (t: number): Companion => {
      const u = easeInOutSine(clamp((t - 266) / 3.5))
      return { x: JIM_DOOR[0] + (JIM_WINGS[0] - JIM_DOOR[0]) * u, y: JIM_DOOR[1] + (JIM_WINGS[1] - JIM_DOOR[1]) * u }
    }
    return {
      ...b,
      company: [
        { who: 'fletcher' as const, from: slot.begin, to: slot.end, at: still(FLETCHER_HOME) },
        { who: 'jim' as const, from: slot.begin, to: slot.end, at: jim },
      ],
    }
  },
} as typeof base

/** The chorus's beat, for anyone timing to it. */
export const SABOTAGE_BEAT = shout
