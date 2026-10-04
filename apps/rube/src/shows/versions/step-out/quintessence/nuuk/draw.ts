import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { blob, ctxOf, ellipse, flash, glint, glow, line, path, rect, rgba, ring, shape, vgrad, type Pen } from '../dream/pen'
import {
  BELL,
  CEIL,
  COUNTER,
  COUNTER_TOP,
  DOOR_IN,
  DOOR_X,
  EXIT_X,
  FLOOR,
  GLASS,
  HEAD,
  HINGE,
  MIC_X,
  OUT,
  PLANK,
  SLAM,
  SPOT,
  SPOT_OFF,
  STAGE,
  STAGE_TOP,
  STOOL_X,
  STRUMS,
  TAPS,
  THUMB,
  WALL_OUT,
  cherylAt,
  CHERYL_AT,
} from './geo'

/**
 * The bar at Nuuk: dark wood in low light, the grey of the harbour at both doors and in the window, the pilot a hard
 * dark shape at the counter. The only warmth is the lamps', until the little stage's spotlight comes on: a warmer
 * light than anything else in the place, for a woman who is not there.
 */

const C = {
  wall: '#2B1F19',
  plank: '#33251E',
  seam: '#1D1511',
  floor: '#4A3427',
  floorSeam: '#33241B',
  beam: '#1A120E',
  counter: '#3E2B21',
  counterTop: '#6A4A33',
  counterEdge: '#8A6444',
  shelf: '#241914',
  bottle: '#5E6F5A',
  bottle2: '#7A5A2E',
  amber: '#C98B4B',
  lamp: '#F2C879',
  grey: '#8E9BA1',
  greyDark: '#5C6A72',
  sea: '#6F7E84',
  seaDark: '#4E5C63',
  sky: '#AEB8BB',
  shore: '#46525A',
  haze: '#9AA6AA',
  h1: '#5E7F9A',
  h2: '#C9A64A',
  h3: '#6E8F6A',
  h4: '#A8B4B6',
  pilot: '#0F0A08',
  rim: '#8E9BA1',
  ring: '#F5D27A',
  stage: '#3A2820',
  stageTop: '#5E4330',
  iron: '#16100D',
  spot: '#FFDFA0',
  guitar: '#B07A3E',
  guitarDark: '#2A1A10',
  quay: '#6C6A66',
  quayDark: '#4A4946',
  pile: '#33393C',
  seaDeep: '#3E4A50',
  floorCut: '#2A1E17',
  bollard: '#2A2A2A',
  door: '#4E3626',
  doorDark: '#2E2018',
}

/* ------------------------------------------------------------------ the room */

