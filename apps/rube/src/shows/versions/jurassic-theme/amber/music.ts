import measured from '../../../../../../../scripts/shows/plans/jurassic-theme-onsets.json'

/**
 * The recording's clock: John Williams's "Theme from Jurassic Park" (Jurassic Park, 1993), from its first sample.
 * Measured once by `scripts/shows/jurassic-theme-onsets.py` into `scripts/shows/plans/jurassic-theme-onsets.json`.
 * The cue is legato — a horn line, breaths, then the orchestra — so the show does not invent a click. It strikes the
 * phrase returns, the entrance, and the crests, and lets everything else move continuously between them.
 *
 *   7.790   bone      the second phrase attacks, out of the breath
 *  11.494   crate     a strong note of that phrase; he is in the crate
 *  16.807   lab       the third phrase returns: the cut, and the cane
 *  21.049   pipettes  a strong note; the rack tips as he arrives
 *  32.241   eggAt     he stops by the egg
 *  45.476   egg       a small note in the hush; the shell starts to open
 *  47.397   valley    the orchestra comes in: the cut, the gates, the neck
 *  86.912   gates     the first big crest: the gates lock, the head clears them
 *  91.835   jeep      he reaches the jeep
 * 100.055   drive     the jeep stops under the neck
 * 105.953   board     the lift leaves the ground
 * 110.210   clear     the next crest: his feet meet the basket, the head clears the trees
 * 157.338   birds     the full statement: the neck arrives, the birds leave
 * 178.220   dawn      the quiet before the last build: the cut
 * 187.176   lift      the last statement: the helicopter leaves the pad
 * 201.322   last      the last moment of the fade still above -45 dB
 */

interface Plan {
  youtube: string
  duration: number
  last: number
  landmarks: {
    bone: number
    crate: number
    lab: number
    pipettes: number
    eggAt: number
    egg: number
    valley: number
    gates: number
    jeep: number
    drive: number
    board: number
    clear: number
    birds: number
    dawn: number
    lift: number
  }
}

const data = measured as Plan

export const YOUTUBE = data.youtube
/** The recording's length, seconds. */
export const RECORDING = data.duration
/** The last moment of the fade still above a whisper. The credits wait until after it. */
export const LAST = data.last

export const BONE = data.landmarks.bone
export const CRATE = data.landmarks.crate
export const LAB = data.landmarks.lab
export const PIPETTES = data.landmarks.pipettes
export const EGG_AT = data.landmarks.eggAt
export const EGG = data.landmarks.egg
export const VALLEY = data.landmarks.valley
export const GATES = data.landmarks.gates
export const JEEP = data.landmarks.jeep
export const DRIVE_END = data.landmarks.drive
export const BOARD = data.landmarks.board
export const CLEAR = data.landmarks.clear
export const BIRDS = data.landmarks.birds
export const DAWN = data.landmarks.dawn
export const LIFT = data.landmarks.lift

/**
 * The picture holds after the fade, and the credits run in that quiet. Long enough that the last card is gone with
 * sky still on the frame.
 */
export const DURATION = 240

/** Every strike, in show seconds: what `check:shows` holds against the measured landmarks. */
export const STRIKES = [BONE, LAB, PIPETTES, EGG, VALLEY, GATES, CLEAR, BIRDS, DAWN, LIFT] as const
