import type { Pt } from '../../../../../parts'
import { laneAt, mixHex } from '../../../../../parts'
import type { ShowBall } from '../../../../../show'
import { box, part, scenery, type Company, type PartShot } from '../kit'
import { beat, DURATION } from '../music'
import { CENTER_THEME, KID_ID, KID_SCALE, KIDS } from '../worlds'
import { drawBuilding, drawOver, drawPump, drawRigBack, drawRigCrown, drawSheet, INTERIOR, LIT, setDusk } from './center-draw'
import {
  BESIDE,
  BOUNCES,
  BUMP,
  CLOSE,
  CUT,
  D,
  duskAt,
  GROUND,
  KID_R,
  litAt,
  MODEL,
  TAIL_FLASHES,
  WINDOW_KIDS,
  gazer,
  DEREK_STEPS,
  derekWay,
  GROWS,
  HANSEL_STEPS,
  hanselWay,
  KID_COUNT,
  kidAt,
  KIDS_FROM,
  LANDED,
  OFF,
  OVER,
  PHOTO,
  RECOIL,
  RELEASES,
  STOMPS,
  TAP,
  TAP_BACK,
  TAP_OFF,
  TAP_UP,
} from './center-plan'
import { drawSet } from './center-set'

/**
 * The Derek Zoolander Center for Kids Who Can't Read Good (202.095 → 263), the CENTER builder's.
 *
 * A bright morning on a lawn. Out of Derelicte's last flash, Derek and Hansel stand on the path before a little
 * thing under a white sheet, a cord from it thrown over the limb of an old tree. On bar 98 Derek bumps the tree's
 * bell-pull, a counterweight drops, and the sheet goes up into the leaves: and there, in the morning, is the Center:
 * pale stone, tall windows, a portico, a lantern on the roof, two trees. Then he comes up beside it, and it comes to
 * his shoulder: a center for ants. He starts back from it, and jumps it.
 *
 * On its far side is the one machine, a foot pump with its hose to the model's foot. He tries it: up on the pedal's
 * end, a little press, and the air runs down the hose and the model puffs and hops. Not enough. Back down, he
 * gathers himself on the drum break (a bounce on every hit of the fill, creeping in) and leaps on it on bar 106's first call:
 * the pedal goes down, the air runs down the hose, and the building jumps to three times its size, up first, then
 * out, its roofs unfolding and its lantern lifting after. The second call: three times again, and the camera cuts
 * back to hold it. The third: three times again, and there it is, whole. On the shout a fourth stomp, and the air
 * blows its brass doors open.
 *
 * In the loudest bars the kids come along the path from the right, a run of little bouncing balls, and up the
 * stair and in; Derek and Hansel at the door either side of them. The last of them in, the two close in to the
 * doorway, the press bring their cameras up, and on the last hit they fire and the two of them give the look: the
 * last photograph, and two more, smaller, as it fades. The press lower their cameras and hurry off, and the day goes:
 * as the camera draws back to the whole Center the sky deepens to dusk over a warm horizon, its windows light one by
 * one with the kids at them, and it holds, drifting, the two of them small at its door, for the credits.
 */

/** The part's origin in the Center's cells: the set and the part share one frame. */
export const CENTER_AT: Pt = [0, 0]
/** Everything the Center draws, claimed coarsely so the stage draws it wherever the camera is. */
export const CENTER_CELLS = box(-16, -18, 26, 5, 2)

export const centerSet = scenery<null>({
  name: 'center-set',
  draw: (p, _s, c) => {
    p.push()
    p.rectMode(p.CORNER)
    drawSet(p, c, c.t)
    p.pop()
  },
})

const DEREK = derekWay()
/** Where Derek looks: down at the model beside him; back at it from over it; across it at Hansel; at the pump; at the kids; at the press. */
const DEREK_LOOKS = gazer(DEREK, [
  [BESIDE + 0.02, BESIDE + 0.45, Math.PI - 0.55],
  [LANDED + 0.25, LANDED + 0.6, 0.35],
  [LANDED + 0.95, LANDED + 1.35, -0.05],
  [beat(412) - 0.15, beat(412) + 0.2, Math.PI - 0.45],
  [TAP_BACK + 0.22, TAP_BACK + 0.6, 0.12],
  [BOUNCES[0] - 0.62, BOUNCES[0] - 0.25, Math.PI - 0.1],
  [CLOSE - 0.5, CLOSE - 0.2, 0.2],
  [PHOTO - 0.36, PHOTO - 0.06, 0.5],
])
/** Where Hansel looks: at the model and across it at Derek; at the kids coming; at the press. */
const HANSEL_LOOKS = gazer(hanselWay, [
  [beat(405) + 0.3, beat(405) + 0.7, Math.PI - 0.5],
  [beat(406) + 0.35, beat(406) + 0.75, Math.PI],
  [HANSEL_STEPS[2] + 0.06, HANSEL_STEPS[2] + 0.45, 0.45],
  [PHOTO - 0.32, PHOTO - 0.04, 0.5],
])
const HANSEL_LANE = { segs: hanselWay, fire: 0 }

