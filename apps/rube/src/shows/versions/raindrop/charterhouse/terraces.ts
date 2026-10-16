import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { bar as beam, clamp, disc, easeIn, hash, line, mix, part, poly, rgba, smooth, turn, type Brush } from './brush'
import { CHUTE, HAMMERS, T1CH, T1_SILLS, T2CH, T3CH, TERRACES, chanY, type Channel } from './geo'
import { at, bar } from './music'
import { rainAt, stormAt, tones } from './look'

/**
 * The terraces' water: a stone channel along each terrace's front, running hard in the storm, and at each terrace's
 * end a water hammer. The channel pours into the hammer's trough; the ball comes with the water and lies at its
 * closed end while it fills; full, the trough goes over east and empties ball and water down the wall to the
 * terrace below, and swings back onto its stone with a knock. Three of them, two bars apart, through the sotto voce:
 * each goes over on a downbeat and knocks two beats later. The third empties into a chute down the gully's wall.
 */

export const CHANNELS: readonly Channel[] = [T1CH, T2CH, T3CH]

/** When each hammer goes over, and when it is back on its stone. */
export const OVER = [at(46, 0), at(48, 0), at(50, 0)]
export const KNOCK = [at(46, 2), at(48, 2), at(50, 2)]

/** The trough: its pin at its hammer's place, its closed west end and open east end (local cells). */
const WEST = -1.55
const EAST = 1.95
const FLOOR = -0.12
/** Resting with the closed end down on its stone; over, with the open end down. */
const REST = -0.27
const TIPPED = 0.62
const GO = 0.34

/** How far hammer `i` is turned at `t` (positive: open end down). */
export function hammerAngle(i: number, t: number): number {
  const o = OVER[i]
  const k = KNOCK[i]
  // Before: settling a little toward over as it fills, a small nod with each surge of the channel.
  const fill = smooth(t, o - 6, o - GO) * 0.12
  let a = REST + fill + 0.012 * Math.sin(t * 5 + i)
  if (t >= o - GO && t < o) a = REST + 0.12 + (TIPPED - REST - 0.12) * easeIn((t - (o - GO)) / GO)
  else if (t >= o && t < k) {
    // Emptying, then back, falling onto its stone on the knock.
    const hold = o + 0.3
    if (t < hold) a = TIPPED + 0.04 * Math.sin((t - o) * 30) * Math.exp(-(t - o) * 8)
    else a = TIPPED + (REST - TIPPED) * easeIn(clamp((t - hold) / (k - hold)))
  } else if (t >= k) a = REST + 0.08 * Math.exp(-(t - k) * 7) * Math.abs(Math.sin((t - k) * 18))
  return a
}

/** A point in hammer `i`'s trough (local cells) in the world at `t`. */
export function inTrough(i: number, t: number, s: number, y = FLOOR - R): Pt {
  const h = HAMMERS[i]
  return turn([[s, y]], hammerAngle(i, t), 0, 0, h.x, h.y)[0]
}

/** The ball in hammer `i`: at the closed end while it fills, running out of the open end as it goes over. */
export function inHammer(i: number, t: number): Pt {
  const o = OVER[i]
  const s = t < o - GO ? WEST + 0.2 : WEST + 0.2 + (EAST - WEST - 0.15) * easeIn(clamp((t - (o - GO)) / GO))
  return inTrough(i, t, s)
}

/** How full trough `i` is, 0 to 1. */
function fullness(i: number, t: number): number {
  const o = OVER[i]
  if (t < o - GO) return 0.25 + 0.7 * smooth(t, o - 8, o - GO)
  if (t < o + 0.3) return 0.95 * (1 - smooth(t, o - GO, o + 0.3))
  return 0.25 * smooth(t, o + 0.5, OVER[i] + 6)
}

