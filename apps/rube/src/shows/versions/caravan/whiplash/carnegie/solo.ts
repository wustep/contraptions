import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, route, type PartShot, type Way } from '../kit'
import { HUSH, SOLO } from '../music'
import type { KitStroke } from '../stub'
import { KIT_AT, CLOSE } from './stage'
import { drawRig, headAt } from './solo-rig'
import { BALL, CATCH, DOWN, LEAP, PULSE, RIG_DOWN, SEATED, SLAM, STROKES, TOMS, TOSS, UNSEAT } from './solo-score'

/**
 * Carnegie Hall, the solo (270.52 → 323.27): Andrew alone after the band's cut-off, the densest playing of the show.
 *
 * He lands on the snare on the solo's first stroke and plays alone, a ball bouncing on the accents, while a
 * drummer's frame of chrome drum hardware comes down out of the flies over the kit: a throne's post for a spine, a
 * yoke for shoulders with a cup where the head goes, two long jointed arms with a stick in each grip, and a steel
 * shin that slides down behind the snare onto the kick's pedal. On a big stroke (272.52) he leaps up into the cup,
 * and as he lands (273.09) the frame wakes and plays as his body: the arms the snare, the toms, the hi-hat, the
 * crash and the ride, the shin the kick drum, his head bouncing on the accents and leaning into the side that is
 * playing. Round the toms (283 to 286); the cymbals' climax (286 to 291), where the right arm throws its stick up
 * end over end and catches it for the biggest hit of the solo (290.50), his head thrown back; the whole machine
 * with Fletcher watching from his podium; the kick drum's pulse (316.5 to 321.8). On its last kick he jumps down to
 * the snare, the frame goes limp and flies out, and he plays the soft strokes into the hush (323.27) alone.
 *
 * The machine's motion and drawing are in `solo-rig.ts`; who plays which stroke is in `solo-score.ts`. The frame is
 * Carnegie's (`stage.ts`): the ball enters on the snare (-0.5, 0) and leaves there (exit [0, 0]).
 */

/** Every stroke on the hall's kit (the hall's kit answers them). */
export const SOLO_KIT: KitStroke[] = STROKES.map((s) => ({ t: s.t, piece: s.piece }))
/** Every strike, in show seconds: each stroke's time, once. */
export const SOLO_HITS: number[] = [...new Set(STROKES.map((s) => s.t))].sort((a, b) => a - b)

/** A point of the kit's frame in the part's. */
const at = (p: Pt): Pt => [KIT_AT[0] + p[0], KIT_AT[1] + p[1]]
const SNARE_TOP: Pt = at([0, 0])
/** A drumhead's bounce: quick and low. */
const G = 30

function lane(begin: number, end: number): Seg[] {
  const segs: Seg[] = []
  // Alone on the snare: a bounce on each of his strokes, a rest on the head when the wait is long.
  const bounces = (from: number, to: number, times: readonly number[]): void => {
    const ways: Way[] = [{ at: from - begin, p: SNARE_TOP }]
    for (const t of [...times.filter((x) => x > from + 0.02 && x < to - 0.02), to]) {
      const last = ways[ways.length - 1]
      // One bounce to each stroke, never a rest and a jump: a long gap is a higher, floatier bounce.
      const T = t - begin - last.at
      ways.push({ at: t - begin, p: SNARE_TOP, arc: Math.min((G * T * T) / 8, 0.62) })
    }
    segs.push(...route(ways))
  }
  const own = BALL.map((b) => b.t)
  bounces(begin, LEAP, own)
  // The leap: from the snare up into the cup, a real throw that tops out just over it and drops in.
  const seat = at(headAt(SEATED))
  const T = SEATED - LEAP
  segs.push(...route([{ at: 0, p: SNARE_TOP }, { at: T, p: seat, arc: Math.max(0.95, (22 * T * T) / 8) }]))
  // Riding the frame: his head, sampled sixty times a second.
  segs.push(...carried((t) => at(headAt(t)), SEATED, UNSEAT, Math.round((UNSEAT - SEATED) * 60)))
  // The jump down to the snare.
  segs.push(...route([{ at: 0, p: at(headAt(UNSEAT)) }, { at: DOWN - UNSEAT, p: SNARE_TOP, arc: (12 * (DOWN - UNSEAT) ** 2) / 8 }]))
  // Alone again, soft, into the hush.
  bounces(DOWN, end, own)
  return segs
}

