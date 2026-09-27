import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import type { PieceCtx } from '../../../../parts'
import { BAR, COLLAPSE, EMAJOR, LAST, RETURN, STROKES, lastIndex } from './music'
import { R } from './plan'
import { BELL, FINIAL, ROOF, STAIR, TREAD_AT } from './finale'
import { BRASS, GOLD, INK, PAPER, deep, easeOut, pale, ring, smooth } from './look'
import { inFrame } from './pose'

/**
 * The roof: E major's gold over the top storey. On the first bar of E major its two slopes rise from the top
 * storey's ceiling, hinged at the eaves, and meet over the mast; a king post comes up the mast to hold them, the
 * great bell hangs under the apex, and a stair's treads fold out up the left slope, a stroke at a time, for the ball
 * to climb a beat at a time. The finial at the apex is a cup. On C's return the ball lands in it and the bell is
 * struck; it is struck again on each downbeat until the tower falls.
 */

const PLANK = 0.24

/** How far the roof has risen: over E major's first bar. */
export const risen = (t: number): number => easeOut(smooth(t, EMAJOR - 0.3, EMAJOR + BAR))

/** The bell's tilt: struck by the ball's landing on C's return, and on each downbeat after, until the collapse. */
function bellTilt(t: number): number {
  let a = 0
  for (let j = 0; j < 4; j++) {
    const at = RETURN + j * BAR
    if (t >= at) a += (j === 0 ? 0.28 : 0.16) * ring(t - at, 0.9, 1.1) * (j % 2 ? -1 : 1)
  }
  return a
}

export function drawRoof(p: p5, c: PieceCtx, t: number): void {
  const rise = risen(t)
  if (rise <= 0) return
  inFrame(p, c.k, 10, t, () => roof(p, c, t, rise))
}

function roof(p: p5, c: PieceCtx, t: number, rise: number): void {
  const { k, weight } = c
  const half = ROOF.half
  const apexY = ROOF.apex
  const slope = Math.atan2(ROOF.eave - apexY, half)
  // The king post, up the mast to the apex.
  const post = apexY + (ROOF.eave - apexY) * (1 - smooth(rise, 0, 0.7))
  solid(p, INK, weight, pale(BRASS, 0.2))
  p.rectMode(p.CORNERS)
  p.rect(-0.1 * k, post * k, 0.1 * k, ROOF.eave * k)
  // The tie beam along the eaves.
  solid(p, INK, weight, deep(GOLD, 0.25))
  p.rect(-half * k, (ROOF.eave - 0.05) * k, half * k, (ROOF.eave + 0.07) * k, 0.03 * k)
  p.rectMode(p.CENTER)

  // The great bell, under the apex, once the roof has closed over it.
  const bell = smooth(rise, 0.7, 1)
  if (bell > 0) {
    const tilt = t < COLLAPSE ? bellTilt(t) : bellTilt(COLLAPSE) * Math.exp(-(t - COLLAPSE) / 0.3)
    p.push()
    p.translate(0, (apexY + 0.18) * k)
    outline(p, INK, weight)
    p.line(0, 0, 0, (BELL[1] - apexY - 0.55) * k * bell)
    p.translate(0, (BELL[1] - apexY - 0.55) * k * bell)
    p.rotate(tilt)
    const w = 1.1 * bell
    const h = 1.15 * bell
    solid(p, INK, weight, GOLD)
    p.beginShape()
    p.vertex(-0.16 * w * k, 0)
    p.bezierVertex(-0.3 * w * k, 0.05 * h * k, -0.32 * w * k, 0.55 * h * k, -0.5 * w * k, 0.85 * h * k)
    p.vertex(0.5 * w * k, 0.85 * h * k)
    p.bezierVertex(0.32 * w * k, 0.55 * h * k, 0.3 * w * k, 0.05 * h * k, 0.16 * w * k, 0)
    p.endShape(p.CLOSE)
    solid(p, INK, weight, deep(GOLD, 0.3))
    p.rect(0, 0.87 * h * k, 1.04 * w * k, 0.08 * h * k, 0.02 * k)
    // Its clapper, swinging a little behind the bell.
    p.rotate(-tilt * 0.6)
    outline(p, INK, weight * 0.8)
    p.line(0, 0.1 * h * k, 0, 0.78 * h * k)
    solid(p, INK, weight * 0.8, deep(GOLD, 0.45))
    p.rect(0, 0.8 * h * k, 0.14 * w * k, 0.1 * h * k, 0.03 * k)
    p.pop()
  }

  // The two slopes: planks hinged at the eaves, rising to meet at the apex.
  for (const side of [-1, 1]) {
    const lift = slope * rise
    p.push()
    p.translate(side * half * k, ROOF.eave * k)
    p.rotate(side * lift)
    const len = Math.hypot(half, ROOF.eave - apexY) + 0.12
    solid(p, INK, weight, GOLD)
    p.rectMode(p.CORNER)
    // Laid from the eave inward.
    p.rect(side < 0 ? 0 : -len * k, -PLANK * k, len * k, PLANK * k, 0.04 * k)
    // Its rafters' ends, as a row of short ticks under it (the ribs that hold it), few and heavy.
    outline(p, INK, weight * 0.7)
    for (let i = 1; i < 6; i++) {
      const x = (side < 0 ? 1 : -1) * (len * i) / 6
      p.line(x * k, 0, x * k, 0.12 * k)
    }
    p.pop()
  }

  // The stair: a tread for each beat of the climb, folding out of the left slope on the strokes of E major's first bar.
  const out = smooth(rise, 0.55, 1)
  if (out > 0) {
    for (let i = 0; i < STAIR.length - 1; i++) {
      const [x, y] = STAIR[i]
      const shown = easeOut(smooth(out, (i / STAIR.length) * 0.8, (i / STAIR.length) * 0.8 + 0.2))
      if (shown <= 0) continue
      const at = TREAD_AT[i]
      const give = t >= at ? 0.03 * Math.exp(-(t - at) / 0.14) : 0
      const glow = t >= at && t < at + 0.6 ? Math.exp(-(t - at) / 0.25) : 0
      p.push()
      p.translate(x * k, (y + R + give) * k)
      p.rotate((1 - shown) * 1.2)
      solid(p, INK, weight * 0.8, glow > 0 ? pale(GOLD, -0.2 * glow) : pale(GOLD, 0.25))
      p.rectMode(p.CORNER)
      p.rect(-0.2 * k, 0, 0.4 * k, 0.07 * k, 0.02 * k)
      // A bracket back to the slope.
      outline(p, INK, weight * 0.6)
      p.line(-0.14 * k, 0.07 * k, -0.02 * k, 0.24 * k)
      p.pop()
    }
  }

  // The finial: a cup on a spike at the apex, where the ball comes to rest.
  const cup = smooth(rise, 0.8, 1)
  if (cup > 0) {
    const [fx, fy] = FINIAL
    const jolt = t >= RETURN && t < COLLAPSE ? 0.04 * Math.exp(-(t - RETURN) / 0.12) : 0
    outline(p, INK, weight)
    p.line(fx * k, (apexY - 0.05) * k, fx * k, (fy + R + 0.05) * k)
    solid(p, INK, weight, GOLD)
    p.arc(fx * k, (fy + R * 0.25 + jolt) * k, 0.42 * cup * k, 0.34 * cup * k, 0, Math.PI, p.CHORD)
  }
  void STROKES
  void lastIndex
  void LAST
  void PAPER
}