/** A channel's bed and water: behind the ball. */
function channelBack(b: Brush, c: ReturnType<typeof tones>, ch: Channel, t: number): void {
  const { x0, x1 } = ch
  // The runnel stands on a low wall of its own along the terrace's edge.
  const tread = TERRACES.find((tr) => x0 >= tr.x0 - 1 && x0 < tr.x1)?.y ?? chanY(ch, x0) + 1
  poly(b, [[x0 - 0.3, chanY(ch, x0) + 0.2], [x1 + 0.15, chanY(ch, x1) + 0.2], [x1 + 0.15, tread + 0.1], [x0 - 0.3, tread + 0.1]], c.stoneShade)
  b.g.fillStyle = rgba(c.stoneDeep, 0.6)
  for (let x = x0 + 0.4; x < x1; x += 0.9) b.g.fillRect(x, chanY(ch, x) + 0.25, 0.04, tread - chanY(ch, x) - 0.2)
  poly(b, [[x0, chanY(ch, x0) - 0.3], [x1, chanY(ch, x1) - 0.3], [x1, chanY(ch, x1) + 0.06], [x0, chanY(ch, x0) + 0.06]], c.stoneDeep)
  // The water: higher in the storm, its face streaked with the run of it.
  const s = clamp(stormAt(t) * 0.6 + rainAt(t) * 0.6)
  const top = 0.1 + 0.1 * s
  const water = mix(c.water, c.earth, 0.2)
  poly(b, [[x0, chanY(ch, x0) - top], [x1, chanY(ch, x1) - top], [x1, chanY(ch, x1) + 0.04], [x0, chanY(ch, x0) + 0.04]], water)
  if (b.k > 12) {
    const g = b.g
    g.strokeStyle = rgba(mix(c.waterLight, c.rain, 0.4), 0.6)
    g.lineWidth = Math.max(b.px, 0.025)
    g.beginPath()
    const n = Math.round((x1 - x0) * 1.2)
    for (let k = 0; k < n; k++) {
      const u = (hash(k, 101) + t * 0.28 * (0.8 + hash(k, 102) * 0.4)) % 1
      const x = x0 + u * (x1 - x0)
      const y = chanY(ch, x) - top + 0.03 + hash(k, 103) * 0.06
      g.moveTo(x, y)
      g.lineTo(Math.min(x1, x + 0.35), y + 0.004)
    }
    g.stroke()
  }
}

/** A channel's front kerb, in front of the ball's foot. */
function channelFront(b: Brush, c: ReturnType<typeof tones>, ch: Channel): void {
  const { x0, x1 } = ch
  // Sills across the first runnel, the water breaking over each.
  if (ch === T1CH) {
    for (const x of T1_SILLS) {
      part(b, [[x - 0.14, chanY(ch, x) + 0.04], [x - 0.1, chanY(ch, x) - 0.13], [x + 0.1, chanY(ch, x) - 0.13], [x + 0.14, chanY(ch, x) + 0.04]], c.stone, mix(c.stoneDeep, c.ink, 0.4), 0.025)
      line(b, x + 0.16, chanY(ch, x) - 0.08, x + 0.5, chanY(ch, x) - 0.05, rgba(mix(c.waterLight, c.rain, 0.5), 0.7), Math.max(1, b.k * 0.02))
    }
  }
  poly(b, [[x0, chanY(ch, x0) - 0.06], [x1, chanY(ch, x1) - 0.06], [x1 + 0.1, chanY(ch, x1) + 0.24], [x0, chanY(ch, x0) + 0.24]], c.stone)
  line(b, x0, chanY(ch, x0) - 0.06, x1, chanY(ch, x1) - 0.06, mix(c.stone, c.skyLow, 0.35), Math.max(1, b.k * 0.02))
}

/** The terrace a hammer stands on: its tread's level. */
const treadOf = (i: number): number => TERRACES[i].y