export function drawRoom(pen: Pen, t: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  // Outside both doors: the harbour's grey day, and the water.
  vgrad(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, [
    [0, C.sky, 1],
    [0.6, C.grey, 1],
    [1, C.greyDark, 1],
  ])
  outside(pen, -12, DOOR_IN[0], t)
  outside(pen, WALL_OUT[1], EXIT_X + 12, t)
  // The back wall: vertical boards.
  const x0 = DOOR_IN[1]
  const x1 = WALL_OUT[0]
  rect(pen, x0, CEIL, x1, FLOOR, C.wall)
  for (let x = x0 + 0.05; x < x1; x += 0.34) {
    rect(pen, x, CEIL, x + 0.03, FLOOR, C.seam)
    if (hash(Math.round(x * 10), 1) > 0.6) rect(pen, x + 0.03, CEIL, x + 0.31, FLOOR, C.plank)
  }
  // The window on the water, behind the stage.
  const wx0 = 2.95
  const wx1 = 4.55
  const wy0 = -2.75
  const wy1 = -1.55
  rect(pen, wx0 - 0.08, wy0 - 0.08, wx1 + 0.08, wy1 + 0.1, C.beam)
  vgrad(pen, wx0, wy0, wx1, wy1, [
    [0, C.sky, 1],
    [0.5, C.grey, 1],
    [0.52, C.sea, 1],
    [1, C.seaDark, 1],
  ])
  // The far shore, low, and a berg.
  shape(pen, [[wx0, wy0 + 0.62], [wx0 + 0.4, wy0 + 0.5], [wx0 + 0.9, wy0 + 0.56], [wx1, wy0 + 0.48], [wx1, wy0 + 0.62]], C.shore)
  shape(pen, [[wx0 + 1.0, wy0 + 0.66], [wx0 + 1.12, wy0 + 0.55], [wx0 + 1.3, wy0 + 0.57], [wx0 + 1.38, wy0 + 0.66]], C.sky)
  for (let i = 0; i < 3; i++) {
    const y = wy0 + 0.75 + i * 0.13
    const dx = Math.sin(t * 0.7 + i) * 0.08
    line(pen, [wx0 + 0.15 + dx + i * 0.2, y], [wx0 + 0.6 + dx + i * 0.2, y], C.grey, 0.5)
  }
  rect(pen, (wx0 + wx1) / 2 - 0.03, wy0, (wx0 + wx1) / 2 + 0.03, wy1, C.beam)
  rect(pen, wx0, (wy0 + wy1) / 2 - 0.03, wx1, (wy0 + wy1) / 2 + 0.03, C.beam)
  // The cold daylight off the window on the boards.
  glow(pen, [(wx0 + wx1) / 2, wy1 + 0.4], 1.6, C.grey, 0.12)
  // The ceiling and its beams.
  rect(pen, x0, CEIL - 3, x1, CEIL, C.beam)
  for (let x = x0 + 0.4; x < x1; x += 1.3) rect(pen, x, CEIL, x + 0.18, CEIL + 0.22, C.beam)
  // The floor.
  rect(pen, DOOR_IN[0] - 0.05, FLOOR, x1 + 0.3, FLOOR + 3, C.floorCut)
  rect(pen, DOOR_IN[0] - 0.05, FLOOR, x1 + 0.3, FLOOR + 0.12, C.floor)
  for (let x = DOOR_IN[0] + 0.4; x < x1; x += 1.1) rect(pen, x, FLOOR + 0.12, x + 0.12, FLOOR + 3, C.beam)
  line(pen, [DOOR_IN[0], FLOOR], [x1 + 0.3, FLOOR], C.counterEdge, 0.6)
  // The walls either side, cut, with their doors.
  wallWithDoor(pen, DOOR_IN[0], DOOR_IN[1])
  wallWithDoor(pen, WALL_OUT[0], WALL_OUT[1])
  // The lamps over the counter: low, amber.
  for (const lx of [1.1, 2.6]) {
    line(pen, [lx, CEIL], [lx, -2.35], C.iron, 0.7)
    shape(pen, [[lx - 0.17, -2.15], [lx + 0.17, -2.15], [lx + 0.08, -2.35], [lx - 0.08, -2.35]], C.counter)
    glow(pen, [lx, -2.05], 1.5, C.lamp, 0.26)
    rect(pen, lx - 0.13, -2.17, lx + 0.13, -2.14, C.lamp)
  }
}

