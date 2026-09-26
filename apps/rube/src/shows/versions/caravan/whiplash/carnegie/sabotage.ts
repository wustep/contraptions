import type p5 from 'p5'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { RIG, drawConductor, type ArmPose, type Pose } from '../fletcher'
import { box, carried, part, route, type Companion, type Ctx, type PartShot, type Way } from '../kit'
import { CARNEGIE, SOLO, shout } from '../music'
import type { KitStroke } from '../stub'
import { FLETCHER, HALL } from '../worlds'
import {
  BOUNCES,
  CHART_H,
  CHART_W,
  COUNT,
  DOOR_OPENS,
  FLING,
  FLOORED,
  HITS3,
  LANDED,
  LANDS,
  LEAVE,
  LIGHTS,
  PATH,
  POINT,
  STAND,
  andrewAt,
  chartAt,
  deskRock,
  fletcherAt,
  jimAt,
  poseAt,
  stageLight,
  standSink,
} from './sabotage-motion'
import { drawChart, drawDoorLeaf, drawDoorway, drawVeil } from './sabotage-set'
import { CLOSE, FLETCHER_HOME, FLOOR, KIT_AT, PODIUM, WIDE } from './stage'

/**
 * Carnegie Hall, 242.34 → 270.52: the sabotage. The last chorus (`shout`), the band's held chord, the cut-off.
 *
 * The film: Fletcher knows Andrew testified against him, and at Carnegie he hands him a piece he has no chart for.
 * The band plays; Andrew can't; he walks off into the wings, where his father holds him at the stage door; he turns
 * back, walks on, sits at the kit, and begins alone. Here, on this music:
 *
 * - **The match cut (242.34).** He sits on the snare in the road's darkness; the hall wakes on the chorus's first big
 *   hit (243.30), and the camera draws back to the whole stage and holds there: the arch, the band on its risers,
 *   Fletcher on his podium conducting with a chart in his hand, and the small yellow ball at a silent kit.
 * - **The chart (247.51 → 248.16).** Fletcher cocks his hand and flings the chart across the stage; it turns once in
 *   the air and lands square on Andrew's empty stand, which knocks and sways. His finger stays on Andrew: "you".
 * - **He can't (248.2 → 258.1).** Andrew rolls to the drum's edge to look at it, close, the chart and him together
 *   while Fletcher's finger stays on him. He rolls back to the middle and tries to play: three times, on the
 *   chorus's beats, he lifts off the head as high as a stick comes up for a stroke, stalls at the top through the
 *   beat, and sinks back with nothing struck, the head dead under him, each smaller, a roll toward the chart between
 *   them. The third hangs until the band's first big hit; the band's three hits knock him back toward the far rim;
 *   he looks at the chart, up the stage to Fletcher, back at the chart, and Fletcher's finger lands on 258.11.
 * - **The walk-off (258.5 → 262.03).** He rolls off the drum, drops to the floor on the beat, and goes fast to the
 *   stage door. On the band's last hit (261.13) the door swings open and his father is standing in the light.
 * - **The chord (262.03 → 266.1).** They meet, close, not pressed, and hold while it swells. He backs off, turns.
 * - **Back (266.1 → 270.52).** He runs back and leaps; Jim steps out into the wings to watch, the door closing behind
 *   him. He lands on the snare on 269.62 as Fletcher's open hands cut the band off (not the fist: that is saved for
 *   the end), the stand with the wrong chart sinks away into its trap, and he counts himself in on the snare,
 *   269.92, 270.23, and the solo's first stroke, 270.52.
 *
 * The frame is Carnegie's (`stage.ts`): the ball enters on the snare (-0.5, 0) and leaves there, exit [0, 0]. This
 * part has Fletcher and Jim for its slot; at its end Fletcher is at FLETCHER_HOME in POSES.rest and Jim at
 * JIM_WINGS, at rest. It draws Fletcher's rig while it has him (the hall draws it after).
 */

/** His strokes on the hall's kit: none while the band plays. The landing on the cut-off, the count-in, the first stroke of the solo. */
export const SABOTAGE_KIT: KitStroke[] = [LANDED, ...COUNT, SOLO].map((t) => ({ t, piece: 'snare' as const }))

/**
 * Every strike: the lights coming up, the fling, the chart landing, the band's three hits and Fletcher's finger
 * knocking him back, his drop to the floor, the door flung open, the landing with the cut-off, the count-in and the
 * solo's first stroke.
 */
export const SABOTAGE_HITS: number[] = [LIGHTS, FLING, LANDS, ...HITS3, POINT, FLOORED, DOOR_OPENS, LANDED, ...COUNT, SOLO]