/** A hammer: its trestle and stone, its trough at its angle, the water in it; and what pours from it. */
function hammer(b: Brush, c: ReturnType<typeof tones>, i: number, t: number, front: boolean): void {
  const h = HAMMERS[i]
  const a = hammerAngle(i, t)
  const wood = mix(c.wood, c.plaster, 0.08)
  const ink = c.ink
  const P = (pts: Pt[]) => turn(pts, a, 0, 0, h.x, h.y)
  const tread = treadOf(i)
  if (!front) {
    // The trestle: two legs from the tread up to the pin.
    beam(b, h.x - 0.55, tread + 0.05, h.x, h.y + 0.05, mix(wood, ink, 0.3), 0.15)
    beam(b, h.x + 0.55, tread + 0.05, h.x, h.y + 0.05, mix(wood, ink, 0.3), 0.15)
    // The stone its closed end knocks down on.
    const k = turn([[WEST + 0.3, FLOOR + 0.24]], REST, 0, 0, h.x, h.y)[0]
    part(b, [[k[0] - 0.55, tread + 0.05], [k[0] - 0.5, k[1] + 0.02], [k[0] + 0.45, k[1]], [k[0] + 0.55, tread + 0.05]], c.stoneShade, mix(c.stoneDeep, ink, 0.4), 0.03)
    // The trough's back wall, and its water.
    part(b, P([[WEST, FLOOR + 0.12], [EAST, FLOOR + 0.12], [EAST, FLOOR - 0.32], [WEST, FLOOR - 0.4]]), mix(wood, ink, 0.32), ink, 0.03)
    const f = fullness(i, t)
    if (f > 0.02) {
      const depth = 0.3 * f
      poly(b, P([[WEST + 0.05, FLOOR + 0.1], [EAST - 0.5 + 0.5 * (1 - f), FLOOR + 0.1], [EAST - 0.5 + 0.5 * (1 - f), FLOOR + 0.1 - depth * 0.35], [WEST + 0.05, FLOOR + 0.1 - depth]]), mix(c.water, c.glass, 0.2))
    }
    return
  }
  // The trough's floor and its low front wall (the ball shows over it), the closed end and its knob, the bands, the pin.
  part(b, P([[WEST - 0.06, FLOOR + 0.24], [EAST, FLOOR + 0.24], [EAST, FLOOR - 0.06], [WEST - 0.06, FLOOR - 0.1]]), wood, ink, 0.035)
  part(b, P([[WEST - 0.16, FLOOR + 0.3], [WEST + 0.06, FLOOR + 0.3], [WEST + 0.06, FLOOR - 0.46], [WEST - 0.16, FLOOR - 0.46]]), mix(wood, ink, 0.2), ink, 0.035)
  for (const s0 of [WEST + 0.75, EAST - 0.6]) part(b, P([[s0 - 0.05, FLOOR + 0.25], [s0 + 0.05, FLOOR + 0.25], [s0 + 0.05, FLOOR - 0.07], [s0 - 0.05, FLOOR - 0.07]]), c.iron, ink, 0.02)
  const pin = P([[0, 0.05]])[0]
  disc(b, pin[0], pin[1], 0.1, c.iron)
  // The channel pouring into it: a thin fall from the channel's end into the trough.
  const ch = CHANNELS[i]
  const s = clamp(stormAt(t) * 0.6 + rainAt(t) * 0.6)
  const from: Pt = [ch.x1 + 0.05, chanY(ch, ch.x1) - 0.12]
  const to = P([[WEST + 0.5, FLOOR - 0.1]])[0]
  b.g.strokeStyle = rgba(mix(c.waterLight, c.rain, 0.3), 0.55 + 0.3 * s)
  b.g.lineWidth = 0.07 + 0.07 * s
  b.g.lineCap = 'round'
  b.g.beginPath()
  b.g.moveTo(from[0], from[1])
  b.g.quadraticCurveTo(from[0] + 0.3, from[1], to[0], to[1])
  b.g.stroke()
  // Over: the water pours from the open end and down the wall, spreading as it falls.
  const o = OVER[i]
  if (t > o - 0.15 && t < o + 1.2) {
    const mouth = P([[EAST, FLOOR]])[0]
    const foot = i < 2 ? TERRACES[i + 1].y : mouth[1] + 1.4
    const fall = foot - mouth[1]
    const head = Math.min(fall, 0.5 * 30 * (t - (o - 0.15)) ** 2)
    const tail = Math.min(fall, Math.max(0, 0.5 * 30 * Math.max(0, t - (o + 0.4)) ** 2))
    if (head > tail) {
      const w0 = 0.18 + (tail / Math.max(1, fall)) * 0.4
      const w1 = 0.18 + (head / Math.max(1, fall)) * 0.4
      b.g.fillStyle = rgba(mix(c.waterLight, c.rain, 0.35), 0.5)
      b.g.beginPath()
      b.g.moveTo(mouth[0] - w0 / 2 + 0.1, mouth[1] + tail)
      b.g.lineTo(mouth[0] + w0 / 2 + 0.1, mouth[1] + tail)
      b.g.lineTo(mouth[0] + w1 / 2 + 0.25, mouth[1] + head)
      b.g.lineTo(mouth[0] - w1 / 2 + 0.25, mouth[1] + head)
      b.g.fill()
    }
  }
}

export function drawChannels(b: Brush, t: number): void {
  const c = tones(t)
  for (const ch of CHANNELS) channelBack(b, c, ch, t)
  for (let i = 0; i < HAMMERS.length; i++) hammer(b, c, i, t, false)
  // The chute down the gully's west wall: a half pipe of tile on stakes.
  const g = b.g
  g.strokeStyle = c.tileDeep
  g.lineWidth = 0.34
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(CHUTE[0][0], CHUTE[0][1])
  for (const [x, y] of CHUTE) g.lineTo(x, y)
  g.stroke()
  for (let k = 1; k < CHUTE.length; k++) {
    const [x, y] = CHUTE[k]
    beam(b, x, y + 0.1, x - 0.4, y + 1.6, mix(c.wood, c.ink, 0.2), 0.1)
  }
}

export function drawChannelsFront(b: Brush, t: number): void {
  const c = tones(t)
  for (const ch of CHANNELS) channelFront(b, c, ch)
  for (let i = 0; i < HAMMERS.length; i++) hammer(b, c, i, t, true)
  // The chute's front lip.
  const g = b.g
  g.strokeStyle = c.tile
  g.lineWidth = 0.14
  g.beginPath()
  g.moveTo(CHUTE[0][0], CHUTE[0][1] + 0.12)
  for (const [x, y] of CHUTE) g.lineTo(x, y + 0.12)
  g.stroke()
}

/** Where on the chute the ball is, `u` of the way down. */
export function onChute(u: number): Pt {
  const n = CHUTE.length - 1
  const f = clamp(u) * n
  const k = Math.min(n - 1, Math.floor(f))
  const v = f - k
  const [ax, ay] = CHUTE[k]
  const [bx, by] = CHUTE[k + 1]
  return [ax + (bx - ax) * v, ay + (by - ay) * v - R - 0.05]
}

export { bar }