function outside(pen: Pen, x0: number, x1: number, t: number): void {
  // Across the water: the mountain over the town, in the haze, and the town's painted houses along the shore.
  for (let m = Math.floor(x0 / 7) * 7; m < x1; m += 7) {
    shape(pen, [[m - 1, -1.0], [m + 1.2, -2.3], [m + 2.0, -2.0], [m + 2.9, -3.1], [m + 3.6, -2.6], [m + 5.2, -1.6], [m + 6.5, -1.0]], C.haze)
  }
  rect(pen, x0, -1.12, x1, -0.98, C.shore)
  const HOUSES = [C.h1, C.h2, C.h3, C.h4]
  for (let i = Math.floor(x0 / 0.55); i * 0.55 < x1; i++) {
    if (hash(i, 31) > 0.55) continue
    const hx = i * 0.55 + hash(i, 32) * 0.2
    const hy = -1.1 - 0.12 * hash(i, 33)
    rect(pen, hx, hy - 0.11, hx + 0.16, hy, HOUSES[Math.floor(hash(i, 34) * 4)])
    shape(pen, [[hx - 0.02, hy - 0.11], [hx + 0.08, hy - 0.17], [hx + 0.18, hy - 0.11]], C.shore)
  }
  // The harbour: water below the quay's edge.
  rect(pen, x0, -1.0, x1, FLOOR + 3, C.sea)
  rect(pen, x0, -1.0, x1, -0.97, C.grey)
  for (let i = 0; i < 5; i++) {
    const y = -0.8 + i * 0.18
    const dx = Math.sin(t * 0.6 + i * 1.3) * 0.2
    for (let x = Math.ceil(x0); x < x1; x += 1.7) line(pen, [x + dx + i * 0.3, y], [x + dx + i * 0.3 + 0.5, y], C.grey, 0.5)
  }
  // The quay: a deck of planks on piles over the water, level with the bar's floor.
  vgrad(pen, x0, FLOOR + 0.14, x1, FLOOR + 3, [
    [0, C.pile, 1],
    [0.25, C.seaDark, 1],
    [1, C.seaDeep, 1],
  ])
  for (let x = Math.ceil(x0 / 1.8) * 1.8; x < x1; x += 1.8) rect(pen, x - 0.04, FLOOR + 0.1, x + 0.04, FLOOR + 1.2, C.pile)
  rect(pen, x0, FLOOR, x1, FLOOR + 0.14, C.quay)
  rect(pen, x0, FLOOR + 0.1, x1, FLOOR + 0.14, C.quayDark)
  for (let x = Math.ceil(x0 * 2) / 2; x < x1; x += 0.5) line(pen, [x, FLOOR], [x, FLOOR + 0.1], C.quayDark, 0.5)
}

function wallWithDoor(pen: Pen, x0: number, x1: number): void {
  rect(pen, x0, CEIL - 3, x1, HEAD, C.beam)
  rect(pen, x0 - 0.04, HEAD - 0.06, x1 + 0.04, HEAD, C.counterTop)
  rect(pen, x0, FLOOR - 0.03, x1, FLOOR + 0.02, C.counterEdge)
}

/** The harbour door, open against its stop, and its bell, which rings as he comes in. */
export function drawDoorIn(pen: Pen, t: number): void {
  const x = DOOR_IN[1]
  // The leaf, swung in and flat against the wall: seen face on.
  const settle = 0.04 * ring(t - BELL, 2.5, 0.4)
  const w = 0.85 * (1 - settle)
  shape(pen, [[x, HEAD + 0.05], [x + w, HEAD + 0.12], [x + w, FLOOR - 0.06], [x, FLOOR]], C.door, 0.5, C.doorDark)
  rect(pen, x + w * 0.2, HEAD + 0.35, x + w * 0.8, -1.2, C.sky)
  rect(pen, x + w * 0.2, -0.9, x + w * 0.8, -0.2, C.doorDark)
  // The bell on its bracket.
  const b: Pt = [DOOR_IN[1] + 0.1, HEAD + 0.02]
  const swing = 0.5 * ring(t - BELL, 3, 0.5)
  path(pen, [[DOOR_IN[1] - 0.05, HEAD - 0.05], [b[0], HEAD - 0.05], [b[0], b[1] + 0.02]], C.iron, 1)
  const bx = b[0] + Math.sin(swing) * 0.12
  const by = b[1] + 0.12
  blob(pen, [[bx, by - 0.08], [bx + 0.05, by - 0.05], [bx + 0.065, by + 0.04], [bx + 0.09, by + 0.08], [bx - 0.09, by + 0.08], [bx - 0.065, by + 0.04], [bx - 0.05, by - 0.05]], C.amber)
  line(pen, [b[0], b[1] + 0.02], [bx, by - 0.07], C.iron, 0.8)
  glint(pen, [bx, by + 0.02], 0.08, C.lamp, 0.8 * flash(t - BELL, 0.3))
}

/** The back door: ajar, banged open as he runs out, slammed shut behind him. Shut it is seen edge on; open, face on. */
export function drawDoorOut(pen: Pen, t: number): number {
  const x = WALL_OUT[1]
  let open = 0.4
  if (t >= OUT) open = 1 - 0.06 * Math.abs(ring(t - OUT, 1.2, 0.3))
  if (t >= SLAM - 0.35) open = Math.max(0, (SLAM - t) / 0.35)
  if (t >= SLAM) open = 0.03 * Math.abs(ring(t - SLAM, 4, 0.12))
  const w = 0.9 * Math.sin((open * Math.PI) / 2)
  // The daylight through it.
  if (w > 0.05) {
    shape(pen, [[x, HEAD + 0.05], [x + w, HEAD + 0.12], [x + w, FLOOR - 0.06], [x, FLOOR]], C.door, 0.5, C.doorDark)
    rect(pen, x + w * 0.2, HEAD + 0.35, x + w * 0.8, -1.2, C.doorDark)
  } else rect(pen, WALL_OUT[0] + 0.08, HEAD, WALL_OUT[0] + 0.18, FLOOR, C.door)
  return w
}

