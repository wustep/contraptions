import { laneAt, type Lane, type Pt } from '../../../../../parts'
import { box, part, route, type PartShot, type Way } from '../kit'
import { beat, FF } from '../music'
import { G_EARTH, hop } from '../physics'
import { quake } from '../rock'
import { PLAN, SEAM_SHOT } from '../seams'
import { BLOWS, BURST, BURST_B, BURST_X, DRUM2, DRUM3, DRUMMERS, LANDINGS, SHAFT, THROUGH, landY, onSkin } from './drum-clock'
import { FIRES, drawFire, drawDrum, drawDrummer, drawDust, drawKettle, drawRoom, jolt, light } from './drum-set'

/**
 * The trolls' drum (89.23 → 101.95; phrases 10 and 11, A A, the accelerando, the crescendo to the fortissimo).
 *
 * Under the mine, the trolls' drum chamber, dark, the fires banked. Peer falls down the mine's shaft onto the
 * kettle the trolls keep under it: the first stroke, and it throws him, rising with the theme's run, across to the
 * war-drum. There a drummer climbs up the drum's back and pounds it, a fist down on every beat, and every blow
 * bounces him, as high as the note; a second drummer joins on the next bar; each blow fans the war-fires and the
 * chamber brightens. On phrase 10's strongest accent the two of them throw him across to the great drum, on its
 * trestle over the pit, where three more climb up, one a bar, the last the oldest and biggest. Phrase 11: they
 * pound on the backbeats, bigger swings, war cries, the chamber jumping on every blow and dust shaken down from the
 * vault, and he goes higher each time. The fortissimo's blow bursts the skin under him, and he falls through the
 * great drum and down its pit into the mountain's heart.
 *
 * Every blow is a beat of the measured grid; every landing is a blow (`DRUM_HITS`).
 */

export interface DrumState {
  begin: number
  lane: Lane
}

/** Every strike, show seconds: his landings (the seam's first), the blows while the drummers have him, the burst. */
function hits(): number[] {
  const out = new Set<number>()
  for (const l of LANDINGS) out.add(beat(l.b))
  const first = beat(DRUMMERS[0].up)
  for (const t of BLOWS) if (t >= first - 1e-6 && t <= BURST + 1e-6) out.add(t)
  return [...out].sort((a, b) => a - b)
}
export const DRUM_HITS: number[] = hits()

export const drum = part<DrumState>(
  {
    name: 'drum',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      const L = light(T)
      const peerX = laneAt(s.lane, c.t).x
      const [qx, qy] = quake(T)
      const j = jolt(T)
      p.push()
      p.translate(qx * c.k, qy * c.k)
      drawRoom(p, c, T, L)
      for (const [n, x] of FIRES.entries()) drawFire(p, c, x, T, L, n + 1, j)
      drawDust(p, c, T, L)
      drawKettle(p, c, T, L, 'back')
      drawDrum(p, c, DRUM2, 2, T, L, 'back', j, peerX)
      for (const d of DRUMMERS) if (d.drum === 2) drawDrummer(p, c, d, T, L, peerX, j)
      drawDrum(p, c, DRUM3, 3, T, L, 'back', j, peerX)
      for (const d of DRUMMERS) if (d.drum === 3) drawDrummer(p, c, d, T, L, peerX, j)
      p.pop()
    },
    over: (p, s, c) => {
      const T = s.begin + c.t
      const L = light(T)
      const peerX = laneAt(s.lane, c.t).x
      const [qx, qy] = quake(T)
      const j = jolt(T)
      p.push()
      p.translate(qx * c.k, qy * c.k)
      drawKettle(p, c, T, L, 'front')
      drawDrum(p, c, DRUM2, 2, T, L, 'front', j, peerX)
      drawDrum(p, c, DRUM3, 3, T, L, 'front', j, peerX)
      p.pop()
    },
  },
  (slot) => {
    const at = (b: number) => beat(b) - slot.begin
    const span = slot.end - slot.begin
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
    for (const l of LANDINGS.slice(1)) {
      const to: Pt = [l.x, landY(l)]
      const prev = ways[ways.length - 1]
      ways.push(l.arc ? { at: at(l.b), p: to, arc: l.arc } : hop(prev, to, at(l.b), G_EARTH))
    }
    // Through the burst skin, straight down the great drum and its pit onto the heart: slowed by the skin, then
    // falling under gravity. The ramp's two speeds give exactly the time the slot has left.
    const tB = at(BURST_B)
    const drop = PLAN.drum.exit[1] - onSkin(DRUM3)
    const dur = span - tB
    const v1 = (2 * drop) / dur - THROUGH
    ways.push({ at: span, p: [BURST_X, PLAN.drum.exit[1]], ramp: [THROUGH, v1] })
    const lane: Lane = { segs: route(ways), fire: at(164) }
    const [x0, y0, x1, y1] = PLAN.drum.footprint
    return {
      cells: box(x0, y0, x1, y1).concat(box(SHAFT.x0, 1, SHAFT.x1, SHAFT.bottom)),
      exit: PLAN.drum.exit,
      lane,
      state: { begin: slot.begin, lane },
    }
  },
  (slot): PartShot[] => [
    { t: slot.begin, ...SEAM_SHOT },
    // The kettle's three strokes (the camera settling on them, drifting the way he will be thrown), then its throw.
    { t: beat(161.2), cells: 6.1, off: [0.5, -0.7] },
    { t: beat(162.4), cells: 6.3, off: [0.9, -0.9] },
    // On the war-drum: close, the drummers over him.
    { t: beat(164.6), cells: 6.0, hold: [4.6, -2.0], w: 0.4 },
    // A slow push in as the second drummer comes up, then back out for the throw.
    { t: beat(168.5), cells: 5.5, hold: [5.1, -2.1], w: 0.45 },
    { t: beat(171.5), cells: 6.1, hold: [5.7, -2.2], w: 0.45 },
    // The throw across: the whole chamber.
    { t: beat(174.8), cells: 8.4, hold: [9.0, -2.7], w: 0.6 },
    // The great drum: three drummers, two clubs each.
    { t: beat(177.8), cells: 7.2, hold: [13.3, -3.0], w: 0.5 },
    { t: beat(181), cells: 7.1, hold: [13.8, -3.1], w: 0.55 },
    { t: beat(185), cells: 7.4, hold: [14.1, -3.3], w: 0.55 },
    // The bar he hangs under the vault while they wind up.
    { t: beat(187.5), cells: 8.0, hold: [14.4, -3.8], w: 0.6 },
    // The fortissimo: the burst.
    { t: FF, cells: 7.2, hold: [14.9, -2.5], w: 0.45 },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
