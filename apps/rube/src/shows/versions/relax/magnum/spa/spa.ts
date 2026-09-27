import { mixHex, type Pt } from '../../../../../parts'
import { glint } from '../cast'
import { follower } from '../camera'
import { box, frame, part, scenery, type Company, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { DEREK, SPA } from '../worlds'
import {
  BLAST,
  BOUNCE_F,
  BOUNCE_F2,
  BACK3,
  CAB_IN,
  CAB_LAMP,
  LAMPS_ON,
  CAB_OUT,
  CAB_PUFF,
  CHOPS,
  COILS,
  CYCLES,
  DELIVER,
  derekWay,
  DOORS,
  DRUM_T,
  DRY,
  DRY_UP,
  DRYER_DOWN,
  DRYER_SPIN,
  FLAT,
  FOG_GO,
  HIT3,
  GATHER3,
  HIT4,
  HOP3,
  WITHDRAW,
  LAND3,
  LAND_F,
  LAUNCH,
  LIFT_GO,
  MUD_HIT,
  MUD_TIP,
  mugatuAt,
  P,
  PRESS_FLASH,
  REST_F_X,
  RINSE_HIT,
  RINSE_OFF,
  RINSE_ON,
  ROBE_BEATS,
  SET_OFF,
  SLICES,
  STRIPS,
  T0,
  T1,
  TOWEL,
  WAY,
  X_END,
  XT,
} from './spa-geo'
import { drawBelt, drawCabinet, drawDrums, drawFog, drawGantries, drawHood, drawLift, drawMud, drawRinse, drawSlicer, drawSlices, drawTowel, drawTowelArm } from './spa-line'
import { drawBalcony, drawBalconyRail, drawBigDryer, drawChute, drawHorn, drawRecliner, drawRigLight, drawTarget } from './spa-rig'
import { drawSet } from './spa-set'
import type { Pen } from './spa-kit'

/**
 * Mugatu's day spa (27.394 → 83.552), the SPA builder's: a car wash for models, and behind its steam the machine that
 * teaches him to strike on a song. See `spa-geo.ts` for the clock and the way; `spa-line.ts` for the treatments,
 * `spa-rig.ts` for the conditioning rig, `spa-set.ts` for the room.
 *
 * The frame's origin is the place's (SPA_AT is [0, 0]): the set and the part draw in the same cells.
 */

export const SPA_AT: Pt = [0, 0]
export const SPA_CELLS = box(-5, -8, Math.ceil(X_END) + 6, 3, 2)

export const spaSet = scenery<null>({
  name: 'spa-set',
  draw: (p, _s, c) => drawSet(p, c.k, c.t, c.ink, c.weight, frame(p, c.k)),
})

/** Every strike, in order. */
export const SPA_HITS: number[] = [
  // The door: Mugatu goes up; the belt starts.
  LIFT_GO,
  SET_OFF,
  // The treatments, each gantry's lamp coming on the downbeat before.
  ...LAMPS_ON,
  CAB_LAMP,
  RINSE_OFF,
  ...DRUM_T,
  MUD_TIP,
  MUD_HIT,
  RINSE_ON,
  RINSE_HIT,
  ...CHOPS,
  ...SLICES,
  CAB_IN,
  CAB_PUFF,
  CAB_OUT,
  TOWEL,
  DRY,
  DRY_UP,
  FOG_GO,
  // The conditioning.
  DELIVER,
  ...CYCLES.flatMap((c) => [c.lever, c.fling, c.hit, c.land, c.latch, c.back]),
  GATHER3,
  HOP3,
  HIT3,
  LAND3,
  BACK3,
  ...COILS,
  LAUNCH,
  HIT4,
  FLAT,
  LAND_F,
  BOUNCE_F,
  BOUNCE_F2,
  // Out.
  DRYER_DOWN,
  DRYER_SPIN,
  BLAST,
  ...ROBE_BEATS,
  STRIPS,
  DOORS,
  ...PRESS_FLASH.slice(0, 2),
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

interface SpaState {
  begin: number
}

/** Is any of [a, b] (x) in view, with a margin? */
const seen = (f: { x0: number; x1: number }, a: number, b: number, m = 1.5): boolean => b > f.x0 - m && a < f.x1 + m

export const spa = part<SpaState>(
  {
    name: 'spa',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const f = frame(p, c.k)
      const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight }
      p.push()
      if (seen(f, P[0] - 3, XT + 2)) drawRigLight(pen, t)
      drawBelt(pen, t, f)
      if (seen(f, -1, 1)) drawLift(pen, t)
      drawGantries(pen, t, f)
      drawMud(pen, t, false)
      drawRinse(pen, t, false)
      drawSlicer(pen, t)
      drawCabinet(pen, t, false)
      drawTowelArm(pen, t)
      drawHood(pen, t)
      if (seen(f, P[0] - 3, XT + 1)) {
        drawChute(pen)
        drawTarget(pen, t)
        drawHorn(pen, t)
        drawRecliner(pen, t)
        drawBalcony(pen, t)
      }
      if (seen(f, REST_F_X - 2, REST_F_X + 4)) drawBigDryer(pen, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      const f = frame(p, c.k)
      const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight }
      p.push()
      drawDrums(pen, t)
      drawMud(pen, t, true)
      drawRinse(pen, t, true)
      // What rides on him goes into the cabinet with him: its fogged front over them.
      drawSlices(pen, t)
      drawTowel(pen, t)
      drawCabinet(pen, t, true)
      if (seen(f, P[0] - 3, P[0] + 1)) drawBalconyRail(pen)
      drawFog(pen, t, f)
      // Mugatu's look, when the one he did not throw lands: his glee.
      const m = mugatuAt(t)
      if (m && t > LAND3 - 0.05 && t < LAND3 + 0.6) glint(p, c.k, [m[0] + 0.09, m[1] - 0.09], t - LAND3, 0.32)
      p.pop()
    },
  },
  (slot) => {
    const way = Math.abs(slot.begin - T0) < 1e-9 && Math.abs(slot.end - T1) < 1e-9 ? WAY : derekWay(slot.begin, slot.end)
    const begin = slot.begin
    const company: Company[] = [
      {
        who: 'mugatu',
        from: begin,
        to: slot.end,
        at: (t: number) => {
          const m = mugatuAt(t)
          if (!m) return null
          // He does not roll: he glides, and his eye is on Derek.
          const d = way.at(t)
          return { x: m[0], y: m[1], spin: Math.atan2(d[1] - m[1], d[0] - m[0]) }
        },
      },
    ]
    return {
      cells: SPA_CELLS,
      exit: [X_END + 0.5, 0] as Pt,
      lane: { segs: way.lane, fire: DRUM_T[0] - begin },
      state: { begin },
      // The mud, and the rinse.
      changes: [
        { at: MUD_HIT - begin, color: mixHex(DEREK, SPA.mud, 0.62), over: 0.14 },
        { at: RINSE_HIT - begin, color: DEREK, over: 0.5 },
      ],
      company,
    }
  },
  (slot) => shotsFor(slot.begin, slot.end),
)

