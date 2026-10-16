import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { clamp, easeInOut, hash, mix, oval, poly, rect, rgba, smooth, turn, type Brush } from './brush'
import { CISTERN, WELL } from './geo'
import { DOWN_TO, bucketTop } from './garden'
import { DRIPS, at, dripIndex } from './music'
import { rainAt, stormAt, tones } from './look'

/**
 * Under the lower garden, the cistern: a vaulted room of black water the well goes down into, seen in section, the
 * ground cut away round it while the camera is down there. The bucket meets the water as the minor comes in and
 * tips; the ball floats out and drifts east on the overflow's current, the vault dripping round it on the pulse,
 * over the weir's lip on bar 32, down three steps of the overflow's channel, and out through the terrace wall into
 * the storm on bar 35.
 */

/** When the cut is shown: from the bucket's going down to a little after the ball is out. */
export const CUT_FROM = at(26, 2)
export const CUT_TO = at(35, 0)
export const cutOn = (t: number): boolean => t >= CUT_FROM && t < CUT_TO

/** The ball's float: from where the bucket tips it to the weir's lip, by bar 32. */
export const FLOAT_FROM = at(28, 1)
export const OVER_LIP = at(32, 0)
/** The steps of the overflow's channel, each a drop on a downbeat, and the outlet. */
export const STEPS = [at(32, 0), at(33, 0), at(34, 0)]
export const OUT = at(35, 0)
const STEP_AT: Pt[] = [
  [74.9, 14.65],
  [76.75, 15.1],
  [78.6, 15.55],
]

/** The hole broken in the garden wall's face for the camera: a ragged edge round the cistern. */
const HOLE: Pt[] = (() => {
  const pts: Pt[] = []
  const [x0, y0, x1, y1] = [53.2, 5.75, 80.0, 17.9]
  const n = 14
  const jag = (i: number, s: number) => (hash(i, s, 3) - 0.5) * 0.7
  for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + Math.abs(jag(i, 1)) * 0.6])
  for (let i = 1; i <= 6; i++) pts.push([x1 + jag(i, 2), y0 + ((y1 - y0) * i) / 6])
  for (let i = n - 1; i >= 0; i--) pts.push([x0 + ((x1 - x0) * i) / n, y1 + jag(i, 4)])
  for (let i = 5; i >= 1; i--) pts.push([x0 + jag(i, 5), y0 + ((y1 - y0) * i) / 6])
  return pts
})()
/** Where the overflow passes inside the wall, between the hole's edge and the outlet. */
export const IN_WALL: [number, number] = [79.7, 80.9]

/** The bucket's tilt, radians: it meets the water, leans east and spills the ball. */
export function bucketTilt(t: number): number {
  return 1.15 * smooth(t, DOWN_TO, DOWN_TO + 0.5) - 0.15 * smooth(t, DOWN_TO + 1.2, DOWN_TO + 3)
}

/** The ball on the water, bobbing, drifting east to the lip. */
export function afloat(t: number): Pt {
  const [bx] = bucketTop(DOWN_TO)
  const u = clamp((t - FLOAT_FROM) / (OVER_LIP - 0.25 - FLOAT_FROM))
  // It drifts slowly out from the bucket, and quickens as the overflow draws it to the lip.
  const x = bx + 0.9 + (CISTERN.lip[0] - 0.25 - bx - 0.9) * (u * u * (1.6 - 0.6 * u))
  const bob = 0.03 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 3.7 + 1)
  return [x, CISTERN.water - R * 0.15 + bob]
}

/** The ball's place on the overflow's step `i`, cells. */
export const stepAt = (i: number): Pt => [STEP_AT[i][0], STEP_AT[i][1] - R]

/**
 * The cistern, seen through a hole broken in the garden wall's face: the earth behind the wall, the chamber's lining
 * of dressed stone, its vault, its black water, and the overflow's stepped channel going off east through the wall
 * to the outlet. Behind the ball.
 */