/** The chorus's beat, for anyone timing to it. */
export const SABOTAGE_BEAT = shout

/* ------------------------------------------------------------------ he can't */

/** 0 → 1 with zero speed and acceleration at both ends. */
const S = (u: number): number => {
  const v = clamp(u)
  return v * v * v * (v * (v * 6 - 15) + 10)
}

/**
 * His three tries at the chart, each a stroke that never comes. On the chorus's beat he lifts off the head as far as a
 * stick comes up for a real stroke, stalls at the top through the beat while the band plays it, and sinks back onto
 * the head with nothing struck: no rebound, the head dead under him. Each smaller than the last. The third stalls
 * until the band's first big hit, which drops him.
 */
const TRIES: { at: number; h: number; up: number; stall: number; down: number }[] = [
  { at: shout(20), h: 0.66, up: 0.36, stall: 0.25, down: 0.5 },
  { at: shout(24), h: 0.5, up: 0.34, stall: 0.26, down: 0.48 },
  { at: shout(28), h: 0.34, up: 0.32, stall: HITS3[0] - shout(28), down: 0.42 },
]

/** How high off the snare's head the tries hold him at `T` (0 on the head). */
function tries(T: number): number {
  let h = 0
  for (const { at, h: top, up, stall, down } of TRIES) {
    const s = T - at
    if (s < -up || s > stall + down) continue
    // Up: most of the height early, like a stick coming up, easing into the top just before the beat. The stall:
    // hanging there, sagging a little. Down: slow to leave the top, falling, and dying on the head (no stroke).
    const rise = S(1 - Math.pow(1 - clamp((s + up) / (up - 0.03)), 1.12))
    const sag = 0.05 * S(s / stall)
    const fall = S(Math.pow(clamp((s - stall) / down), 1.4))
    h += top * (rise - sag) * (1 - fall)
  }
  return h
}

/** A move of `d` from `t0` over `dur`, eased at both ends (the motion's own `move`). */
const move = (T: number, t0: number, dur: number, d: number): number => d * S((T - t0) / dur)

/**
 * Where the tries put him across the head, on top of the motion's path: the motion's own drift back to the middle
 * (250.95 and 251.85) taken out, and in its place a roll back from the edge to play (-0.34, the same distance, so
 * nothing is left over when he leaves the drum), and between the tries a quick roll toward the stand and back: a
 * glance at the chart.
 */
function across(T: number): number {
  const undo = move(T, 250.95, 0.6, 0.1) + move(T, 251.85, 1.5, 0.24)
  const back = move(T, 249.82, 0.5, -0.34)
  const look1 = move(T, 251.53, 0.3, 0.17) - move(T, 251.86, 0.27, 0.17)
  const look2 = move(T, 253.24, 0.28, 0.14) - move(T, 253.55, 0.27, 0.14)
  return undo + back + look1 + look2
}

/** After the band's hits: he looks at the chart, up the stage to Fletcher, back at the chart; all of it gone before he leaves the drum. */
function glance(T: number): number {
  return 0.1 * S((T - 256.55) / 0.35) + 0.11 * (S((T - 256.98) / 0.32) - S((T - 257.4) / 0.32)) - 0.1 * S((T - 257.93) / 0.47)
}

/** Andrew at show time `T`: the motion's path, with his tries and his glances on it (all nothing outside the silent stretch). */
function andrew(T: number): Pt {
  const [x, y] = andrewAt(T)
  if (T <= LANDS || T >= LEAVE) return [x, y]
  return [x + across(T) + glance(T), y - tries(T)]
}

/* ------------------------------------------------------------------ the stand */

/**
 * The desk as the house sees it: turned toward the kit and leaning back, so its face is foreshortened and its top
 * leans away from him. A point on the desk (`u` across from its middle, `v` up from its hinge, negative) in the
 * stand's frame at the hinge.
 */
const DESK = { a: 0.46, b: 0.08, c: -0.34, d: 0.93 }
const onDesk = (u: number, v: number): Pt => [DESK.a * u + DESK.c * v, DESK.b * u + DESK.d * v]
const DESK_BOTTOM = STAND.deskY + STAND.deskH / 2
/** Where the chart's middle is when it lies on the desk, in the part's frame (the desk at rest). */
const CHART_REST: Pt = (() => {
  const [x, y] = onDesk(0, -0.05 - CHART_H / 2)
  return [STAND.x + x, DESK_BOTTOM + y]
})()

