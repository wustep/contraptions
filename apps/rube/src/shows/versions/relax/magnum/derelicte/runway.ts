import { mixHex, type Pt } from '../../../../../parts'
import { DERELICTE } from '../worlds'
import { box, frame, part, scenery, type Company, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { DEREK_MEET } from './geo'
import {
  B0,
  B1,
  BAND,
  BANKS_ON,
  BUMP,
  CHEER_K,
  derekAt,
  DEREK_LANE,
  DEREK_LOOK,
  derekSteps,
  FOLLOW_ON,
  HANSEL_LOOK,
  HOUSE_DOWN,
  LANDS,
  MAGNUM,
  mugatuAt,
  pmAt,
  RISES,
  STICK,
  STOP,
  STRUGGLE,
  FLICKER,
  DARK,
  WORKS_ON,
  THROW,
  TRIGGER,
} from './runway-clock'
import { drawDarkness, drawHeap, drawLooks, drawStar } from './runway-over'
import { drawCrowd, PRESS_HITS } from './set-crowd'
import { drawFloor, drawHall, drawLight } from './set-hall'
import { drawCanopy, drawChair, drawCurtain, drawCurtainLeak, drawFence, drawPerch, drawRunway, drawSteps } from './set-stage'
import { TOWER_COMPANY } from './tower'
import { bar, half, beat } from '../music'

/**
 * Derelicte (116.820 → 202.095), the runway builder's: Mugatu's show in a raw warehouse, and the song he has played
 * at it.
 *
 * The needle drops (the tower's) and the house goes down; Derek alone in the dark of the wings, Mugatu on his gantry
 * over him; the runway's banks come up from its head to its end, a bank a bar. On the title (beat 233) the song has
 * him: from here to the plug he moves as he was taught, a stiff step a beat, off dead on the beat and stopped dead on
 * its off-beat. The curtain of bags hoists in three jerks with his first three steps and he marches out into the
 * follow spot; "don't do it", a half step back and a beat held; on. On the wash the march becomes a stride, down the
 * whole runway past the press (they think it is the show); the model's stop at the end, and he does not turn back:
 * down the steps, a tread every other beat, and across to the Prime Minister a step a bar, while Hansel climbs.
 *
 * The rock: a swing a beat, bigger and bigger; Mugatu glides down his runway to watch the kill; the lunge (350), and
 * the plug (182.817) stops it and the band dead. The silence plays slow: Mugatu comes on to the runway's edge, draws a
 * star and throws it (184.936); it spins at them. Magnum (186.474): the look, the star stopped dead a cell and a half
 * short of him, the world held for half a second. The band: the star turns, hangs, drops, and sticks in the boards
 * (187.525). A flash finds Mugatu; he backs away up his runway into the canopy's upright (188.581), its hitch slips
 * and the heap of bags he hung over the pose comes down on him (189.615): a lump of bin bags, Derelicte. The press
 * turn on it; the Prime Minister rises and cheers; Hansel comes down (the tower's) and to Derek's side; a look for the
 * press, and a flash takes us to the Center.
 */

export const DERELICTE_CELLS = box(-10, -13, 36, 5, 2)

/** The set's ink: the theme's bone, dimmed, so the warehouse's things are masses in the dark and not a drawing in chalk. */
const setInk = (ink: string, weight: number) => ({ ink: mixHex(ink, DERELICTE.roof, 0.58), weight: weight * 0.85 })

export const derelicteSet = scenery<null>({
  name: 'derelicte-set',
  draw: (p, _s, c) => {
    const t = c.t
    const f = frame(p, c.k)
    const ink = setInk(c.ink, c.weight)
    drawHall(p, c.k, f, t, ink)
    drawFloor(p, c.k, f)
    drawPerch(p, c.k, f, t, ink)
    drawCanopy(p, c.k, f, t, ink)
    drawFence(p, c.k, f, t, ink)
    drawCurtainLeak(p, c.k, t)
    drawRunway(p, c.k, f, t, ink)
    drawCurtain(p, c.k, f, t, ink)
    drawSteps(p, c.k, f, t, ink)
    drawChair(p, c.k, f, ink)
    drawLight(p, c.k, f, t)
  },
  over: (p, _s, c) => {
    drawCrowd(p, c.k, frame(p, c.k), c.t)
  },
})

/* ------------------------------------------------------------------ the part */

interface RunwayState {
  begin: number
}

const MUGATU_SPAN: Company = {
  who: 'mugatu',
  from: B0,
  to: B1,
  at: (t) => {
    const [x, y] = mugatuAt(t)
    return { x, y, spin: -0.4 }
  },
}
const PM_SPAN: Company = {
  who: 'pm',
  from: B0,
  to: B1,
  at: (t) => {
    const [x, y] = pmAt(t)
    return { x, y, spin: Math.PI - 0.25 }
  },
}

export const runway = part<RunwayState>(
  {
    name: 'runway',
    // Over the whole set and the tower, under the balls: the dark the plug leaves, the fires in it, the house's cold.
    draw: (p, s, c) => drawDarkness(p, c.k, frame(p, c.k), c.t + s.begin),
    over: (p, s, c) => {
      const t = c.t + s.begin
      const f = frame(p, c.k)
      drawHeap(p, c.k, f, t, setInk(c.ink, c.weight))
      drawStar(p, c.k, f, t, { ink: c.ink, weight: c.weight })
      drawLooks(p, c.k, t)
    },
  },
  (slot) => ({
    cells: box(-10, -13, 36, 5, 2),
    exit: [DEREK_MEET[0] + 0.5, DEREK_MEET[1]] as Pt,
    lane: { segs: DEREK_LANE.segs, fire: DEREK_LANE.fire },
    state: { begin: slot.begin },
    company: [MUGATU_SPAN, PM_SPAN, ...TOWER_COMPANY],
  }),
  (slot) => shotsFor(slot.begin, slot.end),
)

/* ------------------------------------------------------------------ the camera */

/**
 * In the wings on the cut (3.6), craning up and back to find Mugatu on his gantry over him as the first bank comes
 * up beyond the curtain; in with him on the title and out through the curtain; the march followed; on the wash wider,
 * Mugatu at the top of the frame behind him; then the great wide down the whole runway: the press pit, its end, the
 * steps, the front row and the Prime Minister, the tower and Hansel at its foot (the geography). In with him past the
 * press to the end; down the steps; up and out to hold the tower as Hansel climbs; the rock in that wide, Mugatu
 * gliding in along the runway; the plug; the silence as a slow push to the throw and the star's whole flight; a cut
 * close on the look; out to Mugatu and the heap; across to the tower as Hansel comes down; in to the two of them.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: at, w: 1, cut })
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const d = (t: number) => derekAt(t)
  const seam = SEAMS.center
  const e = d(end)
  void begin
  return [
    // The wings.
    hold(117.3, 3.7, [-0.1, -0.64]),
    hold(120.8, 5.5, [-0.72, -1.52]),
    // Triggered: in with him to the curtain, and close as he comes out through it ("don't do it": the hitch).
    hold(122.6, 5.0, [0.3, -1.1]),
    hold(124.3, 3.5, [1.0, -0.55]),
    hold(125.7, 3.55, [1.12, -0.55]),
    // The march: drawing back to show him the runway ahead, Mugatu on his perch behind.
    hold(131.4, 7.0, [4.7, -1.65]),
    // The wash: the stride.
    hold(135.2, 8.0, [4.3, -2.0]),
    // The geography, in time for Hansel to see him (139.169): the whole runway, the front row, the tower.
    hold(139.1, 14.4, [17.9, -3.2]),
    hold(142.2, 14.1, [18.3, -3.1]),
    // In with him past the press.
    follow(145.9, 7.4, [1.6, -1.25]),
    follow(150.2, 6.8, [1.5, -1.05]),
    follow(152.1, 6.6, [1.5, -1.0]),
    // The end, the Prime Minister beyond.
    hold(154.7, 6.2, [21.3, -0.3]),
    hold(156.6, 6.3, [21.5, -0.1]),
    // Down the steps with Hansel on the sub in the frame; out to the tower for its kick (160.503).
    hold(159.9, 8.5, [23.4, -0.6]),
    hold(162.2, 10.6, [24.9, -1.45]),
    hold(bar(79) - 0.02, 11.0, [24.85, -1.6]),
    // Cut in on his step (316): closing on the Prime Minister, a step a bar.
    hold(bar(79), 4.4, [22.7, 0.95], true),
    hold(bar(81) - 0.02, 4.1, [22.95, 1.02]),
    // Cut out on the next (324): the rail gives under Hansel, and he falls the whole shaft.
    hold(bar(81), 11.2, [24.8, -1.7], true),
    hold(bar(83) - 0.02, 10.4, [24.3, -1.45]),
    // The rock, cut a bar at a time: Derek and the Prime Minister; the tower; Hansel's last rails and his dart into
    // the booth; closer on the swings; all of it for the last bar; the booth on the rip; Derek frozen in the dark.
    hold(bar(83), 4.3, [23.05, 1.0], true),
    hold(bar(84) - 0.02, 4.1, [23.0, 1.05]),
    hold(bar(84), 10.0, [25.4, -1.3], true),
    hold(bar(85) - 0.02, 9.8, [25.35, -1.25]),
    hold(bar(85), 5.0, [27.6, -5.2], true),
    hold(bar(86) - 0.02, 4.9, [27.95, -5.55]),
    hold(bar(86), 3.8, [22.75, 1.2], true),
    hold(bar(87) - 0.02, 3.6, [22.75, 1.25]),
    hold(bar(87), 12.0, [23.9, -1.84], true),
    hold(STOP - 0.02, 11.9, [23.8, -1.82]),
    hold(STOP, 4.3, [28.35, -6.5], true),
    hold(DARK - 0.02, 4.25, [28.4, -6.5]),
    hold(DARK, 5.0, [22.1, 1.05], true),
    // The silence: to the two-shot, Mugatu at his runway's end over Derek, for the draw and the throw.
    hold(184.45, 5.0, [20.95, 0.95]),
    hold(186.25, 4.85, [21.0, 0.98]),
    // Magnum.
    hold(MAGNUM, 3.0, [22.25, 1.6], true),
    hold(BAND, 3.05, [22.2, 1.6]),
    // The star's drop; then out to find Mugatu backing away, and the heap.
    hold(187.5, 3.3, [22.1, 1.5]),
    hold(189.6, 7.1, [20.8, -0.3]),
    hold(191.0, 7.4, [21.2, -0.36]),
    // Hansel's way down in the bucket; the Prime Minister up.
    hold(192.3, 9.6, [23.4, -1.15]),
    hold(194.2, 8.4, [23.4, -0.7]),
    hold(196.2, 6.6, [23.0, 0.25]),
    // The two of them, at the seam's framing on the cut.
    hold(199.5, 4.3, [22.75, 1.24]),
    hold(end, seam.cells, [e[0] + seam.frame[0], e[1] + seam.frame[1]]),
  ]
}

/* ------------------------------------------------------------------ the strikes */

export const RUNWAY_HITS: number[] = [
  ...new Set(
    [
      HOUSE_DOWN,
      ...BANKS_ON,
      TRIGGER,
      FOLLOW_ON,
      ...derekSteps(),
      STOP,
      ...FLICKER,
      DARK,
      ...WORKS_ON,
      THROW,
      MAGNUM,
      BAND,
      STICK,
      BUMP,
      LANDS,
      ...STRUGGLE,
      RISES,
      beat(369),
      ...CHEER_K.flatMap((k) => [beat(k), half(k)]),
      DEREK_LOOK,
      HANSEL_LOOK,
      ...PRESS_HITS,
    ].map((t) => Math.round(t * 1e6) / 1e6),
  ),
].sort((a, b) => a - b)
