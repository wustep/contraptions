import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { clamp, easeInOut, hash, mix, oval, poly, rect, rgba, smooth, turn, type Brush } from './brush'
import { CISTERN, GARDEN, WELL } from './geo'
import { DOWN_TO, bucketTop } from './garden'
import { drawWall } from './land'
import { DRIPS, at, bar, dripIndex } from './music'
import { tones } from './look'

/**
 * Under the lower garden, the cistern: a vaulted room of black water the well goes down into, seen in section, the
 * ground cut away round it while the camera is down there. The bucket meets the water as the minor comes in and
 * tips; the ball floats out and drifts east on the overflow's current, the vault dripping round it on the pulse,
 * over the weir's lip on bar 32, down three steps of the overflow's channel, and out through the terrace wall into
 * the storm on bar 35.
 */

/** When the cut is shown: from the bucket's going down to a little after the ball is out. */
export const CUT_FROM = at(26, 2)
export const CUT_TO = bar(36)
export const cutOn = (t: number): boolean => t >= CUT_FROM && t < CUT_TO

/** The ball's float: from where the bucket tips it to the weir's lip, by bar 32. */
export const FLOAT_FROM = DOWN_TO + 0.55
export const OVER_LIP = at(32, 0)
/** The steps of the overflow's channel, each a drop on a downbeat, and the outlet. */
export const STEPS = [at(32, 0), at(33, 0), at(34, 0)]
export const OUT = at(35, 0)
const STEP_AT: Pt[] = [
  [76.1, 14.75],
  [78.2, 15.25],
  [80.3, 15.75],
]

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

/** The earth round the cistern, cut, and the cistern's chamber: masonry, vault, water. Behind the ball. */
export function drawCistern(b: Brush, t: number): void {
  if (!cutOn(t)) return
  const c = tones(t)
  const { x0, x1, crown, spring, floor, water } = CISTERN
  const g = b.g
  // The cut: earth from under the garden's gravel to below the cistern, from the steps to the terrace wall.
  const earth = mix(c.earthDark, c.ink, 0.25)
  rect(b, 50, GARDEN.lower + 0.7, 82.1, floor + 3, earth)
  g.fillStyle = rgba(mix(c.earth, c.stone, 0.3), 0.35)
  for (let i = 0; i < 160; i++) {
    const x = 50.3 + hash(i, 81) * 31.5
    const y = GARDEN.lower + 1 + hash(i, 82) * (floor + 1.6 - GARDEN.lower)
    if (x > x0 - 0.6 && x < x1 + 0.6 && y > crown - 0.6 && y < floor + 0.6) continue
    g.beginPath()
    g.ellipse(x, y, 0.12 + hash(i, 83) * 0.2, 0.08 + hash(i, 84) * 0.12, hash(i, 85) * 3, 0, Math.PI * 2)
    g.fill()
  }
  // The terrace wall's face beyond, cut through: the outlet goes out through it.
  drawWall(b, c, 81.0, GARDEN.lower + 0.4, 82.2, 17.3, 9)
  // The chamber's lining: a ring of dressed stone.
  const lining = mix(c.stoneDeep, c.ink, 0.25)
  const room = mix(c.ink, '#0B0F15', 0.35)
  const vault: Pt[] = []
  const bays = 3
  const w = (x1 - x0) / bays
  for (let k = 0; k < bays; k++) {
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI
      vault.push([x0 + w * (k + 0.5) + Math.cos(a) * (w / 2), spring + Math.sin(a) * (spring - crown)])
    }
  }
  poly(b, [[x0 - 0.5, crown - 0.6], [x1 + 0.5, crown - 0.6], [x1 + 0.5, floor + 0.5], [x0 - 0.5, floor + 0.5]], lining)
  poly(b, [[x0, spring], ...vault, [x1, spring], [x1, floor], [x0, floor]], room)
  // Faint courses in the walls, and the piers between the bays.
  g.fillStyle = rgba(lining, 0.9)
  for (let k = 1; k < bays; k++) g.fillRect(x0 + w * k - 0.25, spring - 0.2, 0.5, floor - spring)
  g.fillStyle = rgba(mix(c.stoneDeep, c.ink, 0.45), 0.6)
  for (let y = spring + 0.8; y < floor; y += 0.8) g.fillRect(x0, y, x1 - x0, 0.04)
  // The well's shaft, through the vault's crown up to the curb: a dark throat.
  rect(b, WELL.x - WELL.inner - 0.3, GARDEN.lower + 0.7, WELL.x + WELL.inner + 0.3, crown + 0.3, lining)
  rect(b, WELL.x - WELL.inner, WELL.curb - 0.1, WELL.x + WELL.inner, crown + 0.4, room)
  // The water: black, a little paler at its face.
  rect(b, x0, water, x1, floor, mix(room, c.water, 0.22))
  // The weir: a sill of stone at the water's east end, and the overflow's stepped channel through the wall.
  const [lx, ly] = CISTERN.lip
  rect(b, lx - 0.15, ly - 0.05, lx + 0.25, floor, lining)
  const chan: Pt[] = [[lx + 0.25, ly - 1.1], [82.2, CISTERN.outlet[1] - 1.1], [82.2, CISTERN.outlet[1] + 0.25], [lx + 0.25, ly + 0.25]]
  poly(b, chan, room)
  for (const [sx, sy] of STEP_AT) rect(b, sx - 1.05, sy, sx + 1.05, sy + 0.5, lining)
  rect(b, lx + 0.25, ly + 0.25, 82.2, CISTERN.outlet[1] + 0.9, lining)
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
  g.strokeStyle = rgba(mix(c.water, c.glass, 0.3), 0.55)
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
