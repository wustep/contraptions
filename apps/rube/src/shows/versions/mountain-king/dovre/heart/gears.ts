import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { HEART_SHOT, PLAN } from '../seams'
import { BELLOWS, FLY, OOM, PAH, PISTONS, T0, T1, kt } from './heart-clock'
import { HOPS, OFF_FLY, laneOf } from './heart-path'
import { drawHeart, drawHeartOver } from './heart-set'

/**
 * The mountain's heart, the gears (101.95 → 124.01, phrases 12–15, A A B B, fortissimo), laid mirrored: the machine
 * the trolls built the hall on, woken by Peer's fall and growing a mechanism every phrase. He rides the hammer's
 * head, jolted on every blow of the 1 and 3 while the furnace flares on every 2 and 4; hops onto the flywheel as it
 * engages (107.75) and is carried up and over it, kicked down its face onto the pumps as they start (113.36),
 * bounced higher when the great bellows come in (118.72), and is back on the first pump for the runaway (124.01). This part draws the whole room for both of the heart's parts
 * (`heart-set.ts`); its clock is `heart-clock.ts`, his path `heart-path.ts`.
 */

const uniq = (list: number[]): number[] => {
  const out: number[] = []
  for (const t of [...list].sort((a, b) => a - b)) if (!out.length || t - out[out.length - 1] > 1e-4) out.push(t)
  return out
}

/** Every strike of the gears: his landing, the blows and the flares, the new mechanisms, every landing and fling on the pistons. */
export const GEARS_HITS: number[] = uniq([
  T0,
  ...OOM,
  ...PAH,
  FLY,
  PISTONS,
  BELLOWS,
  OFF_FLY,
  // The first flick's landing on the hammer's head, and his hop off it at the top of its lift onto the flywheel's
  // side: each on an eighth.
  kt(194.5),
  kt(207.5),
  ...HOPS.flatMap((h) => [kt(h.k), kt(h.off)]),
]).filter((t) => t >= T0 - 1e-6 && t < T1 - 1e-6)

export const gears = part<{ begin: number }>(
  {
    name: 'gears',
    draw: (p, s, c) => drawHeart(p, c, s.begin + c.t),
    over: (p, s, c) => drawHeartOver(p, c, s.begin + c.t),
  },
  (slot) => ({
    cells: box(-1.5, -6.5, 15.5, 3),
    exit: PLAN.gears.exit,
    lane: { segs: laneOf(slot.begin, slot.end), fire: OOM[0] - slot.begin },
    state: { begin: slot.begin },
  }),
  (slot): PartShot[] => {
    // A point in WORLD cells, in this part's frame (laid mirrored: its entry, frame (-0.5, 0), is world (61.5, 33)).
    const wp = (x: number, y: number): Pt => [61 - x, y - 33]
    // Statement 3 is the show's biggest machine, so its frame breathes with the phrases: each phrase pushes in close
    // (7 to 8 cells) on the mechanism its first note lights and travels with him across it (a light hold), and on its
    // last bar pulls back to the whole heart, a little wider each time (9.5, 10, 10.5), its top kept under the drum
    // room's floor; on the great bellows' last bar it opens right out to the heart and the whole drum room over it
    // (18), the mountain shaking to the blows, into the runaway (`runaway.ts`). Each move is timed so the zoom never
    // whips (from rest to rest over a bar and a half or more).
    const close = (t: number, cells: number, x: number, y: number, w = 0.5, wy = w): PartShot => ({ t, cells, hold: wp(x, y), w, wy })
    const whole = (t: number, cells: number, y = 31.1): PartShot => ({ t, cells, hold: wp(54.4, y), w: 0.85 })
    return [
      { t: slot.begin, cells: HEART_SHOT.cells, hold: wp(HEART_SHOT.world[0], HEART_SHOT.world[1]), w: HEART_SHOT.w },
      // The hammer: in on the anvil and the furnace's mouth as its first blow sparks the fire.
      close(kt(194), 7.2, 57.3, 32.0, 0.55),
      close(kt(203), 7.4, 57.0, 31.7, 0.5),
      whole(FLY - 0.05, 9.5, 31.0),
      // The flywheel: in on the great wheel as it engages, riding up its side with him and over its top.
      close(kt(212), 7.4, 56.2, 30.3, 0.45, 0.8),
      close(kt(219), 7.6, 55.0, 30.3, 0.4, 0.85),
      whole(PISTONS - 0.05, 10, 31.2),
      // The pumps: in on the heads as they start, going with him head to head.
      close(kt(228), 7.5, 50.8, 32.0, 0.35, 0.7),
      close(kt(235), 7.7, 50.8, 32.0, 0.35, 0.7),
      whole(BELLOWS - 0.05, 10.5, 31.3),
      // The great bellows: its own stage, raised into the furnace's mouth, the furnace white, him surfing the wave.
      close(kt(244), 7.8, 52.6, 31.6, 0.5),
      // (The pull-back starts half a bar early, so it opens slowly and arrives at the wide on the phrase's downbeat.)
      close(kt(248), 8.0, 52.3, 31.6, 0.45),
      // Out to the heart and the drum room over it, whole.
      { t: slot.end, cells: 18, hold: wp(54.4, 26.9), w: 0.9 },
    ]
  },
)