/** The camera, in the part's frame: close at both seams; up to see the frame come in; with him round the kit. */
function shots(): PartShot[] {
  const k = (t: number, cells: number, hold: Pt, w = 1): PartShot => ({ t, cells, hold: at(hold), w })
  return [
    { t: SOLO, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    // Up with the sticks as they come down into the light; out to the whole frame, limp, and him on the snare.
    k(271.05, 4.4, [-0.8, -0.85]),
    k(RIG_DOWN + 0.15, 6.2, [-0.5, -1.55]),
    // In as he lands in the cup and it plays.
    k(SEATED + 0.25, 5.4, [-0.5, -1.4]),
    // His head and the house's right arm: the hi-hat, the crash.
    k(274.6, 4.2, [0.15, -1.85]),
    k(276.0, 4.1, [0.2, -1.9]),
    // The snare and both sticks, under his head.
    k(277.2, 4.6, [-0.35, -1.35]),
    k(279.4, 4.6, [-0.4, -1.3]),
    // The left: the rack tom and the ride.
    k(280.6, 4.4, [-1.2, -1.55]),
    k(282.4, 4.5, [-1.1, -1.5]),
    // Round the toms.
    k(TOMS[0] + 0.7, 4.6, [-1.4, -1.38]),
    k(TOMS[1] - 0.45, 4.7, [-1.25, -1.4]),
    // Up to the crash on the climax's first run.
    k(286.2, 3.9, [0.05, -2.0]),
    k(286.95, 4.0, [0.0, -1.95]),
    k(288.2, 4.9, [-0.3, -1.55]),
    // The throw, the catch, the slam.
    k(TOSS - 0.1, 5.0, [0.0, -1.7]),
    k((TOSS + CATCH) / 2, 6.4, [0.4, -2.55]),
    k(SLAM + 0.08, 5.0, [-0.2, -1.6]),
    k(291.6, 5.1, [-0.25, -1.55]),
    // The whole machine, and Fletcher watching from his podium.
    k(295.0, 8.6, [2.2, -1.6], 0.95),
    k(299.2, 7.6, [1.5, -1.5], 0.95),
    // In again: the snare and the floor tom trading.
    k(302.4, 5.2, [-0.3, -1.4]),
    k(306.2, 4.9, [-1.2, -1.3]),
    k(309.9, 5.0, [-1.05, -1.35]),
    // His head and the cymbals again.
    k(312.4, 4.2, [0.1, -1.85]),
    k(314.6, 4.3, [0.05, -1.8]),
    k(PULSE - 0.5, 5.2, [-0.4, -1.3]),
    // The kick drum's pulse: the whole of him, head to foot.
    k(PULSE + 0.9, 7.6, [-0.7, -0.35]),
    k(UNSEAT - 0.3, 6.4, [-0.6, -0.6]),
    // Down to the snare as the frame flies out.
    k(DOWN + 0.15, 5.2, [-0.55, -0.9]),
    { t: HUSH, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
  ]
}

export const solo = part<{ begin: number }>(
  {
    name: 'solo',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      p.push()
      p.translate(KIT_AT[0] * c.k, KIT_AT[1] * c.k)
      drawRig(p, c, T)
      p.pop()
    },
  },
  (slot) => {
    const segs = lane(slot.begin, slot.end)
    const first = BALL.find((b) => b.t > slot.begin + 0.05)
    return {
      cells: box(-5, -5, 3.5, 3),
      exit: [0, 0] as Pt,
      lane: { segs, fire: first ? first.t - slot.begin : 0 },
      state: { begin: slot.begin },
    }
  },
  () => shots(),
)

