import { laneAt, mixHex, type Pt } from '../../../../../parts'
import type { ShowBall } from '../../../../../show'
import { box, frame, part, scenery, type Company, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { COBB, MAL, PARIS, PARIS_THEME } from '../worlds'

/** Mal's edge in Paris: the light off the stone on the wine. */
const MAL_RIM = mixHex(PARIS.stone, MAL, 0.25)
import {
  ariAt,
  ARI_HOP_OVER,
  ARI_LAND,
  A,
  B_HOME,
  BLASTS,
  C,
  COBB_END,
  COBB_END_S,
  cobbLane,
  CUT,
  D,
  H,
  LAST_SHARD,
  LEVER_HOME,
  LEVER_ON,
  LOCK,
  MAL_FROM,
  MAL_TURN,
  malAt,
  MIRROR_A,
  MIRROR_B,
  over,
  unover,
  parisRoll as roll,
  reflections,
  RELEASE,
  restsOn,
  SHARDS,
  SHATTER,
  spinTable,
  STARE,
  STEP,
  STRIKE,
  SURGES,
  Y_S,
} from './paris-geo'
import { drawParisSet } from './paris-set'
import { drawParis, drawParisOver } from './paris-draw'

/**
 * PARIS (30.860 → 61.342): the architect's lesson. The PARIS builder's.
 *
 * The cut comes on the strings' first great attack: a café table in the sun, Ariadne across it; the pigeons go up off
 * the cobbles. Bar 9: the café blows apart round them in slow motion, its window, the fruit stand, the kiosk, on the
 * strings' three attacks, and what flew hangs in the air. She goes: along the pavement, up into the pan of a great
 * lever on the square, and her weight carries it home (bar 10), letting go the anchor of the hinge's escapement under
 * the quai: on each attack of bars 10 and 11 the counterweight drops a step, the great gear turns, and the tambour's
 * slabs go out through the slot and lock into a curve that pushes the far half of Paris (the bridge, the Seine under
 * it, the far bank) up and over. Bar 12 lets the last of it go: the bridge falls over by its own weight onto its
 * latches, upside down over the café. They have already gone up the curve after it, she first, and the camera rolls
 * with him, a half turn, so the upturned bridge is the floor and the old street is the sky. Bar 13: under the
 * viaduct's iron she swings a great mirror behind him, and the near one shuts on them: a corridor of him, each smaller
 * and paler, to nowhere. Bar 14: she touches it, and it shatters. Bar 15: the projections all turn to stare; they step
 * in; Mal comes out of them, and strikes; Ariadne is thrown up out of the dream; Mal turns to him. The cut, on the
 * pulse.
 */

export const PARIS_AT: Pt = [0, 0]
export const PARIS_CELLS: Pt[] = box(-26, -34, 58, 12, 3)

export const parisSet = scenery<null>({
  name: 'paris-set',
  draw: (p, _s, c) => drawParisSet(p, c.k, c.t, c.ink, c.weight, frame(p, c.k)),
})

/** Every strike, show seconds. */
export const PARIS_HITS: number[] = [
  // The cut: the pigeons go up.
  CUT,
  // The café, in three blasts.
  ...BLASTS,
  // The lever: she lands in its pan; it comes home and the anchor goes.
  LEVER_ON,
  LEVER_HOME,
  // The drum's surges, the release, and the leaf slamming onto its latches overhead.
  ...SURGES.slice(1).map(([t]) => t),
  RELEASE,
  LOCK,
  // The mirrors: she swings the great one; it comes onto its stop; the near one shuts.
  MIRROR_B,
  B_HOME,
  MIRROR_A,
  // She touches it: it shatters; the glass comes down.
  SHATTER,
  SHARDS,
  LAST_SHARD,
  // The projections turn, and step in; Mal's blow; she turns to him.
  STARE,
  STEP,
  STRIKE,
  MAL_TURN,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

/** The camera's roll while the street folds over (radians, clockwise); 0 outside Paris. */
export const parisRoll = (t: number): number => roll(t)

interface ParisState {
  begin: number
}


export const paris = part<ParisState>(
  {
    name: 'paris',
    draw: (p, s, c) => drawParis(p, c.k, s.begin + c.t, c.ink, c.weight, frame(p, c.k)),
    over: (p, s, c) => drawParisOver(p, c.k, s.begin + c.t, c.ink, c.weight, frame(p, c.k)),
  },
  (slot) => {
    const lane = cobbLane()
    const T = slot.begin
    const cobbPos = (t: number): Pt => {
      const q = laneAt(lane, t - T)
      return [q.x, q.y]
    }
    // Their marks turn as they roll over whatever they rest on (the curve, the bridge overhead), not as the stage would.
    const up = (flights: [number, number][]) => (t: number, p: Pt): Pt | null => (flights.some(([a, b]) => t > a && t < b) ? null : restsOn(p))
    const cobbSpin = spinTable(cobbPos, up([]), T, slot.end)
    const ariSpin = spinTable(ariAt, up([[LEVER_ON - 0.56, LEVER_ON], [LEVER_HOME + 0.12, LEVER_HOME + 0.54], [ARI_HOP_OVER, ARI_LAND], [STRIKE, STRIKE + 2]]), T, STRIKE + 1.2)
    const company: Company[] = [
      {
        who: 'ariadne',
        from: T,
        // Thrown up out of the dream: gone once she is well out of the frame's top.
        to: STRIKE + 0.62,
        at: (t) => {
          const [x, y] = ariAt(t)
          return { x, y, spin: ariSpin(t) }
        },
      },
      {
        who: 'mal',
        from: MAL_FROM,
        to: slot.end,
        at: (t) => {
          const [x, y] = malAt(t)
          // She does not roll: she glides, and her mark is where she looks: at Ariadne (after her as she is thrown),
          // and then, on the eighth, round to him.
          const look = (p: Pt) => Math.atan2(p[1] - y, p[0] - x)
          const a0 = look(ariAt(Math.min(t, STRIKE + 0.35)))
          // Among the black of the projections her wine would sink into them: the light off the stone catches her
          // edge, so she is seen coming out of them.
          const rim = MAL_RIM
          if (t <= MAL_TURN) return { x, y, spin: a0, rim }
          const a1 = look(cobbPos(t))
          let d = a1 - a0
          while (d > Math.PI) d -= 2 * Math.PI
          while (d < -Math.PI) d += 2 * Math.PI
          const u = Math.min(1, (t - MAL_TURN) / 0.2)
          return { x, y, spin: a0 + d * u * u * (3 - 2 * u), rim }
        },
      },
    ]
    const riders = (t: number, hero: ShowBall): ShowBall[] => {
      const me: ShowBall = { ...hero, spin: cobbSpin(t) }
      const out: ShowBall[] = [me]
      reflections(t, unover([hero.x, hero.y])).forEach((r, i) => {
        const [x, y] = over(r.at)
        out.push({
          id: 60 + i,
          x,
          y,
          color: mixHex(COBB, PARIS.mirror, r.fade * 0.82),
          rim: mixHex(PARIS_THEME.ink, PARIS.mirror, r.fade * 0.7),
          scale: r.scale,
          // Mirrored, turn and turn about.
          spin: i % 2 === 0 ? Math.PI - (me.spin ?? 0) : me.spin,
        })
      })
      return out
    }
    return {
      cells: box(-24, -30, 56, 10, 2),
      exit: [COBB_END[0] + 0.5, COBB_END[1]] as Pt,
      lane: { segs: lane.segs, fire: 0 },
      state: { begin: T },
      company,
      riders,
    }
  },
  (slot) => shotsFor(slot.begin, slot.end),
)

/**
 * The camera. The table close, as the cut carried it, drifting; back as the café blows; with her to the lever; the
 * wide (the hinge at the bottom, the whole bridge swinging up and over); then with him up the curve, halfway between
 * him and the curve's middle, rolling as he goes round; onto the bridge; the mirror; the glass; on to the crowd; Mal;
 * and the seam's framing at the cut.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  // On the upturned bridge: a hold given in the bridge's own cells (upright on the screen once the roll is done).
  const holdUp = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: over(at), w: 1 })
  const seam = SEAMS.plane
  const keys: PartShot[] = [
    // In on the two of them at the table while the strings take hold.
    hold(begin + 0.7, 4.15, [0.22, -0.74]),
    hold(D(9) - 0.25, 3.75, [0.28, -0.56]),
    // The café blows: back to see it hang.
    hold(A(9) + 0.8, 6.3, [0.9, -1.45]),
    // With her, along to the lever.
    hold(BLASTS[2] + 1.3, 6.9, [2.9, -1.55]),
    hold(LEVER_HOME + 0.4, 8.2, [6.3, -1.55]),
    // The wide: the hinge at the bottom, the bridge swinging up and over.
    hold(D(11) - 0.5, 19.0, [11.4, -6.1]),
    hold(A(11) + 0.2, 19.0, [11.1, -6.05]),
    // Up the curve with him, halfway between him and its middle: the roll turns the picture as he goes round.
    { t: 44.4, cells: 13.2, hold: C, w: 0.5 },
    { t: 46.3, cells: 12.4, hold: C, w: 0.5 },
    { t: 48.1, cells: 10.8, hold: C, w: 0.45 },
    // On the bridge, upright: the old street hangs over it for a sky; then in to the mirror.
    holdUp(MIRROR_B + 0.15, 11.6, [H + 2.1, Y_S - 3.45]),
    holdUp(MIRROR_A + 0.95, 5.4, [H + 5.6, Y_S - 1.2]),
    holdUp(SHATTER - 0.3, 4.9, [H + 5.45, Y_S - 1.22]),
    // The glass comes down.
    holdUp(LAST_SHARD + 0.2, 5.7, [H + 5.7, Y_S - 1.35]),
    // One breath of it: back, to see the crowd on the bridge, the two of them, and Paris hanging over them for a sky.
    holdUp(STARE, 10.4, [H + 10.4, Y_S - 2.85]),
    holdUp(STEP + 0.05, 10.2, [H + 10.2, Y_S - 2.75]),
    // In on Mal for the blow, and on him for the cut.
    holdUp(STRIKE + 0.25, 6.6, [H + 9.7, Y_S - 1.35]),
    holdUp(MAL_TURN + 0.5, 4.8, [H + 9.1, Y_S - 0.95]),
    // The seam's framing, exactly, at the cut.
    holdUp(end, seam.cells, [H + COBB_END_S + seam.frame[0], Y_S - 0.13 + seam.frame[1]]),
  ]
  return keys.filter((k) => k.t > begin + 0.39 && k.t <= end + 1e-6)
}