/* ------------------------------------------------------------------ counter, pilot, stage */

export function drawCounter(pen: Pen, t: number): void {
  const [x0, x1] = COUNTER
  // The back bar: a shelf of bottles against the boards.
  rect(pen, x0 + 0.1, -2.05, x1 - 0.1, -1.98, C.shelf)
  for (let i = 0; i < 9; i++) {
    const x = x0 + 0.25 + i * 0.22
    const h = 0.3 + 0.12 * hash(i, 4)
    const col = hash(i, 5) > 0.5 ? C.bottle : C.bottle2
    rect(pen, x - 0.05, -2.05 - h, x + 0.05, -2.05, col)
    rect(pen, x - 0.02, -2.05 - h - 0.1, x + 0.02, -2.05 - h, col)
  }
  glow(pen, [(x0 + x1) / 2, -2.2], 1.4, C.amber, 0.12)
  // The counter itself.
  rect(pen, x0, COUNTER_TOP, x1, FLOOR, C.counter)
  for (let x = x0 + 0.3; x < x1; x += 0.5) rect(pen, x, COUNTER_TOP + 0.15, x + 0.03, FLOOR - 0.1, C.seam)
  rect(pen, x0 - 0.08, COUNTER_TOP - 0.06, x1 + 0.08, COUNTER_TOP + 0.04, C.counterTop)
  line(pen, [x0 - 0.08, COUNTER_TOP - 0.06], [x1 + 0.08, COUNTER_TOP - 0.06], C.counterEdge, 0.6)
  rect(pen, x0, FLOOR - 0.12, x1, FLOOR, C.seam)
  void t
}

/**
 * The pilot: a big man hunched over his glass on a stool, a hard dark shape with a cold rim of the window's light.
 * His right hand on the counter, its thumb out; on the thumb the ring that catches the light on THUMB.
 */
export function drawPilot(pen: Pen, t: number): void {
  const { p, k } = pen
  p.push()
  p.translate(STOOL_X * k, FLOOR * k)
  p.scale(PILOT_SCALE)
  p.translate(-STOOL_X * k, -FLOOR * k)
  pilot(pen, t)
  p.pop()
}
const PILOT_SCALE = 0.86

/** The counter's top and its far end in the pilot's own (unscaled) space, so what he puts on it lands on it. */
const TOP_L = FLOOR + (COUNTER_TOP - FLOOR) / PILOT_SCALE
const END_L = STOOL_X + (COUNTER[1] - 0.12 - STOOL_X) / PILOT_SCALE