/**
 * The camera: close at the door as Mugatu goes up; a travelling follow down the line, a little ahead of him, pushing
 * in for the cucumbers; drawing back as the steam clears to the whole rig (chair, horn, console, target) for the
 * conditioning, drifting in a little over its four rounds; in for the call; with him to where he lands, dazed, the
 * dryer coming down; and with him out through the doors to the seam's framing.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  // The seam's framing, exactly: the follow the score will make at the cut, offset to put him where the seam says.
  const seam = SEAMS.club
  const where = (s: number): Pt => (s > end ? [X_END + seam.v[0] * (s - end), 0] : s < begin ? WAY.at(begin) : WAY.at(s))
  const fl = follower(where, 400)(end)
  const offEnd: Pt = [X_END + seam.frame[0] - fl[0], seam.frame[1] - fl[1]]
  return [
    hold(begin + 0.75, 3.7, [-0.18, -0.68]),
    hold(SET_OFF + 0.1, 3.85, [-0.05, -0.8]),
    follow(SET_OFF + 1.9, 4.3, [0.95, -0.85]),
    follow(DRUM_T[0], 4.5, [0.85, -0.95]),
    follow(MUD_HIT, 4.7, [0.9, -1.0]),
    follow(SLICES[1] - 0.2, 4.1, [0.7, -0.8]),
    follow(CAB_IN + 0.3, 4.8, [0.95, -0.95]),
    follow(DRY, 5.0, [1.0, -1.0]),
    follow(FOG_GO - 0.3, 5.5, [1.15, -1.1]),
    hold(DELIVER + 0.9, 7.3, [P[0] + 1.6, -1.42]),
    hold(CYCLES[1].near, 7.2, [P[0] + 1.65, -1.4]),
    hold(CYCLES[2].near, 7.05, [P[0] + 1.7, -1.38]),
    // The fourth: in close on Mugatu at his lever and the chair with its latch, as his hand comes off and stays off;
    // held through the beat of nothing and Derek's gathering; a cut wide on the spring, to see him go by himself.
    hold(CYCLES[2].land + 0.8, 6.95, [P[0] + 1.6, -1.38]),
    hold(WITHDRAW - 0.15, 4.85, [P[0] - 1.15, -1.27]),
    hold(GATHER3 + 0.12, 4.75, [P[0] - 1.2, -1.25]),
    { t: HOP3, cells: 6.5, hold: [P[0] + 2.1, -1.25], w: 1, cut: true },
    hold(HIT3 + 0.4, 6.6, [P[0] + 1.9, -1.3]),
    hold(BACK3 - 0.4, 6.9, [P[0] + 1.8, -1.35]),
    // In for the call: the chair and the target, closer; wider again with him as he is thrown up off it, Mugatu's glee
    // at the frame's edge.
    hold(COILS[0] - 0.2, 5.6, [P[0] + 1.7, -1.05]),
    hold(LAUNCH, 5.35, [P[0] + 1.62, -0.98]),
    hold(HIT4 + 0.25, 5.6, [P[0] + 2.5, -1.2]),
    hold(LAND_F, 6.0, [P[0] + 3.3, -1.28]),
    hold(BOUNCE_F + 0.1, 6.2, [P[0] + 4.1, -1.2]),
    hold(DRYER_DOWN - 0.1, 5.4, [REST_F_X - 1.0, -0.8]),
    follow(BLAST + 1.3, 5.0, [1.05, -0.75]),
    follow(STRIPS, 4.6, [0.95, -0.66]),
    follow(end, seam.cells, offEnd),
  ]
}
