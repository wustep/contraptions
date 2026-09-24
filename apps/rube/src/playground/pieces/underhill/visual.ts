import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, rail } from '../../../parts'

export const TWO = Math.PI * 2

export function deck(p: p5, k: number, ink: string, weight: number, color: string, x0 = -0.5, x1 = 1.5, level = 0): void {
  rail(p, k, ink, weight, x0, x1, FLOOR + level)
  solid(p, ink, weight, color)
  p.rect(((x0 + x1) / 2) * k, (FLOOR + level + 0.075) * k, (x1 - x0) * k, 0.09 * k, 0.018 * k)
  outline(p, ink, weight * 0.7)
  for (let x = x0 + 0.15; x < x1; x += 0.45) p.line(x * k, (FLOOR + level + 0.12) * k, x * k, (level + 0.48) * k)
}

export function arch(p: p5, k: number, ink: string, weight: number, color: string, x: number, top = -0.62): void {
  outline(p, ink, weight * 1.2)
  p.line((x - 0.32) * k, FLOOR * k, (x - 0.32) * k, top * k)
  p.line((x + 0.32) * k, FLOOR * k, (x + 0.32) * k, top * k)
  p.arc(x * k, top * k, 0.64 * k, 0.5 * k, Math.PI, TWO)
  solid(p, ink, weight, color)
  p.circle((x - 0.32) * k, top * k, 0.08 * k)
  p.circle((x + 0.32) * k, top * k, 0.08 * k)
}

export function gear(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, r: number, angle: number, teeth = 10): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  solid(p, ink, weight, color)
  for (let i = 0; i < teeth; i++) {
    p.push()
    p.rotate((i * TWO) / teeth)
    p.rect(0, -r * k, 0.09 * k, 0.13 * k, 0.015 * k)
    p.pop()
  }
  p.circle(0, 0, r * 1.75 * k)
  p.fill(ink)
  p.noStroke()
  p.circle(0, 0, r * 0.36 * k)
  p.pop()
}

export function crystal(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, size: number, lit = 0): void {
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex((x - size * 0.55) * k, (y + size * 0.38) * k)
  p.vertex((x - size * 0.38) * k, (y - size * 0.55) * k)
  p.vertex(x * k, (y - size) * k)
  p.vertex((x + size * 0.55) * k, (y - size * 0.4) * k)
  p.vertex((x + size * 0.46) * k, (y + size * 0.38) * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.65)
  p.line(x * k, (y - size) * k, x * k, (y + size * 0.35) * k)
  p.line((x - size * 0.55) * k, (y + size * 0.38) * k, x * k, (y - size * 0.18) * k)
  if (lit > 0) {
    const halo = p.color(color)
    halo.setAlpha(95 * clamp(lit))
    p.noStroke()
    p.fill(halo)
    p.circle(x * k, (y - size * 0.3) * k, size * (1.3 + lit * 0.6) * k)
  }
}

export function spark(p: p5, k: number, ink: string, weight: number, x: number, y: number, t: number, color: string): void {
  if (t < 0 || t > 0.42) return
  const f = 1 - t / 0.42
  p.push()
  p.translate(x * k, y * k)
  p.stroke(color)
  p.strokeWeight(weight * f)
  for (let i = 0; i < 6; i++) {
    const a = (i * TWO) / 6
    const a0 = (0.11 + t * 0.35) * k
    const a1 = a0 + 0.12 * f * k
    p.line(Math.cos(a) * a0, Math.sin(a) * a0, Math.cos(a) * a1, Math.sin(a) * a1)
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.6 * f)
  p.circle(0, 0, R * k * f)
  p.pop()
}