export function drawCistern(b: Brush, t: number): void {
  const c = tones(t)
  const g = b.g
  const [ox, oy] = CISTERN.outlet
  // The outlet in the wall's face, there always: a round mouth of stone, the overflow running out of it.
  const lining = mix(c.stoneDeep, c.ink, 0.25)
  g.fillStyle = mix(c.stone, c.plaster, 0.15)
  g.beginPath()
  g.arc(ox, oy, 0.62, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = mix(c.ink, '#0B0F15', 0.4)
  g.beginPath()
  g.arc(ox, oy, 0.42, 0, Math.PI * 2)
  g.fill()
  const run = 0.06 + 0.12 * clamp(stormAt(t) + rainAt(t) * 0.5)
  g.fillStyle = rgba(mix(c.waterLight, c.rain, 0.35), 0.6)
  g.fillRect(ox - 0.18, oy + 0.15, 0.36, 0.1)
  g.beginPath()
  g.moveTo(ox + 0.1, oy + 0.2)
  g.quadraticCurveTo(ox + 0.9, oy + 0.25, ox + 1.2, oy + 1.4)
  g.lineTo(ox + 1.2 - run * 3, oy + 1.4)
  g.quadraticCurveTo(ox + 0.6, oy + 0.4, ox - 0.1, oy + 0.3)
  g.fill()
  if (!cutOn(t)) return
  const { x0, x1, crown, spring, floor, water } = CISTERN
  // The broken edge of the hole: stones cut through, a lighter line where the face breaks.
  g.save()
  g.beginPath()
  g.moveTo(HOLE[0][0], HOLE[0][1])
  for (const [x, y] of HOLE) g.lineTo(x, y)
  g.closePath()
  g.lineWidth = 0.22
  g.strokeStyle = mix(c.stone, c.plaster, 0.25)
  g.stroke()
  g.clip()
  // Behind the face: the earth the wall holds back, stones in it.
  rect(b, 52, 5, 81, 19, mix(c.earthDark, c.ink, 0.3))
  g.fillStyle = rgba(mix(c.earth, c.stone, 0.35), 0.4)
  g.beginPath()
  for (let i = 0; i < 150; i++) {
    const x = 53 + hash(i, 81) * 27
    const y = 5.8 + hash(i, 82) * 12.2
    if (x > x0 - 0.7 && x < x1 + 0.7 && y > crown - 0.7 && y < floor + 0.7) continue
    const rx = 0.1 + hash(i, 83) * 0.22
    g.moveTo(x + rx, y)
    g.ellipse(x, y, rx, 0.07 + hash(i, 84) * 0.12, hash(i, 85) * 3, 0, Math.PI * 2)
  }
  g.fill()
  // The chamber: a lining of dressed stone, a barrel vault in three bays.
  const room = mix(c.ink, '#0B0F15', 0.4)
  const bays = 3
  const w = (x1 - x0) / bays
  const vault: Pt[] = []
  for (let k = 0; k < bays; k++) {
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI
      vault.push([x0 + w * (k + 0.5) + Math.cos(a) * (w / 2), spring + Math.sin(a) * (spring - crown)])
    }
  }
  poly(b, [[x0 - 0.55, crown - 0.65], [x1 + 0.55, crown - 0.65], [x1 + 0.55, floor + 0.55], [x0 - 0.55, floor + 0.55]], lining)
  poly(b, [[x0, spring], ...vault, [x1, spring], [x1, floor], [x0, floor]], room)
  // The vault's courses, faint; the piers between the bays.
  g.strokeStyle = rgba(mix(c.stoneDeep, c.ink, 0.1), 0.55)
  g.lineWidth = Math.max(b.px, 0.04)
  g.beginPath()
  for (let k = 0; k < bays; k++) {
    const cx = x0 + w * (k + 0.5)
    for (let i = 1; i < 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      g.moveTo(cx + Math.cos(a) * (w / 2), spring + Math.sin(a) * (spring - crown))
      g.lineTo(cx + Math.cos(a) * (w / 2 - 0.45), spring + Math.sin(a) * (spring - crown - 0.45))
    }
  }
  g.stroke()
  for (let k = 1; k < bays; k++) rect(b, x0 + w * k - 0.3, spring - 0.25, x0 + w * k + 0.3, water, lining)
  // The well's shaft, through the vault's crown: a dark throat with the night at the top of it.
  rect(b, WELL.x - WELL.inner - 0.32, 5, WELL.x + WELL.inner + 0.32, crown + 0.3, lining)
  rect(b, WELL.x - WELL.inner, 5, WELL.x + WELL.inner, crown + 0.45, room)
  // The water: black, the faintest of the sky at its face, and under the shaft the shaft's own pale mouth.
  rect(b, x0, water, x1, floor, mix(room, c.water, 0.16))
  rect(b, WELL.x - WELL.inner * 0.8, water + 0.12, WELL.x + WELL.inner * 0.8, water + 0.2, rgba(c.skyLow, 0.18))
  rect(b, WELL.x - WELL.inner * 0.55, water + 0.32, WELL.x + WELL.inner * 0.55, water + 0.38, rgba(c.skyLow, 0.1))
  // The weir and the overflow's stepped channel east through the wall to the outlet.
  const [lx, ly] = CISTERN.lip
  rect(b, lx - 0.18, ly - 0.05, lx + 0.22, floor, lining)
  poly(b, [[lx + 0.22, ly - 1.0], [81, oy - 0.9], [81, oy + 0.42], [lx + 0.22, ly + 0.2]], room)
  for (const [sx, sy] of STEP_AT) rect(b, sx - 0.95, sy, sx + 0.95, sy + 0.45, lining)
  rect(b, lx + 0.22, ly + 0.25, 81, oy + 1.1, lining)
  g.restore()
}