/** A quad of four desk points, in pixels. */
function deskQuad(p: p5, k: number, q: Pt[]): void {
  p.quad(q[0][0] * k, q[0][1] * k, q[1][0] * k, q[1][1] * k, q[2][0] * k, q[2][1] * k, q[3][0] * k, q[3][1] * k)
}

/** The wrong chart lying on the desk: a pale page, foreshortened with it, four staves ruled across. Nothing that reads as writing. */
function deskChart(p: p5, c: Ctx, light: number): void {
  const { k, ink, weight } = c
  const paper = mixHex(HALL.deep, mixHex(HALL.beam, HALL.floor, 0.3), 0.35 + 0.65 * light)
  const v1 = -0.05
  const v0 = v1 - CHART_H
  const u0 = -CHART_W / 2
  const u1 = CHART_W / 2
  solid(p, ink, weight * 0.6, paper)
  deskQuad(p, k, [onDesk(u0, v0), onDesk(u1, v0), onDesk(u1, v1), onDesk(u0, v1)])
  p.stroke(mixHex(paper, HALL.black, 0.7))
  p.strokeWeight(Math.max(0.6, weight * 0.45))
  for (let staff = 0; staff < 4; staff++) {
    const vs = v0 + 0.08 + staff * 0.105
    for (let line = 0; line < 4; line++) {
      const a = onDesk(u0 + 0.04, vs + line * 0.014)
      const b = onDesk(u1 - 0.04, vs + line * 0.014)
      p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
    }
  }
}