function pilot(pen: Pen, t: number): void {
  const sx = STOOL_X
  // The stool.
  line(pen, [sx - 0.18, -0.72], [sx - 0.25, FLOOR], C.iron, 1.4)
  line(pen, [sx + 0.18, -0.72], [sx + 0.25, FLOOR], C.iron, 1.4)
  rect(pen, sx - 0.25, -0.78, sx + 0.25, -0.7, C.counterTop)
  // He breathes, and sways a little: drunk.
  const sway = 0.03 * Math.sin(t * 1.3)
  const hip: Pt = [sx - 0.05, -0.85]
  const sh: Pt = [sx + 0.32 + sway, -1.9]
  const head: Pt = [sh[0] + 0.24, sh[1] - 0.12 + 0.02 * Math.sin(t * 1.3 + 1)]
  // Legs: thigh to the knee, shin down to the stool's rail.
  const knee: Pt = [sx + 0.48, -0.8]
  shape(pen, [[hip[0] - 0.15, hip[1] - 0.12], [knee[0] + 0.08, knee[1] - 0.14], [knee[0] + 0.1, knee[1] + 0.1], [hip[0] - 0.1, hip[1] + 0.14]], C.pilot)
  shape(pen, [[knee[0] - 0.05, knee[1]], [knee[0] + 0.12, knee[1]], [knee[0] + 0.06, -0.25], [knee[0] + 0.2, -0.22], [knee[0] + 0.2, -0.12], [knee[0] - 0.08, -0.15]], C.pilot)
  // The body: a broad hunched back.
  blob(pen, [[hip[0] - 0.22, hip[1] + 0.1], [hip[0] - 0.32, hip[1] - 0.45], [sh[0] - 0.35, sh[1] + 0.05], [sh[0] - 0.05, sh[1] - 0.18], [sh[0] + 0.28, sh[1] + 0.1], [sh[0] + 0.25, sh[1] + 0.55], [hip[0] + 0.35, hip[1] - 0.05]], C.pilot)
  // The head, low between the shoulders, a heavy beard.
  ellipse(pen, head, 0.2, 0.21, C.pilot)
  blob(pen, [[head[0] - 0.05, head[1] + 0.05], [head[0] + 0.2, head[1] + 0.02], [head[0] + 0.18, head[1] + 0.26], [head[0] - 0.02, head[1] + 0.24]], C.pilot)
  // A cold rim of daylight on his back, from the window.
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.strokeStyle = rgba(pen, C.rim, 0.35)
  ctx.lineWidth = pen.w * 1.1
  ctx.beginPath()
  ctx.arc(head[0] * pen.k, head[1] * pen.k, 0.205 * pen.k, -Math.PI * 0.95, -Math.PI * 0.45)
  ctx.stroke()
  ctx.restore()
  path(pen, [[sh[0] - 0.33, sh[1] + 0.08], [sh[0] - 0.05, sh[1] - 0.17]], C.rim, 0.5)
  // The arm: shoulder to the elbow on the counter, the forearm to the hand by the glass.
  const gx = END_L - 0.06
  const handRest: Pt = [gx - 0.22, TOP_L - 0.1]
  const elbow: Pt = [Math.min(sh[0] + 0.25, handRest[0] - 0.4), TOP_L - 0.08]
  // The hand: lifting the glass to GLASS, then up for the thumb, then the taps.
  const lift = handLift(t)
  const hand: Pt = [handRest[0] + 0.05 * lift, handRest[1] - 0.32 * lift]
  shape(pen, [[sh[0] + 0.05, sh[1] + 0.1], [sh[0] + 0.25, sh[1] + 0.05], [elbow[0] + 0.1, elbow[1] - 0.05], [elbow[0] + 0.05, elbow[1] + 0.07], [elbow[0] - 0.12, elbow[1]]], C.pilot)
  line(pen, elbow, hand, C.pilot, 7)
  ellipse(pen, hand, 0.1, 0.085, C.pilot)
  // The thumb up off the fist, and its ring.
  const thumbTip: Pt = [hand[0] + 0.02, hand[1] - 0.2]
  line(pen, [hand[0] + 0.01, hand[1] - 0.05], thumbTip, C.pilot, 3.6)
  const ringAt: Pt = [hand[0] + 0.015, hand[1] - 0.11]
  rect(pen, ringAt[0] - 0.035, ringAt[1] - 0.012, ringAt[0] + 0.035, ringAt[1] + 0.012, C.ring)
  // It catches the light: hard on the thumb, softer on each tap.
  let g = 1.0 * flash(t - THUMB, 0.45)
  for (const tap of TAPS) g = Math.max(g, 0.55 * flash(t - tap, 0.22))
  glint(pen, [ringAt[0] + 0.02, ringAt[1] - 0.01], 0.07 + 0.12 * g, C.lamp, 0.25 + 0.75 * g)
  // His glass.
  rect(pen, gx - 0.06, TOP_L - 0.2, gx + 0.06, TOP_L - 0.06, C.bottle)
  rect(pen, gx - 0.05, TOP_L - 0.13, gx + 0.05, TOP_L - 0.07, C.amber)
  if (t >= GLASS && t < GLASS + 0.4) glow(pen, [gx, TOP_L - 0.06], 0.3, C.lamp, 0.4 * flash(t - GLASS, 0.12))
}