export const center = part<null>(
  {
    name: 'center',
    draw: (p, _s, c) => {
      const t = c.t + CUT
      setDusk(duskAt(t))
      p.push()
      p.rectMode(p.CORNER)
      const grown = t >= GROWS[0]
      drawRigBack(p, c, t)
      if (grown) {
        drawSheet(p, c, t)
        drawRigCrown(p, c, t)
      }
      drawPump(p, c, t)
      drawBuilding(p, c, t)
      if (!grown) {
        drawSheet(p, c, t)
        drawRigCrown(p, c, t)
      }
      p.pop()
    },
    over: (p, _s, c) => {
      const t = c.t + CUT
      setDusk(duskAt(t))
      p.push()
      p.rectMode(p.CORNER)
      drawOver(p, c, t)
      p.pop()
    },
  },
  (slot) => {
    const lane = { segs: DEREK, fire: BUMP - slot.begin }
    const end = laneAt(lane, slot.end - slot.begin)
    const hansel: Company = {
      who: 'hansel',
      from: slot.begin,
      to: DURATION + 1,
      at: (t) => {
        const q = laneAt(HANSEL_LANE, t - CUT)
        return { x: q.x, y: q.y, spin: HANSEL_LOOKS(t) }
      },
    }
    return {
      cells: box(-14, -16, 24, 4, 2),
      exit: [end.x + 0.5, end.y],
      lane,
      state: null,
      company: [hansel],
      riders: (t: number, hero: ShowBall) => {
        const out: ShowBall[] = [{ ...hero, spin: DEREK_LOOKS(t) }]
        if (t < KIDS_FROM) return out
        // The kids at the lit windows, coming out of the light as each lamp comes on.
        for (const q of WINDOW_KIDS) {
          const lit = litAt(q.window, t)
          if (lit <= 0) continue
          out.push({
            id: KID_ID + q.kid,
            x: MODEL.x0 + D.windows[q.window] + q.dx,
            y: GROUND - D.window.y0 - KID_R,
            color: mixHex(LIT, KIDS[q.kid % KIDS.length], lit),
            rim: mixHex(LIT, CENTER_THEME.ink, lit),
            scale: KID_SCALE,
            spin: Math.PI / 2 + q.dx * 3,
          })
        }
        for (let i = 0; i < KID_COUNT; i++) {
          const kid = kidAt(i, t)
          if (!kid) continue
          const color = KIDS[i % KIDS.length]
          out.push({
            id: KID_ID + i,
            x: kid.x,
            y: kid.y,
            color: mixHex(color, INTERIOR, kid.dark),
            rim: mixHex(CENTER_THEME.ink, INTERIOR, kid.dark),
            scale: kid.scale,
            spin: kid.spin,
          })
        }
        return out
      },
    }
  },
  (slot) => shots(slot.begin),
)

/** The camera: the two of them; the model alone as a building; Derek beside it; out with each jump; the whole Center. */
function shots(begin: number): PartShot[] {
  const on = (t: number, cells: number, x: number, y: number, cut = false): PartShot => ({ t, cells, hold: [x, y], w: 1, ...(cut ? { cut } : {}) })
  return [
    // The two of them on the path (the score opens on the carried framing); drifting with him to the bell-pull.
    on(begin + 1.3, 3.8, -1.2, -0.82),
    // Cut on the bump to the model alone, a building in the morning as the sheet goes up; a slow push in.
    on(BUMP, 0.78, -2.9, -0.04, true),
    on(BESIDE - 1.45, 0.72, -2.92, -0.03),
    // He comes up beside it: easing back to take him in.
    on(BESIDE, 1.02, -2.72, -0.1),
    on(RECOIL, 1.25, -2.8, -0.14),
    on(LANDED, 1.6, -3.05, -0.22),
    on(LANDED + 1.2, 1.7, -3.05, -0.25),
    // Out and along the hose to the pump.
    on(beat(408) + 0.1, 1.85, -3.25, -0.28),
    on(beat(412) - 0.2, 2.05, -4.0, -0.36),
    on(TAP, 1.98, -4.02, -0.36),
    on(BOUNCES[0] - 1.1, 1.9, -3.95, -0.3),
    on(BOUNCES[0], 2.15, -4.0, -0.42),
    on(BOUNCES[BOUNCES.length - 1], 3.1, -4.35, -0.95),
    // The first call in this frame; the second and third each cut back to hold it.
    on(STOMPS[0], 3.25, -4.25, -0.9),
    on(STOMPS[1], 7.5, -1.5, -2.0, true),
    on(STOMPS[2], 15.5, 3.55, -5.2, true),
    on(OFF + 0.1, 15.4, 3.5, -5.1),
    // In to the door as the kids come.
    on(225.2, 9.5, 3.3, -2.9),
    on(227.4, 4.6, 3.85, -0.98),
    on(PHOTO, 4.2, 3.85, -0.9),
    on(PHOTO + 0.15, 4.22, 3.85, -0.91),
    // And back, slowly, to the whole Center under the sky; a drift for the credits.
    on(232.8, 15.3, 3.6, -5.3),
    // Under the credits the evening comes on (stars, lamps, the last lights) and the camera wanders, slowly.
    on(240.2, 15.8, 4.5, -5.5),
    on(248.2, 15.5, 3.7, -5.46),
    on(256.0, 16.1, 2.9, -5.6),
    on(DURATION, 16.4, 3.4, -5.7),
  ]
}

/** Every strike, in show seconds, exact. */
export const CENTER_HITS: number[] = [
  // The bell-pull: the sheet up (and the camera's cut to the model).
  BUMP,
  // Beside it; the start back; over it, and down.
  BESIDE,
  RECOIL,
  OVER,
  LANDED,
  // The test on the pedal's end: up, the little press (and the model's puff), off, and down behind.
  TAP_UP,
  TAP,
  TAP_OFF,
  TAP_BACK,
  // The drum break: the bounces, and the leap.
  ...BOUNCES,
  // The three calls, three stomps and three times bigger; the doors on the shout; off onto the path.
  ...STOMPS,
  ...RELEASES,
  OFF,
  // Hansel up the steps, and Derek.
  beat(431),
  ...HANSEL_STEPS,
  beat(434),
  ...DEREK_STEPS,
  // The last photograph, and the press's two more as it fades.
  PHOTO,
  ...TAIL_FLASHES,
]