/** A line with an ink edge: a black tube. */
function tube(p: p5, c: Ctx, a: Pt, b: Pt, w: number, fill: string): void {
  const { k, ink, weight } = c
  p.stroke(ink)
  p.strokeWeight(weight * (w + 1.2))
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.stroke(fill)
  p.strokeWeight(weight * w)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/**
 * Andrew's music stand beside the hi-hat: three feet, a post in two tubes, and a desk turned toward the kit, a
 * lit ledge leaning back (never a flat black board face-on, which reads as a screen). Empty until the chart lands
 * on it; it knocks and sways when it does; on the cut-off it sinks into the trap under it.
 */
function drawStand(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const sink = standSink(T)
  if (sink > 3.6) return
  const rock = deskRock(T)
  const light = stageLight(T)
  const metal = mixHex(HALL.black, HALL.deep, 0.5)
  // The desk's face catches the stage light a little; its lip and top edge catch it most.
  const face = mixHex(mixHex(HALL.black, HALL.floor, 0.75), HALL.gilt, 0.16 * light)
  const lip = mixHex(HALL.floor, HALL.beam, 0.2 + 0.3 * light)
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // Below the stage floor is under the stage: whatever has sunk that far is gone.
  ctx.beginPath()
  ctx.rect(-40 * k, -40 * k, 80 * k, (FLOOR + 40) * k)
  ctx.clip()
  p.translate(STAND.x * k, (FLOOR + sink) * k)
  p.rotate(rock.stand)
  const hub = -0.34
  tube(p, c, [0, hub], [-0.32, 0], 1.3, metal)
  tube(p, c, [0, hub], [0.3, 0], 1.3, metal)
  tube(p, c, [0, hub], [0.04, 0], 1.3, metal)
  tube(p, c, [0, 0.02], [0, -1.45], 1.9, metal)
  tube(p, c, [0, -1.45], [0, DESK_BOTTOM - FLOOR], 1.4, metal)
  solid(p, ink, weight * 0.6, metal)
  p.rectMode(p.CORNER)
  p.rect(-0.045 * k, -1.52 * k, 0.09 * k, 0.12 * k, 0.02 * k)
  // The desk, hinged at the top of the post, knocking on its hinge.
  p.translate(0, (DESK_BOTTOM - FLOOR) * k)
  p.rotate(rock.desk)
  const W = STAND.deskW / 2
  const H = STAND.deskH
  solid(p, ink, weight * 0.8, face)
  deskQuad(p, k, [onDesk(-W, -H), onDesk(W, -H), onDesk(W, 0), onDesk(-W, 0)])
  // Its top edge, lit.
  solid(p, ink, weight * 0.5, lip)
  deskQuad(p, k, [onDesk(-W, -H), onDesk(W, -H), onDesk(W, -H + 0.035), onDesk(-W, -H + 0.035)])
  if (chartAt(T).on === 'desk') deskChart(p, c, light)
  // The ledge along the bottom that the page stands on.
  solid(p, ink, weight * 0.7, lip)
  deskQuad(p, k, [onDesk(-W - 0.03, -0.05), onDesk(W + 0.03, -0.05), onDesk(W + 0.03, 0.02), onDesk(-W - 0.03, 0.02)])
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ Fletcher and the throw */

/** Fletcher's column, from the podium to the cup under his ball, leaning with him (as `drawConductor` draws it upright). */
function column(p: p5, c: Ctx, head: Pt, floor: number): void {
  const { k, ink, weight } = c
  const base = FLETCHER_HOME[0]
  const w = 0.09
  const top = head[1] + 0.16
  solid(p, ink, weight * 0.8, FLETCHER)
  p.quad((base - w) * k, floor * k, (base + w) * k, floor * k, (head[0] + w * 0.6) * k, top * k, (head[0] - w * 0.6) * k, top * k)
  p.rect((base - 0.2) * k, (floor - 0.04) * k, 0.4 * k, 0.05 * k, 0.02 * k)
}

/**
 * The chart in the air: from his hand, turning once, onto the desk. It is a page tumbling, so it narrows as it
 * turns edge-on, and comes down turned the desk's way, so it lies on it exactly as the desk draws it.
 */
function drawThrown(p: p5, c: Ctx, T: number, light: number): void {
  const from = chartAt(FLING)
  const u = clamp((T - FLING) / (LANDS - FLING))
  const arc = (9 * (LANDS - FLING) ** 2) / 8
  const x = from.at[0] + (CHART_REST[0] - from.at[0]) * u
  const y = from.at[1] + (CHART_REST[1] - from.at[1]) * u - arc * 4 * u * (1 - u)
  const turn = from.turn + (-2 * Math.PI - from.turn) * easeInOutSine(u)
  // A tumble about its long side (full width in his hand, edge-on mid-flight), coming round to the desk's own turn
  // and lean, so the page that lands is the page the desk then draws.
  const e = easeInOutSine(u)
  const tumble = Math.max(0.12, Math.abs(Math.cos(Math.PI * e)))
  p.push()
  p.translate(x * c.k, y * c.k)
  p.applyMatrix(tumble * (1 + (DESK.a - 1) * e), DESK.b * e, DESK.c * e, 1 + (DESK.d - 1) * e, 0, 0)
  drawChart(p, c, [0, 0], turn, light)
  p.pop()
}

/** The finger that lands with the chart stays on him while he goes to look at it, and lets go as he rolls back to try. */
const HOLD_POINT = { from: 248.6, to: 250.25, release: 0.55 }

/** An arm's angles eased from `a` to `b`, the shoulder the short way round (as the motion's own blend). */
function mixArm(a: ArmPose, b: ArmPose, u: number): ArmPose {
  let d = b.up - a.up
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return { up: a.up + d * u, bend: a.bend + (b.bend - a.bend) * u, wrist: a.wrist + (b.wrist - a.wrist) * u, hand: u < 0.5 ? a.hand : b.hand }
}

/** Fletcher's hands as the motion has them, but with the finger held on Andrew (where he is drawn) through `HOLD_POINT`. */
function pose(T: number): Pose {
  const base = poseAt(T)
  if (T < HOLD_POINT.from || T > HOLD_POINT.to + HOLD_POINT.release) return base
  const [hx, hy] = fletcherAt(T)
  const [ax, ay] = andrew(T)
  const point: ArmPose = { up: Math.atan2(ay - (hy + RIG.drop), ax - (hx - RIG.shoulder)), bend: 0.05, wrist: 0, hand: 'point' }
  if (T <= HOLD_POINT.to) return { left: base.left, right: point }
  return { left: base.left, right: mixArm(point, base.right, easeInOutSine((T - HOLD_POINT.to) / HOLD_POINT.release)) }
}

/** Fletcher on his podium, and the chart while it is in his hand or in the air. */
function drawFletcher(p: p5, c: Ctx, T: number): void {
  const head = fletcherAt(T)
  const light = stageLight(T)
  column(p, c, head, FLOOR - PODIUM.h)
  const chart = chartAt(T)
  if (chart.on === 'hand') drawChart(p, c, chart.at, chart.turn, light)
  drawConductor(p, c, head, pose(T), { light })
  if (chart.on === 'air') drawThrown(p, c, T, light)
}

interface SabotageState {
  begin: number
}

/** Andrew's lane, in slot seconds: sampled from `andrew` stretch by stretch, then the count-in's bounces. */
function lane(begin: number): Seg[] {
  const segs: Seg[] = []
  for (const { from, to, rate: r } of PATH) {
    // The silent stretch finely too: the tries lift him quickly.
    const rate = from === LANDS ? Math.max(r, 120) : r
    const n = rate > 0 ? Math.max(1, Math.ceil((to - from) * rate)) : 1
    segs.push(...carried(andrew, from, to, n))
  }
  const hops: Way[] = [{ at: LANDED - begin, p: [...KIT_AT] as Pt }]
  for (const b of BOUNCES) hops.push({ at: b.at - begin, p: [...KIT_AT] as Pt, arc: b.arc })
  segs.push(...route(hops))
  return segs
}

/** A person's place as the stage wants it, from a function of show time. */
const person = (fn: (t: number) => Pt) => (t: number): Companion => {
  const [x, y] = fn(t)
  return { x, y }
}

export const sabotage = part<SabotageState>(
  {
    name: 'sabotage',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      if (T < CARNEGIE - 0.001 || T > SOLO + 0.001) return
      drawDoorway(p, c, T)
      drawStand(p, c, T)
      if (T < SOLO) drawFletcher(p, c, T)
      drawVeil(p, c, T)
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      // The door's leaf is over the balls while Jim waits behind it; once it has shut behind him the hall's own door is the same.
      if (T < CARNEGIE - 0.001 || T > 269.4) return
      drawDoorLeaf(p, c, T)
    },
  },
  (slot) => ({
    // From the stage door (house left) to Fletcher's podium, from over the stand's desk to the floor.
    cells: box(-11, -4, 7, 3),
    exit: [0, 0] as Pt,
    lane: { segs: lane(slot.begin), fire: LIGHTS - slot.begin },
    state: { begin: slot.begin },
    company: [
      { who: 'fletcher' as const, from: slot.begin, to: slot.end, at: person(fletcherAt) },
      { who: 'jim' as const, from: slot.begin, to: slot.end, at: person(jimAt) },
    ],
  }),
  (slot): PartShot[] => [
    // The match cut: the road's frame, held on him in the dark until the lights come up.
    { t: slot.begin, cells: 3.5, hold: [...KIT_AT] as Pt, w: 1 },
    { t: LIGHTS, cells: 3.5, hold: [...KIT_AT] as Pt, w: 1 },
    // The reveal: out from him on the lights, slowing long into the whole hall (the arch, the band, the house), held
    // there while the chorus plays, drifting; then one long push through the throw, Fletcher to the kit, arriving
    // close on the wrong chart and him together, the finger that sent it still on him.
    { t: 245.4, cells: 18.4, hold: [4.4, -2.7], w: 1 },
    { t: 246.7, cells: WIDE.cells + 0.1, hold: [WIDE.hold[0], WIDE.hold[1] - 0.05], w: 1 },
    { t: LANDS, cells: 7.4, hold: [2.1, -1.2], w: 1 },
    { t: 249.7, cells: 3.2, hold: [1.0, -0.72], w: 1 },
    { t: 250.3, cells: 3.15, hold: [0.9, -0.7], w: 1 },
    // His first try close, the chart beside him; then a slow widening through the other two until Fletcher is in the
    // frame too, keeping the band going on the other side of the chart; on out into the band's three hits.
    { t: 251.2, cells: 3.55, hold: [0.35, -0.62], w: 1 },
    { t: 253.9, cells: 4.9, hold: [1.75, -0.95], w: 1 },
    // Drawing back over two seconds into the band's three hits: the band playing past the small still ball.
    { t: 255.9, cells: 8.4, hold: [3.1, -1.5], w: 1 },
    // The two of them as he looks from the chart to Fletcher, and for Fletcher's finger, easing toward the wings.
    { t: 257.95, cells: 6.4, hold: [2.1, -0.95], w: 1 },
    { t: 258.8, cells: 6.6, hold: [0.5, -0.1], w: 1 },
    // Across the stage with him to the door, wide enough to see where he is going, and in on the two of them in its light.
    { t: 260.6, cells: 6.3, hold: [-4.9, 0.55], w: 1 },
    { t: 262.03, cells: 3.6, hold: [-8.95, 1.15], w: 1 },
    { t: 265.7, cells: 3.0, hold: [-8.95, 1.3], w: 1 },
    { t: 266.1, cells: 3.05, hold: [-8.85, 1.28], w: 1 },
    // Back across with him to the kit, settling on it wide enough for the leap and Fletcher's cut; in to the solo.
    { t: 267.4, cells: 6.0, hold: [-4.6, 0.55], w: 1 },
    { t: 268.75, cells: 6.6, hold: [0.3, 0.05], w: 1 },
    { t: LANDED, cells: 6.3, hold: [0.15, -0.3], w: 1 },
    { t: slot.end, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
  ],
)
