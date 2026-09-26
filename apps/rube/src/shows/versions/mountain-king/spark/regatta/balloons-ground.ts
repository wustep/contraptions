import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { REGATTA } from '../worlds'
import { INK, type Look } from './balloons-draw'
import { ANAT, AT, GROUND, ss } from './balloons-plan'

/**
 * What stands on the launch meadow with the first two balloons: the inflator fan breathing into B1's mouth, and the
 * tethers from the baskets to their stakes, B1's with the quick-release that lets it go.
 */

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** The fan: a drum on a little wheeled frame on the grass, tipped up into B1's mouth. */
export const FAN: Pt = [9.15, GROUND]

/** How fast the fan turns (turns a second): full while B1 lies filling, spinning down once it is up. */
const fanSpeed = (t: number): number => 7 * (1 - ss(t, AT.upright - 0.3, AT.blast1 + 0.6))
/** How far round its blades have gone. */
function fanTurn(t: number): number {
  // Integral of the speed: full before the spin-down, then the spin-down's area.
  const a = AT.upright - 0.3
  const b = AT.blast1 + 0.6
  if (t <= a) return 7 * t
  const u = Math.min(t, b)
  let s = 7 * a
  // Midpoint sums over the spin-down (it is short).
  const n = 24
  const dt = (u - a) / n
  for (let i = 0; i < n; i++) s += fanSpeed(a + (i + 0.5) * dt) * dt
  return s
}

export function drawFan(p: p5, look: Look, t: number): void {
  const { k, weight } = look
  const X = (v: number) => v * k
  const [fx, fy] = FAN
  p.push()
  p.translate(X(fx), X(fy))
  // The stand: a tubular A-frame on the grass, and the fan's pivot at its top.
  p.stroke(INK)
  p.strokeWeight(weight * 1.1)
  p.line(X(-0.45), X(0), X(-0.06), X(-0.78))
  p.line(X(0.35), X(0), X(-0.02), X(-0.78))
  p.stroke(REGATTA.steel)
  p.strokeWeight(weight * 0.55)
  p.line(X(-0.45), X(0), X(-0.06), X(-0.78))
  p.line(X(0.35), X(0), X(-0.02), X(-0.78))
  // The fan, tipped up toward the mouth: a short drum, seen three-quarters, its open face to the envelope.
  p.translate(X(-0.04), X(-0.82))
  p.rotate(-0.38)
  const depth = 0.3
  const w = 0.56
  const h = 1.5
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.fill(mixHex(REGATTA.coral, INK, 0.3))
  p.ellipse(X(-depth), X(0), X(w), X(h))
  p.noStroke()
  p.rectMode(p.CORNER)
  p.rect(X(-depth), X(-h / 2), X(depth), X(h))
  p.rectMode(p.CENTER)
  p.stroke(INK)
  p.line(X(-depth), X(-h / 2), X(0), X(-h / 2))
  p.line(X(-depth), X(h / 2), X(0), X(h / 2))
  // The open face: dark inside, the blades turning (a blur while it runs), the guard's ring and its cross.
  p.fill(mixHex(INK, REGATTA.steel, 0.3))
  p.ellipse(X(0), X(0), X(w), X(h))
  const turn = fanTurn(t) * Math.PI * 2
  const sp = Math.min(1, fanSpeed(t) / 7)
  p.noStroke()
  p.fill(rgba(REGATTA.ivory, 0.75 - 0.45 * sp))
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2
    const c = Math.cos(a)
    const sn = Math.sin(a)
    const tip: Pt = [c * w * 0.42, sn * h * 0.42]
    const side: Pt = [-sn * w * 0.12, c * h * 0.12]
    p.quad(X(0), X(0), X(tip[0] + side[0]), X(tip[1] + side[1]), X(tip[0] * 1.02), X(tip[1] * 1.02), X(tip[0] * 0.5 - side[0] * 0.3), X(tip[1] * 0.5 - side[1] * 0.3))
  }
  p.fill(rgba(REGATTA.ivory, 0.3 * sp))
  p.ellipse(X(0), X(0), X(w * 0.86), X(h * 0.86))
  p.stroke(INK)
  p.strokeWeight(weight * 0.5)
  p.noFill()
  p.line(X(0), X(-h * 0.46), X(0), X(h * 0.46))
  p.line(X(-w * 0.46), X(0), X(w * 0.46), X(0))
  p.strokeWeight(weight * 1.0)
  p.stroke(INK)
  p.ellipse(X(0), X(0), X(w), X(h))
  p.stroke(REGATTA.coral)
  p.strokeWeight(weight * 0.6)
  p.ellipse(X(0), X(0), X(w * 0.96), X(h * 0.97))
  p.pop()
}

/** A tether's stake on the meadow. */
function drawStake(p: p5, look: Look, x: number): void {
  const { k, weight } = look
  const X = (v: number) => v * k
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(REGATTA.steel)
  p.quad(X(x - 0.06), X(GROUND + 0.02), X(x + 0.06), X(GROUND + 0.02), X(x + 0.05), X(GROUND - 0.34), X(x - 0.05), X(GROUND - 0.34))
  p.noFill()
  p.strokeWeight(weight * 0.7)
  p.ellipse(X(x), X(GROUND - 0.38), X(0.14), X(0.1))
}

/** A rope between two points, sagging `sag` at its middle. */
function rope(p: p5, look: Look, a: Pt, b: Pt, sag: number): void {
  const { k, weight } = look
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 1.05)
  p.beginShape()
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    p.vertex((a[0] + (b[0] - a[0]) * u) * k, (a[1] + (b[1] - a[1]) * u + sag * 4 * u * (1 - u)) * k)
  }
  p.endShape()
  p.stroke(REGATTA.rope)
  p.strokeWeight(weight * 0.55)
  p.beginShape()
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    p.vertex((a[0] + (b[0] - a[0]) * u) * k, (a[1] + (b[1] - a[1]) * u + sag * 4 * u * (1 - u)) * k)
  }
  p.endShape()
}

/**
 * A tether from a basket's rim (at nozzle `n`) down to its stake `span` cells to the west. Taut till `release` (if
 * any); then the rope falls away from the basket and lies down on the grass from its stake.
 */
export function drawTether(p: p5, look: Look, n: Pt, span: number, t: number, release: number | null): void {
  const stake = n[0] - span
  drawStake(p, look, stake)
  const ring: Pt = [stake, GROUND - 0.38]
  const hook: Pt = [n[0] - ANAT.rimW + 0.05, n[1] + ANAT.rimY + 0.1]
  if (release === null || t < release) {
    rope(p, look, ring, hook, 0.05)
    // The quick-release shackle at the rim.
    const { k, weight } = look
    p.stroke(INK)
    p.strokeWeight(weight * 0.7)
    p.fill(REGATTA.steel)
    p.rectMode(p.CORNER)
    p.rect((hook[0] - 0.07) * k, (hook[1] - 0.05) * k, 0.14 * k, 0.1 * k, 0.03 * k)
    p.rectMode(p.CENTER)
    return
  }
  // Let go: the free end drops and swings down to the grass, the rope settling along it.
  const u = t - release
  const fall = Math.min(1, 0.5 * 12 * u * u / Math.max(0.01, GROUND - hook[1]))
  const settle = ss(u, 0, 0.9)
  const end: Pt = [hook[0] - 0.9 * settle - 0.1 * Math.sin(u * 7) * Math.exp(-u / 0.3), hook[1] + (GROUND - 0.03 - hook[1]) * fall]
  rope(p, look, ring, end, 0.12 * (1 - settle) + 0.02)
}
