import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, route, type PartShot, type Way } from '../kit'
import { HUSH, SOLO } from '../music'
import type { KitStroke } from '../stub'
import { KIT_AT, CLOSE } from './stage'
import { drawRig, headAt, liftShape } from './solo-rig'
import { ACCENTS, BALL, DOWN, LEAP, PULSE, SEATED, SLAM, STROKES, TOSS, TRADE, UNSEAT } from './solo-score'

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

/**
 * His head's nods on the solo's biggest hits while he rides the frame. The frame's own bounce (`solo-rig.ts` `bob`)
 * is a few hundredths of a cell, too small to see in a wide; on these five he lifts his head clear of the cup off the
 * accent before and comes down into it on the hit, the slam highest of all. Each nod spans exactly the frame's own
 * bounce (accent to accent), so it leaves the head on an accent and lands on one: nothing moves away from a stroke.
 * 286.45 stands for the climax's first crash (286.25): the louder crash of the pair, and the frame's accent.
 */
const NODS: readonly { t: number; lift: number }[] = [
  { t: 276.288, lift: 0.2 },
  { t: 286.447, lift: 0.2 },
  { t: SLAM, lift: 0.3 },
  { t: 293.552, lift: 0.2 },
  { t: 297.622, lift: 0.2 },
]
const NOD_SPANS = NODS.map(({ t, lift }) => {
  const j = ACCENTS.findIndex((x) => Math.abs(x.t - t) < 0.005)
  if (j < 1) return null
  const a = ACCENTS[j - 1].t
  const b = ACCENTS[j].t
  // How high the frame already lifts him over this span: the nod makes up the rest.
  let has = 0
  for (let T = a; T <= b; T += 0.002) has = Math.max(has, headAt(b)[1] - headAt(T)[1])
  return { a, b, extra: Math.max(0, lift - has) }
}).filter((x): x is { a: number; b: number; extra: number } => !!x && x.extra > 0)
/** How much higher than the frame holds him his head is at `T`, cells (0 away from the big hits). */
function nod(T: number): number {
  for (const n of NOD_SPANS) if (T > n.a && T < n.b) return n.extra * liftShape((T - n.a) / (n.b - n.a))
  return 0
}
/** His head (the ball) while he rides the frame, in the kit's frame: the frame's head, and the nods. */
const riding = (T: number): Pt => {
  const h = headAt(T)
  return [h[0], h[1] - nod(T)]
}

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
  // (Sampled in stretches that end on each nod's landing, so he comes down into the cup on the hit exactly.)
  const breaks = [SEATED, ...NOD_SPANS.map((n) => n.b), UNSEAT]
  for (let i = 0; i + 1 < breaks.length; i++) {
    segs.push(...carried((t) => at(riding(t)), breaks[i], breaks[i + 1], Math.max(1, Math.round((breaks[i + 1] - breaks[i]) * 60))))
  }
  // The jump down to the snare.
  segs.push(...route([{ at: 0, p: at(headAt(UNSEAT)) }, { at: DOWN - UNSEAT, p: SNARE_TOP, arc: (12 * (DOWN - UNSEAT) ** 2) / 8 }]))
  // Alone again, soft, into the hush.
  bounces(DOWN, end, own)
  return segs
}

/**
 * The close-ups: each a subject a drummer's film cuts to on a big hit, in the kit's frame. The snare under both sticks;
 * the crash with his head beside it; the kick's pedal and his boot on it.
 */
const CU = {
  snare: { cells: 2.9, hold: [0.1, -0.25] as Pt },
  crash: { cells: 2.9, hold: [0.15, -2.3] as Pt },
  pedal: { cells: 2.75, hold: [-0.35, 1.5] as Pt },
}
/** A framing that holds the thrown stick's whole flight, its top, his head, the crash and the snare it slams. */
const THROW = { cells: 5.6, hold: [-0.3, -2.3] as Pt }

/**
 * The camera, in the part's frame. Each key picks a subject: in close on the ball alone on the snare as the frame
 * comes down; out to the frame as he leaps into it; in to a close-up on each big hit (the crash and his head, the
 * snare under both sticks), a medium on him between; one framing held through the toss; a wide on the whole machine
 * and Fletcher watching; the snare and the floor tom trading, close; down the shin to the pedal for the kick drum's
 * pulse; out to all of him as he jumps down.
 */
function shots(): PartShot[] {
  const k = (t: number, cells: number, hold: Pt, w = 1): PartShot => ({ t, cells, hold: at(hold), w })
  const cu = (t: number, f: { cells: number; hold: Pt }, dx = 0, dy = 0): PartShot => k(t, f.cells, [f.hold[0] + dx, f.hold[1] + dy])
  return [
    { t: SOLO, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    // In on him alone on the snare; the frame's sticks come down into the top of the shot.
    k(271.39, 3.0, [-0.15, -0.55]),
    k(271.95, 3.2, [-0.25, -0.8]),
    // Out to the whole frame as he leaps up into its cup.
    k(SEATED + 0.15, 5.6, [-0.5, -1.5]),
    k(274.5, 5.2, [-0.35, -1.6]),
    // The first big hit: the crash and his head.
    cu(276.288, CU.crash),
    cu(277.5, CU.crash, -0.1, 0.1),
    // Out to him: the snare and both sticks under his head, then the left, the rack tom.
    k(279.6, 4.7, [-0.45, -1.4]),
    k(281.4, 4.4, [-0.75, -1.45]),
    // Round the toms.
    k(283.4, 4.9, [-1.35, -1.25]),
    k(284.8, 4.8, [-1.3, -1.3]),
    // The climax's first run of crashes: in to the crash and his head.
    cu(286.25, CU.crash),
    cu(287.7, CU.crash, -0.15, 0.1),
    // The toss: one framing, held, from the throw through the stick's top to the catch and the slam.
    k(TOSS - 0.35, THROW.cells, THROW.hold),
    k(SLAM + 0.4, THROW.cells - 0.1, [THROW.hold[0] - 0.05, THROW.hold[1] + 0.05]),
    // The snare under both sticks.
    cu(293.552, CU.snare),
    // The whole machine, and Fletcher watching from his podium.
    k(296.0, 8.4, [2.1, -1.7], 0.95),
    k(298.4, 8.0, [1.9, -1.6], 0.95),
    // In again: him, the snare and the hi-hat.
    k(300.6, 5.0, [-0.3, -1.45]),
    k(303.2, 4.6, [-0.2, -1.5]),
    // The snare and the floor tom trading: both hands, close.
    k(TRADE[0] + 0.7, 3.5, [-1.35, -0.35]),
    k(310.3, 3.6, [-1.3, -0.4]),
    // His head and the hi-hat again.
    k(312.6, 4.4, [0.05, -1.8]),
    k(314.8, 4.6, [-0.2, -1.6]),
    // The kick drum's pulse: down the shin to the pedal and his boot on it.
    cu(PULSE + 0.7, CU.pedal),
    cu(318.6, CU.pedal, 0, -0.1),
    // Out to all of him, head to foot, and down to the snare as the frame flies out.
    k(UNSEAT - 0.5, 6.0, [-0.6, -0.7]),
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