/** The bucket, down in the water: tipping, and floating empty after. */
export function drawSunkBucket(b: Brush, t: number): void {
  if (!cutOn(t)) return
  const [bx, by] = bucketTop(t)
  if (by <= WELL.curb + 0.2) return
  const c = tones(t)
  const { w, h } = WELL.bucket
  const a = bucketTilt(t)
  const wood = mix(c.wood, c.ink, 0.35)
  const shape = turn([[-w, 0], [w, 0], [w * 0.8, h], [-w * 0.8, h]], a, 0, h * 0.6, bx, by)
  poly(b, shape, wood)
  const hoop = turn([[-w * 0.95, h * 0.2], [w * 0.95, h * 0.2], [w * 0.92, h * 0.28], [-w * 0.92, h * 0.28]], a, 0, h * 0.6, bx, by)
  poly(b, hoop, c.iron)
  // Its rope, up the shaft.
  b.g.strokeStyle = mix(c.wood, c.plaster, 0.2)
  b.g.lineWidth = Math.max(b.px, 0.03)
  b.g.beginPath()
  b.g.moveTo(bx, WELL.curb)
  b.g.lineTo(bx + Math.sin(a) * 0.4, by - 0.5)
  b.g.stroke()
}

/** The water's skin, over the ball's lower half; rings where the vault drips, and where the ball moves. */
export function drawCisternWater(b: Brush, t: number): void {
  if (!cutOn(t)) return
  const c = tones(t)
  const { x0, water } = CISTERN
  const g = b.g
  const skin = mix(mix(c.ink, '#0B0F15', 0.35), c.water, 0.3)
  g.fillStyle = rgba(skin, 0.72)
  g.fillRect(x0, water, CISTERN.lip[0] - 0.15 - x0, 0.6)
  g.strokeStyle = rgba(mix(c.water, c.glass, 0.45), 0.7)
  g.lineWidth = Math.max(b.px, 0.025)
  g.beginPath()
  g.moveTo(x0, water)
  g.lineTo(CISTERN.lip[0] - 0.15, water)
  g.stroke()
  // The vault's drips: from the crowns of the bays, falling on the pulse, a ring where each lands.
  const i = dripIndex(t)
  for (let j = i; j >= 0 && j > i - 3; j--) {
    const age = t - DRIPS[j]
    if (age > 0.9) continue
    const x = x0 + 2 + hash(j, 91) * (CISTERN.lip[0] - x0 - 4)
    ring(b, x, water, age, 0.9, c)
  }
  // The drops still falling to them.
  const fall = Math.sqrt((2 * (water - CISTERN.crown)) / 30)
  const k = dripIndex(t + fall)
  for (let j = k; j > i && j >= 0; j--) {
    const u = (t - (DRIPS[j] - fall)) / fall
    if (u < 0 || u > 1) continue
    const x = x0 + 2 + hash(j, 91) * (CISTERN.lip[0] - x0 - 4)
    const top = CISTERN.spring - (CISTERN.spring - CISTERN.crown) * 0.6
    oval(b, x, top + (water - top) * u * u, 0.035, 0.06, rgba(mix(c.glass, c.water, 0.3), 0.8))
  }
  // The wake: a ring now and then off the drifting ball.
  if (t > FLOAT_FROM && t < OVER_LIP) {
    for (let n = 0; n < 3; n++) {
      const t0 = FLOAT_FROM + Math.floor((t - FLOAT_FROM) / 0.9 - n) * 0.9
      if (t0 < FLOAT_FROM) continue
      const [x] = afloat(t0)
      ring(b, x, water, t - t0, 2.4, c)
    }
  }
}

function ring(b: Brush, x: number, y: number, age: number, life: number, c: ReturnType<typeof tones>): void {
  if (age < 0 || age > life) return
  const f = age / life
  b.g.strokeStyle = rgba(mix(c.water, c.glass, 0.4), 0.6 * (1 - f))
  b.g.lineWidth = Math.max(b.px, 0.025)
  b.g.beginPath()
  b.g.ellipse(x, y, 0.1 + f * 1.4, 0.03 + f * 0.12, 0, 0, Math.PI * 2)
  b.g.stroke()
}

export { easeInOut }
