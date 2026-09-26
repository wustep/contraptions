import type { Pt } from '../../../../../parts'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { POSES, blendPose, type Pose } from '../fletcher'
import { BREAK, FINAL, LAST_CHORD } from '../music'
import { FLETCHER_HOME, JIM_WINGS } from './stage'

/**
 * Fletcher and Jim through the solo, from its first stroke (270.52) to the end: where they are and what Fletcher's
 * hands do, in the Carnegie frame (`stage.ts`). The director's: the score hands the stage their company spans from
 * here, and the hall draws Fletcher's rig from `poseAt`. Before the solo, the sabotage part has them both; at the
 * hand-off (270.52) Fletcher is at `FLETCHER_HOME` in `POSES.rest` and Jim at `JIM_WINGS`, at rest.
 *
 * PRE-PRODUCTION: a first pass. The film's beats still to stage here: Fletcher watching the solo; stepping to the
 * kit in the hush to set the crash cymbal straight on its stand; close in the rubato; his slow nod in the long roll;
 * his hands up in the silence to cue the band; the chord held; the fist.
 */

/** Where Fletcher's head (his ball) is at `t` (show seconds), in the Carnegie frame. */
export function fletcherAt(t: number): Pt {
  // The nod: a slow dip of his whole head, once, late in the long roll.
  const nod = 0.12 * Math.sin(Math.PI * clamp((t - 527.5) / 2.4)) ** 2
  return [FLETCHER_HOME[0], FLETCHER_HOME[1] + nod]
}

/** What his hands do at `t`. */
export function poseAt(t: number): Pose {
  if (t < BREAK + 0.2) return POSES.rest
  // In the silence before the last chord, both hands come up, open: the band ready. The chord is held so.
  if (t < FINAL - 0.5) return blendPose(POSES.rest, POSES.ready, easeInOutSine(clamp((t - BREAK - 0.2) / (LAST_CHORD - BREAK - 0.35))))
  // The fist: his right hand closes on the cut-off.
  return blendPose(POSES.ready, POSES.fist, easeInOutSine(clamp((t - (FINAL - 0.5)) / 0.5)))
}

/** Where Jim is at `t`: in the wings, watching, from the solo on. */
export const jimAt = (_t: number): Pt => JIM_WINGS