/** How high the pilot's hand is off the counter, 0..1: the glass set down hard, the thumb up, the drunk taps. */
function handLift(t: number): number {
  if (t < GLASS - 0.8) return 0
  if (t < GLASS) return Math.sin(((t - (GLASS - 0.8)) / 0.8) * Math.PI) * 0.6
  if (t < THUMB - 0.35) return 0
  if (t < THUMB) return (t - (THUMB - 0.35)) / 0.35
  let v = 1
  for (const tap of TAPS) {
    const s = t - tap
    if (s > -0.2 && s < 0) v = Math.min(v, 1 - (s + 0.2) / 0.2 * 0.8)
    else if (s >= 0 && s < 0.25) v = Math.min(v, 0.2 + (s / 0.25) * 0.8)
  }
  if (t > HINGE - 0.3) v = Math.max(0, 1 - (t - (HINGE - 0.3)) / 0.8)
  return v
}

/** The little stage, its mic stand, and the spotlight's lamp. */
export function drawStage(pen: Pen, t: number): void {
  const [x0, x1] = STAGE
  rect(pen, x0, STAGE_TOP, x1, FLOOR, C.stage)
  rect(pen, x0 - 0.04, STAGE_TOP - 0.05, x1 + 0.04, STAGE_TOP + 0.04, C.stageTop)
  for (let x = x0 + 0.35; x < x1; x += 0.35) rect(pen, x, STAGE_TOP + 0.08, x + 0.025, FLOOR, C.seam)
  // The mic stand: a base, a pole, a boom to the mic.
  const m = MIC_X
  const wob = 0.02 * ring(t - SPOT_OFF, 3, 0.4)
  shape(pen, [[m - 0.16, STAGE_TOP], [m + 0.16, STAGE_TOP], [m + 0.05, STAGE_TOP - 0.04], [m - 0.05, STAGE_TOP - 0.04]], C.iron)
  line(pen, [m, STAGE_TOP - 0.03], [m + wob, -1.05], C.iron, 1.2)
  line(pen, [m + wob, -1.05], [m + 0.2 + wob, -1.12], C.iron, 1.0)
  ellipse(pen, [m + 0.24 + wob, -1.13], 0.045, 0.035, C.iron)
  // The spotlight's can on its beam.
  rect(pen, SPOT[0] - 0.25, CEIL, SPOT[0] + 0.25, CEIL + 0.12, C.beam)
  const on = spotOn(t)
  shape(pen, [[SPOT[0] - 0.1, SPOT[1] - 0.1], [SPOT[0] + 0.1, SPOT[1] - 0.12], [SPOT[0] + 0.2, SPOT[1] + 0.12], [SPOT[0] - 0.02, SPOT[1] + 0.16]], C.iron)
  if (on > 0.01) glow(pen, [SPOT[0] + 0.12, SPOT[1] + 0.12], 0.25, C.spot, on)
}

/** The spotlight, 0..1: on at the hinge with a little flare, off as she lands outside. */
export function spotOn(t: number): number {
  if (t < HINGE) return 0
  if (t < SPOT_OFF) return 1 + 0.35 * flash(t - HINGE, 0.15)
  return Math.max(0, 1 - (t - SPOT_OFF) / 0.12) * 0.9
}

/** The spotlight's cone on the stage, warm, with dust in it: drawn behind her. */
export function drawSpot(pen: Pen, t: number): void {
  const on = spotOn(t)
  if (on <= 0.01) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const src: Pt = [SPOT[0] + 0.12, SPOT[1] + 0.12]
  const target: Pt = [CHERYL_AT[0], STAGE_TOP]
  const g = ctx.createLinearGradient(src[0] * k, src[1] * k, target[0] * k, target[1] * k)
  g.addColorStop(0, rgba(pen, C.spot, 0.45 * on))
  g.addColorStop(1, rgba(pen, C.spot, 0.16 * on))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((src[0] - 0.06) * k, src[1] * k)
  ctx.lineTo((src[0] + 0.08) * k, src[1] * k)
  ctx.lineTo((target[0] + 0.62) * k, target[1] * k)
  ctx.lineTo((target[0] - 0.62) * k, target[1] * k)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  // Its pool on the boards of the stage.
  ctx.save()
  ctx.translate(target[0] * k, target[1] * k)
  ctx.scale(1, 0.16)
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.8 * k)
  pool.addColorStop(0, rgba(pen, C.spot, 0.7 * on))
  pool.addColorStop(1, rgba(pen, C.spot, 0))
  ctx.fillStyle = pool
  ctx.fillRect(-0.8 * k, -0.8 * k, 1.6 * k, 1.6 * k)
  ctx.restore()
  glow(pen, [target[0], target[1] - 0.35], 0.9, C.spot, 0.3 * on)
  // Dust turning in it.
  for (let i = 0; i < 14; i++) {
    const u = (hash(i, 1) + t * 0.03 * (0.5 + hash(i, 2))) % 1
    const x = src[0] + (target[0] - src[0]) * u + (hash(i, 3) - 0.5) * 1.0 * u + Math.sin(t * 0.8 + i) * 0.05
    const y = src[1] + (target[1] - src[1]) * u
    ellipse(pen, [x, y], 0.012, 0.012, C.spot)
  }
}

/** Her guitar, held across her as she stands in the light: it goes with her when she goes. */
export function drawGuitar(pen: Pen, t: number): void {
  const c = cherylAt(t)
  if (!c) return
  const on = Math.max(0.35, Math.min(1, spotOn(t)))
  const [x, y] = c
  // Body low at her right, neck up across her to the left.
  const body: Pt = [x + 0.17, y + 0.07]
  const neckEnd: Pt = [x - 0.3, y - 0.3]
  line(pen, [body[0] - 0.05, body[1] - 0.02], neckEnd, C.guitarDark, 2.2)
  rect(pen, neckEnd[0] - 0.05, neckEnd[1] - 0.03, neckEnd[0] + 0.02, neckEnd[1] + 0.03, C.guitarDark)
  ellipse(pen, body, 0.13, 0.1, C.guitarDark)
  ellipse(pen, [body[0] + 0.06, body[1] + 0.01], 0.09, 0.08, C.guitarDark)
  ellipse(pen, body, 0.115, 0.085, C.guitar)
  ellipse(pen, [body[0] + 0.06, body[1] + 0.01], 0.075, 0.068, C.guitar)
  ellipse(pen, [body[0] - 0.01, body[1] - 0.005], 0.028, 0.028, C.guitarDark)
  // The strings, shimmering on each strum.
  let s = 0
  for (const at of STRUMS) s = Math.max(s, flash(t - at, 0.2))
  const shimmer = 0.012 * s * Math.sin(t * 90)
  line(pen, [body[0] + 0.08, body[1] + shimmer], [neckEnd[0], neckEnd[1] + shimmer], C.spot, 0.5 + 0.8 * s)
  if (s > 0.05) glow(pen, [body[0] - 0.02, body[1]], 0.3, C.spot, 0.45 * s * on)
}

/* ------------------------------------------------------------------ outside */

/** The quay past the back door: a loose plank that knocks under him, a bollard, a gull. */
export function drawQuay(pen: Pen, t: number, plankX: number): void {
  // The plank that knocks.
  const k = flash(t - PLANK, 0.1)
  const tip = 0.04 * ring(t - PLANK, 5, 0.18)
  shape(pen, [[plankX - 0.35, FLOOR + tip], [plankX + 0.35, FLOOR - tip], [plankX + 0.35, FLOOR + 0.1 - tip], [plankX - 0.35, FLOOR + 0.1 + tip]], C.quay, 0.5, C.quayDark)
  if (k > 0.05) glow(pen, [plankX, FLOOR], 0.35, C.sky, 0.4 * k)
  // Bollards along the edge.
  for (const bx of [DOOR_X + 2.6, DOOR_X + 6.2]) {
    rect(pen, bx - 0.12, FLOOR - 0.32, bx + 0.12, FLOOR, C.bollard)
    rect(pen, bx - 0.17, FLOOR - 0.38, bx + 0.17, FLOOR - 0.3, C.bollard)
  }
}

/** Over the balls: the haze of the spotlight on her, and the dark of the room's near edge. */
export function drawOver(pen: Pen, t: number): void {
  void pen
  void t
}
